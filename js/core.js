
'use strict';
/* EXAM BANK · B(ChatGPT) UI base · Local-first functional prototype
   Storage only in this browser. Never use client-side flags to protect paid content. */
const STORE_KEY = 'EXAM_BANK_B_LOCAL_V2';
const $ = sel => document.querySelector(sel);
const esc = val => String(val ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeImg = val => {const s=String(val||'').trim();return (/^https:\/\//i.test(s)||/^assets\/questions\/[a-z0-9_\/.\-]+$/i.test(s))&&!s.includes('..')?s:'';};
const uid = prefix => prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
const today = () => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
const formatDay = ts => new Date(ts).toLocaleDateString('ko-KR',{year:'numeric',month:'short',day:'numeric'});
const errText = '이 브라우저에서 저장이 제한되어 있어요. 데이터 내보내기로 백업해 주세요.';
function freshDb(){
 return {version:3,exams:[],subjects:[],papers:[],questions:[],history:[],wrongIds:[],wrongCompletedIds:[],wrongSnapshots:{},draft:null,dailyGoal:20};
}

let db;
let storageOK=true;
try {let saved=localStorage.getItem(STORE_KEY);db=saved?JSON.parse(saved):freshDb();if(!saved)localStorage.setItem(STORE_KEY,JSON.stringify(db));} catch(e){db=freshDb();storageOK=false;}
if(!db||!Array.isArray(db.exams)||!Array.isArray(db.subjects)||!Array.isArray(db.papers)||!Array.isArray(db.questions)||!Array.isArray(db.history)||!Array.isArray(db.wrongIds))db=freshDb();
if(!db.wrongSnapshots||typeof db.wrongSnapshots!=='object')db.wrongSnapshots={};
// Backward-compatible migration: previously saved wrong answers remain pending.
if(!Array.isArray(db.wrongCompletedIds))db.wrongCompletedIds=[];
db.wrongCompletedIds=[...new Set(db.wrongCompletedIds.filter(id=>db.wrongIds.includes(id)))];
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(db));storageOK=true;return true;}catch(e){storageOK=false;toast(errText);return false}}
const S={view:'home',examId:null,subjectId:null,paperId:null,attempt:null,result:null,reviewId:null,showPalette:false,adminTab:'시험',editId:null,showCsv:false,adminFilter:'',wrongFilter:'전체'};
const navs=[['home','홈','<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3z"/>'],['library','문제은행','<path d="M4 5h16M4 12h16M4 19h16"/>'],['wrong','오답','<path d="M5 4h14v17l-7-4-7 4z"/>'],['my','마이','<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 16-5 16 0"/>']];
const prices=[['과목별 이용권','4,900원','과목당 · 90일','한 과목만 선택해서 이용'],['프리패스 1개월','12,900원','전 과목 · 30일','전체 문제은행 자유롭게'],['프리패스 12개월','99,000원','전 과목 · 365일','가장 경제적인 장기 학습']];
const externalLoaded=new Map();
const examBy=id=>db.exams.find(x=>x.id===id),subjectBy=id=>db.subjects.find(x=>x.id===id),paperBy=id=>db.papers.find(x=>x.id===id);
const questionBy=id=>db.questions.find(x=>x.id===id)||[...externalLoaded.values()].flat().find(x=>x.id===id)||db.wrongSnapshots[id];
const subLabel = id => {let s=subjectBy(id);return s?`${examBy(s.examId)?.name||'시험'} · ${s.name}`:'삭제된 과목'};
const papersIn = subj => db.papers.filter(p=>p.subjectId===subj);
const questionsIn=paperId=>db.questions.filter(q=>q.paperId===paperId).concat(externalLoaded.get(paperId)||[]);
const questionCount=p=>p?.dataFile?(p.questionCount||0)+db.questions.filter(q=>q.paperId===p.id).length:questionsIn(p.id).length;
function importedQuestions(){return [...db.questions,...Object.values(db.wrongSnapshots).filter(q=>!db.questions.some(l=>l.id===q.id))];}
async function initCatalog(){
 try{
  const response=await fetch('data/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error('목록 파일을 찾지 못했습니다 ('+response.status+')');
  const catalog=await response.json();
  for(const type of ['exams','subjects','papers']){
   if(!Array.isArray(catalog[type]))throw Error('catalog.json의 '+type+' 목록이 잘못되었습니다.');
   for(const item of catalog[type]){
    const existing=db[type].find(x=>x.id===item.id);
    if(!existing)db[type].push({...item,external:true});
    else if(existing.external)Object.assign(existing,item);
   }
  }
  persist();
 }catch(e){console.error('시험 목록 불러오기 실패:',e);window.catalogError=e.message;}
}
async function loadExternal(p){
 if(!p.dataFile||externalLoaded.has(p.id))return;
 const res=await fetch(p.dataFile);
 if(!res.ok)throw Error('시험지 데이터 파일 오류: '+p.dataFile+' ('+res.status+')');
 const paper=await res.json();
 if(paper.id!==p.id||!Array.isArray(paper.questions))throw Error('시험지 ID 또는 문항 형식이 올바르지 않습니다.');
 const ids=new Set();
 const list=paper.questions.map((q,i)=>{
  if(!q.id||ids.has(q.id)||q.paperId!==p.id||!Array.isArray(q.options)||q.options.length<2||q.options.length>5||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw Error('시험지 '+(i+1)+'번 문항의 형식 또는 정답을 확인해 주세요.');
  ids.add(q.id);
  return {...q,explanation:db.explanationOverrides?.[q.id]??(q.explanation||'')};
 });
 if(p.questionCount&&list.length!==p.questionCount)throw Error('문항 수가 예상과 다릅니다.');
 externalLoaded.set(p.id,list);
}
const pendingWrongCount=()=>db.wrongIds.filter(id=>!db.wrongCompletedIds.includes(id)).length;
const completedWrongCount=()=>db.wrongIds.filter(id=>db.wrongCompletedIds.includes(id)).length;
const allSolved = ()=>db.history.reduce((n,h)=>n+h.total,0);
const allCorrect=()=>db.history.reduce((n,h)=>n+h.correct,0);
const accuracy=()=>allSolved()?Math.round(allCorrect()/allSolved()*100):null;
const todaySolved=()=>db.history.filter(h=>h.day===today()).reduce((n,h)=>n+h.total,0);
// 응시 1회 기록만 삭제하고, 해당 기록에서 유래한 오답만 정리합니다.
// 오답을 사용자가 수동 삭제했다면 되살리지 않습니다.
function deleteHistoryAttempt(id){
 const record=db.history.find(h=>h.id===id);
 if(!record)return false;
 const saved={
  history:db.history,
  wrongIds:[...db.wrongIds],
  wrongCompletedIds:[...db.wrongCompletedIds],
  wrongSnapshots:{...db.wrongSnapshots}
 };
 db.history=db.history.filter(h=>h.id!==id);
 const affected=new Set((record.items||[]).map(q=>q&&q.id).filter(Boolean));
 for(const qid of affected){
  // A manually removed wrong answer must not reappear.
  if(!db.wrongIds.includes(qid))continue;
  const remaining=[];
  for(const h of db.history){
   if(!Array.isArray(h.items))continue;
   h.items.forEach((q,i)=>{
    if(q&&q.id===qid){
     remaining.push({q,correct:Array.isArray(h.answers)&&h.answers[i]===q.answer});
    }
   });
  }
  // Only an actual remaining incorrect submission may keep an item in wrong notes.
  const lastWrong=[...remaining].reverse().find(event=>!event.correct);
  if(!lastWrong){
   db.wrongIds=db.wrongIds.filter(x=>x!==qid);
   db.wrongCompletedIds=db.wrongCompletedIds.filter(x=>x!==qid);
   delete db.wrongSnapshots[qid];
  }else{
   // Reflect the newest still-saved attempt, not the deleted one.
   const last=remaining[remaining.length-1];
   if(last.correct){
    if(!db.wrongCompletedIds.includes(qid))db.wrongCompletedIds.push(qid);
   }else{
    db.wrongCompletedIds=db.wrongCompletedIds.filter(x=>x!==qid);
   }
   // Recover a source image / question for legacy notes if necessary.
   if(!db.wrongSnapshots[qid])db.wrongSnapshots[qid]=lastWrong.q;
  }
 }
 if(!persist()){
  db.history=saved.history;
  db.wrongIds=saved.wrongIds;
  db.wrongCompletedIds=saved.wrongCompletedIds;
  db.wrongSnapshots=saved.wrongSnapshots;
  return false;
 }
 return true;
}

function nav(){return `<nav class="bottomnav" aria-label="하단 메뉴">${navs.map(([key,label,svg])=>`<button data-act="view" data-val="${key}" class="${S.view===key?'active':''}"><span class="navico"><svg viewBox="0 0 24 24">${svg}</svg></span>${label}</button>`).join('')}</nav>`}
function appHeader(){return `<div class="header row between"><div class="brand"><div class="logo"><img src="assets/brand/exam-bank-icon.png" alt="EXAM BANK 로고"></div><div><div class="brandname">EXAM BANK</div><div class="eyebrow" style="font-size:9px;letter-spacing:.1em">Your next achievement</div></div></div><button class="avatar" data-act="view" data-val="my" aria-label="마이 페이지">나</button></div>`}
function catCards(){return `<div class="cards">${db.exams.map((e,i)=>`<button class="cat" data-act="exam" data-val="${esc(e.id)}"><h3>${esc(e.name)}</h3><p>${esc(e.desc||'')}</p></button>`).join('')}</div>${db.exams.length?'':`<div class="empty">관리자 페이지에서 시험 분야를 등록해 주세요.</div>`}`}
function paperCard(p){let cnt=questionCount(p),sub=subjectBy(p.subjectId);return `<button class="paper" data-act="paper" data-val="${esc(p.id)}"><span class="paperico">📘</span><span class="grow"><b>${esc(p.title)}</b><p>${esc(sub?.name||'')}${p.year?' · '+esc(p.year)+'년':''} · ${cnt}문항${p.isSample?' · 예시':''}</p></span><span class="arrow">›</span></button>`}
function statCards(){return `<div class="metrics"><div class="metric"><b>${allSolved()}</b><span>누적 풀이</span></div><div class="metric"><b>${accuracy()===null?'—':accuracy()+'%'}</b><span>평균 정답률</span></div><div class="metric"><b>${pendingWrongCount()}</b><span>복습할 오답</span></div></div>`}