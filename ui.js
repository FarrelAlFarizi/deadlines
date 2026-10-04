const $=s=>document.querySelector(s);
const hr=$('.hr'),st=$('#st'),sub=$('#sub');
if(hr&&sub){
 if(st)sub.after(st);
 const menu=document.createElement('div');menu.id='menu';menu.hidden=true;
 const mb=document.createElement('button');mb.id='mb';mb.type='button';
 mb.setAttribute('aria-label','Menu');mb.setAttribute('aria-expanded','false');
 mb.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
 [...hr.querySelectorAll('button')].forEach(b=>{if(b.id!=='cal')menu.append(b)});
 hr.append(mb,menu);
 const close=()=>{menu.hidden=true;mb.setAttribute('aria-expanded','false')};
 mb.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;mb.setAttribute('aria-expanded',String(!menu.hidden))};
 menu.onclick=close;
 document.addEventListener('click',e=>{if(!menu.contains(e.target))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
}
