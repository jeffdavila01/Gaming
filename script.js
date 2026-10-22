import {Game} from './game.js';
import {HandTracking} from './handTracking.js';
const $=id=>document.getElementById(id);
let mode='hand',cameraBusy=false,lastHand=0,lastUI='',connection=0;
function render(g){
  const key=[g.state,g.score,g.health,Math.ceil(g.time),g.ammo,!!g.reloadTime,!!g.shieldTime,mode].join('|');if(key===lastUI)return;lastUI=key;
  $('score').textContent=String(g.score).padStart(5,'0');$('health').textContent=`${g.health}%`;
  const seconds=Math.ceil(g.time);$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('ammo').textContent=g.reloadTime?'RELOADING':`${g.ammo} / 12`;$('level').textContent=`SECTOR ${1+Math.floor(g.elapsed/15)}`;
  $('screen').hidden=g.state==='playing';$('pause').textContent=g.state==='paused'?'Resume':'Pause';$('pause').disabled=!['playing','paused'].includes(g.state);$('start').disabled=g.state==='loading';
  const screens={menu:['SYSTEM READY','Take your shot.','Show your hand for automatic target lock. Move left or right to select enemies. Pinch to fire.'],setup:['CAMERA SETUP','Connect your vision.','Click Start Game to enable your camera or choose Mouse Demo Mode.'],loading:['LOADING VISION','Waking up vision...','Loading hand tracking. Mouse Demo Mode is available while you wait.'],paused:['SYSTEM PAUSED','Take a breath.','Resume when you are ready.'],gameover:['ROUND COMPLETE',g.health?'Grid secured.':'Defense breached.',`Score: ${g.score} | Accuracy: ${g.shots?Math.round(g.hits/g.shots*100):0}%. Hold an open palm to restart.`],error:['VISION INTERRUPTED','Reconnect your camera.','Retry Start Camera or use Mouse Demo Mode. Details appear below.']};
  if(screens[g.state]){const [label,title,description]=screens[g.state];$('stateLabel').textContent=label;$('title').textContent=title;$('description').textContent=description;}
  $('start').textContent=g.state==='paused'?'Resume':g.state==='gameover'?'Play again':'Start Game';
}
const game=new Game($('game'),render);
function clearTracking(){game.handVisible=false;game.lockedTarget=null;}
function showError(error){cameraBusy=false;$('camera').disabled=false;clearTracking();$('cameraStatus').textContent='Camera unavailable';$('handStatus').textContent='No hand detected';const messages={NotAllowedError:'Allow camera access in your browser site settings, then retry.',NotFoundError:'No webcam found. Connect a camera or choose Mouse Demo Mode.',NotReadableError:'Camera is busy. Close other camera apps, then retry.'};$('error').textContent=messages[error.name]||error.message;$('error').hidden=false;if(mode==='hand')game.setState('error');}
const tracker=new HandTracking($('video'),$('landmarks'),input=>{
  if(mode!=='hand')return;
  if(!input.visible){clearTracking();$('handStatus').textContent='Hand lost | show your full hand';return;}
  const now=performance.now(),gap=now-lastHand;lastHand=now;game.handVisible=true;
  $('handStatus').textContent=game.reloadTime?'Reloading...':input.action==='reload'?'Open palm detected':input.reloadProgress>0?`Hold palm: ${Math.round(input.reloadProgress*100)}%`:`${input.count} hand${input.count>1?'s':''} | ${input.pinched?'Release fingers to re-arm':'Ready to pinch'}`;
  if(input.action==='reload'&&game.state==='gameover'){tracker.resetGesture();game.start();return;}
  const primary=input.primary!==false;
  const savedAim={...game.handAim},savedLock=game.lockedTarget;
  if(primary||input.action==='shoot'){
  if(game.assistEnabled){
    const alpha=gap>180?1:1-Math.exp(-Math.min(gap,100)/55);
    game.handAim.x+=((input.palmX??input.x)-game.handAim.x)*alpha;
    game.handAim.y+=((input.palmY??input.y)-game.handAim.y)*alpha;
  }else if(gap>180||input.ratio>tracker.threshold+.10){game.handAim={x:input.x,y:input.y};}
  game.updateAim();
  }
  if(input.action==='shoot'){
    // Each hand has its own trigger cooldown, including simultaneous pinches.
    if(!primary){game.handAim={x:game.assistEnabled?(input.palmX??input.x):input.x,y:game.assistEnabled?(input.palmY??input.y):input.y};game.lockedTarget=null;}
    game.shoot(input.handId??0);
  }
  if(!primary){game.handAim=savedAim;game.lockedTarget=savedLock;game.updateAim();}
  if(input.action==='reload')game.reload();
  if(input.action==='shield')game.shield();
},text=>{$('cameraStatus').textContent=text;},showError);
function useMode(next){mode=next;game.handControl=next==='hand';clearTracking();$('mode').textContent=next==='mouse'?'MOUSE DEMO':'HAND CONTROL';lastUI='';}
async function connectCamera(startRound=false){
  if(cameraBusy)return;const request=++connection;cameraBusy=true;$('camera').disabled=true;$('error').hidden=true;useMode('hand');game.unlockAudio();game.setState('loading');
  await tracker.start();if(request!==connection)return;
  cameraBusy=false;$('camera').disabled=false;if(tracker.active&&mode==='hand'){tracker.resetGesture();if(startRound)game.start();else game.setState('menu');}
}
async function begin(){if(cameraBusy)return;game.unlockAudio();if(game.state==='paused'){tracker.resetGesture();game.setState('playing');return;}if(mode==='hand'&&!tracker.active){await connectCamera(true);return;}tracker.resetGesture();game.start();}
$('start').addEventListener('click',begin);
$('demo').addEventListener('click',()=>{connection++;tracker.stop();cameraBusy=false;$('camera').disabled=false;$('cameraStatus').textContent='Camera off';$('handStatus').textContent='Mouse aim + click to fire';$('error').hidden=true;useMode('mouse');game.unlockAudio();game.start();});
$('camera').addEventListener('click',()=>connectCamera(false));
$('stopCamera').addEventListener('click',()=>{connection++;tracker.stop();cameraBusy=false;$('camera').disabled=false;clearTracking();$('cameraStatus').textContent='Camera off';$('handStatus').textContent='No hand detected';if(mode==='hand')game.setState('setup');});
$('sensitivity').addEventListener('input',e=>{tracker.threshold=Number(e.target.value);$('sensitivityValue').textContent=tracker.threshold.toFixed(2);});
$('aimAssist').addEventListener('change',e=>{game.assistEnabled=e.target.checked;game.lockedTarget=null;game.updateAim();});
$('skeleton').addEventListener('change',e=>tracker.overlay=e.target.checked);
function pause(){if(game.state==='playing')game.setState('paused');else if(game.state==='paused')game.setState('playing');tracker.resetGesture();}
$('reload').addEventListener('click',()=>{game.unlockAudio();game.reload();});
$('pause').addEventListener('click',pause);
$('restart').addEventListener('click',()=>{if(cameraBusy)return;if(game.state==='paused')game.setState('menu');begin();});
$('mute').addEventListener('click',()=>{game.muted=!game.muted;$('mute').textContent=`Sound: ${game.muted?'off':'on'}`;$('mute').setAttribute('aria-pressed',String(game.muted));game.unlockAudio();});
const canvas=$('game');
function mouseAim(e){if(mode!=='mouse')return;const r=canvas.getBoundingClientRect();game.aim={x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
canvas.addEventListener('pointermove',mouseAim);canvas.addEventListener('pointerdown',e=>{if(mode!=='mouse'||e.button!==0)return;game.unlockAudio();mouseAim(e);game.shoot();});
window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||e.repeat)return;if(e.code==='KeyR'){e.preventDefault();game.reload();return;}if(e.code==='Escape')pause();if(mode==='mouse'){if(e.code==='Space'){e.preventDefault();game.shield();}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game.state==='playing')game.setState('paused');clearTracking();tracker.resetGesture();}});
window.addEventListener('pagehide',()=>{connection++;tracker.stop();});
setInterval(()=>{$('feedback').textContent=game.state==='playing'?(mode==='hand'&&performance.now()-lastHand>700?'SHOW YOUR HAND TO AIM':game.reloadTime?'RELOADING...':game.shieldTime?'SHIELD ACTIVE':game.lockedTarget?'TARGET LOCKED | PINCH TO FIRE':mode==='mouse'?'CLICK TO FIRE | R TO RELOAD':'MOVE HAND TO SELECT TARGET'):'AWAITING INPUT';},150);
