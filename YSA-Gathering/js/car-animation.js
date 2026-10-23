let demoTimer, raceFrame, raceRunning=false;
function setupAnimations() {
 const demo=document.getElementById('mechanism-demo'), button=document.getElementById('play-demo'), status=document.getElementById('demo-status');
 button.addEventListener('click',()=>{
  clearTimeout(demoTimer); demo.classList.remove('playing'); void demo.offsetWidth; demo.classList.add('playing');
  button.disabled=true; status.textContent='Inflating the balloon?';
  demoTimer=setTimeout(()=>{status.textContent='Air escapes backward. The car moves forward!';},1800);
  setTimeout(()=>{demo.classList.remove('playing');button.disabled=false;status.textContent='Demonstration complete. Play again to explore action and reaction.';},5200);
 });
 const track=document.getElementById('race-track'), distance=document.getElementById('distance'), start=document.getElementById('start-test'), testStatus=document.getElementById('test-status');
 function reset(){cancelAnimationFrame(raceFrame);raceRunning=false;track.style.setProperty('--progress',0);track.classList.remove('running');distance.value='0.00 m';start.disabled=false;testStatus.textContent='Ready at the starting line.';}
 start.addEventListener('click',()=>{
  if(raceRunning)return; reset(); raceRunning=true;start.disabled=true;track.classList.add('running');testStatus.textContent='Test running?';let began;
  function tick(time){began??=time;const t=Math.min((time-began)/4300,1), progress=1-Math.pow(1-t,2);track.style.setProperty('--progress',progress);distance.value=(progress*3.24).toFixed(2)+' m';if(t<1)raceFrame=requestAnimationFrame(tick);else{raceRunning=false;start.disabled=false;track.classList.remove('running');testStatus.textContent='Test complete: 3.24 m (simulated). Try your real car and measure its distance.';}}
  raceFrame=requestAnimationFrame(tick);
 });
 document.getElementById('reset-test').addEventListener('click',reset);
}
