
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
   if(db.draft?.paperId===p.id&&confirm('저장된 풀이를 이어서 진행할까요?\n[취소] 새로 시작')){S.attempt=db.draft;S.view='quiz';}
   else {
    loadExternal(p).then(()=>{startQuiz(questionsIn(p.id),p.title,p.id,mode);}).catch(err=>alert('문제 파일을 불러오지 못했습니다.\n'+err.message));
    return;
   }
  }}
 else if(a==='quick'){if(db.draft){S.attempt=db.draft;S.view='quiz'}else{S.examId=null;S.view='library'}}
 else if(a==='answer'){let z=getAttempt();if(z&&!(z.mode==='instant'&&z.checked[z.index])){z.answers[z.index]=Number(v);if(z.mode==='instant')z.checked[z.index]=true;db.draft=z;persist();keep=true}}
 else if(a==='next'||a==='prev'){let z=getAttempt();if(z){z.index=Math.max(0,Math.min(z.items.length-1,z.index+(a==='next'?1:-1)));db.draft=z;persist()}}
 else if(a==='palette'){S.showPalette=!S.showPalette;keep=true}
 else if(a==='jump'){let z=getAttempt();if(z){z.index=Number(v);db.draft=z;persist();keep=true}}
 else if(a==='quit'){if(confirm('현재 풀이를 저장하고 나갈까요?')){S.attempt=null;S.view='home'}else return}
 else if(a==='submit'){grade();return}
 else if(a==='review'){S.reviewId=S.reviewId===Number(v)?null:Number(v);keep=true}
 else if(a==='wrongReview'){S.reviewId=S.reviewId===v?null:v;keep=true}
 else if(a==='wrongFilter'){S.wrongFilter=v;keep=true}
 else if(a==='retry'){const list=importedQuestions().filter(q=>db.wrongIds.includes(q.id)&&(S.wrongFilter==='전체'||paperBy(q.paperId)?.subjectId===S.wrongFilter));startQuiz(list,'오답 복습',null,'batch','wrong');return}
 else if(a==='historyDetail'){const item=db.history.find(h=>h.id===v);if(item){S.result=item;S.reviewId=null;S.view='result'}}
 else if(a==='adminTab'){S.adminTab=v;S.editId=null;S.adminFilter='';keep=true}
 else if(a==='adminCancel'){S.editId=null;keep=true}
 else if(a==='edit'){S.editId=v;keep=false}
 else if(a==='delete'){deleteRecord(v);return}
 else if(a==='buy'){toast('결제는 정식 출시 단계에서 연결할 예정입니다.');return}
 else if(a==='export'){exportDb();toast('백업 파일을 저장했습니다.');return}
 else if(a==='importStart'){$('#jsonImport')?.click();return}
 else if(a==='csvStart'){$('#csvImport')?.click();return}
 else if(a==='csvTemplate'){const header=['question','option1','option2','option3','option4','option5','answer','explanation','imageUrl'];const example=['예시 문제: 2 + 2는?', '3','4','5','','','2','정답은 4입니다.',''];downloadBlob('EXAM_BANK_CSV_문항등록_양식.csv','\uFEFF'+[header,example].map(r=>r.map(csvEncodeCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');return}
 render(keep);
});
document.addEventListener('submit',e=>{if(e.target.id==='adminEditor'){e.preventDefault();try{saveEditor(e.target)}catch(err){toast(err.message||'입력 내용을 확인해 주세요.')}}});
document.addEventListener('change',async e=>{if(e.target.id==='adminFilter'){S.adminFilter=e.target.value;render(true)}else if(['jsonImport','csvImport'].includes(e.target.id)){const file=e.target.files?.[0];if(!file)return;try{if(e.target.id==='jsonImport')await importJson(file);else await importCsv(file);}catch(err){alert(err.message||'파일 처리 중 오류가 발생했습니다.')}finally{e.target.value=''}}});
initCatalog().then(()=>render()).catch(err=>{console.error(err);render()});
