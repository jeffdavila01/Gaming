renderBuilding();
setupEntrance();
let step=0;
function showStep(){
 const [title,copy,type]=steps[step];
 document.getElementById('step-count').textContent=`STEP 0${step+1} / 04`;
 document.getElementById('step-title').textContent=title;
 document.getElementById('step-copy').textContent=copy;
 document.getElementById('step-art').innerHTML=`<div class="tutorial-photo scene-${type}" role="img" aria-label="Construction photograph: ${title}"></div>`;
 document.querySelector('.step-dots').innerHTML=steps.map((_,i)=>`<span class="${i===step?'current':''}"></span>`).join('');
 document.getElementById('previous-step').disabled=step===0;
 document.getElementById('next-step').disabled=step===3;
}
document.getElementById('previous-step').addEventListener('click',()=>{step=Math.max(0,step-1);showStep()});
document.getElementById('next-step').addEventListener('click',()=>{step=Math.min(3,step+1);showStep()});
showStep();setupAnimations();
if(matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches){
 document.addEventListener('pointermove',e=>{document.querySelector('.sky').style.transform=`translate(${(e.clientX/innerWidth-.5)*-8}px,${(e.clientY/innerHeight-.5)*-5}px) scale(1.03)`;});
}

document.querySelectorAll('.gallery-choice').forEach(button=>{
 button.addEventListener('click',()=>{
  const index=Number(button.dataset.car),car=galleryCars[index];
  WorkshopWorld.focusCar(index);
  document.querySelectorAll('.gallery-choice').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));
  document.getElementById('gallery-car-name').textContent=car.name;
  document.getElementById('gallery-car-number').textContent=String(index+1).padStart(2,'0');
  document.getElementById('gallery-car-copy').textContent=car.detail;
  const image=document.getElementById('gallery-car-image');image.src=`assets/images/gallery-${index+1}.svg`;image.style.filter="none";image.alt=`${car.name}, ${car.wheels}-wheel balloon-powered straw car`;
 });
});

// Align the entrance controls with the full-screen cover image.
function fitExterior(){
 const scene=document.querySelector('.architecture');
 const rect=scene.getBoundingClientRect();
 const width=Math.max(rect.width,rect.height*1.5);
 scene.style.setProperty('--exterior-width',`${width}px`);
 scene.style.setProperty('--exterior-height',`${width/1.5}px`);
}
new ResizeObserver(fitExterior).observe(document.querySelector('.architecture'));
fitExterior();
