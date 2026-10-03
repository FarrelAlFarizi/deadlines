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
const view=()=>$('#tabs .on')?.dataset.v||'today';
const cls=document.createElement('div');cls.id='cls';
const flt=document.createElement('div');flt.id='flt';
flt.innerHTML=`<input id="q" type="search" placeholder="Search tasks" aria-label="Search tasks"><select id="ft" aria-label="Filter by type"><option value="">All types<option>Assignment<option>Quiz<option>Exam<option>Project</select>`;
$('#list').before(cls,flt);
function occs(a,b){
 const out=[],A=dstr(a),B=dstr(b);
 for(const c of courses){
  if(!(c.day&&c.start&&c.end&&c.until))continue;
  const ov=c.ov||{};
  for(let d=new Date(a.getTime()-14*864e5);dstr(d)<=c.until&&d<=new Date(b.getTime()+14*864e5);d.setDate(d.getDate()+1)){
   if(d.getDay()!==DN[c.day])continue;
   const k=dstr(d),o=ov[k],mv=o?.mode==='move';
   const e={date:mv?(o.date||k):k,start:mv?(o.start||c.start):c.start,end:mv?(o.end||c.end):c.end,room:(mv&&o.room)||c.room,x:o?.mode==='cancel',mv};
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
 cls.innerHTML=`<h3>${v==='today'?'Classes today':'Classes this week'}</h3>`+o.map(e=>`<div class="c${e.x?' x':''}" style="--h:${hue(e.c.id)}"><time>${v==='week'?day(e.date)+'<br>':''}${e.start} to ${e.end}</time><div><b>${esc(e.c.name)}</b><small>${esc([e.room,e.mv&&'Changed',e.x&&'Cancelled'].filter(Boolean).join(', '))}</small></div></div>`).join('');
}
const apply=()=>{
 const q=$('#q').value.toLowerCase(),t=$('#ft').value;
 document.querySelectorAll('#list .t[data-id]').forEach(li=>{li.hidden=!!((t&&li.dataset.type!==t)||(q&&!li.textContent.toLowerCase().includes(q)))});
 flt.hidden=view()==='courses';
};
$('#q').oninput=apply;$('#ft').onchange=apply;
new MutationObserver(()=>{apply();drawCls()}).observe($('#list'),{childList:true});
setInterval(drawCls,6e4);
const parse=s=>[...String(s).matchAll(/(\d+)\s*(d|h|m)/gi)].map(m=>m[1]*({d:1440,h:60,m:1}[m[2].toLowerCase()])).filter(n=>n>0&&n<=40320).slice(0,5);
const fmt=a=>a.map(n=>n%1440===0?n/1440+'d':n%60===0?n/60+'h':n+'m').join(', ');
const sb=document.createElement('button');sb.className='lnk';sb.textContent='Settings';
$('.hr').insertBefore(sb,$('#out'));
const dlg=document.createElement('dialog');
dlg.innerHTML=`<form><h2>Reminder settings</h2><p><small>How long before the due time Google Calendar alerts you. Use d, h and m, for example 7d, 1d, 3h.</small></p>${TYPES.map(t=>`<label>${t}<input name="${t}"></label>`).join('')}<label>Classes<input name="cls"></label><div class="act"><span></span><button type="button" class="lnk" id="sx">Close</button><button class="pri">Save</button></div></form>`;
document.body.append(dlg);
const f=dlg.querySelector('form');
sb.onclick=()=>{TYPES.forEach(t=>{f[t].value=fmt(cfg.rem?.[t]||DEF[t])});f.cls.value=fmt(cfg.cls||[30]);dlg.showModal()};
dlg.querySelector('#sx').onclick=()=>dlg.close();
f.onsubmit=e=>{
 e.preventDefault();const rem={};
 TYPES.forEach(t=>{const a=parse(f[t].value);rem[t]=a.length?a:DEF[t]});
 const c=parse(f.cls.value);
 setDoc(doc(db,`users/${uid}/meta/settings`),{rem,cls:c.length?c.slice(0,3):[30]}).catch(er=>alert(er.message));
 dlg.close();
};
onAuthStateChanged(auth,u=>{
 subs.forEach(x=>x());subs=[];uid=u?.uid;courses=[];cfg={};drawCls();
 if(!u)return;
 window.dlReady=false;
 subs=[onSnapshot(collection(db,`users/${uid}/courses`),s=>{courses=s.docs.map(d=>({id:d.id,...d.data()})).filter(c=>!c.deleted);drawCls()}),
  onSnapshot(doc(db,`users/${uid}/meta/settings`),s=>{cfg=s.data()||{};window.dlRem=cfg.rem;window.dlClsRem=cfg.cls;ready()},()=>ready())];
});
