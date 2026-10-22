export class Game {
  constructor(canvas,onChange){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onChange=onChange;this.state='menu';this.muted=false;this.audio=null;
    this.aim={x:.5,y:.5};this.handAim={x:.5,y:.5};this.handControl=true;this.handVisible=false;this.assistEnabled=true;
    this.resize=()=>{const r=canvas.getBoundingClientRect();const oldW=this.w,oldH=this.h;this.w=r.width;this.h=r.height;if(oldW&&oldH)for(const e of this.enemies){e.x*=this.w/oldW;e.y*=this.h/oldH;}const d=Math.min(devicePixelRatio||1,2);canvas.width=this.w*d;canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);};
    this.reset();this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);this.resize();this.last=performance.now();requestAnimationFrame(t=>this.loop(t));
  }
  reset(){this.score=0;this.health=100;this.time=90;this.ammo=12;this.shots=0;this.hits=0;this.elapsed=0;this.spawn=.5;this.reloadTime=0;this.shieldTime=0;this.shieldCooldown=0;this.fireCooldown=0;this.handCooldowns=new Map();this.flash=0;this.enemies=[];this.particles=[];this.lockedTarget=null;this.notify();}
  notify(){this.onChange?.(this);}
  start(){this.reset();this.state='playing';this.notify();}
  setState(state){this.state=state;this.notify();}
  unlockAudio(){try{this.audio??=new(window.AudioContext||window.webkitAudioContext)();this.audio.resume().catch(()=>{});}catch{}}
  sound(f=650){if(this.muted||!this.audio)return;const now=this.audio.currentTime,o=this.audio.createOscillator(),g=this.audio.createGain();o.type='triangle';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(60,now+.12);g.gain.setValueAtTime(.07,now);g.gain.exponentialRampToValueAtTime(.001,now+.12);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(now+.12);}
  updateAim(){
    if(!this.handControl)return;if(!this.handVisible){this.lockedTarget=null;return;}
    if(!this.assistEnabled){this.lockedTarget=null;this.aim={...this.handAim};return;}
    const cost=e=>Math.hypot(this.handAim.x-e.x/this.w,.15*(this.handAim.y-e.y/this.h));
    let nearest=null,best=Infinity;for(const e of this.enemies){const d=cost(e);if(d<best){nearest=e;best=d;}}
    const current=this.enemies.includes(this.lockedTarget)?this.lockedTarget:null;if(current&&cost(current)<=best+.035)nearest=current;
    this.lockedTarget=nearest;this.aim=nearest?{x:nearest.x/this.w,y:nearest.y/this.h}:{...this.handAim};
  }
  targetAt(x,y){for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i],a=Math.sin(this.elapsed+e.phase)*.2,dx=x-e.x,dy=y-e.y,lx=Math.abs(dx*Math.cos(a)+dy*Math.sin(a)),ly=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));if(ly<=Math.sqrt(3)*e.r/2&&Math.sqrt(3)*lx+ly<=Math.sqrt(3)*e.r)return e;}return null;}
  burst(x,y,color,n){for(let i=0;i<n&&this.particles.length<160;i++){const a=Math.random()*6.28,s=50+Math.random()*180;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.65,color});}}
  shoot(handId=null){const cooldown=handId===null?this.fireCooldown:(this.handCooldowns.get(handId)||0);if(this.state!=='playing'||this.reloadTime>0||cooldown>0)return false;this.updateAim();if(!this.ammo){this.sound(90);return false;}this.ammo--;this.shots++;if(handId===null)this.fireCooldown=.18;else this.handCooldowns.set(handId,.18);this.flash=.10;this.sound(700);const x=this.aim.x*this.w,y=this.aim.y*this.h,target=this.targetAt(x,y);if(target){this.enemies.splice(this.enemies.indexOf(target),1);this.hits++;this.score+=100+Math.floor(this.elapsed/15)*25;this.burst(target.x,target.y,'#52e4ef',18);}else this.burst(x,y,'#ff5574',5);this.notify();return true;}
  reload(){if(this.state==='playing'&&!this.reloadTime&&this.ammo<12){this.reloadTime=.65;this.sound(250);this.notify();}}
  shield(){if(this.state==='playing'&&!this.shieldCooldown){this.shieldTime=3;this.shieldCooldown=8;this.sound(400);this.notify();}}
  update(dt){
    for(const [id,value]of this.handCooldowns)this.handCooldowns.set(id,Math.max(0,value-dt));
    this.elapsed+=dt;this.time=Math.max(0,this.time-dt);this.fireCooldown=Math.max(0,this.fireCooldown-dt);this.flash=Math.max(0,this.flash-dt);this.shieldTime=Math.max(0,this.shieldTime-dt);this.shieldCooldown=Math.max(0,this.shieldCooldown-dt);
    if(this.reloadTime){this.reloadTime=Math.max(0,this.reloadTime-dt);if(!this.reloadTime)this.ammo=12;}
    this.spawn-=dt;if(this.spawn<=0&&this.enemies.length<16){const r=22+Math.random()*9;this.enemies.push({x:r+Math.random()*(this.w-r*2),y:90+r,r,speed:23+this.elapsed*.65+Math.random()*18,phase:Math.random()*6.28});this.spawn=Math.max(.38,1.2-this.elapsed*.009);}
    for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];e.y+=e.speed*dt;e.x=Math.max(e.r,Math.min(this.w-e.r,e.x+Math.sin(this.elapsed*2+e.phase)*25*dt));if(e.y>this.h-30-e.r){this.enemies.splice(i,1);this.burst(e.x,e.y,this.shieldTime?'#52e4ef':'#ff5574',10);if(!this.shieldTime){this.health=Math.max(0,this.health-20);this.sound(100);}}}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)this.particles.splice(i,1);}
    this.updateAim();if(!this.health||!this.time)this.state='gameover';this.notify();
  }
  loop(now){const dt=Math.min((now-this.last)/1000,.05);this.last=now;if(this.state==='playing')this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t));}
  draw(){
    const c=this.ctx,w=this.w,h=this.h;if(!w||!h)return;c.fillStyle='#080f1c';c.fillRect(0,0,w,h);c.strokeStyle='#19304666';c.lineWidth=1;c.beginPath();for(let x=0;x<w;x+=45){c.moveTo(x,0);c.lineTo(x,h);}for(let y=0;y<h;y+=45){c.moveTo(0,y);c.lineTo(w,y);}c.stroke();
    c.strokeStyle=this.shieldTime?'#52e4ef':'#ff557466';c.lineWidth=this.shieldTime?4:1;c.beginPath();c.moveTo(0,h-30);c.lineTo(w,h-30);c.stroke();
    for(const e of this.enemies){c.save();c.translate(e.x,e.y);c.rotate(Math.sin(this.elapsed+e.phase)*.2);c.shadowColor='#ff5574';c.shadowBlur=16;c.fillStyle='#3b192d';c.strokeStyle=e===this.lockedTarget?'#9dffaf':'#ff5574';c.lineWidth=e===this.lockedTarget?3:2;c.beginPath();for(let i=0;i<6;i++)c.lineTo(Math.cos(i*Math.PI/3)*e.r,Math.sin(i*Math.PI/3)*e.r);c.closePath();c.fill();c.stroke();c.shadowBlur=0;c.fillStyle='#ff8299';c.fillRect(-e.r*.5,-3,e.r,6);c.fillStyle='#fff';c.fillRect(-3,-3,6,6);c.restore();}
    for(const p of this.particles){c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,3,3);}c.globalAlpha=1;
    if(this.state==='playing'){const x=this.aim.x*w,y=this.aim.y*h;c.save();c.translate(x,y);c.strokeStyle=this.flash?'#fff':this.targetAt(x,y)?'#9dffaf':'#52e4ef';c.shadowColor=c.strokeStyle;c.shadowBlur=12;c.lineWidth=2;c.beginPath();c.arc(0,0,this.flash?22:15,0,Math.PI*2);for(let i=0;i<4;i++){const a=i*Math.PI/2;c.moveTo(Math.cos(a)*20,Math.sin(a)*20);c.lineTo(Math.cos(a)*28,Math.sin(a)*28);}c.stroke();c.fillStyle=c.strokeStyle;c.fillRect(-2,-2,4,4);c.restore();}
  }
}
