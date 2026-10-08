/*PURE*/
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const HX=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const SKY={day:['#BFB0E6','#D6B4E4','#EDB9D0','#F8C4BE','#FFD6A8','#FFE7C0'].map(HX),dusk:['#4B3F8F','#7A4A9A','#B65A93','#E27A86','#F5A36C','#FFC98A'].map(HX),night:['#070A1F','#0B1030','#101A45','#172358','#202C6B','#2A3680'].map(HX)};
const LAND={far:{day:{rim:HX('#A98BC4'),body:HX('#8E6AA8'),deep:HX('#6C4C8A')},night:{rim:HX('#9AA3D6'),body:HX('#6F79B4'),deep:HX('#4A5490')}},near:{day:{rim:HX('#6B4F8C'),body:HX('#4A3566'),deep:HX('#2F2145')},night:{rim:HX('#C9D0EC'),body:HX('#8D97CB'),deep:HX('#5D68A4')}}};
const CLOUD={day:{top:HX('#FFFFFF'),sh:HX('#F0C6D8')},dusk:{top:HX('#FFC9B0'),sh:HX('#D9728F')},night:{top:HX('#59659F'),sh:HX('#343E78')}};
const SUNC=[HX('#FFF6CE'),HX('#FFB067')],SUNR=[HX('#FFD27D'),HX('#FF8A4C')],SUNG=[HX('#FFE2A8'),HX('#FF9C6B')],MOONG=HX('#7C8CE0');
const CB=[[0,0,5],[-6,2,3.6],[6,2,4],[11,3.2,3],[-11,3,2.6]],CR=[[-.3,-.2,.18],[.25,.15,.22],[-.05,.4,.12]];
const lerp=(a,b,k)=>a+(b-a)*k,mixC=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
const pk=(r,g,b)=>(0xFF000000|(Math.round(b)<<16)|(Math.round(g)<<8)|Math.round(r))>>>0;
const pc=c=>pk(c[0],c[1],c[2]);
const mixp=(c,t,k)=>pk(lerp(c&255,t[0],k),lerp((c>>8)&255,t[1],k),lerp((c>>16)&255,t[2],k));
const MOON_CORE=pk(233,237,251),MOON_RIM=pk(195,203,234),MOON_CR=pk(197,205,236),MOON_SH=pk(205,212,238);
const PROF={far:[(x,H)=>H*(.80-.035*Math.sin(x*.05+.5)-.02*Math.sin(x*.13+2)),(x,H)=>H*(.77-.018*Math.abs(Math.sin(x*.2+.3))-.01*Math.abs(Math.sin(x*.47)))],near:[(x,H)=>H*(.88-.03*Math.sin(x*.04+3)-.015*Math.sin(x*.12)),(x,H)=>H*(.86-.022*Math.abs(Math.sin(x*.17+1.2))-.012*Math.abs(Math.sin(x*.41+2)))]};
function rng(seed){let s=seed>>>0;return()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296}
function mkStars(GW,GH,seed){const r=rng(seed),n=Math.round(GW*GH/230),a=[];for(let i=0;i<n;i++)a.push({x:Math.floor(r()*GW),y:Math.floor(r()*GH*.66),big:r()<.14,th:r()*.85,ph:r()*6.28});return a}
function mkClouds(GW,GH,seed){const r=rng(seed),a=[];for(let i=0;i<6;i++)a.push({x:r()*(GW+60),y:GH*(.1+.45*r()),s:.7+.9*r(),v:.5+1.3*r()});return a}
function skyBg(buf,GW,GH,t){
 const k=t<.5?t*2:(t-.5)*2,A=t<.5?SKY.day:SKY.dusk,B=t<.5?SKY.dusk:SKY.night;
 const p=A.map((a,i)=>pc(mixC(a,B[i],k))),hz=GH*.84;
 for(let y=0;y<GH;y++){const f=Math.min(5,y/hz*5),i=Math.min(4,Math.floor(f)),fr=f-i,row=y*GW;
  for(let x=0;x<GW;x++)buf[row+x]=fr>BAYER[((y&3)<<2)|(x&3)]?p[i+1]:p[i]}
}
function stars(buf,lay,GW,GH,t,time,S){
 const n=Math.max(0,Math.min(1,(t-.35)/.55));if(n<=0)return;
 const put=(x,y,c)=>{if(x>=0&&x<GW&&y>=0&&y<GH){buf[y*GW+x]=c;if(lay)lay[y*GW+x]=2}};
 const w=pk(235,240,255),d=pk(160,172,230);
 for(const s of S){if(n*(.62+.38*Math.sin(time*2.2+s.ph))<=s.th)continue;put(s.x,s.y,w);if(s.big){put(s.x-1,s.y,d);put(s.x+1,s.y,d);put(s.x,s.y-1,d);put(s.x,s.y+1,d)}}
}
function disc(buf,lay,GW,GH,cx,cy,R,core,rim,glow,gk,m,det){
 const g=R*1.9,x0=Math.max(0,Math.floor(cx-g)),x1=Math.min(GW-1,Math.ceil(cx+g)),y0=Math.max(0,Math.floor(cy-g)),y1=Math.min(GH-1,Math.ceil(cy+g));
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const dx=x+.5-cx,dy=y+.5-cy,d=Math.sqrt(dx*dx+dy*dy),i=y*GW+x;
  if(d<=R){let c=d>R-1.5?rim:core;if(det)c=det(dx,dy,c);buf[i]=c;if(lay)lay[i]=m}
  else if(d<g&&(1-(d-R)/(g-R))*gk>BAYER[((y&3)<<2)|(x&3)])buf[i]=mixp(buf[i],glow,.4);
 }
}
function clouds(buf,lay,GW,GH,t,time,C){
 const k=t<.5?t*2:(t-.5)*2,A=t<.5?CLOUD.day:CLOUD.dusk,B=t<.5?CLOUD.dusk:CLOUD.night;
 const top=pc(mixC(A.top,B.top,k)),sh=pc(mixC(A.sh,B.sh,k)),W=GW+60;
 for(const c of C){
  const cx=((c.x+time*c.v)%W+W)%W-30;
  for(let y=Math.floor(c.y-6*c.s);y<=Math.floor(c.y+3.2*c.s);y++){
   if(y<0||y>=GH)continue;
   for(let x=Math.floor(cx-14*c.s);x<=Math.ceil(cx+14*c.s);x++){
    if(x<0||x>=GW)continue;
    let ins=false;
    for(const b of CB){const dx=x-(cx+b[0]*c.s),dy=y-(c.y+b[1]*c.s);if(dx*dx+dy*dy<=b[2]*b[2]*c.s*c.s){ins=true;break}}
    if(!ins)continue;
    const i=y*GW+x;buf[i]=y>c.y+1.4*c.s?sh:top;if(lay)lay[i]=3;
   }
  }
 }
}
function land(buf,lay,GW,GH,t,sh,L,m){
 const a=LAND[L].day,b=LAND[L].night,rim=pc(mixC(a.rim,b.rim,t)),bc=pc(mixC(a.body,b.body,t)),dc=pc(mixC(a.deep,b.deep,t)),[pd,pn]=PROF[L];
 for(let x=0;x<GW;x++){
  const y0=Math.max(0,Math.floor(lerp(pd(x+sh,GH),pn(x+sh,GH),t)));
  for(let y=y0;y<GH;y++){
   const dp=(y-y0)/(GH-y0+1),i=y*GW+x;
   buf[i]=y-y0<2?rim:(dp>BAYER[((y&3)<<2)|(x&3)]*1.15?dc:bc);
   if(lay)lay[i]=m;
  }
 }
}
function scene(buf,lay,GW,GH,t,time,S,C){
 if(lay)lay.fill(0);
 skyBg(buf,GW,GH,t);
 stars(buf,lay,GW,GH,t,time,S);
 const a=-Math.PI/2+Math.PI*t,cx=GW/2,cy=GH*.88,rx=GW*.46,ry=GH*.5,mn=Math.min(GW,GH);
 const sx=cx+rx*Math.cos(a),sy=cy+ry*Math.sin(a),mx=cx-rx*Math.cos(a),my=cy-ry*Math.sin(a);
 const low=Math.max(0,Math.min(1,(sy-GH*.38)/(GH*.46)));
 disc(buf,lay,GW,GH,sx,sy,Math.max(5,Math.round(mn*.12)),pc(mixC(SUNC[0],SUNC[1],low)),pc(mixC(SUNR[0],SUNR[1],low)),mixC(SUNG[0],SUNG[1],low),.95,4);
 const Rm=Math.max(4,Math.round(mn*.095));
 disc(buf,lay,GW,GH,mx,my,Rm,MOON_CORE,MOON_RIM,MOONG,.8,5,(dx,dy,c)=>{for(const [ox,oy,r] of CR)if((dx-ox*Rm)**2+(dy-oy*Rm)**2<=(r*Rm)**2)return MOON_CR;return dx+dy*.6>Rm*.55?MOON_SH:c});
 clouds(buf,lay,GW,GH,t,time,C);
 land(buf,lay,GW,GH,t,time*.6*t,'far',6);
 land(buf,lay,GW,GH,t,time*1.1*t,'near',7);
}
/*ENDPURE*/
const $=s=>document.querySelector(s),root=document.documentElement;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let still=false;try{still=localStorage.getItem('dl-bg')==='still'}catch(e){}
const cv=document.createElement('canvas');cv.id='sky';cv.setAttribute('aria-hidden','true');document.body.prepend(cv);
const ctx=cv.getContext&&cv.getContext('2d');
if(ctx){
 let GW,GH,PX,img,buf,S,C,tCur,tFrom,tTo,tStart=0,last=0,raf=0,rt=0;
 const target=()=>root.dataset.theme==='dark'?1:0;
 const draw=()=>{scene(buf,null,GW,GH,tCur,still||reduce?0:performance.now()/1000,S,C);ctx.putImageData(img,0,0)};
 const align=()=>{cv.style.left=((root.clientWidth||innerWidth)-GW*PX)/2+'px'};
 const size=()=>{
  const W=innerWidth,Hh=innerHeight;
  PX=Math.max(3,Math.min(6,Math.round(Math.min(W,Hh)/100)));GW=Math.ceil(W/PX);GH=Math.ceil(Hh/PX);
  cv.width=GW;cv.height=GH;cv.style.width=GW*PX+'px';cv.style.height=GH*PX+'px';align();
  img=ctx.createImageData(GW,GH);buf=new Uint32Array(img.data.buffer);S=mkStars(GW,GH,7);C=mkClouds(GW,GH,11);draw();
 };
 const tick=now=>{
  raf=0;const moving=tTo!==tCur;
  if(moving){const k=Math.min(1,(now-tStart)/2000),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;tCur=k>=1?tTo:tFrom+(tTo-tFrom)*e}
  const ambient=!still&&!reduce&&!document.hidden;
  if(moving||ambient){if(now-last>=(moving?33:66)){last=now;draw()}raf=requestAnimationFrame(tick)}
 };
 const go=()=>{if(!raf)raf=requestAnimationFrame(tick)};
 const set=v=>{tFrom=tCur;tTo=v;tStart=performance.now();if(reduce){tCur=v;draw()}else go()};
 new MutationObserver(()=>set(target())).observe(root,{attributes:true,attributeFilter:['data-theme']});
 addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(size,150);align()});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(align).observe(root);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)go()});
 tCur=tFrom=tTo=target();size();go();
 const menu=$('#menu');
 if(menu){
  const b=document.createElement('button');b.className='lnk';b.type='button';
  const lab=()=>{b.textContent='Background: '+(still?'Still':'Animated')};lab();
  b.onclick=()=>{still=!still;try{localStorage.setItem('dl-bg',still?'still':'anim')}catch(e){}lab();draw();go()};
  menu.insertBefore(b,$('#out'));
 }
}
