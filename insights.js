import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
const root=document.documentElement,mq=matchMedia('(prefers-color-scheme: dark)');
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const TI={auto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',light:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',dark:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'};
let mode='auto';try{const s=localStorage.getItem('dl-theme');if(s==='light'||s==='dark')mode=s}catch(e){}
const tb=document.createElement('button');tb.id='themeBtn';tb.type='button';tb.className='ib';
$('.hr').insertBefore(tb,$('#mb')||null);
const meta=document.querySelector('meta[name="theme-color"]');
function theme(){
 const dark=mode==='dark'||(mode==='auto'&&mq.matches);
 root.dataset.theme=dark?'dark':'light';
 if(meta)meta.content=dark?'#070A1F':'#BFB0E6';
 tb.innerHTML=svg(TI[mode]);tb.setAttribute('aria-label','Theme: '+mode+'. Tap to change.');tb.title='Theme: '+mode;
}
tb.onclick=()=>{mode={auto:'light',light:'dark',dark:'auto'}[mode];try{if(mode==='auto')localStorage.removeItem('dl-theme');else localStorage.setItem('dl-theme',mode)}catch(e){}theme()};
mq.addEventListener?.('change',theme);theme();
const hello=$('#hello'),p2=n=>String(n).padStart(2,'0'),ymd=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tasks=[],courses=[],subs=[],who='',signed=false;
const greet=()=>{const h=new Date().getHours();return signed?(h<5?'Late night':h<12?'Good morning':h<18?'Good afternoon':'Good evening')+(who?', '+who.split(' ')[0]:''):''};
const dueMs=t=>new Date(t.due).getTime(),fin=t=>t.doneAt||t.updatedAt||0;
const meter=document.createElement('section');meter.id='meter';meter.hidden=true;
meter.innerHTML=`<div class="mh"><span id="ml"></span><span id="mp"></span></div><div class="seg">${'<i></i>'.repeat(32)}</div><div class="mf"><span id="md"></span><span id="mr"></span><span id="ms"></span></div>`;
($('#cls')||$('#list')).before(meter);
const segs=[...meter.querySelectorAll('.seg i')];segs.forEach((s,i)=>s.style.setProperty('--i',i));
const insEl=document.createElement('section');insEl.id='ins';insEl.hidden=true;$('#list').after(insEl);
const days=()=>{const m={};for(const t of tasks)if(t.done&&fin(t)){const k=ymd(new Date(fin(t)));m[k]=(m[k]||0)+1}return m};
const streak=m=>{const d=new Date();let n=0;if(!m[ymd(d)])d.setDate(d.getDate()-1);while(m[ymd(d)]){n++;d.setDate(d.getDate()-1)}return n};
function drawMeter(v){
 const t0=new Date();t0.setHours(0,0,0,0);const a=t0.getTime(),end=v==='today'?a+864e5-1:a+7*864e5;
 const sc=tasks.filter(t=>v==='all'||(dueMs(t)>=a&&dueMs(t)<=end));
 const dn=sc.filter(t=>t.done).length,tot=sc.length,n=tot?Math.round(32*dn/tot):0,st=streak(days());
 segs.forEach((s,i)=>s.classList.toggle('on',i<n));
 $('#ml').textContent={today:"Today's progress",week:'Week progress',all:'Overall progress'}[v];
 $('#mp').textContent=(tot?Math.round(100*dn/tot):0)+'%';
 $('#md').textContent=dn+' done';$('#mr').textContent=(tot-dn)+' left';$('#ms').textContent=st?st+'-day streak':'';
}
function drawIns(){
 const m=days(),now=Date.now(),f=tasks.filter(t=>t.done&&fin(t));
 const wk=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {d,n:m[ymd(d)]||0}});
 const ot=f.filter(t=>fin(t)<=dueMs(t)).length,over=tasks.filter(t=>!t.done&&dueMs(t)<now).length;
 const mon=new Date();mon.setHours(0,0,0,0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7)-28);
 let cells='';
 for(let i=0;i<35;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);const n=m[ymd(d)]||0;cells+=`<i class="g${Math.min(n,4)}${d>new Date()?' fut':''}${ymd(d)===ymd(new Date())?' td':''}" title="${ymd(d)}: ${n} finished"></i>`}
 const per=courses.map(c=>{const a=tasks.filter(t=>t.courseId===c.id);return {c,a:a.length,dn:a.filter(t=>t.done).length}}).filter(x=>x.a);
 insEl.innerHTML=`<div class="stats"><div class="st"><small>Streak</small><b>${streak(m)}<em>days</em></b></div><div class="st"><small>This week</small><b>${wk.reduce((s,x)=>s+x.n,0)}<em>done</em></b></div><div class="st"><small>On time</small><b>${f.length?Math.round(100*ot/f.length)+'<em>%</em>':'-'}</b></div><div class="st"><small>Overdue</small><b>${over}</b></div></div>
<div class="card"><small class="cap">Last 7 days</small><div class="orbs">${wk.map(x=>`<span class="${x.n?'on':''}"><i></i><small>${'SMTWTFS'[x.d.getDay()]}</small></span>`).join('')}</div></div>
<div class="card"><small class="cap">Consistency grid</small><div class="gw">${[...'MTWTFSS'].map(x=>`<span>${x}</span>`).join('')}</div><div class="grid5">${cells}</div></div>${per.length?`<div class="card"><small class="cap">By course</small>${per.map(x=>`<div class="cb"><span>${esc(x.c.name)}</span><div class="seg s10">${[...Array(10)].map((_,i)=>`<i class="${i<Math.round(10*x.dn/x.a)?'on':''}" style="--i:${i}"></i>`).join('')}</div><em>${x.dn}/${x.a}</em></div>`).join('')}</div>`:''}`;
}
function draw(){
 const v=$('#tabs .on')?.dataset.v||'today';
 meter.hidden=!['today','week','all'].includes(v);insEl.hidden=v!=='insights';$('#fab').hidden=v==='insights';
 hello.textContent=greet();
 if(!meter.hidden)drawMeter(v);if(!insEl.hidden)drawIns();
}
onAuthStateChanged(auth,u=>{
 subs.forEach(f=>f());subs=[];tasks=[];courses=[];signed=!!u;who=u?.displayName||'';draw();
 if(!u)return;
 const s=(n,cb)=>onSnapshot(collection(db,`users/${u.uid}/${n}`),q=>{cb(q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.deleted));draw()});
 subs=[s('tasks',a=>tasks=a),s('courses',a=>courses=a)];
});
new MutationObserver(draw).observe($('#ttl'),{childList:true,characterData:true,subtree:true});
setInterval(draw,6e4);
