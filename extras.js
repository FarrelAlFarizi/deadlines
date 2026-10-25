import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
window.dlReady=false;
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
const ready=()=>{window.dlReady=true;document.dispatchEvent(new Event('dlcfg'))};
setTimeout(()=>{if(window.dlReady===false)ready()},8000);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hue=id=>[...String(id)].reduce((a,c)=>a+c.charCodeAt(0),0)*47%360;
const p2=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const DN={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0};
const TYPES=['Assignment','Quiz','Exam','Project'],DEF={Assignment:[1440,180],Quiz:[1440,60],Exam:[10080,4320,1440],Project:[10080,2880,1440]};
let uid,courses=[],cfg={},subs=[];
const view=()=>$('#tabs .on')?.dataset.v||'agenda';
const cls=document.createElement('div');cls.id='cls';
const flt=document.createElement('div');flt.id='flt';
flt.innerHTML=`<input id="q" type="search" placeholder="Search tasks" aria-label="Search tasks"><select id="ft" aria-label="Filter by type"><option value="">All types<option>Assignment<option>Quiz<option>Exam<option>Project</select>`;
$('#list').before(cls,flt);
const nm=document.createElement('div');nm.id='nm';nm.className='empty';nm.hidden=true;nm.textContent='No matching tasks';flt.after(nm);
function occs(a,b,list=courses){
 const out=[],A=dstr(a),B=dstr(b);
 for(const c of list){
  if(c.deleted)continue;
  if(!(c.day&&c.start&&c.end&&c.until))continue;
  const ov=c.ov||{};
  for(let d=new Date(a.getTime()-14*864e5);dstr(d)<=c.until&&d<=new Date(b.getTime()+14*864e5);d.setDate(d.getDate()+1)){
   if(d.getDay()!==DN[c.day])continue;
   const k=dstr(d),o=ov[k],mv=o?.mode==='move';
   const e={k,date:mv?(o.date||k):k,start:mv?(o.start||c.start):c.start,end:mv?(o.end||c.end):c.end,room:(mv&&o.room)||c.room,x:o?.mode==='cancel',mv};
   if(e.date>=A&&e.date<=B)out.push({c,...e});
  }
 }
 return out.sort((x,y)=>(x.date+x.start).localeCompare(y.date+y.start));
}
function drawCls(){
 const v=view();cls.innerHTML='';
 if(!uid||(v!=='today'&&v!=='week'))return;
 const a=new Date();a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+(v==='today'?0:6));
 const o=occs(a,b);if(!o.length)return;
 const day=d=>new Date(d+'T00:00').toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'});
 cls.innerHTML=`<h2>${v==='today'?'Classes today':'Classes this week'}</h2>`+o.map(e=>`<div class="c${e.x?' x':''}" data-c="${e.c.id}" style="--h:${hue(e.c.id)}"><time>${v==='week'?day(e.date)+'<br>':''}${e.start} to ${e.end}</time><div><b>${esc(e.c.name)}</b><small>${esc([e.room,e.mv&&'Changed',e.x&&'Cancelled'].filter(Boolean).join(', '))}</small></div></div>`).join('');
}
window.dlOccs=occs;
/* Search lives behind a header icon; while a search or type filter is active the agenda shows matching tasks only */
const SRCH='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
const sb2=document.createElement('button');sb2.id='srch';sb2.type='button';sb2.className='ib';sb2.innerHTML=SRCH;sb2.setAttribute('aria-label','Search tasks');sb2.setAttribute('aria-expanded','false');sb2.setAttribute('aria-controls','flt');
$('.hr').prepend(sb2);
let sOpen=false;
const setSearch=o=>{sOpen=o;sb2.setAttribute('aria-expanded',String(o));if(!o){$('#q').value='';$('#ft').value=''}apply();if(o)$('#q').focus();else sb2.focus()};
sb2.onclick=()=>setSearch(!sOpen);
const pendT=new Map(),pendC=new Map();
const apply=()=>{
 const q=$('#q').value.toLowerCase(),t=$('#ft').value;
 document.querySelectorAll('#list .t[data-id]').forEach(li=>{li.hidden=pendT.has(li.dataset.id)||!!((t&&li.dataset.type!==t)||(q&&!li.textContent.toLowerCase().includes(q)))});
 document.querySelectorAll('#list .t[data-c]').forEach(li=>{li.hidden=pendC.has(li.dataset.c)});
 const all=[...document.querySelectorAll('#list .t[data-id]')];
 nm.hidden=!(all.length&&(q||t)&&all.every(li=>li.hidden)&&all.some(li=>!pendT.has(li.dataset.id)));
 const act=!!(q||t);flt.hidden=view()!=='agenda'||!(sOpen||act);sb2.hidden=view()!=='agenda';document.body.classList.toggle('searching',act&&view()==='agenda');
};
$('#q').oninput=apply;$('#ft').onchange=apply;
$('#q').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setSearch(false)}});
new MutationObserver(()=>{apply();drawCls()}).observe($('#list'),{childList:true});
setInterval(drawCls,6e4);
const H=40,MAXD=28,LAB={cls:'Classes'};
const fmt=m=>m===0?'At due':[Math.floor(m/1440)&&Math.floor(m/1440)+'d',Math.floor(m%1440/60)&&Math.floor(m%1440/60)+'h',m%60&&m%60+'m'].filter(Boolean).join(' ');
const sb=document.createElement('button');sb.className='lnk';sb.textContent='Settings';
$('.hr').insertBefore(sb,$('#out'));
const dlg=document.createElement('dialog');
dlg.innerHTML=`<form><h2>Reminders</h2><p><small>Google Calendar alerts you this long before a due time or class start. Tap a time to change it.</small></p><div id="rl"></div><div class="act"><span></span><button type="button" class="lnk" id="sx">Close</button><button class="pri">Save</button></div></form>`;
const pk=document.createElement('dialog');
pk.innerHTML=`<form id="pf"><h2>Time before</h2><div class="ws"></div><p id="pe" role="alert"></p><div class="act"><button type="button" class="lnk dng" id="prm">Remove</button><span></span><button type="button" class="lnk" id="pc">Cancel</button><button class="pri">Done</button></div></form>`;
document.body.append(dlg,pk);
let draft={},pick=null;
const render=()=>{$('#rl').innerHTML=[...TYPES,'cls'].map(k=>{const a=draft[k],max=k==='cls'?3:5;return `<div class="rg"><b>${LAB[k]||k}</b>${a.map((m,i)=>`<button type="button" class="chip" data-k="${k}" data-i="${i}">${fmt(m)}</button>`).join('')}${a.length<max?`<button type="button" class="chip add" data-k="${k}">+ Add</button>`:''}</div>`}).join('')};
const val=w=>Math.min(Math.round(w.scrollTop/H),w.children.length-1);
/* Each wheel is a spin button for screen readers and keyboards: it announces "3 days" and arrow keys change it */
const UNIT={days:['day','days'],hours:['hour','hours'],min:['minute','minutes']};
const mark=(w,v=val(w))=>{w.querySelector('.on')?.classList.remove('on');w.children[v].classList.add('on');w.setAttribute('aria-valuenow',v);w.setAttribute('aria-valuetext',v+' '+UNIT[w.dataset.u][v===1?0:1])};
const now=w=>+w.getAttribute('aria-valuenow');
function attachWheel(w){
 let acc=0,tgt=null,t;
 const step=dir=>{
  const i=Math.max(0,Math.min(w.children.length-1,(tgt??now(w))+dir));
  tgt=i;mark(w,i);w.scrollTo({top:i*H,behavior:'smooth'});
  clearTimeout(t);t=setTimeout(()=>{tgt=null},300);
 };
 w.addEventListener('keydown',e=>{
  const n=w.children.length-1,d={ArrowUp:1,ArrowDown:-1,PageUp:5,PageDown:-5}[e.key];
  if(d){e.preventDefault();step(d)}
  else if(e.key==='Home'||e.key==='End'){e.preventDefault();step((e.key==='Home'?0:n)-(tgt??now(w)))}
 });
 w.addEventListener('wheel',e=>{
  e.preventDefault();
  const d=e.deltaMode===1?e.deltaY*16:e.deltaY;
  if(!d)return;
  if(Math.abs(d)>=50){acc=0;step(Math.sign(d));return}
  acc+=d;
  if(Math.abs(acc)>=40){step(Math.sign(acc));acc=0}
 },{passive:false});
}
const ws=pk.querySelector('.ws');
const W=[['days',MAXD+1],['hours',24],['min',60]].map(([l,n])=>{
 const c=document.createElement('div');c.className='wc';
 c.innerHTML=`<div class="wl" aria-hidden="true">${l}</div><div class="wh" tabindex="0" role="spinbutton" data-u="${l}" aria-label="${UNIT[l][1][0].toUpperCase()+UNIT[l][1].slice(1)}" aria-valuemin="0" aria-valuemax="${n-1}" aria-valuenow="0">${Array.from({length:n},(_,i)=>`<div data-i="${i}" aria-hidden="true">${i}</div>`).join('')}</div>`;
 ws.append(c);const w=c.querySelector('.wh');
 w.onscroll=()=>mark(w);attachWheel(w);
 w.onclick=e=>{const i=e.target.dataset.i;if(i!=null)w.scrollTo({top:i*H,behavior:'smooth'})};
 return w;
});
function openPick(k,i){
 pick={k,i};const m=i==null?60:draft[k][i];
 $('#pe').textContent='';$('#prm').hidden=i==null;
 pk.showModal();
 const vs=[Math.floor(m/1440),Math.floor(m%1440/60),m%60];vs.forEach((v,j)=>mark(W[j],v));
 requestAnimationFrame(()=>vs.forEach((v,j)=>{W[j].scrollTop=v*H;mark(W[j])}));
}
$('#rl').onclick=e=>{const b=e.target.closest('.chip');if(b)openPick(b.dataset.k,b.dataset.i===undefined?null:+b.dataset.i)};
$('#pf').onsubmit=e=>{
 e.preventDefault();
 const v=w=>+w.getAttribute('aria-valuenow'),m=v(W[0])*1440+v(W[1])*60+v(W[2]);
 if(m>MAXD*1440){$('#pe').textContent='The longest allowed is 28 days.';return}
 const a=draft[pick.k];if(pick.i==null)a.push(m);else a[pick.i]=m;
 draft[pick.k]=[...new Set(a)].sort((x,y)=>y-x);pk.close();render();
};
$('#prm').onclick=()=>{draft[pick.k].splice(pick.i,1);pk.close();render()};
$('#pc').onclick=()=>pk.close();
sb.onclick=()=>{draft={};TYPES.forEach(t=>{draft[t]=[...(cfg.rem?.[t]||DEF[t])]});draft.cls=[...(cfg.cls||[30])];render();dlg.showModal()};
$('#sx').onclick=()=>dlg.close();
dlg.querySelector('form').onsubmit=e=>{
 e.preventDefault();const rem={};
 TYPES.forEach(t=>{rem[t]=draft[t]});
 setDoc(doc(db,`users/${uid}/meta/settings`),{rem,cls:draft.cls}).catch(er=>{console.error(er);toast('Could not save. Check your connection and try again.')});
 dlg.close();
};
onAuthStateChanged(auth,u=>{
 subs.forEach(x=>x());subs=[];uid=u?.uid;courses=[];cfg={};drawCls();
 if(!u)return;
 window.dlReady=false;
 subs=[onSnapshot(collection(db,`users/${uid}/courses`),s=>{courses=s.docs.map(d=>({id:d.id,...d.data()})).filter(c=>!c.deleted);drawCls()}),
  onSnapshot(doc(db,`users/${uid}/meta/settings`),s=>{cfg=s.data()||{};window.dlRem=cfg.rem;window.dlClsRem=cfg.cls;ready()},()=>ready())];
});

const tt=document.createElement('div');tt.id='toast';tt.setAttribute('role','status');document.body.append(tt);
let tm;
const hideT=()=>tt.classList.remove('show');
/* Over an open page or dialog the toast moves into it, so Undo stays visible and tappable */
function toast(msg,undo,ms=5000,plain){
 clearTimeout(tm);tt.innerHTML='';
 const top=[...document.querySelectorAll('dialog[open]:not(.closing)')].pop()||document.body;if(tt.parentNode!==top)top.append(tt);tt.classList.toggle('indlg',top!==document.body);
 const s=document.createElement('span');s.textContent=msg;tt.append(s);
 const add=(label,fn,keep)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(!keep){hideT();clearTimeout(tm)}fn()};tt.append(b)};
 if(undo)add('Undo',undo);
 const c=$('#cal');
 if(undo&&!plain&&c&&(c.dataset.s==='wait'||c.dataset.s==='idle'))add('Reconnect',()=>c.click(),true);
 tt.classList.add('show');tm=setTimeout(hideT,ms);
}
window.dlNote=m=>toast(m,null,8000);
window.dlToast=(m,undo)=>toast(m,undo,undo?6000:5000,true);
const wr=(n,id,data)=>setDoc(doc(db,`users/${uid}/${n}/${id}`),data,{merge:true}).catch(er=>{console.error(er);toast('Could not save. Check your connection and try again.')});
const later=(map,n,id,msg,data)=>{
 const commit=()=>{const p=map.get(id);if(!p)return;clearTimeout(p.t);map.delete(id);wr(n,id,{...data,updatedAt:Date.now()})};
 map.set(id,{t:setTimeout(commit,6000),commit});apply();
 toast(msg,()=>{const p=map.get(id);if(p)clearTimeout(p.t);map.delete(id);apply()});
};
$('#list').addEventListener('click',e=>{
 const b=e.target.closest('[data-k]');if(!b)return;
 const prev=b.closest('li').classList.contains('fin'),id=b.dataset.k;
 toast(prev?'Marked not done':'Marked done',()=>wr('tasks',id,{done:prev,doneAt:prev?Date.now():0,updatedAt:Date.now()}));
},true);
$('#td').addEventListener('click',e=>{
 if(!e.target.closest('#tdel')||!window.dlEdit)return;
 e.stopPropagation();e.preventDefault();const id=window.dlEdit,one=()=>{$('#td').close();later(pendT,'tasks',id,'Task deleted',{deleted:true})};
 if(!window.dlTaskDel?.(id,one))one();
},true);
$('#cd').addEventListener('click',e=>{
 if(!e.target.closest('#cdel')||!window.dlEditC)return;
 e.stopPropagation();e.preventDefault();const id=window.dlEditC;$('#cd').close();later(pendC,'courses',id,window.dlMatCount&&window.dlMatCount(id)?'Course and its materials deleted':'Course deleted',{day:'',deleted:true});
},true);
addEventListener('pagehide',()=>{[...pendT.values(),...pendC.values()].forEach(p=>p.commit())});

const cerr=document.createElement('p');cerr.id='cerr';cerr.className='ferr';cerr.setAttribute('role','alert');
$('#cd .act').before(cerr);
$('#cd').addEventListener('submit',e=>{
 const f=$('#cf');cerr.textContent='';if(!f.day.value)return;
 const s=f.start.value,en=f.end.value,u=f.until.value;
 const m=!s||!en||!u?'For a weekly class, fill in Starts, Ends and Repeats until.':en<=s?'The class must end after it starts.':'';
 if(m){e.preventDefault();e.stopImmediatePropagation();cerr.textContent=m}
},true);
$('#cd').addEventListener('input',()=>{cerr.textContent=''});
$('#cd').addEventListener('close',()=>{cerr.textContent=''});

window.dlBulkDelete=(kind,ids)=>{
 const map=kind==='courses'?pendC:pendT,data=kind==='courses'?{day:'',deleted:true}:{deleted:true};
 for(const id of ids){
  const commit=()=>{const p=map.get(id);if(!p)return;clearTimeout(p.t);map.delete(id);wr(kind,id,{...data,updatedAt:Date.now()})};
  const old=map.get(id);if(old)clearTimeout(old.t);
  map.set(id,{t:setTimeout(commit,6000),commit});
 }
 apply();
 toast(`${ids.length} ${kind==='courses'?'course':'task'}${ids.length>1?'s':''} deleted`,()=>{for(const id of ids){const p=map.get(id);if(p)clearTimeout(p.t);map.delete(id)}apply()});
};
