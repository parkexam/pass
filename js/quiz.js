
function snapshot(q){const paper=paperBy(q.paperId);const subj=subjectBy(paper?.subjectId);return {id:q.id,paperId:q.paperId,subjectId:subj?.id||'',subjectName:subj?.name||'과목',body:q.body,options:[...q.options],answer:q.answer,explanation:q.explanation||'',optionExplanations:Array.isArray(q.optionExplanations)?[...q.optionExplanations]:[],imageUrl:q.imageUrl||'',kind:q.kind||'text',number:q.number||null}}
/* 문항별 풀이 시간: 문항 이동·앱 전환 시 누적 시간을 저장합니다. */
function initClock(z){
 if(!z||!Array.isArray(z.items))return;
 const old=Array.isArray(z.timeSpentMs)?z.timeSpentMs:[];
 if(old.length!==z.items.length)z.timeSpentMs=z.items.map((_,i)=>Math.max(0,Number(old[i])||0));
 else z.timeSpentMs=z.timeSpentMs.map(x=>Math.max(0,Number(x)||0));
 if(typeof z.timerPaused!=='boolean')z.timerPaused=false;
 if(!Number.isFinite(z.activeSince))z.activeSince=null;
}
function isClockActive(z){return !!z&&S.view==='quiz'&&!document.hidden&&!z.timerPaused&&!(z.mode==='instant'&&z.checked[z.index]);}
function checkpointClock(){
 const z=getAttempt();if(!z)return;
 initClock(z);
 if(z.activeSince!==null){
  z.timeSpentMs[z.index]+=Math.max(0,Date.now()-z.activeSince);
  z.activeSince=null;
 }
}
function armClock(){const z=getAttempt();if(!z)return;initClock(z);if(isClockActive(z)&&z.activeSince===null)z.activeSince=Date.now();}
function resumeClock(z){if(!z)return;initClock(z);z.activeSince=null;armClock();persist();}
function moveClockQuestion(index){
 const z=getAttempt();if(!z)return;
 checkpointClock();z.index=Math.max(0,Math.min(z.items.length-1,Number(index)));
 armClock();db.draft=z;persist();
}
function clockNow(z,index){
 if(!z)return 0;
 const ms=Array.isArray(z.timeSpentMs)?Number(z.timeSpentMs[index])||0:0;
 return Math.max(0,ms+(index===z.index&&z.activeSince!==null?Math.max(0,Date.now()-z.activeSince):0));
}
function totalClockMs(z){return z?.items?.reduce((sum,_,i)=>sum+clockNow(z,i),0)||0;}
function formatClock(ms){
 const sec=Math.floor(Math.max(0,Number(ms)||0)/1000);
 const minutes=Math.floor(sec/60),seconds=sec%60;
 return (minutes>=60?Math.floor(minutes/60)+':'+String(minutes%60).padStart(2,'0'):String(minutes).padStart(2,'0'))+':'+String(seconds).padStart(2,'0');
}
function refreshClockView(){
 if(S.view!=='quiz')return;
 const z=getAttempt();if(!z)return;
 const t=document.getElementById('question-time');if(t)t.textContent=formatClock(clockNow(z,z.index));
 const total=document.getElementById('exam-total-time');if(total)total.textContent=formatClock(totalClockMs(z));
}
function startQuiz(items,title,paperId=null,mode='batch',source='paper'){if(!items.length){toast('등록된 문항이 없습니다.');return}let z={id:uid('attempt'),title,paperId,mode,source,items:items.map(snapshot),answers:items.map(()=>null),checked:items.map(()=>false),index:0,started:Date.now(),timeSpentMs:items.map(()=>0),activeSince:Date.now(),timerPaused:false};S.attempt=z;db.draft=z;persist();S.reviewId=null;S.showPalette=false;S.view='quiz';render()}
function grade(){const z=getAttempt();if(!z)return;const missing=z.answers.filter(x=>x===null).length;if(missing&&!confirm(`미응답 ${missing}문항이 있습니다. 그대로 채점할까요?`))return;checkpointClock();const correct=z.items.reduce((n,q,i)=>n+(z.answers[i]===q.answer?1:0),0);const h={id:uid('history'),title:z.title,paperId:z.paperId,source:z.source,day:today(),time:Date.now(),total:z.items.length,correct,items:z.items,answers:[...z.answers],timeSpentMs:[...z.timeSpentMs],totalSpentMs:totalClockMs(z)};for(let i=0;i<z.items.length;i++){let id=z.items[i].id,wi=db.wrongIds.indexOf(id);if(z.answers[i]===z.items[i].answer){if(wi>=0)db.wrongIds.splice(wi,1);delete db.wrongSnapshots[id];}else {if(wi<0)db.wrongIds.push(id);db.wrongSnapshots[id]=z.items[i];}}db.history.push(h);db.draft=null;S.attempt=null;S.result=h;S.reviewId=null;S.view='result';persist();render()}