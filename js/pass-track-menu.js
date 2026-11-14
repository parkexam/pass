/* PASS | 9급 공무원 직렬별 과목 연결 (2026-11-14 표기 간소화 · 지역구분 중복 직렬 숨김)
 * 공무원 > 9급 공무원 의 직렬 카드를 누르면 공통과목(국어·영어)과 그 직렬의 전공과목을
 * 간호직 메뉴(pass-nursing-menu.js)와 같은 화면 구성으로 열어 줍니다.
 * 하위 섹션은 행정 / 8급 간호·보건진료 / 9급 보건·의료 / 9급 조세·사법·치안 /
 * 9급 과학기술·전산 / 9급 농림·환경·현장 순으로 보여 줍니다.
 * 기존 data/catalog.json, 시험지 JSON, subjectId, Firebase 오답/학습 기록은 그대로 두고
 * 화면(메뉴) 구성만 담당합니다.
 * catalog-extension.js, pass-nursing-menu.js 다음, app.js 이전에 로드하세요.
 *
 * 2026-11-14: '일반행정(지역구분)'처럼 끝에 '(지역구분)'이 붙은 직렬은 시험과목이
 * 같은 기본 직렬(일반행정)과 중복이라 직렬 목록 카드에서 숨깁니다. 기기에 예전 카탈로그가
 * 남아 있는 사용자도 같은 목록을 보도록 이름으로 걸러 내고, 이미 그 직렬을 목표(targetTrack)로
 * 저장했거나 옛 주소로 들어와도 과목 화면은 기본 직렬 화면으로 이어서 열립니다.
 * data/extended-catalog.json 의 항목과 TRACK_MAJORS 연결은 그대로 둡니다.
 */
(function () {
  'use strict';

  const CIVIL = 'civil';
  const DEFAULT_COMMON = ['국어', '영어'];
  /* 9급 공무원 하위 섹션 표시 순서. 저장된 기기 데이터의 과목 순서와 상관없이 같은 순서로 보입니다. */
  const SECTION_ORDER = ['행정', '8급 간호·보건진료', '9급 보건·의료',
    '9급 조세·사법·치안', '9급 과학기술·전산', '9급 농림·환경·현장'];
  const sectionRank = name => {
    const i = SECTION_ORDER.indexOf(name);
    return i < 0 ? SECTION_ORDER.length : i;
  };

  /* '(지역구분)' 꼬리표가 붙은 직렬은 기본 직렬과 같은 시험을 두 번 보여 주는 중복 카드입니다.
     목록에서는 숨기고, 열리면 기본 직렬 화면으로 바꿔 보여 줍니다. */
  const DUPLICATE_TRACK = /\(지역구분\)\s*$/;
  function isDuplicateTrack(track) {
    return !!(track && track.kind === 'track' && DUPLICATE_TRACK.test(String(track.name || '')));
  }
  /* 중복 직렬 -> 같은 시험 분야의 기본 직렬. 기본 직렬이 없으면 원래 항목을 그대로 씁니다. */
  function baseTrack(track) {
    if (!isDuplicateTrack(track)) return track;
    const name = String(track.name).replace(/\s*\(지역구분\)\s*$/, '');
    return db.subjects.find(s => s && s.examId === track.examId && s.kind === 'track' &&
      s.id !== track.id && !isDuplicateTrack(s) && String(s.name) === name) || track;
  }
  /* 목표 직렬 화면(pass-target-home.js)도 같은 기준을 쓰도록 넘겨 줍니다. */
  window.PASS_TRACK_DISPLAY = { isDuplicate: isDuplicateTrack, baseOf: baseTrack };

  /* 직렬별 전공과목. 공무원임용시험령 별표1과 각 기관 공고의 9급 공채 기준을 참고했습니다.
     값이 없으면 화면에 '전공과목 안내·기출 준비 중'으로 표시됩니다. */
  const TRACK_MAJORS = {
    '일반행정': ['행정법총론', '행정학개론'],
    '일반행정(지역구분)': ['행정법총론', '행정학개론'],
    '우정사업본부 행정': ['행정법총론', '행정학개론'],
    '교육행정': ['교육학개론', '행정법총론'],
    '선거행정': ['공직선거법', '행정법총론'],
    '고용노동': ['노동법개론', '행정법총론'],
    '직업상담': ['노동법개론', '직업상담·심리학개론'],
    '사회복지': ['사회복지학개론', '행정법총론'],
    '사서': ['자료조직개론', '정보봉사개론'],
    '속기': ['행정법총론', '행정학개론'],
    '운전': ['자동차구조원리 및 도로교통법규'],
    '시설관리': ['기계일반', '전기이론', '화학공학일반'],
    '방호': [],
    '세무': ['세법개론', '지방세법', '회계학'],
    '관세': ['관세법개론', '회계원리'],
    '통계': ['통계학개론', '경제학개론'],
    '교정': ['교정학개론', '형사소송법개론'],
    '보호': ['형사정책개론', '사회복지학개론'],
    '검찰': ['형법', '형사소송법'],
    '마약수사': ['형법', '형사소송법'],
    '출입국관리': ['행정법총론', '국제법개론'],
    '철도관리': [],
    '철도경찰': ['형사소송법개론', '형법총론'],
    '일반기계': ['기계일반', '기계설계'],
    '전기': ['전기이론', '전기기기'],
    '화공': ['화학공학일반', '공업화학'],
    '전산개발': ['컴퓨터일반', '정보보호론'],
    '정보보호': ['네트워크 보안', '정보시스템 보안'],
    '방송통신(전송기술)': ['전자공학개론', '무선공학개론'],
    '농업(일반농업)': ['재배학개론', '식용작물'],
    '임업(산림자원)': ['조림', '임업경영'],
    '환경(일반환경)': ['화학', '환경공학개론'],
    '일반토목': ['응용역학개론', '토목설계'],
    '건축': ['건축계획', '건축구조'],
    '지적': ['지적측량', '지적전산학개론'],
    '방재안전': ['재난관리론', '안전관리론'],
    '보건': ['공중보건', '보건행정'],
    '간호': ['간호관리', '지역사회간호'],
    '간호직': ['간호관리', '지역사회간호'],
    '보건진료': ['공중보건', '지역사회간호'],
    '의료기술': ['공중보건', '의료관계법규'],
    '식품위생': ['식품위생', '식품화학개론'],
    '수의': [],
    '농촌지도': ['재배학', '작물생리학', '토양학'],
    '녹지': [],
    '조경': ['조경학', '조경계획 및 생태계관리'],
    '기계운영': []
  };
  /* 공통과목이 국어·영어와 다른 직렬만 따로 적습니다. */
  const TRACK_COMMON = {
    '시설관리': ['국어', '한국사'],
    '운전': [],
    '의료기술': []
  };

  let entryLeaf = null;
  let entryTrack = null;

  // 아직 기출이 없는 과목 행은 눌리지 않는 안내 행으로 보이게 합니다.
  if (!document.getElementById('pass-track-menu-styles')) {
    const style = document.createElement('style');
    style.id = 'pass-track-menu-styles';
    style.textContent = '.catalog-item.is-pending{background:#fbfcff;border-style:dashed;box-shadow:none;color:#7d8aa1}' +
      '.catalog-item.is-pending .catalog-item-main b{color:#67748c;font-weight:800}' +
      '.catalog-item.is-pending .catalog-item-main small{color:#9aa6ba}';
    document.head.appendChild(style);
  }

  /* 직렬의 급수는 섹션 이름의 앞머리에서 읽습니다. 8급은 '8급 간호·보건진료'처럼 섹션에
     '8급'이 들어 있을 때만 8급이고, 급수 표기가 없는 섹션('행정' 등)은 9급으로 봅니다. */
  function gradeOf(track) {
    const section = String(track && track.section || '');
    if (section.indexOf('8급') >= 0) return '8급';
    return '9급';
  }
  function civilExam() { return examBy(CIVIL); }
  function isCivilTrack(id) {
    const s = subjectBy(id);
    return !!(s && s.examId === CIVIL && s.kind === 'track');
  }
  function nursingTrackId() {
    const t = db.subjects.find(s => s.examId === CIVIL && s.kind === 'track' &&
      (s.name === '간호' || s.name === '간호직'));
    return t ? t.id : null;
  }
  function isNursingTrack(id) {
    if (!id) return false;
    if (id === nursingTrackId()) return true;
    const s = subjectBy(id);
    return !!(s && s.examId === CIVIL && s.kind === 'track' && (s.name === '간호' || s.name === '간호직'));
  }
  /* 기존 과목(sub_civil_0 등)의 subjectId는 그대로 두고 이름으로만 연결합니다. */
  function findSubject(name) {
    return db.subjects.find(s => s.examId === CIVIL && !s.kind && s.name === name) ||
      db.subjects.find(s => !s.kind && s.name === name) || null;
  }
  function majorNames(track) { return (TRACK_MAJORS[track.name] || []).slice(); }
  function commonNames(track) { return (TRACK_COMMON[track.name] || DEFAULT_COMMON).slice(); }
  function connectCount(track) {
    const seen = new Set();
    let papers = 0;
    let subjects = 0;
    for (const name of commonNames(track).concat(majorNames(track))) {
      const sub = findSubject(name);
      if (!sub || seen.has(sub.id)) continue;
      seen.add(sub.id);
      subjects++;
      papers += papersIn(sub.id).length;
    }
    return { subjects, papers };
  }

  function catalogSearchBox(placeholder) {
    return `<div class="catalog-search"><span aria-hidden="true">⌕</span><input id="catalogSearch" type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off"></div><div class="catalog-no-result" id="catalogNoResult" hidden>일치하는 항목이 없습니다.</div>`;
  }

  function trackTile(track) {
    const { subjects, papers } = connectCount(track);
    const search = [track.name, track.section || ''].concat(commonNames(track), majorNames(track)).join(' ');
    const info = subjects ? `${subjects}과목 · ${papers}개 시험지`
      : (majorNames(track).length ? '기출 준비 중' : '전공과목 안내 준비 중');
    return `<button class="catalog-item" data-act="subject" data-val="${esc(track.id)}" data-catalog-item="${esc(search)}">` +
      `<span class="catalog-item-main"><b>${esc(track.name)}</b><small>${esc(info)}</small></span>` +
      `<span class="catalog-chevron">›</span></button>`;
  }

  /* 9급 공무원 첫 화면: 직렬 카드만 보여 주고(직렬명만 표시), 낱개 과목 타일은 직렬 안으로 옮깁니다. */
  function civilLibrary() {
    const e = civilExam();
    const tracks = db.subjects.filter(s => s.examId === CIVIL && s.kind === 'track' && !isDuplicateTrack(s));
    const bySection = new Map();
    for (const track of tracks) {
      const key = track.section || '직렬';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(track);
    }
    const sections = Array.from(bySection).sort((a, b) => sectionRank(a[0]) - sectionRank(b[0]));
    const sectionHtml = sections.map(([name, rows]) =>
      `<section class="catalog-list-section" data-catalog-section><h2 class="catalog-section-title">${esc(name)} <span class="catalog-muted-count">${rows.length}</span></h2><div class="catalog-list">${rows.map(trackTile).join('')}</div></section>`).join('');
    return `${appHeader()}<button class="back back-exams" data-act="backExams">← 시험 분야</button><h1 class="titleline">${esc(e ? e.name : '9급 공무원')}</h1><p class="description">직렬을 선택하면 공통과목과 전공과목이 함께 열립니다.</p>
 ${catalogSearchBox('직렬·전공과목 검색')}${sectionHtml || '<div class="empty">등록된 직렬이 없습니다.</div>'}
 <p class="catalog-footnote">8급은 간호·보건진료를, 9급은 보건·의료와 농림·환경·현장까지 직렬별로 모았습니다. 아직 기출이 없는 과목은 '기출 준비 중'으로 표시됩니다. 2027년부터 9급 한국사 필기는 한국사능력검정시험 성적으로 대체됩니다. 직렬·직류·연도에 따라 시험과목이 다를 수 있으니 해당 연도 공고를 확인해 주세요.</p>`;
  }

  function subjectRow(name) {
    const sub = findSubject(name);
    const count = sub ? papersIn(sub.id).length : 0;
    if (sub && count) {
      return `<button class="catalog-item" data-act="trackOpenSubject" data-val="${esc(sub.id)}">` +
        `<span class="catalog-item-main"><b>${esc(name)}</b><small>${count}개 시험지</small></span>` +
        `<span class="catalog-chevron">›</span></button>`;
    }
    return `<div class="catalog-item is-pending" aria-disabled="true">` +
      `<span class="catalog-item-main"><b>${esc(name)}</b><small>기출 준비 중</small></span></div>`;
  }

  function trackPage(track) {
    const common = commonNames(track);
    const majors = majorNames(track);
    const grade = gradeOf(track);
    const commonSection = common.length
      ? `<section class="catalog-list-section"><h2 class="catalog-section-title">공통과목</h2><div class="catalog-list">${common.map(subjectRow).join('')}</div></section>`
      : '';
    const majorSection = majors.length
      ? `<section class="catalog-list-section"><h2 class="catalog-section-title">전공과목</h2><div class="catalog-list">${majors.map(subjectRow).join('')}</div></section>`
      : `<section class="catalog-list-section"><h2 class="catalog-section-title">전공과목</h2><div class="catalog-pending">전공과목 안내·기출 준비 중</div></section>`;
    return `${appHeader()}
      <button class="back back-exams" data-act="trackReturn">← ${esc(civilExam() ? civilExam().name : '9급 공무원')}</button>
      <h1 class="titleline">${esc(grade)} · ${esc(track.name)}</h1>
      <p class="description">공통과목과 ${esc(track.name)} 전공과목을 한곳에서 풀어보세요.</p>
      ${commonSection}${majorSection}
      <p class="catalog-footnote">과목 안내는 메뉴 구성용입니다. 직렬·직류·연도에 따라 시험과목과 배점이 다를 수 있으니 해당 연도 공고를 확인해 주세요. 기출이 준비된 과목은 문제 수와 함께 바로 열립니다.</p>`;
  }

  const beforeLibrary = library;
  library = function () {
    if (S.examId === CIVIL) return civilLibrary();
    return beforeLibrary();
  };

  const beforeSubject = subject;
  subject = function () {
    const id = S.subjectId;
    if (isNursingTrack(id)) return beforeSubject();
    if (isCivilTrack(id)) return trackPage(baseTrack(subjectBy(id)));
    const html = beforeSubject();
    if (entryLeaf && id === entryLeaf && entryTrack && subjectBy(entryTrack)) {
      // 직렬에서 들어온 과목만 뒤로가기를 그 직렬로 바꿉니다.
      return html.replace(
        /<button\b(?=[^>]*\bdata-act="backSubjects")[^>]*>[\s\S]*?<\/button>/,
        `<button class="back back-exams" data-act="trackReturnToTrack">← ${esc(subjectBy(entryTrack).name)}</button>`
      );
    }
    return html;
  };

  function clearEntry() { entryLeaf = null; entryTrack = null; }

  // 앱의 기존 클릭 처리(app.js)와 간호직 처리보다 먼저 새 동작만 가로챕니다.
  document.addEventListener('click', function (event) {
    const b = event.target.closest?.('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'trackOpenSubject') {
      const sub = subjectBy(b.dataset.val);
      if (!sub) return;
      const track = subjectBy(S.subjectId);
      entryLeaf = sub.id;
      entryTrack = isCivilTrack(track && track.id) ? track.id : null;
      S.examId = CIVIL;
      S.subjectId = sub.id;
      S.view = 'subject';
    } else if (act === 'trackReturnToTrack') {
      const trackId = entryTrack;
      clearEntry();
      S.examId = CIVIL;
      S.subjectId = trackId;
      S.view = trackId ? 'subject' : 'library';
    } else if (act === 'trackReturn') {
      clearEntry();
      S.examId = CIVIL;
      S.subjectId = null;
      S.view = 'library';
    } else {
      // 다른 경로로 이동하면 직렬에서 들어온 상태를 남기지 않습니다.
      if (['subject', 'exam', 'view', 'backExams', 'quick', 'nursingOpenSubject',
        'nursingReturn', 'nursingReturnToTrack', 'historyDetail'].includes(act)) clearEntry();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    render();
  }, true);
})();
