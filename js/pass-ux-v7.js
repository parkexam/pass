/* PASS v7 UX + multi-paper drafts
 * Keeps all original catalog/question JSON, local-storage history, grading and no-jump choice behavior.
 * An old single db.draft is migrated automatically; earlier drafts already overwritten cannot be recovered.
 */
(function(){
'use strict';
const CSS=`
  .pass-progress{margin-top:14px;padding-top:2px}
  .pass-goal-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:#4c5c78;font-weight:800;margin-bottom:10px}
  .pass-goal-row strong{font-size:15px;color:#182a4c;font-variant-numeric:tabular-nums}
  .pass-goal-icon{display:inline-flex;gap:6px;align-items:center}
  .pass-goal-bar{height:13px;background:#e9edf8;border-radius:999px;overflow:hidden;border:1px solid #e0e7f3}
  .pass-goal-bar span{display:block;height:100%;background:linear-gradient(90deg,#496cfa,#58c5af);border-radius:999px;transition:width .18s ease}
  .pass-goal-done{margin-top:7px;color:#0c8878;font-size:12px;font-weight:800}
  .pass-drafts-list{margin:18px 0 18px}
  .pass-drafts-list h2{font-size:17px;margin:0 0 11px;letter-spacing:-.04em}
  .pass-drafts-row{display:flex;align-items:center;gap:9px;width:100%;padding:13px 14px;margin:8px 0;background:#fff;border:1px solid var(--line);border-radius:15px;text-align:left;box-shadow:var(--shadow);min-height:61px}
  .pass-drafts-row .grow{flex:1;min-width:0}
  .pass-drafts-row b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pass-drafts-row small{display:block;color:var(--muted);font-size:11px;margin-top:4px}
  .pass-drafts-row .pass-resume{color:var(--blue);font-size:12px;font-weight:900;white-space:nowrap}
  .pass-library-home{display:inline-flex;align-items:center;min-height:44px;font-size:16px;color:#33496f;font-weight:850;letter-spacing:-.025em;padding:10px 10px 10px 0;margin:0 0 5px}
  .pass-library-home:focus-visible,.pass-drafts-row:focus-visible{outline:3px solid #94a9f7;outline-offset:3px}
`;
if(!document.getElementById('pass-ux-v7-styles')){
 const style=document.createElement('style');style.id='pass-ux-v7-styles';style.textContent=CSS;document.head.appendChild(style);
}
const keyOf=z => z?.source==='wrong'?'review:wrong':(z?.paperId?'paper:'+z.paperId:null);
function ensureDrafts(){
 if(!db.drafts||typeof db.drafts!=='object'||Array.isArray(db.drafts))db.drafts={};
 if(db.draft&&Array.isArray(db.draft.items)){
  const key=keyOf(db.draft);if(key) db.drafts[key]=db.draft;
 }
}
ensureDrafts();
// Persist all partially completed papers, not only the currently opened paper.
const basePersist=persist;
persist=function(){
 ensureDrafts();
 return basePersist();
};
function drafts(){
 ensureDrafts();
 return Object.entries(db.drafts).filter(([,z])=>z&&Array.isArray(z.items)&&Array.isArray(z.answers)&&z.items.length)
  .sort((a,b)=>(Number(b[1].lastOpened)||Number(b[1].started)||0)-(Number(a[1].lastOpened)||Number(a[1].started)||0));
}
// Completed papers are removed from the unfinished-draft map; other papers remain intact.
const baseGrade=grade;
grade=function(){
 const before=db.history.length;
 const z=getAttempt();const key=keyOf(z);
 const result=baseGrade();
 if(key&&db.history.length>before){
  delete db.drafts[key];
  basePersist();
 }
 return result;
};
const baseRender=render;
render=function(preserve){
 baseRender(preserve);
 customizeScreen();
};
function escapeHtml(x){return esc(x);}
function insertDraftList(){
 if(S.view!=='home'&&S.view!=='my')return;
 const entries=drafts();if(!entries.length)return;
 const wrapper=document.createElement('section');wrapper.className='pass-drafts-list';
 wrapper.innerHTML='<h2>진행 중인 시험지</h2>'+entries.map(([key,z])=>{
  const answered=z.answers.filter(a=>a!==null&&a!==undefined).length;
  return `<button type="button" class="pass-drafts-row" data-act="resumePassDraft" data-val="${escapeHtml(key)}"><span class="grow"><b>${escapeHtml(z.title||'이름 없는 시험지')}</b><small>${answered}/${z.items.length}문항 응답 · 이어 풀 수 있어요</small></span><span class="pass-resume">이어 풀기 ›</span></button>`;
 }).join('');
 if(S.view==='home'){
  const hero=document.querySelector('.page .hero');if(hero)hero.insertAdjacentElement('afterend',wrapper);
  const cta=document.querySelector('.hero .cta');if(cta&&(!db.draft||!Array.isArray(db.draft.items))){
   const label=cta.firstChild;if(label&&label.nodeType===Node.TEXT_NODE)label.textContent='이어서 문제 풀기 ';
  }
 } else {
  const metrics=document.querySelector('.page .metrics');if(metrics)metrics.insertAdjacentElement('afterend',wrapper);
 }
}
function customizeScreen(){
 if(S.view==='result'){
  // The explanation above 'record delete' was redundant and crowded the mobile view.
  document.querySelectorAll('.history-delete-note').forEach(el=>el.remove());
 }
 if(S.view==='home'){
  document.querySelectorAll('.sectionbar').forEach(bar=>{
   if(bar.querySelector('h2')?.textContent.trim()==='추천 학습')bar.querySelectorAll('.tag').forEach(el=>el.remove());
  });
 }
 if(S.view==='library'&&!S.examId){
  const page=document.querySelector('.page');const head=page?.querySelector('.header');
  if(head&&!page.querySelector('.pass-library-home'))head.insertAdjacentHTML('afterend','<button type="button" class="pass-library-home" data-act="view" data-val="home">← 홈으로</button>');
 }
 if(S.view==='my'){
  const form=document.querySelector('.goal-panel');
  if(form){
   const goal=Math.max(1,Number(db.dailyGoal)||20),now=Number(todaySolved())||0;
   const pct=Math.round(Math.min(100,now/goal*100)),done=now>=goal;
   form.querySelectorAll('.pass-progress').forEach(x=>x.remove());
   // Replaces plain text with a visual, accessible progress display.
   form.querySelectorAll('p').forEach(el=>{
    if(el.textContent.includes('오늘 푼 문항 수')||el.textContent.includes('달성률은'))el.remove();
   });
   const el=document.createElement('div');el.className='pass-progress';
   el.innerHTML=`<div class="pass-goal-row"><span class="pass-goal-icon">${done?'💗 목표 달성':'🏃 오늘의 학습'}</span><strong>${now}/${goal}문항</strong></div><div class="pass-goal-bar" role="progressbar" aria-label="오늘의 학습 목표 달성률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>${done?'<div class="pass-goal-done">오늘의 목표를 달성했어요!</div>':''}`;
   form.appendChild(el);
  }
 }
 insertDraftList();
}
function resumeDraft(key){
 const z=db.drafts?.[key];if(!z){toast('저장된 풀이를 찾지 못했습니다.');return}
 db.draft=z;db.drafts[key]=z;
 z.lastOpened=Date.now();
 S.attempt=z;S.paperId=z.paperId||null;S.view='quiz';S.reviewId=null;S.showPalette=false;
 resumeClock(z);render();
}
// Prevent original startPaper/delete handlers only when special handling is required.
document.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-act]');if(!b)return;
 const a=b.dataset.act,v=b.dataset.val;
 if(a==='resumePassDraft'){
  event.preventDefault();event.stopImmediatePropagation();resumeDraft(v);return;
 }
 if(a==='startPaper'){
  ensureDrafts();
  const key='paper:'+v;
  // Restore this paper's own incomplete work before app.js checks for 'continue'.
  db.draft=db.drafts[key]||null;
  return; // original app.js keeps its confirmation/start logic
 }
 if(a==='quick'&&(!db.draft||!Array.isArray(db.draft.items))){
  const first=drafts()[0];if(first)db.draft=first[1];
  return;
 }
 if(a==='historyDelete'){
  event.preventDefault();event.stopImmediatePropagation();
  const record=db.history.find(h=>h.id===v);
  if(!record){toast('이미 삭제된 기록입니다.');S.result=null;S.view='history';render();return}
  // When removing a correct review attempt, existing incorrect attempts can return to '복습 필요'.
  const msg=record.source==='wrong'
   ?'이 응시 기록을 삭제하면 오답 기록에 복습 필요로 다시 등록됩니다.\n삭제는 복구할 수 없습니다.'
   :'이 응시 기록을 삭제하면 누적 풀이·정답률에서 제외되며 관련 오답이 재계산됩니다.\n삭제는 복구할 수 없습니다.';
  if(!confirm(msg))return;
  if(!deleteHistoryAttempt(v))return;
  S.result=null;S.reviewId=null;S.view='history';
  toast('응시 기록을 삭제했습니다.');render();
 }
},true);
// Start with any old draft migrated from previous app versions, without losing any newer drafts.
customizeScreen();
})();
