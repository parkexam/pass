/* PASS Firebase stage-1: login, per-account cloud progress, admin test entitlement.
 * NO payment, NO fake paywall: existing public JSON files are still publicly accessible.
 * JS SDK pinned to v13.3.0 (2026-11-11).
 */
(function(){
'use strict';
const C=window.PASS_FIREBASE_CONFIG||{};
const valid=C.enabled===true && ['apiKey','authDomain','projectId','appId'].every(k=>!!String(C.firebase?.[k]||'').trim());
const FIREBASE_VERSION='13.3.0';
const GUEST_KEY='PASS_GUEST_PROGRESS_BACKUP_V1';
const ACCOUNT_PREFIX='PASS_ACCOUNT_LOCAL_V1_';
const IMPORTED_PREFIX='PASS_GUEST_IMPORTED_V1_';
const FIELDS=['history','wrongIds','wrongCompletedIds','wrongSnapshots','draft','drafts','dailyGoal'];
const state={user:null,uid:null,ready:false,busy:false,admin:false,entitled:false,guest:null,hasGuest:false,syncTimer:null,syncBusy:false,syncAgain:false,muted:false,remote:new Map(),sdk:null,fb:null,auth:null,firestore:null,functions:null,status:'',error:''};
const encodeDoc=x=>encodeURIComponent(String(x));
const e=x=>typeof esc==='function'?esc(x):String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
const clone=x=>JSON.parse(JSON.stringify(x));
function snapshot(){const out={};for(const f of FIELDS)out[f]=clone(db[f]===undefined?(f==='dailyGoal'?20:f==='wrongSnapshots'||f==='drafts'?{}:f==='draft'?null:[]):db[f]);return out;}
function applyProgress(data){
 state.muted=true;
 try{
  for(const f of FIELDS){
   if(f==='dailyGoal')db[f]=Math.max(1,Number(data?.[f])||20);
   else if(f==='wrongSnapshots'||f==='drafts')db[f]=data?.[f]&&typeof data[f]==='object'&&!Array.isArray(data[f])?clone(data[f]):{};
   else if(f==='draft')db[f]=data?.draft&&typeof data.draft==='object'?clone(data.draft):null;
   else db[f]=Array.isArray(data?.[f])?clone(data[f]):[];
  }
  db.wrongCompletedIds=db.wrongCompletedIds.filter(id=>db.wrongIds.includes(id));
  // Preserve the question catalog and loaded images; only user progress is replaced.
  localStorage.setItem(STORE_KEY,JSON.stringify(db));
 }finally{state.muted=false;}
}
function guestBackup(){
 try{const old=localStorage.getItem(GUEST_KEY);if(old){state.guest=JSON.parse(old);return;}
  state.guest=snapshot();localStorage.setItem(GUEST_KEY,JSON.stringify(state.guest));
 }catch(err){state.guest=snapshot();}
}
function markStatus(text,error=false){state.status=text;state.error=error?text:'';refreshUI();}
function prettyError(err){const code=err?.code||'';
 if(code==='auth/email-already-in-use')return '이미 가입한 이메일입니다.';
 if(code==='auth/invalid-email')return '이메일 주소를 확인해 주세요.';
 if(code==='auth/weak-password')return '비밀번호를 6자 이상으로 설정해 주세요.';
 if(code==='auth/invalid-credential'||code==='auth/wrong-password'||code==='auth/user-not-found')return '이메일이나 비밀번호를 확인해 주세요.';
 if(code==='auth/operation-not-allowed')return 'Firebase에서 이메일/비밀번호 로그인을 활성화해야 해요.';
 if(code==='permission-denied'||code==='functions/permission-denied')return '이 작업을 수행할 권한이 없습니다.';
 return err?.message||'Firebase 연결 상태를 확인해 주세요.';
}
function ui(){
 if(S.view!=='my')return;
 const main=document.querySelector('.page');if(!main)return;
 const old=main.querySelector('#pass-account-stage1');if(old)old.remove();
 const box=document.createElement('section');box.id='pass-account-stage1';box.className='panel pass-account-panel';
 const busy=state.busy?'disabled':'';
 const status=state.status?`<p class="pass-account-status" role="status">${e(state.status)}</p>`:'';
 if(!valid){
  box.innerHTML='<h3>회원·이용권 준비</h3><p>Firebase 연결 전입니다. 현재는 기존 브라우저 기록을 그대로 이용합니다.</p><p class="pass-account-note">js/pass-firebase-config.js의 설정을 완료하면 이메일 회원가입과 계정별 저장 기능이 열립니다.</p>';
 }else if(!state.ready){
  box.innerHTML='<h3>회원 계정</h3><p>Firebase 로그인 상태를 확인하는 중입니다.</p>';
 }else if(!state.user){
  box.innerHTML=`<h3>회원 계정</h3><p>회원가입 후 기출 기록을 내 계정에 저장할 수 있어요.</p>
   <form id="passAccountForm" class="pass-account-form"><label>이메일<input name="email" type="email" autocomplete="email" required placeholder="example@email.com"></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="6자 이상"></label>
   <div class="pass-account-actions"><button class="btn" type="submit" name="mode" value="login" ${busy}>로그인</button><button class="btn ghost" type="submit" name="mode" value="register" ${busy}>회원가입</button></div></form>${status}`;
 }else{
  const email=state.user.email||'회원';const test=state.entitled?'간호직 이용권 테스트: 이용 가능':'간호직 이용권 테스트: 없음';
  box.innerHTML=`<h3>내 회원 계정</h3><p><strong>${e(email)}</strong></p><p class="pass-account-entitlement">${test}</p>
  <div class="pass-account-actions"><button class="btn soft" type="button" data-pass-action="sync" ${busy}>지금 동기화</button><button class="btn ghost" type="button" data-pass-action="logout" ${busy}>로그아웃</button></div>
  ${state.hasGuest?'<div class="pass-account-guest"><p>로그인 전 이 기기에서 푼 기록이 있어요. 계정에 가져올까요?</p><button class="btn soft" type="button" data-pass-action="import-guest">기존 기기 기록 가져오기</button></div>':''}
  ${state.admin?`<div class="pass-account-admin"><strong>관리자 · 간호직 테스트 이용권</strong><p>결제 없이 계정의 간호직 권한을 테스트합니다.</p><form id="passGrantForm" class="pass-account-form"><label>대상 회원 이메일<input type="email" name="targetEmail" required placeholder="member@email.com"></label><label>권한<select name="active"><option value="true">이용권 부여</option><option value="false">이용권 회수</option></select></label><button class="btn" type="submit" ${busy}>적용하기</button></form></div>`:''}
  ${status}<p class="pass-account-note">현재 공개 GitHub JSON 문제지는 아직 유료 보호 상태가 아닙니다. 이용권은 서버 권한 테스트입니다.</p>`;
 }
 const anchor=main.querySelector('.profile');if(anchor)anchor.insertAdjacentElement('afterend',box);else main.querySelector('.header')?.insertAdjacentElement('afterend',box);
}
const css=`
 #pass-account-stage1{margin:15px 0 18px;padding:19px}
 #pass-account-stage1 h3{font-size:16px;margin:0 0 10px}
 #pass-account-stage1 p{font-size:12px;line-height:1.7;margin:5px 0 12px}
 .pass-account-form{display:grid;gap:10px;margin-top:12px}
 .pass-account-form label{font-size:12px;font-weight:800;display:grid;gap:5px;color:#546680}
 .pass-account-form input,.pass-account-form select{font:inherit;color:#203453;max-width:100%;padding:12px;border:1px solid #dde4f0;border-radius:12px;background:#f8faff;font-size:15px;min-height:45px}
 .pass-account-actions{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
 .pass-account-actions .btn{flex:1;min-width:104px}
 .pass-account-guest,.pass-account-admin{border-top:1px solid #e4e8f2;padding-top:12px;margin-top:14px}
 .pass-account-entitlement{font-weight:800;color:#0f827a}
 .pass-account-status{background:#eef3fd;padding:10px;border-radius:10px;color:#344b7a}
 .pass-account-note{color:#8290a5!important;font-size:11px!important}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function refreshUI(){if(S.view==='my')ui();}
const oldRender=render;
render=function(preserve){oldRender(preserve);ui();};
// Respect the original v7 draft-preserving persist implementation. Debounce remote writes.
const oldPersist=persist;
persist=function(){const ok=oldPersist();if(valid&&state.ready&&state.user&&!state.muted&&ok)queueSync();return ok;};
function queueSync(){clearTimeout(state.syncTimer);state.syncTimer=setTimeout(()=>{syncCloud().catch(err=>markStatus('클라우드 저장 실패: '+prettyError(err),true));},1800);}
function progressEntries(){
 const m=new Map();const snap=snapshot();
 m.set('settings/main',{dailyGoal:snap.dailyGoal,wrongIds:snap.wrongIds,wrongCompletedIds:snap.wrongCompletedIds});
 for(const h of snap.history)if(h?.id)m.set('attempts/'+encodeDoc(h.id),{data:h});
 for(const [key,z] of Object.entries(snap.drafts||{}))if(z?.items?.length)m.set('drafts/'+encodeDoc(key),{data:z});
 if(snap.draft?.items?.length){const key=snap.draft.source==='wrong'?'review:wrong':snap.draft.paperId?'paper:'+snap.draft.paperId:null;if(key&&!m.has('drafts/'+encodeDoc(key)))m.set('drafts/'+encodeDoc(key),{data:snap.draft});}
 for(const [id,q] of Object.entries(snap.wrongSnapshots||{}))if(q?.id)m.set('wrongItems/'+encodeDoc(id),{data:q});
 return m;
}
async function getCloud(){
 const {doc,getDoc,getDocs,collection}=state.fb.dbOps;
 const root=['users',state.uid];const out={history:[],wrongIds:[],wrongCompletedIds:[],wrongSnapshots:{},draft:null,drafts:{},dailyGoal:20};
 const hashes=new Map();let any=false;
 const meta=await getDoc(doc(state.firestore,...root,'settings','main'));
 if(meta.exists()){const d=meta.data();out.dailyGoal=d.dailyGoal||20;out.wrongIds=Array.isArray(d.wrongIds)?d.wrongIds:[];out.wrongCompletedIds=Array.isArray(d.wrongCompletedIds)?d.wrongCompletedIds:[];hashes.set('settings/main',JSON.stringify(d));any=true;}
 for(const coll of ['attempts','drafts','wrongItems']){
  const result=await getDocs(collection(state.firestore,...root,coll));
  result.forEach(d=>{
   const obj=d.data();const key=coll+'/'+d.id;hashes.set(key,JSON.stringify(obj));any=true;
   if(coll==='attempts'&&obj?.data)out.history.push(obj.data);
   if(coll==='drafts'&&obj?.data){const z=obj.data;const draftKey=z.source==='wrong'?'review:wrong':z.paperId?'paper:'+z.paperId:null;if(draftKey)out.drafts[draftKey]=z;}
   if(coll==='wrongItems'&&obj?.data){out.wrongSnapshots[obj.data.id||decodeURIComponent(d.id)]=obj.data;}
  });
 }
 out.history.sort((a,b)=>(a.time||0)-(b.time||0));
 out.draft=Object.values(out.drafts).sort((a,b)=>(b.lastOpened||b.started||0)-(a.lastOpened||a.started||0))[0]||null;
 state.remote=hashes;
 return {progress:out,any};
}
async function syncCloud(){
 if(!valid||!state.ready||!state.user||state.muted)return;
 if(state.syncBusy){state.syncAgain=true;return;}
 state.syncBusy=true;
 try{
  const {doc,setDoc,deleteDoc}=state.fb.dbOps;
  const current=progressEntries(),removed=[...state.remote.keys()].filter(k=>!current.has(k));
  for(const [key,data] of current){
   const hash=JSON.stringify(data);if(state.remote.get(key)===hash)continue;
   const [collectionName,id]=key.split('/');
   await setDoc(doc(state.firestore,'users',state.uid,collectionName,id),data);
   state.remote.set(key,hash);
  }
  for(const key of removed){
   const [collectionName,id]=key.split('/');
   await deleteDoc(doc(state.firestore,'users',state.uid,collectionName,id));state.remote.delete(key);
  }
  try{localStorage.setItem(ACCOUNT_PREFIX+state.uid,JSON.stringify(snapshot()));}catch(_e){}
  markStatus('클라우드 기록 저장 완료');
 }finally{
  state.syncBusy=false;
  if(state.syncAgain){state.syncAgain=false;queueSync();}
 }
}
async function membership(){
 state.entitled=false;state.admin=false;
 if(!state.user)return;
 const token=await state.fb.getIdTokenResult(state.user,true);state.admin=token.claims.admin===true;
 try{
  const callable=state.fb.httpsCallable(state.functions,'membershipStatus');
  const res=await callable({});state.entitled=!!res.data?.nursingAll;
 }catch(err){markStatus('이용권 상태 확인 실패: '+prettyError(err),true);}
}
async function loginState(user){
 clearTimeout(state.syncTimer);state.ready=false;state.user=user;state.uid=user?.uid||null;state.remote=new Map();state.hasGuest=false;
 try{
  if(user){
   guestBackup();
   const remote=await getCloud();
   let fallback=null;
   if(!remote.any){try{fallback=JSON.parse(localStorage.getItem(ACCOUNT_PREFIX+state.uid)||'null');}catch(_e){}}
   applyProgress(remote.any?remote.progress:(fallback||{}));
   state.hasGuest=localStorage.getItem(IMPORTED_PREFIX+state.uid)!=='yes' && (!!state.guest?.history?.length||!!Object.keys(state.guest?.drafts||{}).length||!!state.guest?.draft);
   if(!remote.any&&fallback)queueSync();
   await membership();
   markStatus(remote.any?'내 계정 학습 기록을 불러왔어요.':'새 계정입니다. 기존 기기 기록을 가져올 수 있어요.');
  }else{
   const guest=state.guest||JSON.parse(localStorage.getItem(GUEST_KEY)||'null');
   if(guest)applyProgress(guest);
   state.entitled=false;state.admin=false;
   markStatus('로그아웃되었습니다.');
  }
 }catch(err){markStatus('회원 데이터 연결 실패: '+prettyError(err),true);}
 finally{state.ready=true;render();}
}
async function init(){
 if(!valid){state.ready=true;ui();return;}
 try{
  const [appSDK,authSDK,dbSDK,funcSDK]=await Promise.all([
   import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
   import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
   import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
   import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-functions.js`)
  ]);
  const app=appSDK.initializeApp(C.firebase,'pass-main');
  state.auth=authSDK.getAuth(app);state.firestore=dbSDK.getFirestore(app);state.functions=funcSDK.getFunctions(app,C.functionsRegion||'asia-northeast3');
  state.fb={...authSDK,httpsCallable:funcSDK.httpsCallable,dbOps:dbSDK};
  authSDK.onAuthStateChanged(state.auth,user=>{loginState(user);});
 }catch(err){state.ready=true;markStatus('Firebase 초기화 실패: '+prettyError(err),true);}
}
function mergeGuest(){
 const g=state.guest;if(!g)return;
 const current=snapshot();const map=new Map(current.history.map(h=>[h.id,h]));
 for(const h of g.history||[])if(h?.id&&!map.has(h.id))map.set(h.id,h);
 current.history=[...map.values()].sort((a,b)=>(a.time||0)-(b.time||0));
 current.wrongIds=[...new Set([...(current.wrongIds||[]),...(g.wrongIds||[])])];
 current.wrongCompletedIds=[...new Set([...(current.wrongCompletedIds||[]),...(g.wrongCompletedIds||[])])];
 current.wrongSnapshots={...(g.wrongSnapshots||{}),...(current.wrongSnapshots||{})};
 current.drafts={...(g.drafts||{}),...(current.drafts||{})};
 if(!current.draft?.items?.length)current.draft=g.draft||null;
 applyProgress(current);state.hasGuest=false;
 try{localStorage.setItem(IMPORTED_PREFIX+state.uid,'yes');}catch(_e){}
 persist();queueSync();markStatus('기기 기록을 계정에 가져왔어요.');render();
}
document.addEventListener('submit',async event=>{
 if(!valid)return;
 if(event.target.id==='passAccountForm'){
  event.preventDefault();event.stopImmediatePropagation();
  const form=event.target;const email=form.elements.email.value.trim(),password=form.elements.password.value;
  const mode=event.submitter?.value||'login';state.busy=true;refreshUI();
  try{
   if(mode==='register')await state.fb.createUserWithEmailAndPassword(state.auth,email,password);
   else await state.fb.signInWithEmailAndPassword(state.auth,email,password);
   markStatus('로그인되었습니다.');
  }catch(err){markStatus(prettyError(err),true);}finally{state.busy=false;refreshUI();}
 }else if(event.target.id==='passGrantForm'){
  event.preventDefault();event.stopImmediatePropagation();
  const form=event.target;const email=form.elements.targetEmail.value.trim(),active=form.elements.active.value==='true';
  state.busy=true;refreshUI();
  try{
   const call=state.fb.httpsCallable(state.functions,'adminSetNursingAccess');await call({email,active});
   markStatus(email+(active?' · 간호직 이용권 부여 완료':' · 간호직 이용권 회수 완료'));
   if(email===state.user?.email)await membership();
  }catch(err){markStatus(prettyError(err),true);}finally{state.busy=false;refreshUI();}
 }
},true);
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-pass-action]');if(!b||!valid)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(state.busy)return;
 state.busy=true;refreshUI();
 try{
  if(b.dataset.passAction==='logout'){
   clearTimeout(state.syncTimer);await syncCloud();await state.fb.signOut(state.auth);
  }
  if(b.dataset.passAction==='import-guest')mergeGuest();
  if(b.dataset.passAction==='sync')await syncCloud();
 }catch(err){markStatus(prettyError(err),true);}finally{state.busy=false;refreshUI();}
},true);
init();
window.PASS_ACCOUNT_STAGE1={getStatus:()=>({configured:valid,uid:state.uid,ready:state.ready,nursingAll:state.entitled,admin:state.admin})};
})();
