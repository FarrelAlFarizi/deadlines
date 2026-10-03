import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,deleteDoc,updateDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const auth=getAuth(getApp()),db=getFirestore(getApp());
const GC='https://www.googleapis.com/calendar/v3/calendars/primary/events';
const REM={Assignment:[1440,180],Quiz:[1440,60],Exam:[10080,4320,1440],Project:[10080,2880,1440]};
let uid,tasks=[],courses=[],tok=null,exp=0,busy=false,again=false,subs=[];
const btn=document.createElement('button');btn.id='cal';btn.className='lnk';
document.querySelector('.hr').insertBefore(btn,document.querySelector('#out'));
const stat=m=>{document.querySelector('#st').textContent=m};
const cn=t=>courses.find(c=>c.id===t.courseId)?.name||'';
const sig=t=>[t.title,t.type,t.due,t.notes,cn(t)].join('|');
const want=t=>!t.done&&!t.deleted?sig(t):null;
const pth=t=>doc(db,`users/${uid}/tasks/${t.id}`);
const eid=t=>'dl'+t.id.replace(/-/g,'');
const on=()=>tok&&Date.now()<exp;
function lab(){const n=tasks.filter(t=>want(t)!==(t.calSig||null)).length+courses.filter(c=>cpend(c)).length;btn.textContent=on()?'Calendar on':n?`Connect Calendar (${n})`:'Connect Calendar'}
function body(t){
 const s=new Date(t.due),e=new Date(s.getTime()+30*6e4);
 const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
 return {id:eid(t),status:'confirmed',summary:`${t.type}: ${t.title}`,description:[cn(t),t.notes].filter(Boolean).join('\n'),
  start:{dateTime:s.toISOString(),timeZone:tz},end:{dateTime:e.toISOString(),timeZone:tz},
  reminders:{useDefault:false,overrides:(REM[t.type]||[1440]).map(m=>({method:'popup',minutes:m}))}};
}
const gc=async(m,p,b)=>{
 const r=await fetch(GC+p,{method:m,headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});
 if(r.status===401){tok=null;lab();throw new Error('auth')}
 return r;
};
async function sync(){
 if(!uid)return;
 if(busy){again=true;return}
 busy=true;
 try{
  for(const t of tasks)if(t.deleted&&!t.calSig)await deleteDoc(pth(t));
  if(!on()){tok=null;return}
  for(const t of tasks){
   const w=want(t),h=t.calSig||null;
   if(w===h)continue;
   if(w){
    let r=await gc('POST','',body(t));
    if(r.status===409)r=await gc('PUT','/'+eid(t),body(t));
    if(!r.ok)throw new Error('Calendar error '+r.status+': '+(await r.text()).slice(0,140));
    await setDoc(pth(t),{calSig:w},{merge:true});
   }else{
    const r=await gc('DELETE','/'+eid(t));
    if(!r.ok&&r.status!==404&&r.status!==410)throw new Error('Calendar error '+r.status);
    if(t.deleted)await deleteDoc(pth(t));else await setDoc(pth(t),{calSig:null},{merge:true});
   }
  }
 await syncCourses();
 }catch(e){if(e.message!=='auth')stat(e.message)}
 finally{busy=false;lab();if(again){again=false;sync()}}
}
btn.onclick=async()=>{
 if(on()){sync();return}
 try{
  const p=new GoogleAuthProvider();p.addScope('https://www.googleapis.com/auth/calendar.events');
  const r=await reauthenticateWithPopup(auth.currentUser,p);
  tok=GoogleAuthProvider.credentialFromResult(r)?.accessToken||null;exp=Date.now()+3.4e6;lab();sync();
 }catch(e){if(e.code!=='auth/popup-closed-by-user')stat(e.message)}
};
onAuthStateChanged(auth,u=>{
 subs.forEach(f=>f());subs=[];uid=u?.uid;tok=null;tasks=[];courses=[];lab();
 if(!u)return;
 const s=(n,cb)=>onSnapshot(collection(db,`users/${uid}/${n}`),q=>{cb(q.docs.map(d=>({id:d.id,...d.data()})));lab();sync()});
 subs=[s('courses',a=>courses=a),s('tasks',a=>tasks=a)];
});
setInterval(lab,6e4);

const DN={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0};
const p2=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
function occ(c,n){const a=[],d=new Date(),u=new Date(c.until+'T23:59');d.setHours(0,0,0,0);for(;a.length<n&&d<=u;d.setDate(d.getDate()+1))if(d.getDay()===DN[c.day])a.push(dstr(d));return a}
const live=c=>c.day&&c.start&&c.end&&c.until&&occ(c,1).length>0;
const csig=c=>[c.name,c.prof,c.day,c.start,c.end,c.room,c.until].join('|');
const cid=c=>'dlc'+c.id.replace(/-/g,'');
const cref=c=>doc(db,`users/${uid}/courses/${c.id}`);
const at=(d,t)=>({dateTime:new Date(`${d}T${t}`).toISOString(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone});
const ovd=c=>{const o=c.ov||{},a=c.calOv||{};return Object.keys({...o,...a}).some(k=>(o[k]?JSON.stringify(o[k]):null)!==(a[k]||null))};
const cpend=c=>{const w=live(c)?csig(c):null;return w!==(c.calSig||null)||(w&&ovd(c))};
function cbody(c){const d=occ(c,1)[0];return {id:cid(c),status:'confirmed',summary:c.name,location:c.room||'',description:c.prof?'Lecturer: '+c.prof:'',
 start:at(d,c.start),end:at(d,c.end),recurrence:[`RRULE:FREQ=WEEKLY;BYDAY=${c.day};UNTIL=${c.until.replace(/-/g,'')}T235959Z`],
 reminders:{useDefault:false,overrides:[{method:'popup',minutes:30}]}}}
const obody=(c,k,o)=>o?(o.mode==='cancel'?{status:'cancelled'}:{status:'confirmed',start:at(o.date||k,o.start||c.start),end:at(o.date||k,o.end||c.end),location:o.room||c.room||''}):{status:'confirmed',start:at(k,c.start),end:at(k,c.end),location:c.room||''};
async function syncCourses(){
 for(let c of courses){
  const w=live(c)?csig(c):null,h=c.calSig||null;
  if(w!==h){
   if(w){let r=await gc('POST','',cbody(c));if(r.status===409)r=await gc('PUT','/'+cid(c),cbody(c));if(!r.ok)throw new Error('Calendar error '+r.status+': '+(await r.text()).slice(0,140))}
   else{const r=await gc('DELETE','/'+cid(c));if(!r.ok&&r.status!==404&&r.status!==410)throw new Error('Calendar error '+r.status)}
   await updateDoc(cref(c),{calSig:w,calOv:{}});c={...c,calSig:w,calOv:{}};
  }
  if(!w)continue;
  const ov=c.ov||{},ap={...(c.calOv||{})};let ch=false;
  for(const k of new Set([...Object.keys(ov),...Object.keys(ap)])){
   const ws=ov[k]?JSON.stringify(ov[k]):null;if(ws===(ap[k]||null))continue;
   const r=await gc('PATCH',`/${cid(c)}_${new Date(k+'T'+c.start).toISOString().replace(/[-:]|\.\d{3}/g,'')}`,obody(c,k,ov[k]));
   if(!r.ok&&r.status!==404)throw new Error('Calendar error '+r.status+': '+(await r.text()).slice(0,140));
   if(ws)ap[k]=ws;else delete ap[k];ch=true;
  }
  if(ch)await updateDoc(cref(c),{calOv:ap});
 }
}
const dlg=document.createElement('dialog');
dlg.innerHTML=`<form><h2>Change one class</h2><label>Which class<select name="k"></select></label>
<label>What happens<select name="m"><option value="move">Move or change it</option><option value="cancel">Cancel it</option><option value="reset">Back to normal</option></select></label>
<div id="mv"><label>New date<input type="date" name="d"></label><label>Starts<input type="time" name="s"></label><label>Ends<input type="time" name="e"></label><label>Room<input name="r" maxlength="60"></label></div>
<p><small>Only this one class changes. The following weeks stay as scheduled.</small></p>
<div class="act"><span></span><button type="button" class="lnk" id="ox">Close</button><button class="pri">Save change</button></div></form>`;
document.body.append(dlg);
const f=dlg.querySelector('form');let cur;
const chg=document.createElement('button');chg.type='button';chg.id='chg';chg.className='lnk';chg.hidden=true;chg.textContent='Change one class';
document.querySelector('#cd .act').before(chg);
const defs=()=>{f.d.value=f.k.value;f.s.value=cur.start;f.e.value=cur.end;f.r.value=cur.room||'';f.querySelector('#mv').hidden=f.m.value!=='move'};
f.k.onchange=defs;f.m.onchange=defs;
chg.onclick=()=>{cur=window.dlCourse;if(!cur)return;
 f.k.innerHTML=occ(cur,8).map(d=>`<option value="${d}">${new Date(d+'T00:00').toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'})}${cur.ov?.[d]?' (changed)':''}</option>`).join('');
 f.m.value='move';defs();document.querySelector('#cd').close();dlg.showModal()};
f.onsubmit=e=>{e.preventDefault();const k=f.k.value,ov={...(cur.ov||{})};
 if(f.m.value==='reset')delete ov[k];else ov[k]=f.m.value==='cancel'?{mode:'cancel'}:{mode:'move',date:f.d.value||k,start:f.s.value,end:f.e.value,room:f.r.value.trim()};
 updateDoc(cref(cur),{ov}).catch(er=>stat(er.message));dlg.close()};
dlg.querySelector('#ox').onclick=()=>dlg.close();
