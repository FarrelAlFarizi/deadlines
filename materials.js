import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,deleteDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
/* Course materials: a page per course with written notes, files and photos.
   Notes live in Firestore. Files and photos go into a CleanSlate folder in the student's own Google Drive
   (drive.file permission: the app only sees files it created); Firestore keeps a record and a small photo preview */
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX=20*1024*1024,PHOTO=2000,PREV=320;
const DRV='https://www.googleapis.com/drive/v3/files',UPL='https://www.googleapis.com/upload/drive/v3/files',SCOPE='https://www.googleapis.com/auth/drive.file';
const TYPES={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',heic:'image/heic'};
const OKT=new Set(Object.values(TYPES));
const mime=f=>{const t=(f.type||'').toLowerCase();if(OKT.has(t)||t.startsWith('image/'))return t;return TYPES[(f.name.split('.').pop()||'').toLowerCase()]||''};
const badge=t=>t==='application/pdf'?'PDF':/word/.test(t)?'DOC':/powerpoint|presentation/.test(t)?'PPT':/excel|sheet/.test(t)?'XLS':t==='text/plain'?'TXT':/^image\//.test(t)?'IMG':'FILE';
const size=n=>n<1024?n+' B':n<1048576?Math.round(n/1024)+' KB':(n/1048576).toFixed(n<10485760?1:0)+' MB';
const date=ms=>{const d=new Date(ms||Date.now());return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',...(d.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})})};
const DAY={MO:'Mon',TU:'Tue',WE:'Wed',TH:'Thu',FR:'Fri',SA:'Sat',SU:'Sun'};
const SV=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const BACK=SV('<path d="M15 5l-7 7 7 7"/>'),NEXT=SV('<path d="M9 5l7 7-7 7"/>'),MORE=SV('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),NOTE=SV('<path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>'),DRIVE=SV('<path d="M8.5 4h7l5.5 9.5-3.5 6h-11L3 13.5z"/><path d="M8.5 4l5.5 9.5H21M15.5 4L10 13.5 6.5 19.5M3 13.5h11"/>');
const SEG={note:{tab:'Notes',add:'Write a note',none:'No notes yet',hint:'Write down what was said in class, or the topics for the exam.'},
 file:{tab:'Files',add:'Upload a file',none:'No files yet',hint:'Add the syllabus, slides or readings. They’re saved in a CleanSlate folder in your Google Drive. PDF, Word, PowerPoint, Excel or text, up to 20 MB each.'},
 photo:{tab:'Photos',add:'Add photos',none:'No photos yet',hint:'Snap the board or a handout. Photos are made smaller, then saved in a CleanSlate folder in your Google Drive.'}};

let uid=null,courses=[],tasks=[],mats=[],cur=null,seg='note',pend=[],srv=false;const gone=new Set();
const mref=id=>doc(db,`users/${uid}/materials/${id}`);
const toast=(m,u)=>window.dlToast?window.dlToast(m,u):window.dlNote&&window.dlNote(m);
const fail=e=>{console.error(e);toast('Could not save. Check your connection and try again.')};

/* ---- Google Drive: access lasts about an hour, like Calendar; one tap reconnects ---- */
let tok=null,exp=0,opening=false,dirs={};const full=new Map();
const on=()=>!!tok&&Date.now()<exp;
const usesDrive=()=>{try{if(localStorage.getItem('dl-drive-'+uid)==='1')return true}catch(e){}return mats.some(m=>m.driveId)};
async function api(method,url,body){
 const r=await fetch(url,{method,headers:{Authorization:'Bearer '+tok,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(r.status===401){tok=null;draw();throw Object.assign(new Error('Drive access expired'),{auth:true})}
 return r;
}
async function folder(q,meta){
 const r=await api('GET',`${DRV}?q=${encodeURIComponent(q+" and mimeType='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id)&spaces=drive`);
 const j=r.ok?await r.json():{};if(j.files&&j.files[0])return j.files[0].id;
 const c=await api('POST',DRV+'?fields=id',{...meta,mimeType:'application/vnd.google-apps.folder'});
 if(!c.ok)throw new Error('Drive folder '+c.status);return (await c.json()).id;
}
/* CleanSlate / <course name>; folders are found again by a tag, so renaming them in Drive is fine */
async function courseDir(cid){
 if(dirs[cid])return dirs[cid];
 if(!dirs.root)dirs.root=await folder("appProperties has { key='cleanslate' and value='root' }",{name:'CleanSlate',appProperties:{cleanslate:'root'}});
 return dirs[cid]=await folder(`appProperties has { key='csCourse' and value='${cid}' }`,{name:courses.find(c=>c.id===cid)?.name||'Course',parents:[dirs.root],appProperties:{csCourse:cid}});
}
async function upload(blob,name,type,parent,onp){
 const s=await api('POST',`${UPL}?uploadType=resumable&fields=id,webViewLink`,{name,parents:[parent],mimeType:type});
 const loc=s.ok&&s.headers.get('Location');if(!loc)throw new Error('Drive upload '+s.status);
 return new Promise((res,rej)=>{
  const x=new XMLHttpRequest();x.open('PUT',loc);x.setRequestHeader('Content-Type',type);
  x.upload.onprogress=e=>{if(e.lengthComputable)onp(e.loaded/e.total)};
  x.onload=()=>{if(x.status===401){tok=null;rej(Object.assign(new Error('Drive access expired'),{auth:true}))}else if(x.status>=200&&x.status<300){try{res(JSON.parse(x.responseText))}catch(e){rej(e)}}else rej(new Error('Drive upload '+x.status))};
  x.onerror=()=>rej(new Error('network'));x.send(blob);
 });
}
async function connect(after){
 if(opening)return;opening=true;draw();
 try{
  const u=auth.currentUser,p=new GoogleAuthProvider();p.addScope(SCOPE);if(u?.email)p.setCustomParameters({login_hint:u.email});
  const r=await reauthenticateWithPopup(u,p);
  tok=GoogleAuthProvider.credentialFromResult(r)?.accessToken||null;exp=Date.now()+3.4e6;
  if(tok){try{localStorage.setItem('dl-drive-'+uid,'1')}catch(e){}pend.filter(x=>x.wait).forEach(start);tidy(1e4);after&&after()}
 }catch(e){if(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request'){console.error(e);toast('Couldn’t connect to Google Drive. Try again.')}}
 finally{opening=false;draw()}
}
/* First time: say where files go and how to get past Google's unverified-app screen */
const dp=document.createElement('dialog');dp.id='dprimer';
dp.innerHTML=`<form method="dialog"><span class="pr-ic">${DRIVE}</span><h2>Save files to your Google Drive</h2>
<p>Files and photos you add go into a <b>CleanSlate</b> folder in your own Google Drive and use its free space. The app can only see the files it saved there, never the rest of your Drive.</p>
<div class="pr-warn"><b>Google may show a warning first</b><p>This student app hasn’t finished Google’s review yet. If Google says “Google hasn’t verified this app”, tap <b>Advanced</b>, then <b>Go to deadline-tracker-220cc.firebaseapp.com (unsafe)</b>.</p></div>
<p class="pr-note">Access lasts about an hour at a time. Your files stay in Drive; adding more later takes one tap to reconnect.</p>
<div class="act"><button type="button" class="lnk" id="dpx">Not now</button><span></span><button type="button" class="pri" id="dpgo">Continue to Google</button></div></form>`;
document.body.append(dp);
let dpAfter=null;
const seenDp=()=>{try{return localStorage.getItem('dl-dprimer-'+uid)==='1'}catch(e){return false}};
function ask(after){if(!usesDrive()&&!seenDp()){try{localStorage.setItem('dl-dprimer-'+uid,'1')}catch(e){}dpAfter=after;dp.showModal()}else connect(after)}
$('#dpx').onclick=()=>dp.close();
$('#dpgo').onclick=()=>{dp.close();connect(dpAfter)};

/* ---- course page ---- */
const pg=document.createElement('dialog');pg.id='cp';pg.className='sheet';
pg.innerHTML=`<div class="sh-bar"><button type="button" class="ib" id="cpx" aria-label="Back">${BACK}</button><button type="button" class="lnk" id="cpe">Edit course</button></div>
<h2 id="cpt"></h2><p class="cp-sub" id="cps"></p><button type="button" class="cp-next" id="cpn" hidden></button>
<div class="mtabs" role="tablist" aria-label="Course materials">${Object.entries(SEG).map(([k,v])=>`<button type="button" role="tab" id="cpt-${k}" data-s="${k}" aria-controls="cpw">${v.tab} <span class="n"></span></button>`).join('')}</div>
<div id="cpw" role="tabpanel"><ul id="cpl"></ul></div>
<div class="sh-foot"><button type="button" class="pri" id="cpa"></button></div>
<input type="file" id="cpf" multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*,${[...OKT].join(',')}"><input type="file" id="cpp" multiple hidden accept="image/*">`;
document.body.append(pg);
const live=()=>mats.filter(m=>m.courseId===cur&&!m.deleted&&!gone.has(m.id));
const items=k=>live().filter(m=>m.kind===k).sort((a,b)=>(k==='note'?(b.updatedAt||0)-(a.updatedAt||0):(b.createdAt||0)-(a.createdAt||0)));
function head(){
 const c=courses.find(x=>x.id===cur);if(!c||c.deleted){if(pg.open)pg.close();return false}
 $('#cpt').textContent=c.name;
 $('#cps').textContent=[c.day&&c.start?`${DAY[c.day]} ${c.start} to ${c.end}`:'',c.room,c.prof].filter(Boolean).join(' · ')||'No class time yet';
 const now=Date.now(),open=tasks.filter(t=>t.courseId===cur&&!t.done&&!t.deleted&&t.due).sort((a,b)=>a.due.localeCompare(b.due)),t=open.find(t=>new Date(t.due)>=now)||open[0],n=$('#cpn');
 n.hidden=!t;if(t){const d=new Date(t.due),late=d<now;n.dataset.id=t.id;n.classList.toggle('late',late);n.textContent=`${late?'Overdue':'Next'}: ${t.title} · ${d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}, ${t.due.slice(11)}`}
 for(const k in SEG){const b=$('#cpt-'+k),on=k===seg;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;b.querySelector('.n').textContent=items(k).length||''}
 $('#cpw').setAttribute('aria-labelledby','cpt-'+seg);$('#cpa').textContent=SEG[seg].add;
 return true;
}
const noteRow=m=>`<li class="t mrow" data-m="${m.id}"><span class="ic">${NOTE}</span><button type="button" class="b" data-open><b>${esc(m.title||'Untitled note')}</b>${m.body?`<small class="clamp">${esc(m.body.slice(0,240))}</small>`:''}</button><span class="r">${date(m.updatedAt)}</span></li>`;
const fileRow=m=>`<li class="t mrow" data-m="${m.id}"><span class="ic ft">${badge(m.type)}</span><a class="b" href="${esc(m.link)}" target="_blank" rel="noopener"><b>${esc(m.title||'File')}</b><small>${badge(m.type)} · ${size(m.size||0)} · ${date(m.createdAt)}</small></a><button type="button" class="ib" data-more aria-label="Rename or delete ${esc(m.title||'file')}">${MORE}</button></li>`;
const photoRow=m=>`<li class="ph" data-m="${m.id}"><button type="button" data-open aria-label="${esc(m.title?'Photo: '+m.title:'Photo')}, ${date(m.createdAt)}">${m.prev?`<img src="${esc(m.prev)}" alt="" loading="lazy" decoding="async">`:`<span class="ph-none">${DRIVE}</span>`}</button></li>`;
const upTxt=p=>p.wait?'Waiting for Google Drive':p.err?'Upload failed':`Uploading ${p.prog}%`;
const acts=p=>p.err?`<span class="up-act"><button type="button" class="lnk" data-retry>Retry</button><button type="button" class="lnk" data-drop>Remove</button></span>`:p.wait?`<span class="up-act"><button type="button" class="lnk" data-drop>Remove</button></span>`:'';
const upRow=p=>p.kind==='photo'
 ?`<li class="ph up${p.err?' err':''}${p.wait?' wait':''}" data-p="${p.id}"><span class="ph-prev"${p.prev?` style="background-image:url(${p.prev})"`:''}></span><small>${upTxt(p)}</small><span class="bar"><i style="width:${p.prog}%"></i></span>${p.err?acts(p):''}</li>`
 :`<li class="t mrow up${p.err?' err':''}${p.wait?' wait':''}" data-p="${p.id}"><span class="ic ft">${badge(p.type)}</span><div class="b"><b>${esc(p.name)}</b><small>${upTxt(p)}</small><span class="bar"><i style="width:${p.prog}%"></i></span></div>${acts(p)}</li>`;
const waitBar=n=>`<li class="dwait"><span class="ic">${DRIVE}</span><p><b>${n===1?'1 item is':n+' items are'} waiting for Google Drive</b><small>${usesDrive()?'Drive access lasts about an hour. Reconnect to save them.':'Files and photos are saved in your own Google Drive.'}</small></p><button type="button" class="pri" data-connect${opening?' disabled':''}>${opening?'Opening Google…':usesDrive()?'Reconnect Drive':'Connect Google Drive'}</button></li>`;
function draw(){
 if(!pg.open||!head())return;
 const L=$('#cpl'),its=items(seg),up=pend.filter(p=>p.courseId===cur&&p.kind===seg),w=up.filter(p=>p.wait).length;
 L.className=seg==='photo'?'pgrid':'mlist';
 L.innerHTML=!its.length&&!up.length?`<li class="empty"><b>${SEG[seg].none}</b>${SEG[seg].hint}</li>`:(w?waitBar(w):'')+up.map(upRow).join('')+its.map(seg==='note'?noteRow:seg==='file'?fileRow:photoRow).join('');
}
const prog=p=>{const el=$(`#cpl [data-p="${p.id}"]`);if(!el)return;el.querySelector('.bar i').style.width=p.prog+'%';el.querySelector('small').textContent=upTxt(p)};
function openPage(id){cur=id;if(!pg.open)pg.showModal();draw();pg.scrollTop=0}
window.dlCoursePage=openPage;
$('#cpx').onclick=()=>pg.close();
$('#cpe').onclick=()=>window.dlOpenCourse&&window.dlOpenCourse(cur);
$('#cpn').onclick=e=>window.dlOpenTask&&window.dlOpenTask(e.currentTarget.dataset.id);
pg.querySelector('.mtabs').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(b){seg=b.dataset.s;draw()}});
pg.querySelector('.mtabs').addEventListener('keydown',e=>{const ks=Object.keys(SEG),i=ks.indexOf(seg),d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();seg=ks[(i+d+ks.length)%ks.length];draw();$('#cpt-'+seg).focus()});
$('#cpa').onclick=()=>seg==='note'?openNote(null):$(seg==='file'?'#cpf':'#cpp').click();
$('#cpl').addEventListener('click',e=>{
 if(e.target.closest('[data-connect]')){ask();return}
 const li=e.target.closest('li');if(!li)return;
 if(li.dataset.p){const p=pend.find(x=>x.id===li.dataset.p);if(!p)return;if(e.target.closest('[data-retry]'))start(p);else if(e.target.closest('[data-drop]')){pend=pend.filter(x=>x!==p);draw()}return}
 const m=mats.find(x=>x.id===li.dataset.m);if(!m)return;
 if(e.target.closest('[data-more]'))openFile(m);
 else if(e.target.closest('[data-open]'))m.kind==='note'?openNote(m.id):openPhoto(m.id);
});

/* ---- uploads: picked files wait here until Drive is connected ---- */
const canvas=(b,max)=>{const s=Math.min(1,max/Math.max(b.width,b.height)),c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d').drawImage(b,0,0,c.width,c.height);return c};
async function shrink(f){
 try{
  const b=await createImageBitmap(f,{imageOrientation:'from-image'}),big=await new Promise(r=>canvas(b,PHOTO).toBlob(r,'image/jpeg',.82));
  let prev='';for(const [px,q] of [[PREV,.7],[PREV,.5],[220,.5]]){prev=canvas(b,px).toDataURL('image/jpeg',q);if(prev.length<75000)break}
  b.close&&b.close();return big?{big,prev:prev.length<75000?prev:''}:null;
 }
 catch(e){return null}
}
function add(files,kind){
 if(navigator.onLine===false){toast('You’re offline. Add files when you’re back online; notes still work.');return}
 for(const f of files){
  const t=mime(f);
  if(kind==='photo'?!t.startsWith('image/'):!t){toast(`${f.name} isn’t a supported file type.`);continue}
  if(kind==='file'&&f.size>MAX){toast(`${f.name} is over 20 MB, so it wasn’t added.`);continue}
  const p={id:crypto.randomUUID(),kind,courseId:cur,name:f.name,file:f,type:t,prog:0,err:false,wait:false,prev:kind==='photo'?URL.createObjectURL(f):''};
  pend.push(p);start(p);
 }
 draw();
}
async function start(p){
 if(!on()){p.wait=true;p.err=false;draw();return}
 p.wait=false;p.err=false;p.prog=0;draw();
 try{
  let blob=p.file,type=p.type,name=p.name,prev='';
  if(p.kind==='photo'){const r=await shrink(p.file);if(r){blob=r.big;prev=r.prev;type='image/jpeg';name=name.replace(/\.[^.]+$/,'')+'.jpg'}}
  if(blob.size>MAX){pend=pend.filter(x=>x!==p);toast(`${p.name} is over 20 MB, so it wasn’t added.`);draw();return}
  const j=await upload(blob,name,type,await courseDir(p.courseId),f=>{p.prog=Math.round(f*100);prog(p)});
  const now=Date.now();pend=pend.filter(x=>x!==p);if(p.prev)setTimeout(()=>URL.revokeObjectURL(p.prev),5000);
  const w=setDoc(mref(p.id),{courseId:p.courseId,kind:p.kind,title:p.kind==='photo'?'':p.name.slice(0,200),driveId:j.id,link:j.webViewLink||`https://drive.google.com/file/d/${j.id}/view`,...(prev?{prev}:{}),size:blob.size,type,createdAt:now,updatedAt:now});
  draw();await w;
 }catch(e){console.error(e);if(e.auth)p.wait=true;else p.err=true;draw()}
}
$('#cpf').onchange=e=>{add([...e.target.files],'file');e.target.value=''};
$('#cpp').onchange=e=>{add([...e.target.files],'photo');e.target.value=''};

/* ---- delete with undo. Drive files go to the Drive trash once the undo window has passed;
   if Drive isn't connected then, the record stays hidden and the file is cleared at the next connection ---- */
async function purge(m){
 if(gone.has(m.id+'#')||(m.driveId&&!on()))return;
 gone.add(m.id+'#');
 try{
  if(m.driveId){const r=await api('PATCH',`${DRV}/${m.driveId}?fields=id`,{trashed:true});if(!r.ok&&r.status!==404)throw new Error('Drive delete '+r.status)}
  await deleteDoc(mref(m.id));
 }catch(e){console.error(e);gone.delete(m.id+'#')}
}
function remove(m,label){
 gone.add(m.id);draw();
 setDoc(mref(m.id),{deleted:true,updatedAt:Date.now()},{merge:true}).catch(fail);
 const t=setTimeout(()=>purge({...m,deleted:true}),6000);
 toast(label+' deleted',()=>{clearTimeout(t);gone.delete(m.id);setDoc(mref(m.id),{deleted:false,updatedAt:Date.now()},{merge:true}).catch(fail);draw()});
}
window.dlMatCount=id=>mats.filter(m=>m.courseId===id&&!m.deleted).length;

/* ---- note editor: saves as you type ---- */
const ne=document.createElement('dialog');ne.id='ne';ne.className='sheet';
ne.innerHTML=`<div class="sh-bar"><button type="button" class="ib" id="nex" aria-label="Done">${BACK}</button><small id="nes" role="status"></small><button type="button" class="lnk dng" id="ned">Delete</button></div>
<small class="ne-c" id="nec"></small><input id="net" class="ne-t" maxlength="200" placeholder="Title" aria-label="Note title" autocomplete="off">
<textarea id="neb" class="ne-b" maxlength="20000" placeholder="Write your note…" aria-label="Note"></textarea>`;
document.body.append(ne);
let nid=null,ntm=null,dirty=false;
function saveNote(){
 clearTimeout(ntm);if(!dirty)return;dirty=false;
 const title=$('#net').value.trim(),body=$('#neb').value,now=Date.now();
 if(!nid&&!title&&!body.trim())return;
 const fresh=!nid;if(fresh)nid=crypto.randomUUID();
 setDoc(mref(nid),{courseId:cur,kind:'note',title,body,updatedAt:now,...(fresh?{createdAt:now}:{})},{merge:true}).catch(fail);
 $('#nes').textContent='Saved';
}
function openNote(id){
 saveNote();
 const m=mats.find(x=>x.id===id);nid=m?m.id:null;dirty=false;
 $('#nec').textContent=courses.find(c=>c.id===cur)?.name||'';
 $('#net').value=m?.title||'';$('#neb').value=m?.body||'';$('#nes').textContent=m?'Saved':'';
 ne.showModal();(m?$('#neb'):$('#net')).focus();if(m)$('#neb').setSelectionRange(0,0);
}
const typed=()=>{dirty=true;$('#nes').textContent='Saving…';clearTimeout(ntm);ntm=setTimeout(saveNote,700)};
$('#net').oninput=typed;$('#neb').oninput=typed;
$('#net').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#neb').focus()}};
$('#nex').onclick=()=>{saveNote();ne.close()};
ne.addEventListener('close',()=>{saveNote();const m=mats.find(x=>x.id===nid);if(m&&!m.title&&!(m.body||'').trim())purge(m);nid=null});
$('#ned').onclick=()=>{clearTimeout(ntm);dirty=false;const m=mats.find(x=>x.id===nid);nid=null;ne.close();if(m)remove(m,'Note')};

/* ---- photo viewer: shows the saved preview at once, then the full photo from Drive while connected ---- */
const pv=document.createElement('dialog');pv.id='pv';pv.className='sheet';
pv.innerHTML=`<div class="sh-bar"><button type="button" class="ib" id="pvx" aria-label="Back">${BACK}</button><small id="pvn" aria-live="polite"></small><button type="button" class="lnk dng" id="pvd">Delete</button></div>
<figure class="pv-f"><img id="pvi" alt=""><button type="button" class="ib pv-p" id="pvp" aria-label="Previous photo">${BACK}</button><button type="button" class="ib pv-q" id="pvq" aria-label="Next photo">${NEXT}</button></figure>
<div class="pv-cap"><label>Caption<input id="pvc" maxlength="200" placeholder="What is this? (optional)" autocomplete="off"></label><button type="button" class="lnk" id="pvl" hidden>Show full size</button><a class="lnk" id="pvo" target="_blank" rel="noopener">Open in Google Drive</a></div>`;
document.body.append(pv);
let pid=null;
const plist=()=>items('photo');
async function fullPhoto(m){
 if(full.has(m.id))return full.get(m.id);
 const r=await api('GET',`${DRV}/${m.driveId}?alt=media`);if(!r.ok)throw new Error('Drive '+r.status);
 const u=URL.createObjectURL(await r.blob());full.set(m.id,u);return u;
}
function showPhoto(){
 const L=plist(),i=L.findIndex(m=>m.id===pid);if(i<0){if(pv.open)pv.close();return}
 const m=L[i],img=$('#pvi');img.src=full.get(m.id)||m.prev||'';img.alt=m.title||`Photo from ${date(m.createdAt)}`;
 $('#pvn').textContent=`${i+1} of ${L.length}`;$('#pvc').value=m.title||'';$('#pvo').href=m.link||'#';
 $('#pvp').disabled=i===0;$('#pvq').disabled=i===L.length-1;
 $('#pvl').hidden=full.has(m.id)||on()||!m.driveId;
 if(on()&&m.driveId&&!full.has(m.id))fullPhoto(m).then(u=>{if(pid===m.id)img.src=u}).catch(e=>console.error(e));
}
function openPhoto(id){pid=id;pv.showModal();showPhoto();$('#pvx').focus()}
const step=d=>{const L=plist(),i=L.findIndex(m=>m.id===pid);const n=L[i+d];if(n){pid=n.id;showPhoto()}};
$('#pvp').onclick=()=>step(-1);$('#pvq').onclick=()=>step(1);$('#pvx').onclick=()=>pv.close();
$('#pvl').onclick=()=>ask(showPhoto);
pv.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1)});
let sx=null;$('#pvi').addEventListener('pointerdown',e=>{sx=e.clientX});
$('#pvi').addEventListener('pointerup',e=>{if(sx!==null&&Math.abs(e.clientX-sx)>50)step(e.clientX<sx?1:-1);sx=null});
$('#pvc').onchange=()=>{const v=$('#pvc').value.trim();if(pid)setDoc(mref(pid),{title:v,updatedAt:Date.now()},{merge:true}).catch(fail)};
$('#pvd').onclick=()=>{const L=plist(),i=L.findIndex(m=>m.id===pid),m=L[i];if(!m)return;const n=L[i+1]||L[i-1];remove(m,'Photo');if(n){pid=n.id;showPhoto()}else pv.close()};

/* ---- file details: rename (also in Drive while connected) or delete ---- */
const fd=document.createElement('dialog');fd.id='fd';
fd.innerHTML=`<form><h2>File</h2><p class="fd-m"><small id="fdm"></small> <a class="lnk" id="fdo" target="_blank" rel="noopener">Open in Google Drive</a></p>
<label>Name<input id="fdn" maxlength="200" required autocomplete="off"></label>
<div class="act"><button type="button" class="lnk dng" id="fdd">Delete</button><span></span><button type="button" class="lnk" id="fdx">Cancel</button><button class="pri">Save</button></div></form>`;
document.body.append(fd);
let fid=null;
function openFile(m){fid=m.id;$('#fdm').textContent=`${badge(m.type)} · ${size(m.size||0)} · added ${date(m.createdAt)}`;$('#fdo').href=m.link||'#';$('#fdn').value=m.title||'';fd.showModal()}
$('#fdx').onclick=()=>fd.close();
fd.querySelector('form').onsubmit=e=>{
 e.preventDefault();const v=$('#fdn').value.trim(),m=mats.find(x=>x.id===fid);
 if(v&&m){setDoc(mref(m.id),{title:v,updatedAt:Date.now()},{merge:true}).catch(fail);if(on()&&m.driveId)api('PATCH',`${DRV}/${m.driveId}?fields=id`,{name:v}).catch(e=>console.error(e))}
 fd.close();
};
$('#fdd').onclick=()=>{const m=mats.find(x=>x.id===fid);fd.close();if(m)remove(m,'File')};

/* ---- live data ---- */
let subs=[];
/* Clears what was deleted earlier: notes at once, Drive files once Drive is connected (a fresh connection catches up sooner) */
function tidy(age=6e4){
 const now=Date.now();
 for(const m of mats){
  const c=courses.find(x=>x.id===m.courseId);
  if(m.deleted&&now-(m.updatedAt||0)>age)purge(m);
  else if(srv&&(!c||c.deleted))purge(m);
 }
}
onAuthStateChanged(auth,u=>{
 subs.forEach(f=>f());subs=[];uid=u?.uid||null;mats=[];courses=[];tasks=[];pend=[];srv=false;gone.clear();
 tok=null;exp=0;dirs={};full.forEach(x=>URL.revokeObjectURL(x));full.clear();
 [pg,ne,pv,fd,dp].forEach(d=>d.open&&d.close());
 if(!u)return;
 subs=[onSnapshot(collection(db,`users/${uid}/materials`),q=>{mats=q.docs.map(d=>({id:d.id,...d.data()}));draw();if(pv.open)showPhoto();tidy()}),
  onSnapshot(collection(db,`users/${uid}/courses`),q=>{courses=q.docs.map(d=>({id:d.id,...d.data()}));srv=!q.metadata.fromCache;draw();tidy()}),
  onSnapshot(collection(db,`users/${uid}/tasks`),q=>{tasks=q.docs.map(d=>({id:d.id,...d.data()}));draw()})];
});
