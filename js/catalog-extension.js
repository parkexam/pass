/* PASS career / qualification catalog expansion.
   The primary catalog.json remains owned by existing AI content workflows.
   Labels here identify browse categories, NOT confirmed current-year recruitment nor paid content. */
(function(){
'use strict';
const categoryGroups=['공무원','적성·입학','국가기술자격','자격·인증'];
/* 홈에 먼저 보여 줄 시험 분야. 간호직은 9급 공무원 > 8급 간호·보건진료 > 간호 로 통합되어 뺐습니다. */
const featuredIds=['civil','leet','meet','cert-engineer','cert-health'];
const baseInit=initCatalog;
initCatalog=async function(){
  await baseInit();
  try{
    const response=await fetch('data/extended-catalog.json',{cache:'no-cache'});
    if(!response.ok) throw Error('추가 시험 메뉴를 읽지 못했습니다 ('+response.status+')');
    const extra=await response.json();
    if(!Array.isArray(extra.exams)||!Array.isArray(extra.subjects))throw Error('시험 목록 형식을 확인해 주세요.');
    for(const ex of extra.exams){
      const current=db.exams.find(e=>e.id===ex.id);
      if(current){
        // 표시 이름·설명은 확장 카탈로그를 기준으로 삼아, 기존 catalog.json이 그대로여도 메뉴 이름이 유지됩니다.
        current.name=ex.name;
        current.desc=ex.desc;
        current.categoryGroup=ex.categoryGroup;
        current.order=ex.order;
        if(ex.hidden)current.hidden=true;
        if(ex.mergedInto)current.mergedInto=ex.mergedInto;
      }else{
        db.exams.push({...ex,external:true});
      }
    }
    for(const change of extra.subjectUpdates||[]){
      const current=db.subjects.find(s=>s.id===change.id);
      if(current&&!current.section)current.section=change.section;
    }
    for(const item of extra.subjects){
      const current=db.subjects.find(s=>s.id===item.id);
      if(!current)db.subjects.push({...item,external:true});
      else if(current.external){
        // 이름·섹션은 확장 카탈로그를 기준으로 삼아, 기기에 저장된 이전 이름이 남지 않게 합니다.
        for(const key of ['name','kind','section','parentId','meta'])if(item[key]!==undefined)current[key]=item[key];
      }
    }
    persist();
  }catch(error){
    console.warn('확장 메뉴 읽기 실패:',error);
    window.extraCatalogError=error.message;
  }
};
const originalLibrary=library;
const originalSubject=subject;
function groupExams(exams){
 return categoryGroups.map(label=>{
  const rows=exams.filter(e=>(e.categoryGroup||'기타')===label);
  if(!rows.length)return '';
  return `<section class="catalog-group"><h2 class="catalog-section-title">${esc(label)}</h2><div class="cards catalog-grid">${rows.map(e=>`<button class="cat catalog-cat" data-act="exam" data-val="${esc(e.id)}"><h3>${esc(e.name)}</h3><p>${esc(e.desc||'')}</p></button>`).join('')}</div></section>`;
 }).join('');
}
catCards=function(){
 // hidden 시험 분야는 다른 메뉴로 통합된 레거시 항목이라 홈·전체보기 어디에도 표시하지 않습니다.
 let exams=db.exams.filter(e=>!e.hidden).slice().sort((a,b)=>(a.order??999)-(b.order??999));
 if(S.view==='home'){
  let picked=featuredIds.map(id=>exams.find(e=>e.id===id)).filter(Boolean);
  if(!picked.length)picked=exams.slice(0,6);
  return `<div class="cards catalog-grid">${picked.map(e=>`<button class="cat catalog-cat" data-act="exam" data-val="${esc(e.id)}"><h3>${esc(e.name)}</h3><p>${esc(e.desc||'')}</p></button>`).join('')}</div>`;
 }
 return groupExams(exams)+`<p class="catalog-footnote">메뉴는 기출 수록 여부와 무관합니다. 연도·직렬·자격별 실제 시행 여부와 출제 형식은 주관 기관 공고를 확인해 주세요.</p>`;
};
function pathLabel(sub){return sub?.kind==='track'?'직렬·종목':'과목'}
function isRootSubject(s){return !s.parentId;}
function subTile(sub){
 const children=db.subjects.filter(s=>s.parentId===sub.id);
 const ownPapers=papersIn(sub.id);
 const count=ownPapers.length+children.reduce((n,c)=>n+papersIn(c.id).length,0);
 return `<button class="catalog-item" data-act="subject" data-val="${esc(sub.id)}" data-catalog-item="${esc(sub.name+' '+(sub.section||''))}"><span class="catalog-item-main"><b>${esc(sub.name)}</b><small>${count?count+'개 시험지':'기출 준비 중'}</small></span><span class="catalog-chevron">›</span></button>`;
}
function catalogSearchBox(placeholder){return `<div class="catalog-search"><span aria-hidden="true">⌕</span><input id="catalogSearch" type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off"></div><div class="catalog-no-result" id="catalogNoResult" hidden>일치하는 항목이 없습니다.</div>`;}
library=function(){
 const e=examBy(S.examId);
 if(!e){return `${appHeader()}<div class="eyebrow">QUESTION LIBRARY</div><h1 class="titleline">시험 분야</h1><p class="description">공무원 직렬부터 객관식 자격시험까지 분야별로 찾아보세요.</p>${catCards()}${window.extraCatalogError?`<div class="notice">확장 메뉴 오류: ${esc(window.extraCatalogError)}</div>`:''}`;}
 const list=db.subjects.filter(s=>s.examId===e.id&&isRootSubject(s));
 const bySection=new Map();
 for(const s of list){const key=s.section||'과목·종목';if(!bySection.has(key))bySection.set(key,[]);bySection.get(key).push(s);}
 let sections=Array.from(bySection,([name,rows])=>`<section class="catalog-list-section" data-catalog-section><h2 class="catalog-section-title">${esc(name)} <span class="catalog-muted-count">${rows.length}</span></h2><div class="catalog-list">${rows.map(subTile).join('')}</div></section>`).join('');
 return `${appHeader()}<button class="back back-exams" data-act="backExams">← 시험 분야</button><h1 class="titleline">${esc(e.name)}</h1><p class="description">${esc(e.desc||'원하는 항목을 선택하세요.')}</p>
 ${catalogSearchBox('직렬·과목·자격증 검색')}${sections||'<div class="empty">아직 등록된 과목이 없습니다.</div>'}
 ${e.id==='meet'?'<p class="catalog-footnote">MEET·DEET는 과거 시행된 시험입니다. 현행 입학시험으로 안내하지 않습니다.</p>':''}
 ${e.id.startsWith('cert-')?'<p class="catalog-footnote">필기에서 객관식인 영역을 중심으로 분류했습니다. 실기·필답·면접 시험은 이 문제은행의 채점 범위가 아닙니다.</p>':''}`;
};
subject=function(){
 const s=subjectBy(S.subjectId);
 if(!s)return originalSubject();
 const children=db.subjects.filter(c=>c.parentId===s.id);
 if(s.kind==='track'||children.length){
  const own=papersIn(s.id).slice().sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  let items=children.length?`<div class="catalog-list">${children.map(subTile).join('')}</div>`:'';
  return `${appHeader()}<button class="back back-exams" data-act="backSubjects">← ${s.parentId?esc(subjectBy(s.parentId)?.name||'분야'):esc(examBy(s.examId)?.name||'시험 분야')}</button>
   <div class="eyebrow">EXAM CATEGORY</div><h1 class="titleline">${esc(s.name)}</h1><p class="description">${own.length||children.length?'등록된 과목이나 시험지를 선택하세요.':'등록된 기출문제가 아직 없습니다.'}</p>
   ${items}${own.length?`<div class="sectionbar"><h2>등록된 시험지</h2></div>${own.map(paperCard).join('')}`:''}
   ${!own.length&&!children.length?'<div class="catalog-pending">기출문제 준비 중</div>':''}`;
 }
 let original=originalSubject();
 if(s.parentId){
   const parent=subjectBy(s.parentId);
   original=original.replace('← 과목 목록',`← ${esc(parent?.name||'직렬 목록')}`);
 }
 return original;
};
// Existing app.js handles all original menu actions. Only the leaf → track back behavior is new.
document.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-act]');
 if(!b||b.dataset.act!=='backSubjects')return;
 const sub=subjectBy(S.subjectId);
 if(sub?.parentId){
  event.preventDefault();event.stopImmediatePropagation();
  S.subjectId=sub.parentId;S.view='subject';render();
 }
},true);
// Search filters the current DOM without changing screen state or learning data.
document.addEventListener('input',event=>{
 if(event.target.id!=='catalogSearch')return;
 const query=event.target.value.trim().toLocaleLowerCase('ko-KR');
 let visible=0;
 document.querySelectorAll('[data-catalog-item]').forEach(row=>{
  const matches=row.dataset.catalogItem.toLocaleLowerCase('ko-KR').includes(query);
  row.hidden=!matches;if(matches)visible++;
 });
 document.querySelectorAll('[data-catalog-section]').forEach(section=>{
  section.hidden=![...section.querySelectorAll('[data-catalog-item]')].some(item=>!item.hidden);
 });
 const empty=document.getElementById('catalogNoResult');if(empty)empty.hidden=!!visible;
});
})();
