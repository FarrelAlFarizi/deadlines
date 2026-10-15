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
const PAL={k:'#14173F',y:'#FFD54A',d:'#E3A400',o:'#FF8A1F'};
const S={
 cal:['..k......k..','..k......k..','kkkkkkkkkkkk','k..........k','kkkkkkkkkkkk','k.kk.kk.kk.k','k.kk.kk.kk.k','k..........k','k.kk.kk....k','k.kk.kk....k','k..........k','kkkkkkkkkkkk'],
 bell:['.....k.....','...kkkkk...','..kkkkkkk..','..kkkkkkk..','..kkkkkkk..','.kkkkkkkkk.','.kkkkkkkkk.','kkkkkkkkkkk','...........','....kkk....','.....k.....'],
 sync:['.....k.....','.....kk....','kkkkkkkkk..','.....kk....','.....k.....','...........','.....k.....','....kk.....','..kkkkkkkkk','....kk.....','.....k.....'],
 list:['kk.kkkkkkkk','kk.kkkkkkkk','...........','kk.kkkkkkkk','kk.kkkkkkkk','...........','kk.kkkkkkkk','kk.kkkkkkkk'],
 duck:['....kkkk.........','...kyyyyk........','..kyyyyyyk.......','..kyykyyyyokkk...','..kyyyyyyyooook..','..kyyyyyyykkkk...','...kyyyyyk.......','..kyyyyyyyk......','.kyyyyyyyyyk.....','.kyyddyyyyyyk....','.kyydddyyyyyyk...','..kyyyyyyyyyk....','...kkkkkkkkk.....']
};
function paint(cv,rows,pal,k){
 const W=Math.max(...rows.map(r=>r.length)),H=rows.length;cv.width=W;cv.height=H;
 cv.style.width=W*k+'px';cv.style.height=H*k+'px';
 const c=cv.getContext('2d');if(!c)return;
 rows.forEach((r,y)=>{for(let x=0;x<r.length;x++){const ch=r[x];if(ch!=='.'){c.fillStyle=pal[ch]||PAL.k;c.fillRect(x,y,1,1)}}});
}
$$('canvas[data-s]').forEach(cv=>paint(cv,S[cv.dataset.s],PAL,+cv.dataset.k));
function sunMoon(){
 const k=5,sun=$('#sunC'),moon=$('#moonC');
 {const R=12;sun.width=2*R+1;sun.height=R+2;sun.style.width=sun.width*k+'px';sun.style.height=sun.height*k+'px';const c=sun.getContext('2d');
  if(c)for(let y=0;y<=R;y++){const dy=R-y,hw=Math.floor(Math.sqrt(R*R-dy*dy));c.fillStyle='#F5B335';c.fillRect(R-hw,y,2*hw+1,1);c.fillStyle='#FFD966';c.fillRect(R-hw+1,y,Math.max(0,2*hw-1),1)}}
 {const R=9,W=2*R+9,H=2*R+3;moon.width=W;moon.height=H;moon.style.width=W*k+'px';moon.style.height=H*k+'px';const c=moon.getContext('2d');
  if(c){const cx=R+4,cy=R+1;
   for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++){const d=Math.sqrt(x*x+y*y);if(d<=R){c.fillStyle=(x+y*.6>R*.55)?'#C9D0EC':'#E9EDFB';c.fillRect(cx+x,cy+y,1,1)}}
   c.fillStyle='#C3CBEA';[[-3,-2,2],[3,2,2],[-1,5,1]].forEach(([x,y,r])=>c.fillRect(cx+x-r+1,cy+y-r+1,r,r));
   c.fillStyle='#FFFFFF';[[1,1],[W-2,4],[2,H-3],[W-3,H-6]].forEach(([x,y])=>{c.fillRect(x,y,1,1)});}}
}
sunMoon();
const auth=getAuth(initializeApp({apiKey:"AIzaSyBe49PRXy_VtbrE-2I80AUo28CVUZPhY30",authDomain:"deadline-tracker-220cc.firebaseapp.com",projectId:"deadline-tracker-220cc",storageBucket:"deadline-tracker-220cc.firebasestorage.app",messagingSenderId:"700144852855",appId:"1:700144852855:web:ac7badeace66dc61d4cb72"}));
let signed=false;const msg=$('#authMsg');
async function start(){
 msg.textContent='';
 if(signed){location.href='app.html';return}
 const p=new GoogleAuthProvider();
 try{await signInWithPopup(auth,p);location.href='app.html'}
 catch(e){
  if(e&&(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request'))return;
  try{sessionStorage.setItem('dl-auth','1');await signInWithRedirect(auth,p)}catch(e2){msg.textContent='Could not sign in: '+((e2&&e2.message)||e2)}
 }
}
$$('[data-auth]').forEach(b=>{b.onclick=start});
onAuthStateChanged(auth,u=>{
 signed=!!u;if(!u)return;
 $$('[data-auth]').forEach(b=>{b.querySelector('.lbl').textContent=b.dataset.in});
 $('#note').textContent='You are signed in.';
 let r=false;try{r=sessionStorage.getItem('dl-auth');sessionStorage.removeItem('dl-auth')}catch(e){}
 if(r)location.href='app.html';
});
