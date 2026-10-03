import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,deleteDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
function lab(){const n=tasks.filter(t=>want(t)!==(t.calSig||null)).length;btn.textContent=on()?'Calendar on':n?`Connect Calendar (${n})`:'Connect Calendar'}
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
