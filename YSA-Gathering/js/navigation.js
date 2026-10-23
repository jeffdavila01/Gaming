let activeFloor = null;
let isInside = false;

function selectFloor(number) {
 if (!isInside) return;
 const next = activeFloor === number ? null : number;
 document.querySelectorAll('.floor').forEach(f => {
  const selected = Number(f.dataset.floor) === next;
  f.classList.toggle('selected', selected);
  f.querySelector('.floor-button').setAttribute('aria-expanded', String(selected));
  f.querySelector('.room').hidden = !selected;
 });
 activeFloor = next;
 document.body.classList.toggle('exploring', next !== null);
 document.body.classList.toggle('gallery-open', next === 6);
 if(next) {
  document.documentElement.style.setProperty('--lift', `${(next - 1) * 20}%`);
  document.documentElement.style.setProperty('--selected-color', floors[next-1].color);
  document.getElementById('world-status').textContent = `Entering Room ${next} - ${floors[next-1].name}`;
  WorkshopWorld.enterRoom(next,()=>{
   if (activeFloor !== next || !isInside) return;
   const room = document.getElementById(`room-${next}`);
   room.scrollTop = 0;
   room.querySelector(next === 6 ? '.back' : 'h2').focus({preventScroll:true});
   document.getElementById('world-status').textContent = `Inside Room ${next} - ${floors[next-1].name}`;
  });
 } else {
  WorkshopWorld.back(()=>{
   if(!isInside)return;
   document.querySelector(`[data-floor="${number}"] .floor-button`).focus({preventScroll:true});
   document.getElementById('world-status').textContent = 'Workshop hallway - Room 06 contains the five-car gallery';
  });
 }
}
function renderBuilding() {
 document.getElementById('floors').innerHTML = [...floors].reverse().map(f=>`<section class="floor" data-floor="${f.n}" style="--floor-color:${f.color};--level:${5-f.n}"><div class="floor-front" data-room="${f.n}"><span class="floor-index">0${f.n}</span><div class="interior" aria-hidden="true"><span class="ceiling-light"></span><span class="room-plant">?</span><span class="workbench"></span><span class="pendant"></span><span class="window-reflection"></span></div><button class="floor-button" aria-expanded="false" aria-controls="room-${f.n}"><span class="floor-icon">${f.n}</span><span><small>ROOM 0${f.n} / ${f.tag}</small><strong>${f.name}</strong></span><span class="arrow">&#8250;</span></button></div><div class="room" id="room-${f.n}" hidden><div class="room-topline"><span>THE MOTION WORKSHOP / ROOM 0${f.n}</span><button class="back">&#8592; Back to Rooms</button></div><h2 tabindex="-1">${f.title}</h2>${f.content}</div></section>`).join('');
 document.querySelectorAll('.floor').forEach(el=>{
  el.querySelector('.floor-button').addEventListener('click',()=>selectFloor(Number(el.dataset.floor)));
  el.querySelector('.back').addEventListener('click',()=>selectFloor(Number(el.dataset.floor)));
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(activeFloor) selectFloor(activeFloor);else if(isInside) leaveBuilding();}});
}

function enterBuilding() {
 if (isInside) return;
 isInside = true;
 document.body.classList.add('inside');
 document.getElementById('entry-panel').hidden = true;
 document.getElementById('inside-heading').hidden = false;
 document.getElementById('floors').inert = false;
 document.getElementById('location-label').textContent = 'INSIDE / THE WORKSHOP ARCADE';
 document.getElementById('world-help').hidden = false;
 document.getElementById('world-status').hidden = false;
 document.getElementById('world-status').textContent = 'Choose a workshop, or enter Room 06 for the five-car gallery';
 WorkshopWorld.show();
 document.querySelector('#inside-heading h1').setAttribute('tabindex','-1');
 document.querySelector('#inside-heading h1').focus({preventScroll:true});
}
function finishLeavingBuilding() {
 if (activeFloor) selectFloor(activeFloor);
 WorkshopWorld.hide();
 document.getElementById('world-help').hidden = true;
 document.getElementById('world-status').hidden = true;
 isInside = false;
 document.body.classList.remove('inside');
 document.getElementById('floors').inert = true;
 document.getElementById('inside-heading').hidden = true;
 document.getElementById('entry-panel').hidden = false;
 document.getElementById('location-label').textContent = 'WELCOME TO OUR YSA GATHERING';
 document.getElementById('open-building').focus({preventScroll:true});
 window.scrollTo({top:0,behavior:'instant'});
}
function setupEntrance() {
 document.getElementById('open-building').addEventListener('click', enterBuilding);
 document.getElementById('exit-building').addEventListener('click', leaveBuilding);
 document.querySelector('.brand').addEventListener('click', event=>{event.preventDefault();leaveBuilding();});
}

let leaving=false;
function leaveBuilding(){
 if(leaving||!isInside)return;
 leaving=true;
 document.body.classList.add('leaving-building');
 document.getElementById('world-status').textContent='Walking out through the glass entrance...';
 WorkshopWorld.exitBuilding(()=>{finishLeavingBuilding();leaving=false;document.body.classList.remove('leaving-building');});
}
