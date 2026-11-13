
function toast(message){let el=$('#toast');if(el)el.remove();el=document.createElement('div');el.id='toast';el.style.cssText='position:fixed;bottom:calc(95px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:#1f2d52;color:white;border-radius:14px;padding:12px 18px;font-size:12px;z-index:200;max-width:90vw;text-align:center;box-shadow:0 7px 28px #15264260';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2500)}
function render(preserve=false){let y=scrollY;let content={home,library,subject,paper,quiz,result,wrong,history,pass,my,admin}[S.view]?.()||home();let quiet=['quiz','result','subject','paper','pass','admin','history'].includes(S.view);$('#app').innerHTML=`<main class="page ${S.view==='quiz'?'padded':''}">${content}</main>${quiet?'':nav()}`;if(S.view==='quiz')$('.page').classList.add('padded');scrollTo({top:preserve?y:0,behavior:'instant'})}
function go(view){S.view=view;S.reviewId=null;render()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.val;let keep=false;
 if(a==='view'){S.view=v;S.reviewId=null;if(v==='library')S.examId=null;}
 else if(a==='exam'){S.examId=v;S.view='library'}
 else if(a==='backExams'){S.examId=null}
 else if(a==='subject'){S.subjectId=v;S.view='subject'}
 else if(a==='backSubjects'){S.view='library'}
 else if(a==='paper'){S.paperId=v;S.view='paper'}
 else if(a==='backPapers'){S.subjectId=paperBy(S.paperId)?.subjectId||S.subjectId;S.view='subject'}
 else if(a==='startPaper'){const p=paperBy(v);if(p){
   const mode=$('input[name="mode"]:checked')?.value||'batch';
   if(db.draft?.paperId===p.id&&confirm('저장된 풀이를 이어서 진행할까요?\n[취소] 새로 시작')){S.attempt=db.draft;S.view='quiz';resumeClock(S.attempt);}
   else {
    loadExternal(p).then(()=>{startQuiz(questionsIn(p.id),p.title,p.id,mode);}).catch(err=>alert('문제 파일을 불러오지 못했습니다.\n'+err.message));
    return;
   }
  }}
 else if(a==='quick'){if(db.draft){S.attempt=db.draft;S.view='quiz';resumeClock(S.attempt)}else{S.examId=null;S.view='library'}}
 else if(a==='answer'){let z=getAttempt();if(z&&!(z.mode==='instant'&&z.checked[z.index])){if(z.mode==='instant')checkpointClock();z.answers[z.index]=Number(v);if(z.mode==='instant')z.checked[z.index]=true;db.draft=z;persist();keep=true}}
 else if(a==='next'||a==='prev'){let z=getAttempt();if(z)moveClockQuestion(z.index+(a==='next'?1:-1))}
 else if(a==='palette'){S.showPalette=!S.showPalette;keep=true}
 else if(a==='toggleClock'){const z=getAttempt();if(z){if(!z.timerPaused)checkpointClock();z.timerPaused=!z.timerPaused;if(!z.timerPaused)armClock();db.draft=z;persist();keep=true}}
 else if(a==='jump'){if(getAttempt()){moveClockQuestion(v);keep=true}}
 else if(a==='quit'){if(confirm('현재 풀이를 저장하고 나갈까요?')){checkpointClock();if(db.draft)persist();S.attempt=null;S.view='home'}else return}
 else if(a==='submit'){grade();return}
 else if(a==='review'){S.reviewId=S.reviewId===Number(v)?null:Number(v);keep=true}
 else if(a==='reviewJump'){S.reviewId=Number(v);render();document.getElementById('result-row-'+v)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 else if(a==='wrongReview'){S.reviewId=S.reviewId===v?null:v;keep=true}
 else if(a==='wrongFilter'){S.wrongFilter=v;keep=true}
 else if(a==='retry'||a==='retryAll'){
  const list=importedQuestions().filter(q=>db.wrongIds.includes(q.id)&&(S.wrongFilter==='전체'||paperBy(q.paperId)?.subjectId===S.wrongFilter)&&(a==='retryAll'||!db.wrongCompletedIds.includes(q.id)));
  if(!list.length){toast('다시 풀 문제가 없습니다.');return}
  startQuiz(list,'오답 복습',null,'batch','wrong');return;
 }
 else if(a==='wrongRemove'){
  if(!db.wrongIds.includes(v))return;
  if(!confirm('이 문제를 오답노트에서 삭제할까요?\n기존 시험 응시 기록은 유지됩니다.'))return;
  db.wrongIds=db.wrongIds.filter(id=>id!==v);
  db.wrongCompletedIds=db.wrongCompletedIds.filter(id=>id!==v);
  delete db.wrongSnapshots[v];S.reviewId=null;persist();keep=true;
 }
 else if(a==='clearCompleted'){
  const inFilter=id=>S.wrongFilter==='전체'||paperBy(db.wrongSnapshots[id]?.paperId||questionBy(id)?.paperId)?.subjectId===S.wrongFilter;
  const ids=db.wrongCompletedIds.filter(id=>db.wrongIds.includes(id)&&inFilter(id));
  if(!ids.length){toast('정리할 복습완료 문제가 없습니다.');return}
  if(!confirm(`복습완료 ${ids.length}문항을 오답노트에서 삭제할까요?\n기존 풀이 기록은 유지됩니다.`))return;
  const removing=new Set(ids);
  db.wrongIds=db.wrongIds.filter(id=>!removing.has(id));
  db.wrongCompletedIds=db.wrongCompletedIds.filter(id=>!removing.has(id));
  ids.forEach(id=>delete db.wrongSnapshots[id]);S.reviewId=null;persist();keep=true;
 }
 else if(a==='historyDetail'){const item=db.history.find(h=>h.id===v);if(item){S.result=item;S.reviewId=null;S.view='result'}}
 else if(a==='historyDelete'){
  const item=db.history.find(h=>h.id===v);
  if(!item){toast('이미 삭제된 응시 기록입니다.');S.result=null;S.view='history';}
  else{
   const isReview=item.source==='wrong';
   const message=`「${item.title}」 ${formatDay(item.time)} 응시 기록을 삭제할까요?\n\n`+
    (isReview?'• 오답 복습은 이미 누적 풀이·평균 정답률 집계에서 제외되어 있습니다.\n':'• 누적 풀이 문항 수와 평균 정답률에서 이번 응시를 제외합니다.\n')+
    `• 이 응시로 인해 등록된 오답은 다른 남은 기록을 고려하여 정리됩니다.\n`+
    `• 다른 시험의 기록과 원본 문제지는 유지됩니다.\n\n`+
    `삭제 후 복구할 수 없습니다.`;
   if(!confirm(message))return;
   if(!deleteHistoryAttempt(v))return;
   S.result=null;S.reviewId=null;S.view='history';
   toast(isReview?'오답 복습 기록을 삭제했습니다.':'응시 기록을 삭제하고 통계를 다시 계산했습니다.');
  }
 }

 else if(a==='adminTab'){S.adminTab=v;S.editId=null;S.adminFilter='';keep=true}
 else if(a==='adminCancel'){S.editId=null;keep=true}
 else if(a==='edit'){S.editId=v;keep=false}
 else if(a==='delete'){deleteRecord(v);return}
 else if(a==='imageZoom'){openImageZoom(b.dataset.src,b.dataset.title);return}
 else if(a==='saveDailyGoal'){
  const input=document.getElementById('dailyGoalInput');const number=Number(input?.value);
  if(!Number.isInteger(number)||number<1||number>1000){toast('목표는 1~1000문항으로 입력해 주세요.');return}
  db.dailyGoal=number;persist();toast('하루 목표를 저장했습니다.');keep=true;
 }
 else if(a==='buy'){toast('결제는 정식 출시 단계에서 연결할 예정입니다.');return}
 else if(a==='export'){exportDb();toast('백업 파일을 저장했습니다.');return}
 else if(a==='importStart'){$('#jsonImport')?.click();return}
 else if(a==='csvStart'){$('#csvImport')?.click();return}
 else if(a==='csvTemplate'){const header=['question','option1','option2','option3','option4','option5','answer','explanation','choice1Explanation','choice2Explanation','choice3Explanation','choice4Explanation','choice5Explanation','imageUrl'];const example=['예시 문제: 2 + 2는?','3','4','5','','','2','정답은 4입니다.','3은 4가 아닙니다.','4가 정답입니다.','5는 4가 아닙니다.','','',''];downloadBlob('EXAM_BANK_CSV_문항등록_양식.csv','\uFEFF'+[header,example].map(r=>r.map(csvEncodeCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');return}
 render(keep);
});
document.addEventListener('submit',e=>{if(e.target.id==='adminEditor'){e.preventDefault();try{saveEditor(e.target)}catch(err){toast(err.message||'입력 내용을 확인해 주세요.')}}});
document.addEventListener('change',async e=>{if(e.target.id==='adminFilter'){S.adminFilter=e.target.value;render(true)}else if(['jsonImport','csvImport'].includes(e.target.id)){const file=e.target.files?.[0];if(!file)return;try{if(e.target.id==='jsonImport')await importJson(file);else await importCsv(file);}catch(err){alert(err.message||'파일 처리 중 오류가 발생했습니다.')}finally{e.target.value=''}}});
initCatalog().then(()=>render()).catch(err=>{console.error(err);render()});

/* 원문은 새 탭을 열지 않고 앱 내부에서 확대. 닫기/ESC/배경 터치 지원 */
function openImageZoom(src,title){
 const clean=safeImg(src);if(!clean){toast('원문 이미지 경로를 확인해 주세요.');return}
 let dialog=document.getElementById('examImageZoom');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='examImageZoom';dialog.className='exam-image-dialog';
  dialog.innerHTML=`<div class="image-dialog-head"><strong id="zoomTitle">원문 보기</strong><button type="button" id="imageZoomClose" aria-label="원문 닫고 문제로 돌아가기">× 닫기</button></div><div class="image-scroll"><img id="zoomImage" alt="문제 원문 확대"></div><div class="image-dialog-tools"><button type="button" data-zoom="minus" aria-label="축소">－</button><button type="button" data-zoom="reset">원래 크기</button><button type="button" data-zoom="plus" aria-label="확대">＋</button><button type="button" id="zoomReturn">문제로 돌아가기</button></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('#imageZoomClose').addEventListener('click',()=>dialog.close());
  dialog.querySelector('#zoomReturn').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  dialog.querySelectorAll('[data-zoom]').forEach(btn=>btn.addEventListener('click',()=>{
   let zoom=Number(dialog.dataset.scale||1);
   if(btn.dataset.zoom==='reset')zoom=1;
   else zoom=Math.min(3,Math.max(1,zoom+(btn.dataset.zoom==='plus'?.35:-.35)));
   dialog.dataset.scale=String(zoom);
   dialog.querySelector('#zoomImage').style.width=(zoom*100)+'%';
  }));
 }
 dialog.querySelector('#zoomTitle').textContent=title||'문제 원문';
 const img=dialog.querySelector('#zoomImage');img.src=clean;img.style.width='100%';
 dialog.dataset.scale='1';
 dialog.showModal();
}
/* 타이머 숫자만 갱신하므로 화면 전체가 다시 렌더링되지 않습니다. */
setInterval(refreshClockView,250);
document.addEventListener('visibilitychange',()=>{
 const z=getAttempt();if(!z||S.view!=='quiz')return;
 if(document.hidden)checkpointClock();else armClock();
 db.draft=z;persist();refreshClockView();
});
window.addEventListener('pagehide',()=>{
 if(S.view==='quiz'&&getAttempt()){checkpointClock();db.draft=getAttempt();persist();}
});
