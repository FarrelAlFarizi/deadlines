import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
/* First minute: a "Set up your semester" card (classes, first deadline, Calendar) that ticks itself off and never returns once done */
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const TICK=svg('<path d="m6 12.5 4 4 8-9"/>'),GO=svg('<path d="m9.5 6 6 6-6 6"/>');
let uid=null,courses=[],tasks=[],ready=0,subs=[];
const get=k=>{try{return localStorage.getItem(k+uid)}catch(e){return null}};
const put=(k,v)=>{try{localStorage.setItem(k+uid,v)}catch(e){}};
const usesCal=()=>get('dl-cal-')==='1'||tasks.some(t=>t.calSig)||courses.some(c=>c.calSig);

const card=document.createElement('section');card.id='setup';card.hidden=true;card.setAttribute('aria-labelledby','setup-h');
($('#meter')||$('#cls')||$('#list')).before(card);

function step(n,done,title,note,action,extra=''){
 return `<li class="su-step${done?' done':''}"><button type="button" class="su-go" data-act="${action}"><span class="su-n" aria-hidden="true">${done?TICK:n}</span><span class="su-t"><b>${title}</b><small>${note}</small></span><span class="su-ch" aria-hidden="true">${GO}</span></button>${extra}</li>`;
}
function draw(){
 const v=$('#tabs .on')?.dataset.v||'agenda',inView=v==='agenda';
 const c1=courses.length>0,c2=tasks.length>0,c3=usesCal(),skip=get('dl-onb-cal-')==='skip';
 if(c1&&c2)put('dl-onb-','done');
 const full=uid&&ready>=2&&get('dl-onb-')!=='done'&&!(c1&&c2);
 const mini=uid&&ready>=2&&!full&&!c3&&!skip&&get('dl-onb-')==='done';
 document.body.classList.toggle('onb',!!full&&inView);
 card.hidden=!(inView&&(full||mini));
 if(card.hidden)return;
 const n=[c1,c2,c3].filter(Boolean).length,cn=courses.length;
 const cal=step(3,c3,'Get reminders on your phone','Your deadlines and classes in Google Calendar, with alerts. <span class="su-rec">Recommended</span>','cal',c3?'':'<button type="button" class="lnk su-skip" data-act="skip">Not now</button>');
 card.className=full?'':'mini';
 card.innerHTML=full
  ?`<div class="su-head"><h2 id="setup-h">Set up your semester</h2><span class="su-count">${n} of 3 done</span></div>
    <p class="su-lede">Three quick steps, about a minute. You can change everything later.</p>
    <ol>${step(1,c1,c1?`${cn} ${cn===1?'class':'classes'} added`:'Add your classes',c1?'Tap to add another class.':'Name, weekly day and time, room. They show up on the right days.','course')}
    ${step(2,c2,'Add your first deadline','An assignment, quiz, exam or project with its due time.','task')}
    ${cal}</ol>`
  :`<h2 id="setup-h" class="vh">One more step</h2><ol>${cal}</ol>`;
}
card.addEventListener('click',e=>{
 const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 if(a==='course')window.dlOpenCourse?.();
 else if(a==='task'){const last=[...courses].sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0))[0];window.dlOpenTask?.(null,last?.id||'')}
 else if(a==='cal')window.dlCalPrimer?.();
 else if(a==='skip'){put('dl-onb-cal-','skip');draw()}
});
$('#tabs').addEventListener('click',()=>setTimeout(draw,0));
addEventListener('dlcal',draw);

onAuthStateChanged(auth,u=>{
 subs.forEach(f=>f());subs=[];uid=u?.uid||null;courses=[];tasks=[];ready=0;draw();
 if(!u)return;
 /* An empty offline copy is not proof of a new account, so wait for the server (or real data) before deciding */
 const s=(n,set)=>{let first=true;return onSnapshot(collection(db,`users/${uid}/${n}`),{includeMetadataChanges:true},q=>{set(q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.deleted));if(first&&(!q.metadata.fromCache||q.size)){first=false;ready++}draw()},()=>{if(first){first=false;ready++}draw()})};
 subs=[s('courses',a=>courses=a),s('tasks',a=>tasks=a)];
});
