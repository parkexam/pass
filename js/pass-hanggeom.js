/* PASS / 한국사능력검정시험 별도 이용권 분류
 * 기존 data/catalog.json, data/extended-catalog.json, Firebase 로그인/기록 수정 없음.
 * 반드시 js/catalog-extension.js 이후, js/app.js 이전에 로드합니다.
 * 메뉴/상품 정의만 추가하며 실제 결제나 콘텐츠 보호 기능은 없습니다.
 */
(function(){
'use strict';
const HAN_EXAM='hanggeom';
const HAN_OPTIONS=[
 {id:'ext_e638ec9da505',name:'한국사능력검정시험 심화',level:'심화'},
 {id:'ext_d2d6a4100d7f',name:'한국사능력검정시험 기본',level:'기본'}
];
const previousInit=initCatalog;
initCatalog=async function(){
 await previousInit();
 let han=db.exams.find(ex=>ex.id===HAN_EXAM);
 if(!han){
  han={id:HAN_EXAM,name:'한국사능력검정시험',desc:'심화·기본 · 별도 이용권',categoryGroup:'자격·인증',order:40,external:true};
  db.exams.push(han);
 }else{
  // 독립 판매 카테고리 표시만 보강. 기존 계정/문항 설정은 변경하지 않습니다.
  han.categoryGroup='자격·인증';han.order=40;
 }
 const other=db.exams.find(ex=>ex.id==='cert-history');
 if(other){
  if(other.name==='한국사·어학')other.name='어학·한자·한국어';
  if((other.desc||'').startsWith('한국사'))other.desc='어학 · 한국어 · 한자 및 교양 자격';
 }
 for(const option of HAN_OPTIONS){
  let s=db.subjects.find(x=>x.id===option.id) || db.subjects.find(x=>x.name===option.name);
  if(!s){
   s={id:option.id,examId:HAN_EXAM,name:option.name,kind:'track',section:'시험 유형',external:true};
   db.subjects.push(s);
  }else{
   s.examId=HAN_EXAM;s.section='시험 유형';s.kind='track';
  }
 }
 try{
  const res=await fetch('data/pass-products.json',{cache:'no-cache'});
  if(res.ok)window.PASS_PRODUCT_DEFINITIONS=await res.json();
  else console.warn('한능검 상품 정의 파일 미등록:',res.status);
 }catch(error){console.warn('상품 정의 불러오기 실패:',error);}
 persist();
};
// 기존 홈 추천 카드 6개 유지: 보건의료 추천 카드를 한능검으로 교체.
// 보건의료 분야는 전체 문제은행에서 계속 접근할 수 있습니다.
const earlierCards=catCards;
catCards=function(){
 let html=earlierCards();
 if(S.view!=='home'||!examBy(HAN_EXAM))return html;
 const card=`<button class="cat catalog-cat" data-act="exam" data-val="${HAN_EXAM}"><h3>한국사능력검정시험</h3><p>심화·기본 · 별도 이용권</p></button>`;
 const replacement=/<button class="cat catalog-cat" data-act="exam" data-val="cert-health">[\s\S]*?<\/button>/;
 if(replacement.test(html))return html.replace(replacement,card);
 // 이전 확장 메뉴가 없더라도 홈에서 한능검을 노출합니다.
 return html.replace(/<\/div>\s*$/,card+'</div>');
};
const earlierLibrary=library;
library=function(){
 let html=earlierLibrary();
 if(S.examId===HAN_EXAM){
  const note='<div class="panel"><b>한국사능력검정시험 · 별도 이용권</b><p>심화(1~3급)와 기본(4~6급)을 구분합니다. 현재는 분류만 준비했으며 결제는 아직 제공하지 않습니다.</p></div>';
  return html.replace(/(<p class="description">[\s\S]*?<\/p>)/,'$1'+note);
 }
 if(S.examId==='civil'){
  const note='<div class="panel"><b>2027년 9급 공개경쟁채용</b><p>한국사 필기는 한능검 3급 이상으로 대체됩니다. 한능검 문제는 공무원 패스가 아닌 별도 이용권으로 분류됩니다. 2026년 이전 한국사 기출은 기존대로 보존합니다.</p><button class="link" data-act="exam" data-val="hanggeom" style="margin-top:10px;padding:8px 0">한능검 별도 메뉴 보기 →</button></div>';
  return html.replace(/(<p class="description">[\s\S]*?<\/p>)/,'$1'+note);
 }
 return html;
};
// 기존 요금은 미출시 예시입니다. 한능검이 기본·프리패스에 포함된다고 오인하지 않도록 표시.
const earlierPass=pass;
pass=function(){
 const html=earlierPass();
 const note='<div class="panel"><b>한국사능력검정시험은 별도 이용권</b><p>공무원 직렬별 패스권과 분리된 상품으로 출시할 예정입니다. 가격·결제·이용 제한은 아직 적용되지 않았습니다.</p><button class="link" data-act="exam" data-val="hanggeom" style="margin-top:9px;padding:8px 0">한능검 분야 보기 →</button></div>';
 return html.replace('전체 문제은행 자유롭게','한능검 제외 문제은행 이용')+note;
};
})();
