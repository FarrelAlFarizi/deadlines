import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const root=document.documentElement,mq=matchMedia('(prefers-color-scheme: dark)');
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const TI={auto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',light:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',dark:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'};
let mode='auto';try{const s=localStorage.getItem('dl-theme');if(s==='light'||s==='dark')mode=s}catch(e){}
const tb=$('#theme');
function theme(){root.dataset.theme=mode==='dark'||(mode==='auto'&&mq.matches)?'dark':'light';tb.innerHTML=svg(TI[mode]);tb.setAttribute('aria-label','Theme: '+mode+'. Tap to change.');tb.title='Theme: '+mode}
tb.onclick=()=>{mode={auto:'light',light:'dark',dark:'auto'}[mode];try{if(mode==='auto')localStorage.removeItem('dl-theme');else localStorage.setItem('dl-theme',mode)}catch(e){}theme()};
if(mq.addEventListener)mq.addEventListener('change',theme);theme();
function sunMoon(){
 const k=3,sun=$('#sunC'),moon=$('#moonC');
 {const R=12;sun.width=2*R+1;sun.height=R+2;sun.style.width=sun.width*k+'px';sun.style.height=sun.height*k+'px';const c=sun.getContext('2d');
  if(c)for(let y=0;y<=R;y++){const dy=R-y,hw=Math.floor(Math.sqrt(R*R-dy*dy));c.fillStyle='#F5B335';c.fillRect(R-hw,y,2*hw+1,1);c.fillStyle='#FFD966';c.fillRect(R-hw+1,y,Math.max(0,2*hw-1),1)}}
 {const R=9,W=2*R+9,H=2*R+3;moon.width=W;moon.height=H;moon.style.width=W*k+'px';moon.style.height=H*k+'px';const c=moon.getContext('2d');
  if(c){const cx=R+4,cy=R+1;
   for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++){const d=Math.sqrt(x*x+y*y);if(d<=R){c.fillStyle=(x+y*.6>R*.55)?'#C9D0EC':'#E9EDFB';c.fillRect(cx+x,cy+y,1,1)}}
   c.fillStyle='#C3CBEA';[[-3,-2,2],[3,2,2],[-1,5,1]].forEach(([x,y,r])=>c.fillRect(cx+x-r+1,cy+y-r+1,r,r));
   c.fillStyle='#FFFFFF';[[1,1],[W-2,4],[2,H-3],[W-3,H-6]].forEach(([x,y])=>{c.fillRect(x,y,1,1)});}}
}
sunMoon();

const BARS='<path d="M4 7h16M4 12h16M4 17h16"/>',XX='<path d="M6 6l12 12M18 6 6 18"/>';
const mb=$('#menuBtn'),mn=$('#mnav');
function menu(open){mn.hidden=!open;mb.setAttribute('aria-expanded',String(open));mb.setAttribute('aria-label',open?'Close menu':'Open menu');mb.innerHTML=svg(open?XX:BARS)}
menu(false);
mb.onclick=()=>menu(mn.hidden);
mn.addEventListener('click',e=>{if(e.target.closest('a'))menu(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!mn.hidden){menu(false);mb.focus()}});
matchMedia('(min-width:860px)').addEventListener('change',e=>{if(e.matches)menu(false)});

const auth=getAuth(initializeApp({apiKey:"AIzaSyBe49PRXy_VtbrE-2I80AUo28CVUZPhY30",authDomain:"deadline-tracker-220cc.firebaseapp.com",projectId:"deadline-tracker-220cc",storageBucket:"deadline-tracker-220cc.firebasestorage.app",messagingSenderId:"700144852855",appId:"1:700144852855:web:ac7badeace66dc61d4cb72"}));
let signed=false,busy=false;const msg=$('#authMsg'),AUTH=$$('[data-auth]');
AUTH.forEach(b=>{b.dataset.idle=b.querySelector('.lbl').textContent});
function paintAuth(){AUTH.forEach(b=>{b.disabled=busy;b.setAttribute('aria-busy',String(busy));b.querySelector('.lbl').textContent=busy?'Opening Google\u2026':(signed?b.dataset.in:b.dataset.idle)})}
async function start(){
 if(busy)return;
 msg.textContent='';
 if(signed){location.href='app.html';return}
 if(navigator.onLine===false){msg.textContent='You\u2019re offline. Connect to the internet, then try again.';return}
 busy=true;paintAuth();
 const p=new GoogleAuthProvider();
 try{await signInWithPopup(auth,p);location.href='app.html'}
 catch(e){
  if(e&&(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')){busy=false;paintAuth();return}
  try{sessionStorage.setItem('dl-auth','1');await signInWithRedirect(auth,p)}
  catch(e2){console.error(e2);try{sessionStorage.removeItem('dl-auth')}catch(_){}busy=false;paintAuth();msg.textContent='Couldn\u2019t sign you in. Check your connection and try again. If a pop-up was blocked, allow pop-ups for this site.'}
 }
}
AUTH.forEach(b=>{b.onclick=start});
onAuthStateChanged(auth,u=>{
 signed=!!u;if(!u)return;
 paintAuth();
 $('#note').textContent='You\u2019re signed in.';
 let r=false;try{r=sessionStorage.getItem('dl-auth');sessionStorage.removeItem('dl-auth')}catch(e){}
 if(r)location.href='app.html';
});
