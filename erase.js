import {getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup,deleteUser} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,getDocsFromServer,writeBatch,terminate,clearIndexedDbPersistence} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
/* Delete my data: removes calendar events this app made, every Firestore record, and the sign-in account */
const auth=getAuth(getApp()),db=getFirestore(getApp()),$=s=>document.querySelector(s);
const GC='https://www.googleapis.com/calendar/v3/calendars/primary/events';
const COLS=['tasks','courses','meta'];
const btn=document.createElement('button');btn.className='lnk dng';btn.type='button';btn.textContent='Delete my data';
$('.hr').insertBefore(btn,$('#out'));
const dlg=document.createElement('dialog');
dlg.innerHTML=`<form><h2>Delete my data</h2>
<p><small>This permanently deletes all your courses, tasks and settings, and your CleanSlate account. It cannot be undone. If you might want them later, use Backup to export a copy first.</small></p>
<label class="ckl" id="ecw"><input type="checkbox" id="ecal" checked> Also remove the events CleanSlate added to my Google Calendar</label>
<label>Type DELETE to confirm<input id="ein" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
<p><small>Google will ask you to confirm your account before anything is deleted.</small></p>
<p id="eerr" class="ferr" role="alert"></p>
<div class="act"><span></span><button type="button" class="lnk" id="ex">Cancel</button><button class="pri dngb" id="ego" disabled>Delete everything</button></div></form>`;
document.body.append(dlg);
const f=dlg.querySelector('form'),inp=$('#ein'),go=$('#ego'),err=$('#eerr');
let running=false;
const ok=()=>inp.value.trim().toUpperCase()==='DELETE';
inp.oninput=()=>{go.disabled=running||!ok()};
const say=m=>{err.textContent=m};
const busy=b=>{running=b;go.disabled=b||!ok();go.textContent=b?'Deleting…':'Delete everything';$('#ex').disabled=b;go.setAttribute('aria-busy',String(b))};
const all=async uid=>{const out=[];for(const n of COLS)for(const d of (await getDocsFromServer(collection(db,`users/${uid}/${n}`))).docs)out.push({n,id:d.id,...d.data()});return out};
async function wipe(uid,docs){for(let i=0;i<docs.length;i+=400){const b=writeBatch(db);docs.slice(i,i+400).forEach(d=>b.delete(doc(db,`users/${uid}/${d.n}/${d.id}`)));await b.commit()}}
async function unCal(tok,docs){
 for(const d of docs){
  if(!d.calSig||d.n==='meta')continue;
  const id=(d.n==='tasks'?'dl':'dlc')+d.id.replace(/-/g,'');
  const r=await fetch(GC+'/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+tok}});
  if(!r.ok&&r.status!==404&&r.status!==410)throw new Error('cal '+r.status);
 }
}
btn.onclick=async()=>{
 say('');inp.value='';busy(false);
 let synced=false;try{const u=auth.currentUser;if(u)synced=(await all(u.uid)).some(d=>d.calSig)}catch(e){}
 $('#ecw').hidden=!synced;$('#ecal').checked=synced;
 dlg.showModal();inp.focus();
};
$('#ex').onclick=()=>{if(!running)dlg.close()};
dlg.addEventListener('cancel',e=>{if(running)e.preventDefault()});
f.onsubmit=async e=>{
 e.preventDefault();if(running||!ok())return;
 const u=auth.currentUser;if(!u)return;
 if(navigator.onLine===false){say('You’re offline. Connect to the internet, then try again. Nothing was deleted.');return}
 busy(true);say('');
 const cal=!$('#ecw').hidden&&$('#ecal').checked;
 let stage='auth';
 try{
  const p=new GoogleAuthProvider();if(cal)p.addScope('https://www.googleapis.com/auth/calendar.events');
  const r=await reauthenticateWithPopup(u,p);
  if(r.user.uid!==u.uid)throw Object.assign(new Error('wrong account'),{code:'auth/user-mismatch'});
  stage='cal';
  let docs=await all(u.uid);
  if(cal){const tok=GoogleAuthProvider.credentialFromResult(r)?.accessToken;if(!tok)throw new Error('no token');await unCal(tok,docs)}
  stage='data';
  await wipe(u.uid,docs);
  docs=await all(u.uid);if(docs.length)await wipe(u.uid,docs);
  stage='account';
  await deleteUser(u);
 }catch(e){
  console.error(e);busy(false);const c=String(e&&e.code||'');
  if(stage==='auth')say(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request'?'Google confirmation was closed. Nothing was deleted.':c==='auth/user-mismatch'?'That was a different Google account. Choose the account you signed in with. Nothing was deleted.':c==='auth/popup-blocked'?'The Google pop-up was blocked. Allow pop-ups for this site and try again. Nothing was deleted.':'Couldn’t confirm your Google account. Check your connection and try again. Nothing was deleted.');
  else if(stage==='cal')say('Couldn’t remove your calendar events, so nothing was deleted. Try again, or untick the calendar box to delete your data and leave the events.');
  else if(stage==='data')say('Some of your data couldn’t be deleted. Check your connection and try again.');
  else say('Your data is deleted, but your account couldn’t be removed. Try again.');
  return;
 }
 try{sessionStorage.setItem('dl-erased','1')}catch(e){}
 try{['dl-theme','dl-bg','dl-snd','dl-cal-'+u.uid,'dl-onb-'+u.uid,'dl-onb-cal-'+u.uid,'dl-primer-'+u.uid].forEach(k=>localStorage.removeItem(k))}catch(e){}
 try{await terminate(db);await clearIndexedDbPersistence(db)}catch(e){}
 location.replace('app.html');
};
try{if(sessionStorage.getItem('dl-erased')){sessionStorage.removeItem('dl-erased');$('#err').textContent='Your data and account have been deleted.'}}catch(e){}
