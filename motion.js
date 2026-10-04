const $=s=>document.querySelector(s);
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Sliding highlight behind the tab bar */
const bar=$('#tabs div');
if(bar){
 const pill=document.createElement('span');pill.id='pill';bar.prepend(pill);
 let placed=false;
 const place=instant=>{
  const on=bar.querySelector('.on');if(!on||!on.offsetWidth)return;
  const x=on.offsetLeft+4,w=on.offsetWidth-8,still=instant||!placed;
  if(still)pill.style.transition='none';
  pill.style.width=w+'px';pill.style.transform=`translateX(${x}px)`;
  if(still){pill.offsetWidth;pill.style.transition=''}
  else if(!calm&&pill.animate)pill.animate([{scale:'1 1'},{scale:'1.08 .9',offset:.4},{scale:'1 1'}],{duration:480,easing:'ease-out'});
  placed=true;
 };
 new MutationObserver(()=>place()).observe(bar,{attributes:true,subtree:true,attributeFilter:['class']});
 addEventListener('resize',()=>place(true));
 place();
}

/* The + button spins when tapped */
const fab=$('#fab');
if(fab&&!calm)fab.addEventListener('click',()=>fab.animate?.([{transform:'rotate(0deg) scale(1)'},{transform:'rotate(120deg) scale(1.15)',offset:.5},{transform:'rotate(180deg) scale(1)'}],{duration:480,easing:'cubic-bezier(.2,1,.3,1)'}));

/* Animated dropdown replacing the native type filter */
const sel=$('#ft');
if(sel){
 const wrap=document.createElement('div');wrap.id='dd';
 const b=document.createElement('button');b.type='button';b.id='ddb';b.setAttribute('aria-haspopup','listbox');b.setAttribute('aria-expanded','false');
 const l=document.createElement('div');l.id='ddl';l.hidden=true;l.setAttribute('role','listbox');
 sel.replaceWith(wrap);sel.classList.add('sr');sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');wrap.append(b,l,sel);
 const lab=()=>{
  b.innerHTML=`<span>${sel.selectedOptions[0].text}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  l.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.v===sel.value));
 };
 const shut=()=>{if(l.hidden)return;l.classList.add('out');b.setAttribute('aria-expanded','false');setTimeout(()=>{l.hidden=true;l.classList.remove('out')},160)};
 [...sel.options].forEach(o=>{
  const x=document.createElement('button');x.type='button';x.setAttribute('role','option');x.dataset.v=o.value;x.textContent=o.text;
  x.onclick=()=>{sel.value=o.value;sel.dispatchEvent(new Event('change'));lab();shut()};
  l.append(x);
 });
 b.onclick=()=>{if(l.hidden){l.hidden=false;b.setAttribute('aria-expanded','true')}else shut()};
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))shut()},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
 lab();
}
