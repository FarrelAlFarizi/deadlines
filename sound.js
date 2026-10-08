const $=s=>document.querySelector(s);
let on=true;try{on=localStorage.getItem('dl-snd')!=='off'}catch(e){}
let ac=null,master=null;
const ctx=()=>{
 if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ac=new A();master=ac.createGain();master.gain.value=.5;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=3200;master.connect(f);f.connect(ac.destination)}
 if(ac.state==='suspended')ac.resume();
 return ac;
};
const rnd=a=>a[Math.floor(Math.random()*a.length)],jit=(s=.04)=>1+(Math.random()-.5)*2*s;
function tone(f,at,dur,type='square',vol=.07,to=0){
 const c=ctx();if(!c)return;
 const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);
}
const PENT=[523.25,587.33,659.25,783.99,880,1046.5];
const FX={
 tap:()=>tone(rnd(PENT)*jit(),0,.05,rnd(['square','triangle']),.05),
 tab:i=>tone(PENT[i%PENT.length]*jit(.01),0,.07,'square',.05),
 check:()=>{const r=rnd([1,1.122,1.26]);tone(659*r,0,.07,'square',.06);tone(988*r*jit(.01),.07,.14,'square',.06)},
 uncheck:()=>{const r=rnd([1,1.122]);tone(587*r,0,.06,'triangle',.07);tone(392*r,.06,.1,'triangle',.07)},
 open:()=>tone(330*jit(),0,.16,'square',.05,660*jit()),
 close:()=>tone(520*jit(),0,.12,'square',.04,260),
 save:()=>{const r=rnd([1,1.122,1.26]);tone(523*r,0,.06,'square',.06);tone(659*r,.06,.06,'square',.06);tone(784*r,.12,.14,'square',.06)},
 del:()=>tone(240*jit(),0,.2,'sawtooth',.05,90),
 theme:()=>{tone(300,0,.28,'triangle',.07,900);tone(450,.05,.28,'triangle',.05,1200)},
 undo:()=>{tone(440,0,.06,'triangle',.07);tone(660,.06,.1,'triangle',.07)}
};
function kindOf(e){
 const t=e.target;if(!t||!t.closest)return null;
 if(t.closest('.chk'))return t.closest('.t')?.classList.contains('fin')?'uncheck':'check';
 if(t.closest('#fab'))return 'open';
 if(t.closest('#themeBtn'))return 'theme';
 if(t.closest('#tdel,#cdel,#seldel'))return 'del';
 if(t.closest('#toast button'))return 'undo';
 const tb=t.closest('#tabs button');
 if(tb)return ['tab',[...tb.parentNode.children].filter(x=>x.tagName==='BUTTON').indexOf(tb)];
 if(t.closest('dialog .pri'))return 'save';
 if(t.closest('dialog [data-x],dialog #sx,dialog #pc,dialog #bc,dialog #ox'))return 'close';
 if(t.closest('button,.t,.chip'))return 'tap';
 return null;
}
document.addEventListener('click',e=>{
 if(!on)return;const k=kindOf(e);if(!k)return;
 try{Array.isArray(k)?FX[k[0]](k[1]):FX[k]()}catch(err){}
},true);
const menu=$('#menu');
if(menu){
 const b=document.createElement('button');b.className='lnk';b.type='button';
 const lab=()=>{b.textContent='Sounds: '+(on?'On':'Off')};lab();
 b.onclick=()=>{on=!on;try{localStorage.setItem('dl-snd',on?'on':'off')}catch(e){}lab();if(on)FX.save()};
 menu.insertBefore(b,$('#out'));
}
