import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
/* First-visit guide: dims the screen, outlines one real control at a time and says what it does. Skippable, replayable from the ⋯ menu */
const auth=getAuth(getApp()),$=s=>document.querySelector(s);
let uid=null,i=0,steps=[],auto=null,from=null,fromMenu=false;
const seen=()=>{try{return localStorage.getItem('dl-tour-'+uid)==='1'}catch(e){return true}};
const mark=()=>{try{localStorage.setItem('dl-tour-'+uid,'1')}catch(e){}};
const vis=el=>!!el&&el.getClientRects().length>0&&!el.closest('[hidden]');
const tab=v=>$(`#tabs button[data-v="${v}"]`);
const AGAIN='You can see the guide again from the ⋯ menu.';

const ALL=[
 {t:'Welcome to CleanSlate',b:'A quick look at where everything is. It takes under a minute, and you can skip it anytime.'},
 {el:()=>$('#fab'),act:true,t:'Add a deadline',b:'Tap + to add an assignment, quiz, exam or project with its due time. For a weekly quiz or lab, tick “Repeats every week” and enter it once.'},
 {el:()=>tab('agenda'),t:'Your agenda',b:'Agenda shows what’s overdue, today, the next 7 days and later, with your classes in between. Once you have deadlines, tap the circle next to one when it’s done.'},
 {el:()=>tab('courses'),t:'Your classes',b:'Courses holds each class with its weekly time and room. Tap a course for its notes, files and photos.'},
 {el:()=>tab('insights'),t:'See how you’re doing',b:'Insights counts what you finished and what’s still open.'},
 {el:()=>$('#cal'),t:'Reminders on your phone',b:'Connect Google Calendar and your deadlines and classes go into your calendar, with alerts before each one.'},
 {el:()=>$('#srch'),t:'Find a deadline',b:'Search by name, or show only quizzes, exams and so on.'},
 {el:()=>$('#mb'),t:'More options',b:'Reminder times, backup, privacy, sign out, and this guide again if you need it.'},
 {el:()=>vis($('#setup'))&&!$('#setup').classList.contains('mini')?$('#setup'):null,act:true,t:'Start here',b:'These three steps set up your semester: add your classes, your first deadline, then phone reminders.',last:true},
 {t:'You’re all set',b:'Tap + whenever a new deadline comes up. You can replay this guide from the ⋯ menu.',last:true,end:true}
];

const d=document.createElement('dialog');d.id='tour';
d.innerHTML=`<div class="tr-hole" aria-hidden="true"></div><div class="tr-safe" aria-hidden="true"></div>
<div class="tr-card" role="document"><div class="tr-txt"><small class="tr-n" id="trn"></small><h2 id="trt"></h2><p id="trb"></p></div>
<div class="act"><button type="button" class="lnk" id="trs">Skip guide</button><span></span><button type="button" class="lnk" id="trp">Back</button><button type="button" class="pri" id="trx">Next</button></div></div>
<p class="vh" id="trlive" aria-live="polite"></p>`;
document.body.append(d);d.setAttribute('aria-labelledby','trt');d.setAttribute('aria-describedby','trb');
const hole=d.querySelector('.tr-hole'),card=d.querySelector('.tr-card'),safe=d.querySelector('.tr-safe'),live=d.querySelector('#trlive');

/* Room to keep clear: 16px, plus the iPhone notch, status bar and home indicator (the app draws under them) */
function edges(){const s=getComputedStyle(safe),n=k=>16+(parseFloat(s['padding'+k])||0);return {t:n('Top'),b:n('Bottom'),l:n('Left'),r:n('Right')}}
function place(){
 const s=steps[i],el=s.el&&s.el(),W=document.documentElement.clientWidth,H=innerHeight,G=edges();
 card.style.maxHeight='';
 if(el){
  el.scrollIntoView({block:'nearest',behavior:'instant'});
  const r=el.getBoundingClientRect(),p=6,gap=12,rad=parseFloat(getComputedStyle(el).borderTopLeftRadius)||14;
  Object.assign(hole.style,{transform:`translate(${r.left-p}px,${r.top-p}px)`,width:r.width+2*p+'px',height:r.height+2*p+'px',borderRadius:(el.id==='fab'?'50%':rad+p+'px')});
  hole.classList.remove('off');
  /* Below or above the control if the card fits; beside it on wide screens; else on the roomier side with its text scrolling */
  const ch=card.offsetHeight,cw=card.offsetWidth,fitH=ch<=H-G.t-G.b;
  const below=r.bottom+p+gap,upTo=r.top-p-gap,roomB=H-G.b-below,roomA=upTo-G.t,right=r.right+p+gap,leftEnd=r.left-p-gap;
  const midY=Math.min(Math.max(G.t,r.top+r.height/2-ch/2),H-ch-G.b);
  let top,left=Math.min(Math.max(G.l,r.left+r.width/2-cw/2),W-cw-G.r),max=0;
  if(ch<=roomB)top=below;
  else if(ch<=roomA)top=upTo-ch;
  else if(fitH&&W-G.r-right>=cw){left=right;top=midY}
  else if(fitH&&leftEnd-G.l>=cw){left=leftEnd-cw;top=midY}
  else if(Math.max(roomA,roomB)>=160){max=Math.max(roomA,roomB);top=roomB>=roomA?below:G.t}
  else{max=H-G.t-G.b;top=G.t}
  if(max)card.style.maxHeight=max+'px';
  card.style.top=top+'px';card.style.left=left+'px';
 }else{
  hole.classList.add('off');Object.assign(hole.style,{transform:`translate(${W/2}px,${H/2}px)`,width:'0px',height:'0px'});
  card.style.maxHeight=H-G.t-G.b+'px';
  card.style.top=Math.max(G.t,(H-card.offsetHeight)/2)+'px';card.style.left=Math.max(G.l,(W-card.offsetWidth)/2)+'px';
 }
 /* Text that has to scroll can be reached by keyboard */
 const tx=card.querySelector('.tr-txt');if(tx.scrollHeight>tx.clientHeight+1){tx.tabIndex=0;tx.setAttribute('aria-label','Guide text')}else{tx.removeAttribute('tabindex');tx.removeAttribute('aria-label')}
}
function show(say){
 const s=steps[i],n=i?`${i} of ${steps.length-1}`:'Guide';
 $('#trn').textContent=n;$('#trt').textContent=s.t;$('#trb').textContent=s.b;
 $('#trp').hidden=i===0;$('#trs').hidden=!!s.last;
 $('#trx').textContent=i===0?'Start':s.last?'Done':'Next';
 card.classList.remove('in');void card.offsetWidth;card.classList.add('in');card.querySelector('.tr-txt').scrollTop=0;
 place();$('#trx').focus();
 /* Focus stays on the same button, so screen readers hear the new step from a live region */
 if(say){live.textContent='';setTimeout(()=>{live.textContent=`${i?'Step '+n+'. ':''}${s.t}. ${s.b}`},60)}
}
const go=k=>{const j=i+k;if(j<0||j>=steps.length)return;i=j;show(true)};
const next=()=>{if(steps[i].last)stop();else go(1)};
function start(){
 if(!uid||d.open)return;
 clearTimeout(auto);from=document.activeElement;
 if((tab('agenda')&&!tab('agenda').classList.contains('on')))tab('agenda').click();
 scrollTo({top:0,behavior:'instant'});
 /* Only steps whose control is on screen right now; the setup card step replaces the closing "all set" step */
 steps=ALL.filter(s=>!s.el||vis(s.el()));
 if(steps.some(s=>s.last&&!s.end))steps=steps.filter(s=>!s.end);
 i=0;mark();d.showModal();show(false);
}
/* Afterwards, focus goes back where it was, or to the ⋯ button when the guide was opened from that menu (after the 0.2s fade, once the page is no longer inert) */
function back(){
 const t=fromMenu?$('#mb'):vis(from)&&from!==document.body?from:null;from=null;fromMenu=false;live.textContent='';
 if(t)setTimeout(()=>t.focus({preventScroll:true}),260);
}
const stop=skipped=>{d.close();back();if(skipped)window.dlToast?.(AGAIN)};
$('#trx').onclick=next;
$('#trp').onclick=()=>go(-1);
$('#trs').onclick=()=>stop(true);
/* Tapping the outlined control: for + and the setup card it does the real thing and the guide ends; elsewhere it moves on */
d.addEventListener('click',e=>{
 if(card.contains(e.target)||hole.classList.contains('off'))return;
 const r=hole.getBoundingClientRect(),s=steps[i];
 if(!(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom))return;
 const el=s.act&&s.el(),inside=b=>{const q=b.getBoundingClientRect();return e.clientX>=q.left&&e.clientX<=q.right&&e.clientY>=q.top&&e.clientY<=q.bottom};
 const hit=el&&(el.matches('button')?el:[...el.querySelectorAll('button')].find(b=>vis(b)&&inside(b)));
 if(!hit){next();return}
 from=null;fromMenu=false;d.close();setTimeout(()=>hit.click(),0);
});
/* The page underneath stays put: wheel, touch drags and scroll keys only scroll the card's own text */
const inText=t=>t instanceof Element&&!!t.closest('.tr-txt');
d.addEventListener('wheel',e=>{if(!inText(e.target))e.preventDefault()},{passive:false});
d.addEventListener('touchmove',e=>{if(!inText(e.target))e.preventDefault()},{passive:false});
d.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'&&!steps[i].last)go(1);
 else if(e.key==='ArrowLeft')go(-1);
 else if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)&&!inText(e.target))e.preventDefault();
});
addEventListener('scroll',()=>{if(d.open&&!d.classList.contains('closing'))place()},{passive:true});
addEventListener('resize',()=>{if(d.open)place()});
d.addEventListener('cancel',()=>{const s=steps[i];back();if(!s?.last)setTimeout(()=>window.dlToast?.(AGAIN),250)});
window.dlTour=start;

/* Replay from the ⋯ menu */
const mi=document.createElement('button');mi.type='button';mi.textContent='Show the guide';mi.onclick=()=>setTimeout(()=>{start();fromMenu=d.open},200);
const menu=$('#menu');if(menu)menu.insertBefore(mi,menu.querySelector('a'));

/* Auto-start once, for a new account: onboard.js marks the body "onb" while the full setup card shows */
const tryAuto=()=>{
 clearTimeout(auto);
 if(!uid||seen()||!document.body.classList.contains('onb')||$('#app').hidden)return;
 auto=setTimeout(()=>{if(!seen()&&document.body.classList.contains('onb')&&!document.querySelector('dialog[open]'))start()},700);
};
new MutationObserver(tryAuto).observe(document.body,{attributes:true,attributeFilter:['class']});
onAuthStateChanged(auth,u=>{uid=u?.uid||null;if(!u&&d.open)d.close();tryAuto()});
