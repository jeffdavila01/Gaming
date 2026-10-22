const VERSION='0.10.21';
const VISION_SOURCES=[
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`,
  `https://unpkg.com/@mediapipe/tasks-vision@${VERSION}`
];
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const EDGES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function fingerExtended(points,tip,aspect=1){
  const base=points[tip-3],joint=points[tip-2],end=points[tip];
  const ax=(base.x-joint.x)*aspect,ay=base.y-joint.y;
  const bx=(end.x-joint.x)*aspect,by=end.y-joint.y;
  const norm=Math.hypot(ax,ay)*Math.hypot(bx,by);
  const straight=norm>1e-6&&(ax*bx+ay*by)/norm<-.65;
  const radial=q=>Math.hypot((q.x-points[0].x)*aspect,q.y-points[0].y);
  return straight&&radial(end)>radial(joint)*1.08;
}
export class HandTracking {
  constructor(video,canvas,onInput,onStatus,onError){Object.assign(this,{video,canvas,onInput,onStatus,onError});this.ctx=canvas.getContext('2d');this.threshold=.42;this.overlay=true;this.active=false;this.generation=0;this.resetGesture();}
  resetGesture(){this.pinched=true;this.kind='';this.held=0;this.fired=false;this.lastShot=-Infinity;this.visibleSince=0;this.anchor=null;this.poseSeen=0;this.poseLast=0;this.poseDuration=0;this.handStates=[];}
  async initialize(){
    if(!this.initializing)this.initializing=(async()=>{
      const failures=[];
      for(const base of VISION_SOURCES){
        this.onStatus(`Loading vision from ${new URL(base).hostname}?`);
        try{
          // Use the package's browser-ready ES module, without CDN transforms.
          const {FilesetResolver,HandLandmarker}=await import(`${base}/vision_bundle.mjs`);
          const files=await FilesetResolver.forVisionTasks(`${base}/wasm`);
          const options={baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.50,minHandPresenceConfidence:.50,minTrackingConfidence:.50};
          try{return await HandLandmarker.createFromOptions(files,options);}
          catch{options.baseOptions.delegate='CPU';return await HandLandmarker.createFromOptions(files,options);}
        }catch(error){failures.push(`${new URL(base).hostname}: ${error.message}`);}
      }
      throw new Error(`MediaPipe could not load from either CDN. Check whether your connection or browser extensions block jsDelivr, unpkg, or storage.googleapis.com. Details: ${failures.join(' | ')}`);
    })().catch(error=>{this.initializing=null;throw error;});
    this.model=await this.initializing;
  }
  async start(){this.stop();const generation=this.generation;this.onStatus('Loading vision model…');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera needs localhost or HTTPS and a browser with camera support.');await this.initialize();if(generation!==this.generation)return;this.onStatus('Requesting camera…');const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;this.video.srcObject=stream;await this.video.play();if(generation!==this.generation)return;this.active=true;this.lastVideo=-1;this.lastInference=0;this.resetGesture();for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{if(this.active){this.stop();this.onError(new Error('Webcam disconnected. Reconnect it, then Start Camera, or use Mouse Demo Mode.'));}});this.onStatus('Camera connected');this.tick(performance.now());}catch(e){if(generation===this.generation){this.stop();this.onError(e);}}}
  stop(){this.generation++;this.active=false;cancelAnimationFrame(this.frame);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.resetGesture();}
  tick(now){if(!this.active)return;try{if(!document.hidden&&now-this.lastInference>=30&&this.video.readyState>=2&&this.video.currentTime!==this.lastVideo){this.lastInference=now;this.lastVideo=this.video.currentTime;this.process(this.model.detectForVideo(this.video,now),now);}this.frame=requestAnimationFrame(t=>this.tick(t));}catch(e){this.stop();this.onError(e);}}
  process(result,now){const hands=result.landmarks;this.canvas.width=this.video.videoWidth||640;this.canvas.height=this.video.videoHeight||480;const c=this.ctx,w=this.canvas.width,h=this.canvas.height;
    if(this.overlay)for(const points of hands){c.strokeStyle='#52e4ef';c.lineWidth=2;c.beginPath();for(const [a,b]of EDGES){c.moveTo(points[a].x*w,points[a].y*h);c.lineTo(points[b].x*w,points[b].y*h);}c.stroke();c.fillStyle='#fff';for(const p of points){c.beginPath();c.arc(p.x*w,p.y*h,3,0,Math.PI*2);c.fill();}}
    const valid=hands.filter(p=>p.length===21&&p.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=-.05&&v.x<=1.05&&v.y>=-.05&&v.y<=1.05)&&distance(p[0],p[9])>=.025);
    if(!valid.length){this.resetGesture();this.onInput({visible:false,count:0});return;}
    const available=new Set(this.handStates.filter(s=>now-s.seen<250));
    const assignments=[];
    // Match the closest wrist pair first, regardless of MediaPipe result order.
    const remaining=new Set(valid);
    while(remaining.size&&available.size){
      let best=null;
      for(const p of remaining)for(const state of available){const d=distance(p[0],state.anchor);if(d<.25&&(!best||d<best.d))best={p,state,d};}
      if(!best)break;
      assignments.push(best);remaining.delete(best.p);available.delete(best.state);
    }
    const used=new Set(assignments.map(a=>a.state.id));
    for(const p of remaining){const id=[0,1].find(id=>!used.has(id));if(id===undefined)continue;used.add(id);assignments.push({p,state:{id,pinched:true,kind:'',fired:false,lastShot:-Infinity,visibleSince:now,poseSeen:0,poseLast:0,poseDuration:0,seen:now,anchor:p[0]}});}
    assignments.sort((a,b)=>a.state.id-b.state.id);
    this.handStates=assignments.map(a=>a.state);
    for(const {p,state}of assignments){
      if(now-state.seen>180){state.pinched=true;state.kind='';state.fired=false;state.poseDuration=0;state.visibleSince=now;}
      state.seen=now;state.anchor=p[0];
      this.analyzeHand(p,state,now,w,h,valid.length,state===this.handStates[0]);
    }
  }
  analyzeHand(p,state,now,w,h,count,primary){
    const scale=distance(p[0],p[9]);const ratio=distance(p[4],p[8])/scale;const extended=[8,12,16,20].map(t=>fingerExtended(p,t,w/h));
    // Three straight fingers are enough; the thumb need not be fully spread.
    // Middle + ring must be extended, and pinches cannot count as an open palm.
    const palm=extended[1]&&extended[2]&&extended.filter(Boolean).length>=3&&ratio>this.threshold+.22;
    const fist=extended.every(v=>!v)&&distance(p[4],p[9])<scale*.95;
    let action=null;
    const releaseThreshold=this.threshold+.10;
    if(ratio>releaseThreshold)state.pinched=false;
    // Keep a deliberate pinch pending during cooldown rather than swallowing it.
    if(now-state.visibleSince>150&&ratio<this.threshold&&!state.pinched&&!fist&&now-state.lastShot>=190){
      state.pinched=true;action='shoot';state.lastShot=now;
    }
    const detected=action?'':palm?'reload':fist?'shield':'';
    if(detected){
      if(detected!==state.kind){state.kind=detected;state.fired=false;state.poseDuration=0;state.poseLast=now;}
      else if(state.poseLast===state.poseSeen)state.poseDuration+=Math.min(100,now-state.poseLast);
      state.poseSeen=now;state.poseLast=now;
      const required=state.kind==='reload'?450:700;
      if(!state.fired&&state.poseDuration>=required){action=state.kind;state.fired=true;}
    }else{
      // Brief landmark noise pauses the hold instead of making the player start over.
      state.poseLast=now;
      if(action||now-state.poseSeen>100){state.kind='';state.fired=false;state.poseDuration=0;}
    }
    const kind=detected;
    const reloadProgress=state.kind==='reload'&&!state.fired?Math.min(1,state.poseDuration/450):0;
    this.onInput({visible:true,count,handId:state.id,primary,x:Math.max(0,Math.min(1,(1-p[8].x-.1)/.8)),y:Math.max(0,Math.min(1,(p[8].y-.1)/.8)),palmX:Math.max(0,Math.min(1,(1-(p[0].x+p[5].x+p[9].x+p[17].x)/4-.2)/.6)),palmY:Math.max(0,Math.min(1,((p[0].y+p[9].y)/2-.1)/.8)),action,ratio,reloadProgress,pinched:state.pinched,gesture:kind||'aim'});
  }
}
