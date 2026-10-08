const $=s=>document.querySelector(s);
const list=$('#list'),ttl=$('#ttl');
if(list){
 let on=false,pick=new Set(),hold=0,skip=false,lastView='';
 const view=()=>$('#tabs .on')?.dataset.v||'today';
 const kind=()=>view()==='courses'?'courses':'tasks';
 const idOf=li=>li.dataset.id||li.dataset.c;
 const ITEM='.t[data-id],.t[data-c]';
 const items=()=>[...list.querySelectorAll(ITEM)].filter(li=>!li.hidden);
 const row=document.createElement('div');row.id='selrow';row.hidden=true;
 row.innerHTML='<button type="button" id="selbtn">Select</button>';
 list.before(row);
 const bar=document.createElement('div');bar.id='selbar';bar.hidden=true;
 bar.innerHTML='<span id="selcount"></span><button type="button" id="selall">All</button><button type="button" id="seldel">Delete</button><button type="button" id="selx">Cancel</button>';
 document.body.append(bar);
 const CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>';
 const paint=()=>{
  document.body.classList.toggle('selecting',on);
  for(const li of list.querySelectorAll(ITEM)){
   if(!li.querySelector('.sel')){const s=document.createElement('span');s.className='sel';s.innerHTML=CHK;li.append(s)}
   li.classList.toggle('picked',on&&pick.has(idOf(li)));
  }
  const n=pick.size;$('#selcount').textContent=n+' selected';$('#seldel').disabled=!n;
  bar.hidden=!on;row.hidden=on||!list.querySelector(ITEM);
 };
 const enter=id=>{on=true;if(id)pick.add(id);paint()};
 const exit=()=>{on=false;pick.clear();paint()};
 $('#selbtn').onclick=()=>enter();
 $('#selx').onclick=exit;
 $('#selall').onclick=()=>{const it=items(),all=it.length>0&&it.every(li=>pick.has(idOf(li)));it.forEach(li=>all?pick.delete(idOf(li)):pick.add(idOf(li)));paint()};
 $('#seldel').onclick=()=>{
  const vis=new Set(items().map(idOf)),ids=[...pick].filter(id=>vis.has(id));
  if(!ids.length)return;
  if(window.dlBulkDelete)window.dlBulkDelete(kind(),ids);
  exit();
 };
 list.addEventListener('click',e=>{
  const li=e.target.closest(ITEM);
  if(skip){skip=false;if(li){e.stopPropagation();e.preventDefault()}return}
  if(!on||!li)return;
  e.stopPropagation();e.preventDefault();
  const id=idOf(li);pick.has(id)?pick.delete(id):pick.add(id);paint();
 },true);
 list.addEventListener('pointerdown',e=>{
  const li=e.target.closest(ITEM);if(!li||on||e.target.closest('.chk'))return;
  clearTimeout(hold);
  hold=setTimeout(()=>{skip=true;setTimeout(()=>{skip=false},700);enter(idOf(li));if(navigator.vibrate)navigator.vibrate(15)},520);
 });
 for(const t of ['pointerup','pointercancel','pointerleave'])list.addEventListener(t,()=>clearTimeout(hold));
 new MutationObserver(paint).observe(list,{childList:true});
 if(ttl)new MutationObserver(()=>{const v=view();if(v!==lastView){lastView=v;if(on)exit();else paint()}}).observe(ttl,{childList:true,characterData:true,subtree:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&on)exit()});
 lastView=view();paint();
}
