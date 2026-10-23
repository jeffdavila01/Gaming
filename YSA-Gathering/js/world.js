/* Dependency-free WebGL: actual 3D meshes, perspective and a moving camera. */
const WorkshopWorld = (() => {
 const canvas = document.getElementById('world-canvas');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const shops = [
  {n:1,x:-4,z:-4,color:[.85,.31,.24]}, {n:2,x:4,z:-4,color:[.22,.52,.85]},
  {n:3,x:-4,z:-13,color:[.31,.65,.40]}, {n:4,x:4,z:-13,color:[.93,.51,.18]},
  {n:5,x:0,z:-24,color:[.62,.37,.83]},
  {n:6,x:-4,z:5,color:[.93,.81,.55]}
 ];
 let glassBuffer,glassCount=0;
 let gl,program,buffer,count,frame=0,enabled=false,transition=null,room=null,lastTime=0;
 let camera=[0,1.7,10],target=[0,1.8,-14],lobby=[0,1.7,5],lobbyTarget=[0,1.8,-14];
 let width=1,height=1,aspect=1,focal=1;
 let doorStart=null,doorBuffer=null,doorCount=0,doorComplete=false,doorOpen=0,doorMotion=null;
 const keys=new Set();let verts=[];
 let drag=null,suppressClick=false,orbit=null;
 const displays=shops.slice(0,5).map(s=>({n:s.n,x:s.x?Math.sign(s.x)*2.7:0,z:s.x?s.z:-19.8,color:s.color}));
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
 function basis(){const forward=norm(sub(target,camera)),right=norm(cross(forward,[0,1,0]));return {forward,right,up:cross(right,forward)}}
 function box(x,y,z,w,h,d,c,glow=0){
  const points=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[x+v[0]*w/2,y+v[1]*h/2,z+v[2]*d/2]);
  const faces=[[[0,3,2,1],[0,0,-1]],[[4,5,6,7],[0,0,1]],[[0,4,7,3],[-1,0,0]],[[1,2,6,5],[1,0,0]],[[3,7,6,2],[0,1,0]],[[0,1,5,4],[0,-1,0]]];
  for(const [ids,n] of faces)for(const i of [0,1,2,0,2,3])verts.push(...points[ids[i]],...n,...c,glow);
 }

 function triangle(a,b,c,normal,color,glow=0){for(const p of [a,b,c])verts.push(...p,...normal,...color,glow);}
 function rod(a,b,r,color,segments=12){
  const axis=norm(sub(b,a)),u=norm(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);
  for(let i=0;i<segments;i++){
   const t=i/segments*Math.PI*2,t2=(i+1)/segments*Math.PI*2;
   const n=u.map((x,j)=>x*Math.cos(t)+v[j]*Math.sin(t)),n2=u.map((x,j)=>x*Math.cos(t2)+v[j]*Math.sin(t2));
   const p=a.map((x,j)=>x+n[j]*r),q=b.map((x,j)=>x+n[j]*r),p2=a.map((x,j)=>x+n2[j]*r),q2=b.map((x,j)=>x+n2[j]*r);
   triangle(p,q,p2,n,color);triangle(p2,q,q2,n2,color);triangle(a,p2,p,axis.map(x=>-x),color);triangle(b,q,q2,axis,color);
  }
 }
 function balloon(x,y,z,rx,ry,rz,color){
  const point=(u,v)=>[x+rx*Math.sin(v)*Math.cos(u),y+ry*Math.cos(v),z+rz*Math.sin(v)*Math.sin(u)];
  for(let row=0;row<10;row++)for(let col=0;col<18;col++){
   const u=col/18*Math.PI*2,u2=(col+1)/18*Math.PI*2,v=row/10*Math.PI,v2=(row+1)/10*Math.PI;
   const a=point(u,v),b=point(u2,v),c=point(u,v2),d=point(u2,v2);const normal=norm([(a[0]+d[0])/2-x,((a[1]+d[1])/2-y)*1.2,(a[2]+d[2])/2-z]);
   triangle(a,b,c,normal,color);triangle(c,b,d,normal,color);
  }
 }
 function strawCar(display){
  const {x,z,color}=display,y=.93,variant=display.variant||0;
  const fourWheels=[1,3,4].includes(variant);
  // Five physical display plinths, each with one full three-wheel car model.
  box(x,.37,z,1.75,.74,2.2,[.14,.23,.26]);box(x,.77,z,1.85,.08,2.3,[.72,.66,.52]);box(x,.82,z+.98,1.55,.04,.035,color,1);
  const red=[.9,.19,.17],blue=[.13,.56,.92],green=[.25,.78,.36],yellow=[.97,.81,.20];
  const a=[x-.42,y+.22,z-.46],b=[x+.42,y+.22,z-.46],c=[x+.42,y+.22,z+.42],d=[x-.42,y+.22,z+.42];
  for(const [p,q,tint] of (variant===2?[[a,b,blue],[b,[x,y+.22,z+.56],yellow],[[x,y+.22,z+.56],a,green]]:[[a,b,blue],[b,c,yellow],[c,d,red],[d,a,green]]))rod(p,q,.045,tint);
  // Rear wooden axle and straw sleeve; one centered front wheel.
  rod([x-.58,y+.18,z-.42],[x+.58,y+.18,z-.42],.018,[.77,.61,.36]);rod([x-.33,y+.18,z-.42],[x+.33,y+.18,z-.42],.035,yellow);
  rod([x-.15,y+.18,z+.56],[x+.15,y+.18,z+.56],.018,[.77,.61,.36]);rod([x,y+.22,z+.42],[x,y+.37,z+.56],.04,green);
  const wheelPositions=fourWheels?[[x-.56,z-.42],[x+.56,z-.42],[x-.56,z+.56],[x+.56,z+.56]]:[[x-.56,z-.42],[x+.56,z-.42],[x,z+.56]];
  if(fourWheels)rod([x-.58,y+.18,z+.56],[x+.58,y+.18,z+.56],.025,[.77,.61,.36]);
  for(const [wx,wz] of wheelPositions){
   rod([wx-.035,y+.18,wz],[wx+.035,y+.18,wz],.22,[.57,.40,.23],24);
   rod([wx-.038,y+.18,wz],[wx+.038,y+.18,wz],.038,[.86,.73,.48],12);
   for(let i=0;i<4;i++){const t=i*Math.PI/2;rod([wx+.039,y+.18,wz],[wx+.039,y+.18+Math.cos(t)*.17,wz+Math.sin(t)*.17],.009,[.76,.59,.36],6);}
  }
  for(const dx of [-.35,.35])rod([x+dx,y+.23,z+.35],[x+dx,y+.63,z+.35],.035,green);
  rod([x,y+.65,z-.22],[x,y+.65,z-.94],.044,blue);
  if(variant===4){balloon(x-.22,y+.80,z-.20,.21,.25,.4,color);balloon(x+.22,y+.80,z-.20,.21,.25,.4,color);}
  else balloon(x,y+.80,z-.20,.32,.30,.43,color);
  if(variant===3){for(const dx of [-.4,.4]){rod([x+dx,y+.22,z-.4],[x+dx,y+.9,z-.25],.035,yellow);rod([x+dx,y+.9,z-.25],[x+dx,y+.85,z+.45],.035,yellow);}rod([x-.4,y+.85,z+.45],[x+.4,y+.85,z+.45],.035,blue);}
  if(variant===1){rod([x-.42,y+.25,z-.46],[x+.42,y+.25,z+.42],.03,green);rod([x+.42,y+.25,z-.46],[x-.42,y+.25,z+.42],.03,green);}

  rod([x,y+.65,z-.63],[x,y+.65,z-.7],.06,[.86,.70,.43]);
  balloon(x-.12,y+.97,z-.07,.045,.035,.10,[.98,.88,.72]);
 }
 function leaf(base,tip,width,color){
  const direction=norm(sub(tip,base)),across=norm(cross(direction,Math.abs(direction[1])>.95?[1,0,0]:[0,1,0]));
  const sections=8,left=[],right=[],ridge=[];
  for(let i=0;i<=sections;i++){
   const t=i/sections,spread=Math.sin(Math.PI*t)*width;
   const center=base.map((v,j)=>v+(tip[j]-v)*t+(j===1?Math.sin(Math.PI*t)*.09:0));
   left.push(center.map((v,j)=>v+across[j]*spread));right.push(center.map((v,j)=>v-across[j]*spread));ridge.push(center.map((v,j)=>v+(j===1?.018:0)));
  }
  for(let i=0;i<sections;i++){
   for(const side of [left,right]){
    const a=ridge[i],b=side[i+1],c=side[i],d=ridge[i+1];
    const normal=norm(cross(sub(b,a),sub(c,a)));triangle(a,b,c,normal,color);triangle(a,d,b,normal,color);
   }
  }
  rod(base,tip,.004,[.35,.47,.19],5);
 }
 function plant(x,z){
  // Rounded ceramic planter with a lip and visible dark soil.
  rod([x,.05,z],[x,.12,z],.23,[.39,.34,.25],24);
  rod([x,.12,z],[x,.48,z],.28,[.65,.59,.45],24);
  rod([x,.47,z],[x,.52,z],.30,[.78,.71,.54],24);
  rod([x,.518,z],[x,.527,z],.255,[.12,.105,.065],24);
  const seed=x*2.31+z*.73;
  // Curved fronds arch outward from the crown, with paired tapered leaflets.
  for(let frond=0;frond<9;frond++){
   const angle=frond*2.399+seed,height=1.03+(frond%3)*.19,reach=.48+(frond%4)*.10;
   const root=[x,.51,z],top=[x+Math.cos(angle)*reach,.53+height*.77,z+Math.sin(angle)*reach];
   const curve=t=>[x+Math.cos(angle)*reach*t,.51+height*(Math.sin(t*Math.PI*.72)*.72+t*.18),z+Math.sin(angle)*reach*t];
   let previous=root;
   for(let j=1;j<=8;j++){const t=j/8,point=curve(t);rod(previous,point,.008,[.28,.38,.15],6);previous=point;
    if(j<8)for(const side of [-1,1]){
     const length=(.30*Math.sin(Math.PI*t)+.07),wing=angle+side*1.05;
     const tip=[point[0]+Math.cos(wing)*length,point[1]-.10*t+.025,point[2]+Math.sin(wing)*length];
     leaf(point,tip,.036+(frond%2)*.012,[.12+(j%3)*.025,.29+(frond%3)*.035,.105+(frond%2)*.02]);
    }
   }
   leaf(curve(.65),top,.052,[.17,.37,.13]);
  }
  // A few broad lower leaves make the silhouette less uniform.
  for(let i=0;i<4;i++){const angle=seed+i*1.7;leaf([x,.65,z],[x+Math.cos(angle)*.48,1.02+(i%2)*.18,z+Math.sin(angle)*.48],.11,[.14,.32+i*.015,.15]);}
 }
 function desk(x,z){box(x,.85,z,1.6,.12,.75,[.63,.44,.26]);for(const a of [-.65,.65])for(const b of [-.25,.25])box(x+a,.4,z+b,.07,.8,.07,[.15,.21,.22]);}
 function chandelier(x,z){
  const silver=[.72,.78,.82],white=[1,1,1];
  rod([x,6.7,z],[x,5.5,z],.035,silver);rod([x,6.67,z],[x,6.77,z],.23,silver,24);
  for(const [radius,y] of [[.85,5.35],[.48,5.02]]){
   for(let i=0;i<32;i++){const t=i/32*Math.PI*2,t2=(i+1)/32*Math.PI*2;rod([x+Math.cos(t)*radius,y,z+Math.sin(t)*radius],[x+Math.cos(t2)*radius,y,z+Math.sin(t2)*radius],.025,silver,6);}
   for(let i=0;i<10;i++){
    const t=i/10*Math.PI*2,px=x+Math.cos(t)*radius,pz=z+Math.sin(t)*radius;
    rod([x,5.65,z],[px,y+.15,pz],.017,silver,6);rod([px,y+.15,pz],[px,y+.37,pz],.035,[.94,.95,.96],8);
    box(px,y+.41,pz,.09,.14,.09,white,1);
    const length=.18+(i%3)*.07;rod([px,y,pz],[px,y-length,pz],.005,silver,5);
    const top=[px,y-length,pz],bottom=[px,y-length-.20,pz],r=.06,mid=y-length-.065;
    for(let face=0;face<4;face++){
     const angle=face*Math.PI/2,next=angle+Math.PI/2,aa=[px+Math.cos(angle)*r,mid,pz+Math.sin(angle)*r],bb=[px+Math.cos(next)*r,mid,pz+Math.sin(next)*r];
     triangle(top,aa,bb,norm(cross(sub(aa,top),sub(bb,top))),[.80,.91,1],.6);triangle(bottom,bb,aa,norm(cross(sub(bb,bottom),sub(aa,bottom))),[.93,.97,1],.4);
    }
   }
  }
  rod([x,5.65,z],[x,4.72,z],.04,silver);
 }
 function sofa(x,z){
  const fabric=[.72,.75,.70],cushion=[.83,.84,.77],legs=[.20,.23,.22];
  for(const dx of [-.85,.85])for(const dz of [-.33,.33])rod([x+dx,.04,z+dz],[x+dx,.25,z+dz],.035,legs,8);
  box(x,.34,z,2.05,.27,.92,fabric);box(x,.79,z-.37,2.05,.88,.20,fabric);
  for(const dx of [-.95,.95]){box(x+dx,.63,z,.18,.58,.95,fabric);rod([x+dx,.91,z-.36],[x+dx,.91,z+.35],.09,cushion,12);}
  for(const dx of [-.46,.46]){box(x+dx,.53,z+.035,.88,.17,.71,cushion);box(x+dx,.91,z-.23,.88,.53,.17,cushion);}
  box(x-.58,.83,z-.04,.31,.35,.15,[.30,.45,.45]);box(x+.58,.83,z-.04,.31,.35,.15,[.77,.68,.49]);
 }
 function wallSofa(x,z,angle){
  const start=verts.length;sofa(x,z);const c=Math.cos(angle),sn=Math.sin(angle);
  for(let i=start;i<verts.length;i+=10){const dx=verts[i]-x,dz=verts[i+2]-z;verts[i]=x+dx*c-dz*sn;verts[i+2]=z+dx*sn+dz*c;const nx=verts[i+3],nz=verts[i+5];verts[i+3]=nx*c-nz*sn;verts[i+5]=nx*sn+nz*c;}
 }
 function chair(x,z){
  for(const dx of [-.28,.28])for(const dz of [-.25,.25])rod([x+dx,.04,z+dz],[x+dx,.42,z+dz],.025,[.29,.24,.18],8);
  box(x,.45,z,.73,.18,.72,[.48,.63,.61]);box(x,.85,z-.28,.73,.75,.16,[.48,.63,.61]);
  for(const dx of [-.35,.35])box(x+dx,.66,z,.10,.32,.68,[.39,.54,.52]);
  box(x,.59,z,.57,.10,.55,[.65,.75,.70]);
 }
 function courtyardTree(x,z,seed){
  const bark=[.28,.22,.15];
  const trunk=[[x,.2,z],[x+.08,1.3,z-.03],[x-.07,2.5,z+.10],[x+.12,3.8,z]];
  for(let i=0;i<3;i++)rod(trunk[i],trunk[i+1],.17-i*.035,bark,14);
  for(let i=0;i<12;i++){
   const angle=i*2.399+seed,height=2.2+(i%4)*.46,reach=.7+(i%3)*.37;
   const start=[x,height-.5,z],end=[x+Math.cos(angle)*reach,height+.65,z+Math.sin(angle)*reach];
   rod(start,end,.055-(i%3)*.009,[.34,.27,.18],8);
   const fork=[end[0]+Math.cos(angle+.8)*.36,end[1]+.25,end[2]+Math.sin(angle+.8)*.36];rod(end,fork,.024,bark,6);
   for(let j=0;j<18;j++){
    const t=j*2.399+seed+i*.7,r=.22+(j%5)*.11;
    const base=[end[0]+Math.cos(t)*r,end[1]+Math.sin(j*1.6)*.43,end[2]+Math.sin(t)*r];
    const tip=[base[0]+Math.cos(t+.3)*.27,base[1]+.10+(j%3)*.04,base[2]+Math.sin(t+.3)*.27];
    leaf(base,tip,.075,[.12+(j%3)*.035,.27+(i%4)*.026,.10+(j%4)*.013]);
   }
  }
  // Bark seams and exposed roots break up the straight trunk silhouette.
  for(let i=0;i<5;i++){const a=i*Math.PI*.4;rod([x,.25,z],[x+Math.cos(a)*.45,.04,z+Math.sin(a)*.45],.06,bark,6);}
 }
 function exteriorBuilding(x,z,index){
  const h=7+(index*7%9),w=3.6+(index%3)*.4;
  box(x,h/2,z,w,h,4.8,[.30+index%3*.04,.34+index%2*.03,.37]);
  box(x,h+.15,z,w+.24,.3,5,[.49,.51,.49]);box(x+.3,h+.65,z+.4,1.2,1,1.5,[.32,.36,.37]);
  for(let y=1.3;y<h-.4;y+=1.6){
   box(x,y-.68,z-2.48,w+.08,.12,.20,[.62,.61,.56]);
   for(let col=0;col<3;col++){
    const wx=x+(col-1)*(w/3);
    const lit=(index+col+Math.floor(y))%4===0;
    box(wx,y,z-2.43,.80,1.03,.045,lit?[.89,.77,.52]:[.25,.42,.51],lit?.45:0);
    for(const dx of [-.44,.44])box(wx+dx,y,z-2.49,.055,1.15,.08,[.62,.63,.58]);
    box(wx,y,z-2.50,.025,1.03,.03,[.67,.70,.66]);
    box(wx,y-.57,z-2.58,.95,.10,.32,[.69,.68,.59]);
   }
  }
  // Recessed entry, canopy, steps and slim architectural columns.
  box(x,.8,z-2.45,1.1,1.6,.08,[.11,.24,.28]);box(x,1.8,z-2.9,1.8,.12,1.05,[.59,.58,.52]);
  for(const dx of [-.78,.78])box(x+dx,.85,z-3.25,.08,1.7,.08,[.54,.56,.52]);
  box(x,.08,z-2.9,1.7,.16,1,[.56,.56,.52]);
 }
 function buildGeometry(){
  box(0,-.17,-7,21,.3,39,[.52,.55,.52]);box(0,6.9,-7,21,.2,39,[.16,.22,.24]);
  // Reflective-looking tiled stone, brass inlays and luminous ceiling strips.
  for(let z=11;z>-27;z-=2){box(0,.005,z,20,.012,.025,[.30,.36,.35]);box(0,6.76,z,7,.025,.05,[1,1,1],1);}
  for(let x=-10;x<=10;x+=2)box(x,.006,-7,.023,.014,39,[.32,.37,.35]);
  for(const x of [-3.65,3.65]){box(x,.025,-7,.035,.03,38,[.83,.66,.36],.5);box(x,6.6,-7,.08,.08,38,[1,1,1],1);}
  box(-10,3.4,-7,.25,6.8,38,[.17,.24,.27]);box(10,3.4,-7,.25,6.8,38,[.17,.24,.27]);box(0,3.4,-27,20,6.8,.2,[.22,.29,.31]);
  for(const z of [8,.5,-8.5,-17.5,-23.3])for(const x of [-4,4]){box(x,3.4,z,.28,6.8,.35,[.20,.28,.29]);box(x+.02,3.4,z+.19,.035,6.1,.015,[.98,.77,.43],1);}
  for(const s of shops){
   const side=Math.sign(s.x), center=side*7;
   if(side){
    // Open storefront portal; solid framing and partial glass side windows.
    box(side*4,5.1,s.z,.2,3.4,8.6,[.22,.29,.31]);
    for(const dz of [-3,3]){box(side*4,1.65,s.z+dz,.13,3.3,2.3,[.30,.46,.47]);box(side*3.91,1.7,s.z+dz,.025,2.8,.035,[.68,.79,.74]);}
    box(side*4,3.5,s.z,.32,.14,3.9,s.color,.85);
    for(const dz of [-1.7,1.7])box(side*4,1.7,s.z+dz,.2,3.4,.14,[.72,.61,.41]);
    for(const dz of [-4.3,4.3])box(center,3.4,s.z+dz,6,6.8,.14,[.27,.33,.33]);
    box(side*9.82,3.4,s.z,.1,6.7,8.4,[.21,.29,.30]);
    // Back wall instruction screen, picture frame and warm lighting.
    box(side*9.69,2.35,s.z,.12,2.8,4.8,[.07,.15,.19]);box(side*9.59,3.8,s.z,.06,.06,5,s.color,1);
    desk(side*7,s.z-2.6);chair(side*7,s.z-1.7);wallSofa(side*6.6,s.z+3.65,Math.PI);plant(side*5.3,s.z-3.3);plant(side*8.8,s.z+3.3);
    box(center,6.7,s.z,4.8,.04,.12,[1,1,1],1);
   }else{
    box(0,5.1,-21,8,3.4,.2,[.22,.29,.31]);for(const x of [-3,3])box(x,1.7,-21,2,3.4,.17,[.30,.46,.47]);
    box(0,3.5,-20.9,4,.12,.2,s.color,1);box(0,2.35,-26.7,5,2.8,.1,[.07,.15,.19]);
    box(0,3.8,-26.6,5,.06,.06,s.color,1);desk(-2.5,-24.3);chair(-2.5,-23.4);wallSofa(3.35,-24,Math.PI/2);plant(-3,-20.5);plant(3,-20.5);
   }
  }
  // Outdoor courtyard and evening skyline, genuinely beyond the entrance.
  box(0,-.2,27,48,.25,34,[.35,.41,.43]);
  box(0,-.05,24,7.5,.1,26,[.61,.60,.54]);
  for(let z=12;z<40;z+=2)box(0,.008,z,7.4,.012,.025,[.39,.43,.42]);
  for(const x of [-7,7]){
   box(x,.14,24,3,.4,24,[.31,.35,.32]);
   for(const z of [16,23,31]){
    courtyardTree(x,z,x*.4+z);
    box(x*.7,1.4,z,.08,2.8,.08,[.19,.25,.28]);box(x*.7,2.85,z,.45,.1,.45,[1,.8,.45],1);
   }
  }
  for(let i=0;i<12;i++)exteriorBuilding(-29+i*5.3,43+(i%3)*1.3,i);
  for(let y=0;y<30;y+=2)box(0,y,50,100,2.1,.2,[.55-y*.012,.40-y*.005,.39+y*.006],.6);
  balloon(-15,8,47,2.5,2.5,.3,[1,.69,.38]);
  // Additional recessed ceiling lights and warm wall washers.
  for(const z of [7,1,-5,-11,-17,-23]){
   for(const x of [-2.5,2.5]){
    box(x,6.76,z,.7,.035,.7,[1,1,1],1);
    box(x,6.79,z,.84,.035,.84,[.62,.65,.60]);
   }
  }
  for(const x of [-3.85,3.85])for(const z of [2,-7,-16]){
   box(x,2.55,z,.055,.52,.16,[.91,.78,.51]);
   box(x,2.85,z,.07,.08,.22,[1,.87,.63],1);
   box(x,2.25,z,.07,.08,.22,[1,.87,.63],1);
  }
  // Entrance portal remains visible from inside, with two animated hinged leaves.
  for(const x of [-4,4])box(x,2.25,10,.3,4.5,.35,[.36,.32,.25]);
  box(0,4.55,10,8.3,.25,.4,[.46,.39,.27]);
  box(0,4.37,9.85,7.7,.055,.06,[1,.82,.52],1);
  for(const x of [-3.5,3.5]){plant(x,8.5);box(x,3.9,8.5,.6,.12,.6,[.94,.79,.49],.8);}
  // Right-wall activity theme mounting panel.
  box(3.96,2.65,4,.12,1.5,4.7,[.63,.51,.32]);box(3.87,2.65,4,.04,1.36,4.5,[.91,.86,.72]);
  box(3.8,3.5,4,.08,.08,4.9,[1,.83,.54],1);
  // Brass planters, framed art, seating and pendant fittings.
  for(const z of [2,-7,-16]){
   plant(-3.3,z);box(-3.7,3.9,z,.5,.07,.5,[.88,.70,.41],1);
   box(2.75,.45,z,1.1,.5,.65,[.39,.51,.43]);box(3.18,.9,z,.2,.8,.65,[.39,.51,.43]);
  }
  for(const z of [5,-5,-15,-23])chandelier(0,z);
  box(0,5.7,10,8.3,2.3,.25,[.23,.31,.33]);
  // Keep the entrance and hallway clear of sofas.
  // No seating at the entrance doors.

  // Car exhibits are displayed exclusively inside Room 06.
  // Sixth room: five physical finished-car exhibits along the gallery wall.
  const galleryColors=[[.94,.35,.28],[.25,.57,.92],[.39,.74,.35],[.97,.73,.19],[.66,.37,.88]];
  for(let i=0;i<5;i++){
   const display={x:-8.4,z:2+i*1.5,color:galleryColors[i],variant:i};const start=verts.length;
   strawCar(display);
   for(let v=start;v<verts.length;v+=10){verts[v]=display.x+(verts[v]-display.x)*.58;verts[v+1]*=.75;verts[v+2]=display.z+(verts[v+2]-display.z)*.58;}
  }
  // A shared gathering bench in the center of the arcade.
  for(const z of [-8.5,-17.5]){box(2.3,.45,z,1.8,.3,.7,[.48,.34,.22]);box(2.3,.16,z,1.3,.25,.45,[.16,.23,.24]);plant(2.7,z-.9);}
 }

 function attributes(){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aGlow',1,36]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}}
 function setDoor(open,done){document.body.classList.add("travelling");doorComplete=false;doorMotion={from:doorOpen,to:open,start:performance.now(),done};}
 function updateDoor(time){if(!doorMotion)return;const t=reduced?1:Math.min(1,Math.max(0,(time-doorMotion.start)/1200));doorOpen=doorMotion.from+(doorMotion.to-doorMotion.from)*t*t*(3-2*t);if(t===1){const done=doorMotion.done;doorMotion=null;document.body.classList.remove("travelling");if(done)done();}}
 function renderDoors(time){
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  const angle=doorOpen*Math.PI*.47;
  if(doorComplete){const main=buffer;buffer=doorBuffer;attributes();gl.drawArrays(gl.TRIANGLES,0,doorCount);buffer=main;attributes();gl.depthMask(true);gl.disable(gl.BLEND);return;}
  const original=verts;verts=[];
  for(const side of [-1,1]){
   const start=verts.length,hinge=side*3.8;
   box(hinge-side*1.9,2.1,10,3.8,4.2,.035,[.61,.83,.86],-.83);
   for(const x of [hinge,hinge-side*3.8])box(x,2.1,9.90,.10,4.2,.15,[.69,.77,.78]);
   for(const y of [.12,2.05,4.12])box(hinge-side*1.9,y,9.88,3.8,.10,.17,[.69,.77,.78]);
   rod([hinge-side*3.5,1.7,9.73],[hinge-side*3.5,2.3,9.73],.04,[.91,.76,.45]);
   const theta=side*angle,c=Math.cos(theta),sn=Math.sin(theta);
   for(let i=start;i<verts.length;i+=10){const x=verts[i]-hinge,z=verts[i+2]-10;verts[i]=hinge+x*c-z*sn;verts[i+2]=10+x*sn+z*c;const nx=verts[i+3],nz=verts[i+5];verts[i+3]=nx*c-nz*sn;verts[i+5]=nx*sn+nz*c;}
  }
  const doorData=new Float32Array(verts);verts=original;doorComplete=!doorMotion;
  gl.bindBuffer(gl.ARRAY_BUFFER,doorBuffer);gl.bufferData(gl.ARRAY_BUFFER,doorData,gl.DYNAMIC_DRAW);doorCount=doorData.length/10;
  const main=buffer;buffer=doorBuffer;attributes();gl.drawArrays(gl.TRIANGLES,0,doorCount);buffer=main;attributes();gl.depthMask(true);gl.disable(gl.BLEND);
 }
 function updateTheme(b){
  const exit=document.getElementById('door-exit');
  const gate=[[1.5,3.75,9.75],[-1.5,3.75,9.75],[-1.5,3.12,9.75],[1.5,3.12,9.75]].map(p=>project(p,b));
  const gateTransform=!room&&camera[2]<9.6&&gate.every(p=>p.d>.15)?planeTransform(gate,260,56):null;
  exit.style.visibility=gateTransform?'visible':'hidden';exit.inert=!gateTransform;if(gateTransform)exit.style.transform=gateTransform;

  const el=document.getElementById('activity-theme');
  const corners=[[3.79,3.3,1.8],[3.79,3.3,6.2],[3.79,2.0,6.2],[3.79,2.0,1.8]].map(p=>project(p,b));
  const transform=!room&&corners.every(p=>p.d>.15)?planeTransform(corners,440,130):null;
  el.style.visibility=transform?'visible':'hidden';if(transform)el.style.transform=transform;
 }
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function fallback(){document.body.classList.add('no-webgl');for(const s of shops){const el=document.querySelector(`[data-floor="${s.n}"] .floor-front`);el.inert=false;}document.getElementById('world-status').textContent='3D is unavailable on this device. Choose a workshop below.';}
 function init(){
  if(gl)return true;
  gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'});
  if(!gl){fallback();return false;}
  try{
   const vs=shader(gl.VERTEX_SHADER,`attribute vec3 aPosition,aNormal,aColor;attribute float aGlow;uniform vec3 uCamera,uRight,uUp,uForward;uniform float uAspect,uFocal;varying vec3 vColor;varying float vDepth;varying float vAlpha;void main(){vec3 p=aPosition-uCamera;float d=dot(p,uForward);gl_Position=vec4(dot(p,uRight)*uFocal/uAspect,dot(p,uUp)*uFocal,1.001*d-.10005,d);float light=.76+.32*max(0.,dot(aNormal,normalize(vec3(-.4,1.,.6))))+.10*max(0.,dot(aNormal,normalize(vec3(.5,.6,-.6))));vColor=aColor*mix(light,1.35,max(aGlow,0.));vAlpha=aGlow<0.?1.+aGlow:1.;vDepth=d;}`);
   const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vColor;varying float vDepth;varying float vAlpha;void main(){float fog=smoothstep(12.,55.,vDepth)*.28;vec3 c=mix(vColor,vec3(.20,.26,.28),fog);gl_FragColor=vec4(pow(c,vec3(.88)),vAlpha);}`);

   program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   verts.length=0;buildGeometry();
   const opaque=[],glass=[];
   for(let i=0;i<verts.length;i+=30){const out=verts[i+9]<0?glass:opaque;for(let j=0;j<30;j++)out.push(verts[i+j]);}
   verts=opaque;glassCount=glass.length/10;glassBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,glassBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(glass),gl.STATIC_DRAW);
   count=verts.length/10;buffer=gl.createBuffer();doorBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);gl.useProgram(program);
   for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aGlow',1,36]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}
   gl.enable(gl.DEPTH_TEST);gl.clearColor(.20,.26,.28,1);return true;
  }catch(error){console.error('3D renderer:',error);gl=null;fallback();return false;}
 }
 function resize(){const r=canvas.getBoundingClientRect();width=Math.max(r.width,1);height=Math.max(r.height,1);const dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}aspect=width/height;focal=1.15*Math.min(1,aspect);gl.viewport(0,0,canvas.width,canvas.height);}
 function project(point,b){const p=sub(point,camera),d=dot(p,b.forward);return {x:(dot(p,b.right)*focal/aspect/d*.5+.5)*width,y:(.5-dot(p,b.up)*focal/d*.5)*height,d};}

 function planeTransform(corners,w=200,h=66){
  // Solve the projective mapping of the physical sign's four corners.
  const local=[[0,0],[w,0],[w,h],[0,h]],rows=[];
  for(let i=0;i<4;i++){const [x,y]=local[i],{x:u,y:v}=corners[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);}
  for(let col=0;col<8;col++){let pivot=col;for(let r=col+1;r<8;r++)if(Math.abs(rows[r][col])>Math.abs(rows[pivot][col]))pivot=r;[rows[col],rows[pivot]]=[rows[pivot],rows[col]];const divisor=rows[col][col];if(Math.abs(divisor)<1e-9)return null;for(let j=col;j<9;j++)rows[col][j]/=divisor;for(let r=0;r<8;r++)if(r!==col){const f=rows[r][col];for(let j=col;j<9;j++)rows[r][j]-=f*rows[col][j];}}
  const m=rows.map(r=>r[8]);return `matrix3d(${[m[0],m[3],0,m[6],m[1],m[4],0,m[7],0,0,1,0,m[2],m[5],0,1].join(',')})`;
 }
 function updateLabels(b){
  for(const s of shops){
   const el=document.querySelector(`[data-floor="${s.n}"] .floor-front`),side=Math.sign(s.x);
   const point=(u,y)=>side?[side*3.86,y,s.z+u*side]:[u,y,-20.8];
   const corners=[point(-1.6,3.48),point(1.6,3.48),point(1.6,2.75),point(-1.6,2.75)].map(p=>project(p,b));
   const center=project(point(0,3.1),b);
   const visible=!room&&corners.every(p=>p.d>.15)&&center.x>-400&&center.x<width+400&&center.y>-200&&center.y<height+200;
   const transform=visible?planeTransform(corners):null;
   el.style.visibility=transform?'visible':'hidden';el.inert=!transform;
   if(transform)el.style.setProperty('--sign-transform',transform);
  }
 }
 function moveTo(position,look,complete){
  document.body.classList.add('travelling');keys.clear();drag=null;
  transition={from:[...camera],lookFrom:[...target],to:position,lookTo:look,start:performance.now(),duration:reduced?0:1550,complete};
 }
 function loop(time){
  if(!enabled)return;
  const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;updateDoor(time);
  if(transition){const t=transition.duration?Math.min((time-transition.start)/transition.duration,1):1,e=t*t*(3-2*t);camera=transition.from.map((v,i)=>v+(transition.to[i]-v)*e);target=transition.lookFrom.map((v,i)=>v+(transition.lookTo[i]-v)*e);if(t===1){const done=transition.complete;transition=null;document.body.classList.remove('travelling');if(done)done();}}
  else if(!room){const direction=(keys.has('forward')?1:0)-(keys.has('back')?1:0);if(direction){const next=Math.max(-17.5,Math.min(7,camera[2]-direction*dt*4));const delta=next-camera[2];camera[2]=next;target[2]+=delta;lobby=[...camera];lobbyTarget=[...target];}}
  resize();const b=basis();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
  for(const [name,value] of [['uCamera',camera],['uRight',b.right],['uUp',b.up],['uForward',b.forward]])gl.uniform3fv(gl.getUniformLocation(program,name),value);
  
  
  gl.uniform1f(gl.getUniformLocation(program,'uAspect'),aspect);gl.uniform1f(gl.getUniformLocation(program,'uFocal'),focal);gl.drawArrays(gl.TRIANGLES,0,count);
  if(glassCount){const main=buffer;buffer=glassBuffer;attributes();gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,glassCount);gl.depthMask(true);gl.disable(gl.BLEND);buffer=main;attributes();}
  renderDoors(time);updateLabels(b);updateTheme(b);frame=requestAnimationFrame(loop);
 }
 function show(){if(!init())return false;document.body.classList.remove('no-webgl');enabled=true;room=null;camera=[0,1.7,13];target=[0,1.8,-14];doorOpen=0;doorComplete=false;doorMotion=null;lobby=[0,1.7,5];lobbyTarget=[0,1.8,-14];lastTime=performance.now();cancelAnimationFrame(frame);document.body.classList.add('travelling');setDoor(1,()=>moveTo([0,1.7,11.5],lobbyTarget,()=>moveTo(lobby,lobbyTarget,()=>setDoor(0))));frame=requestAnimationFrame(loop);return true;}
 function hide(){doorMotion=null;drag=null;orbit=null;enabled=false;cancelAnimationFrame(frame);transition=null;room=null;keys.clear();document.body.classList.remove('travelling');}
 function enterRoom(n,done){if(!gl){done();return;}const s=shops[n-1];if(!room){lobby=[...camera];lobbyTarget=[...target];}room=n;orbit=null;
  // Walk into the doorway first, then turn toward the workshop's presentation wall.
  const side=Math.sign(s.x);const door=side?[side*2.8,1.7,s.z]:[0,1.7,-20];const wall=side?[side*9.7,2.2,s.z]:[0,2.2,-26.7];const inside=side?[side*6,1.7,s.z]:[0,1.7,-23.3];
  moveTo(door,wall,()=>moveTo(inside,n===6?[-8.4,1.2,5]:wall,done));
 }
 function back(done){if(!gl){if(done)done();return;}const previous=room;room=null;orbit=null;if(previous){const s=shops[previous-1],side=Math.sign(s.x);const door=side?[side*2.8,1.7,s.z]:[0,1.7,-20];moveTo(door,lobbyTarget,()=>moveTo(lobby,lobbyTarget,done));}else moveTo(lobby,lobbyTarget,done);}


 function walkToPoint(clientX,clientY){
  if(!enabled||transition||doorMotion||(room&&room!==6))return;
  const rect=canvas.getBoundingClientRect(),b=basis();
  const nx=((clientX-rect.left)/width*2-1)*aspect/focal,ny=(1-(clientY-rect.top)/height*2)/focal;
  const ray=norm(b.forward.map((v,i)=>v+b.right[i]*nx+b.up[i]*ny));
  const distance=ray[1]<-.035?Math.min(35,-camera[1]/ray[1]):6;
  const hit=camera.map((v,i)=>v+ray[i]*distance),gallery=room===6;
  const position=[Math.max(gallery?-7.3:-3,Math.min(gallery?-4.8:3,hit[0])),1.7,Math.max(gallery?1.3:-18,Math.min(gallery?8.7:7,hit[2]))];
  if(!gallery&&position[0]>1.1&&[-8.5,-17.5].some(z=>Math.abs(position[2]-z)<1.4))position[0]=.8;
  if(Math.hypot(position[0]-camera[0],position[2]-camera[2])<.12)return;
  const view=sub(target,camera),lookAt=position.map((v,i)=>v+view[i]);orbit=null;
  document.getElementById('world-status').textContent='Walking to the selected spot...';
  moveTo(position,lookAt,()=>{if(!gallery){lobby=[...camera];lobbyTarget=[...target];}document.getElementById('world-status').textContent='Drag to look around. Click a spot to walk, or select a room sign.';});
 }

 function look(dx,dy){
  if(!enabled||transition||doorMotion||(room&&room!==6))return;
  if(orbit){
   orbit.yaw-=dx*.005;orbit.pitch=Math.max(-.15,Math.min(.75,orbit.pitch+dy*.004));
   camera=[orbit.center[0]+Math.cos(orbit.yaw)*1.25,orbit.center[1]+Math.sin(orbit.pitch)*1.8,orbit.center[2]+Math.sin(orbit.yaw)*1.25];target=[...orbit.center];
  }else{
   const d=sub(target,camera),yaw=Math.atan2(d[0],-d[2])-dx*.004,pitch=Math.max(-.75,Math.min(.75,Math.atan2(d[1],Math.hypot(d[0],d[2]))+dy*.004));
   target=[camera[0]+Math.sin(yaw)*Math.cos(pitch)*10,camera[1]+Math.sin(pitch)*10,camera[2]-Math.cos(yaw)*Math.cos(pitch)*10];
   if(!room){lobby=[...camera];lobbyTarget=[...target];}
  }
 }
 function focusCar(index){
  if(room!==6||!enabled||transition)return;
  const center=[-8.4,1.12,2+index*1.5];
  orbit={center,yaw:0,pitch:.3};
  moveTo([center[0]+1.25,center[1]+.53,center[2]],center);
 }
 function resetGallery(){if(room!==6||transition)return;orbit=null;moveTo([-6,1.7,5],[-8.4,1.2,5]);}
 function bind(){
  canvas.addEventListener('pointerdown',e=>{
   if(!enabled||transition||doorMotion||(room&&room!==6)||e.button>0)return;
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};suppressClick=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
  });
  canvas.addEventListener('pointermove',e=>{
   if(drag&&e.pointerId===drag.id){
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;
    if(drag.moved)look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;
   }else canvas.style.cursor='grab';
  });
  const stopDrag=()=>{if(drag)suppressClick=drag.moved;drag=null;canvas.style.cursor='grab';};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stopDrag);
  canvas.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}walkToPoint(e.clientX,e.clientY);});
  document.getElementById('gallery-reset-view').addEventListener('click',resetGallery);
  document.addEventListener('keydown',e=>{if(!enabled||(room&&room!==6)||transition||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
   if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)){e.preventDefault();look(e.key==='ArrowLeft'||e.key==='a'?-25:25,0);return;}
   if(room)return;const direction={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back'}[e.key];if(direction){e.preventDefault();keys.add(direction)}});
  document.addEventListener('keyup',e=>{const direction={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back'}[e.key];if(direction)keys.delete(direction)});
  window.addEventListener('blur',()=>keys.clear());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();hide();gl=null;fallback();});
 }
 function exitBuilding(done){
  if(!enabled||!gl){done();return;}
  const headOut=()=>moveTo([0,1.7,8],[0,1.8,18],()=>setDoor(1,()=>moveTo([0,1.7,15],[0,1.8,25],()=>setDoor(0,done))));
  if(room){const s=shops[room-1],side=Math.sign(s.x);room=null;orbit=null;moveTo(side?[side*2.8,1.7,s.z]:[0,1.7,-20],[0,1.8,10],headOut);}else headOut();
 }
 bind();return {show,hide,enterRoom,back,focusCar,resetGallery,exitBuilding};
})();
