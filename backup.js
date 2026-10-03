import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,getDocs} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
const btn=document.createElement('button');btn.className='lnk';btn.textContent='Backup';
$('.hr').insertBefore(btn,$('#out'));
const dlg=document.createElement('dialog');
dlg.innerHTML=`<form><h2>Backup and import</h2>
<p><small>Export saves your courses and tasks to a file. Import adds items from a file or pasted text and never overwrites what you have.</small></p>
<div class="act"><button type="button" class="pri" id="bx">Export file</button></div>
<label>Paste data to import<textarea id="bt" rows="6" placeholder='{"courses":[],"tasks":[]}'></textarea></label>
<label>Or choose a file<input type="file" id="bf" accept=".json,application/json"></label>
<p id="bm" role="status"></p>
<div class="act"><span></span><button type="button" class="lnk" id="bc">Close</button><button type="button" class="pri" id="bi">Import</button></div></form>`;
document.body.append(dlg);
let uid;onAuthStateChanged(auth,u=>{uid=u?.uid});
const say=m=>{$('#bm').textContent=m};
btn.onclick=()=>{say('');dlg.showModal()};
$('#bc').onclick=()=>dlg.close();
const strip=d=>{const {calSig,calOv,...r}=d;return r};
const load=async n=>(await getDocs(collection(db,`users/${uid}/${n}`))).docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.deleted);
$('#bx').onclick=async()=>{
 try{
  const cs=await load('courses'),ts=await load('tasks'),nm=Object.fromEntries(cs.map(c=>[c.id,c.name]));
  const data={version:1,courses:cs.map(strip),tasks:ts.map(t=>({...strip(t),course:nm[t.courseId]||''}))};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
  a.download='deadlines-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  say(`Exported ${cs.length} courses and ${ts.length} tasks.`);
 }catch(e){say(e.message)}
};
$('#bf').onchange=async e=>{const f=e.target.files[0];if(f)$('#bt').value=await f.text()};
$('#bi').onclick=async()=>{
 try{
  const d=JSON.parse($('#bt').value),cs={};
  for(const c of await load('courses'))cs[String(c.name).toLowerCase()]=c.id;
  const ex=new Set((await load('tasks')).map(t=>t.title+'|'+t.due));
  let nc=0,nt=0,sk=0;
  for(const c of d.courses||[]){
   const k=String(c.name||'').toLowerCase();if(!k||cs[k])continue;
   const id=crypto.randomUUID();
   await setDoc(doc(db,`users/${uid}/courses/${id}`),{name:c.name,prof:c.prof||'',day:c.day||'',start:c.start||'',end:c.end||'',room:c.room||'',until:c.until||'',updatedAt:Date.now()});
   cs[k]=id;nc++;
  }
  for(const t of d.tasks||[]){
   if(!t.title||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.due||'')||ex.has(t.title+'|'+t.due)){sk++;continue}
   const cid=cs[String(t.course||'').toLowerCase()]||(Object.values(cs).includes(t.courseId)?t.courseId:'');
   await setDoc(doc(db,`users/${uid}/tasks/${crypto.randomUUID()}`),{title:t.title,courseId:cid,type:['Assignment','Quiz','Exam','Project'].includes(t.type)?t.type:'Assignment',due:t.due,notes:t.notes||'',done:!!t.done,updatedAt:Date.now()});
   ex.add(t.title+'|'+t.due);nt++;
  }
  say(`Imported ${nc} courses and ${nt} tasks. Skipped ${sk} (duplicates or invalid).`);
 }catch(e){say('Could not import: '+e.message)}
};
