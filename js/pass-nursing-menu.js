/* PASS | 8급 간호직 메뉴 통합 (2026-11-14 표기 간소화)
 * 9급 공무원 > 8급 간호·보건진료 > 간호 를 누르면 기존 4과목(국어·영어·간호관리·지역사회간호)을 연결합니다.
 * 중복되던 첫 화면의 '간호직' 시험 분야(examId: nursing)는 data/extended-catalog.json 에서 hidden 처리되어
 * 홈·전체보기 메뉴에 나오지 않습니다. 원본 기출 JSON, catalog.json, 문제/응시 ID, Firebase 데이터는 변경하지 않습니다.
 * catalog-extension.js 다음, app.js 이전에 로드하세요.
 */
(function () {
  'use strict';

  /* 8급 간호·보건진료 섹션의 '간호' 직렬. 과목 연결은 기존 subjectId를 그대로 씁니다. */
  const TRACK_ID = 'ext_437ba2654a4e';
  const COMPONENTS = [
    { id: 'sub_civil_0', name: '국어', from: 'civil' },
    { id: 'sub_civil_1', name: '영어', from: 'civil' },
    { id: 'sub_nursing_manage', name: '간호관리', from: 'nursing' },
    { id: 'sub_nursing_community', name: '지역사회간호', from: 'nursing' }
  ];
  let entryLeaf = null;

  function nursingTrack() {
    return subjectBy(TRACK_ID) ||
      db.subjects.find(s => s.examId === 'civil' && s.kind === 'track' &&
        (s.name === '간호' || s.name === '간호직'));
  }

  function resolveComponent(part) {
    // 현재 기출의 기존 subjectId를 우선 사용해 통계/오답 연결을 유지합니다.
    return subjectBy(part.id) ||
      db.subjects.find(s => s.examId === part.from && s.name === part.name);
  }

  // 네 과목은 원본 subjectId 그대로 열며, 기존 학습 기록에도 영향이 없습니다.
  function courseRow(part) {
    const sub = resolveComponent(part);
    if (!sub) return '';
    const count = papersIn(sub.id).length;
    return `<button class="catalog-item" data-act="nursingOpenSubject" data-val="${esc(sub.id)}">` +
      `<span class="catalog-item-main"><b>${esc(part.name)}</b>` +
      `<small>${count ? count + '개 시험지' : '기출 준비 중'}</small></span>` +
      `<span class="catalog-chevron">›</span></button>`;
  }
  function nursingSubjects() {
    const track = nursingTrack();
    return `${appHeader()}
      <button class="back back-exams" data-act="nursingReturn">← ${esc(examBy('civil')?.name || '9급 공무원')}</button>
      <div class="eyebrow">CIVIL SERVICE</div>
      <h1 class="titleline">8급 · ${esc(track?.name || '간호')}</h1>
      <p class="description">8급 간호직입니다. 공통과목과 간호 전공과목을 한곳에서 풀어보세요.</p>
      <section class="catalog-list-section"><h2 class="catalog-section-title">공통과목</h2>
        <div class="catalog-list">${COMPONENTS.slice(0, 2).map(courseRow).join('') || '<div class="empty">공통과목 준비 중</div>'}</div></section>
      <section class="catalog-list-section"><h2 class="catalog-section-title">전공과목</h2>
        <div class="catalog-list">${COMPONENTS.slice(2).map(courseRow).join('') || '<div class="empty">전공과목 준비 중</div>'}</div></section>
      <p class="catalog-footnote">과목 안내는 메뉴 구성용입니다. 8급 간호직의 연도·지역·채용 방식별 실제 시험과목은 해당 공고를 확인해 주세요. 기존 한국사 기출은 공무원 과목 목록에 그대로 유지됩니다.</p>`;
  }

  const beforeSubject = subject;
  subject = function () {
    if (S.subjectId === nursingTrack()?.id) return nursingSubjects();
    let html = beforeSubject();
    if (entryLeaf && S.subjectId === entryLeaf) {
      // 간호직에서 들어온 경우에만 뒤로가기를 간호직으로 변경합니다.
      html = html.replace(
        /<button\b(?=[^>]*\bdata-act="backSubjects")[^>]*>[\s\S]*?<\/button>/,
        `<button class="back back-exams" data-act="nursingReturnToTrack">← ${esc(nursingTrack()?.name || '간호')}</button>`
      );
    }
    return html;
  };

  // 기존 app.js와 충돌하지 않도록 새 동작만 캡처 단계에서 처리합니다.
  document.addEventListener('click', function (event) {
    const b = event.target.closest?.('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'nursingOpenSubject') {
      if (!subjectBy(b.dataset.val)) return;
      entryLeaf = b.dataset.val;
      S.examId = 'civil';
      S.subjectId = entryLeaf;
      S.view = 'subject';
    } else if (act === 'nursingReturnToTrack') {
      entryLeaf = null;
      S.examId = 'civil';
      S.subjectId = nursingTrack()?.id || TRACK_ID;
      S.view = 'subject';
    } else if (act === 'nursingReturn') {
      entryLeaf = null;
      S.examId = 'civil';
      S.subjectId = null;
      S.view = 'library';
    } else {
      // 다른 메뉴에서 같은 과목으로 직접 들어가면 일반 뒤로가기를 유지합니다.
      if (act === 'subject' || act === 'exam' || act === 'view' || act === 'backExams') {
        entryLeaf = null;
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    render();
  }, true);
})();
