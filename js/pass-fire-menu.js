/* PASS | 소방 공무원 직렬별 과목 연결 (2026-11-14)
 * 소방 공무원 첫 화면에서는 낱개 과목 타일 대신 직렬 카드만 보여 주고,
 * 소방사 공개채용을 누르면 소방학개론·소방관계법규·행정법총론 시험지가 개수와 함께 열립니다.
 * 나머지 소방 직렬은 실제 시험과목 안내와 '기출 준비 중'으로 연결합니다.
 * 기존 data/catalog.json, 시험지 JSON, subjectId, 학습 기록은 그대로 두고 화면 구성만 담당합니다.
 * pass-police-menu.js 다음, app.js 이전에 로드하세요.
 */
(function () {
  'use strict';

  const FIRE = 'fire';
  /* 소방학개론·소방관계법규·행정법총론 기출이 등록된 직렬 */
  const LINKED_TRACKS = ['소방사 공개채용'];
  /* 기출이 아직 없는 직렬의 안내용 과목 목록(연도·직렬별 공고에 따라 달라질 수 있습니다). */
  const GUIDE_TRACKS = {
    '소방간부후보생': ['헌법', '행정법', '행정학', '소방학개론', '민법총칙', '형사소송법', '전공과목(경제학·자연과학개론 등)'],
    '소방 구조': ['소방학개론', '소방관계법규', '전공과목(응급처치학개론 등)'],
    '소방 구급': ['소방학개론', '소방관계법규', '전공과목(응급처치학개론 등)'],
    '소방 관련학과 경력채용': ['소방학개론', '소방관계법규', '전공과목(화학개론 등)'],
    '소방 정보통신 경력채용': ['소방학개론', '소방관계법규', '전공과목(컴퓨터일반 등)']
  };

  let entryLeaf = null;
  let entryTrack = null;

  if (!document.getElementById('pass-fire-menu-styles')) {
    const style = document.createElement('style');
    style.id = 'pass-fire-menu-styles';
    style.textContent = '.catalog-item.is-pending{background:#fbfcff;border-style:dashed;box-shadow:none;color:#7d8aa1}' +
      '.catalog-item.is-pending .catalog-item-main b{color:#67748c;font-weight:800}' +
      '.catalog-item.is-pending .catalog-item-main small{color:#9aa6ba}';
    document.head.appendChild(style);
  }

  function fireExam() { return examBy(FIRE); }
  function isFireTrack(id) {
    const s = subjectBy(id);
    return !!(s && s.examId === FIRE && s.kind === 'track');
  }
  function fireSubject(name) {
    return db.subjects.find(s => s.examId === FIRE && !s.kind && s.name === name) || null;
  }
  function isLinkedTrack(track) {
    return !!track && isFireTrack(track.id) && LINKED_TRACKS.indexOf(track.name) >= 0;
  }
  function linkNames() { return ['소방학개론', '소방관계법규', '행정법총론']; }
  function linkCount(track) {
    const seen = new Set();
    let papers = 0;
    let subjects = 0;
    for (const name of linkNames()) {
      const sub = fireSubject(name);
      if (!sub || seen.has(sub.id)) continue;
      seen.add(sub.id);
      subjects++;
      papers += papersIn(sub.id).length;
    }
    return { subjects, papers };
  }

  function searchBox(placeholder) {
    return `<div class="catalog-search"><span aria-hidden="true">⌕</span><input id="catalogSearch" type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off"></div><div class="catalog-no-result" id="catalogNoResult" hidden>일치하는 항목이 없습니다.</div>`;
  }

  function trackTile(track) {
    const linked = isLinkedTrack(track);
    const counts = linked ? linkCount(track) : { subjects: 0, papers: 0 };
    const guide = GUIDE_TRACKS[track.name] || [];
    const search = [track.name, track.section || ''].concat(linked ? linkNames() : guide).join(' ');
    let info;
    if (linked && counts.papers) info = `${counts.subjects}과목 · ${counts.papers}개 시험지`;
    else if (linked) info = '기출 준비 중';
    else if (guide.length) info = '과목 안내 · 기출 준비 중';
    else info = '기출 준비 중';
    return `<button class="catalog-item" data-act="subject" data-val="${esc(track.id)}" data-catalog-item="${esc(search)}">` +
      `<span class="catalog-item-main"><b>${esc(track.name)}</b><small>${esc(info)}</small></span>` +
      `<span class="catalog-chevron">›</span></button>`;
  }

  function fireLibrary() {
    const e = fireExam();
    const tracks = db.subjects.filter(s => s.examId === FIRE && s.kind === 'track');
    const bySection = new Map();
    for (const track of tracks) {
      const key = track.section || '직렬';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(track);
    }
    const sections = Array.from(bySection, ([name, rows]) =>
      `<section class="catalog-list-section" data-catalog-section><h2 class="catalog-section-title">${esc(name)} <span class="catalog-muted-count">${rows.length}</span></h2><div class="catalog-list">${rows.map(trackTile).join('')}</div></section>`).join('');
    return `${appHeader()}<button class="back back-exams" data-act="backExams">← 시험 분야</button><h1 class="titleline">${esc(e ? e.name : '소방 공무원')}</h1><p class="description">직렬을 선택하면 해당 직렬의 시험과목이 열립니다.</p>
 ${searchBox('직렬·과목 검색')}${sections || '<div class="empty">등록된 직렬이 없습니다.</div>'}
 <p class="catalog-footnote">소방사 공개채용은 2022~2026년 소방학개론·소방관계법규·행정법총론 기출이 등록되어 있습니다. 2023·2024·2025·2026년은 과목당 25문항, 2022년은 과목당 20문항입니다. 소방간부후보생·경력채용은 과목 안내만 제공하며 기출은 준비 중입니다. 직렬·연도에 따라 시험과목이 다를 수 있으니 해당 연도 공고를 확인해 주세요.</p>`;
  }

  function linkedRow(name) {
    const sub = fireSubject(name);
    const count = sub ? papersIn(sub.id).length : 0;
    if (sub && count) {
      return `<button class="catalog-item" data-act="fireOpenSubject" data-val="${esc(sub.id)}">` +
        `<span class="catalog-item-main"><b>${esc(name)}</b><small>${count}개 시험지</small></span>` +
        `<span class="catalog-chevron">›</span></button>`;
    }
    return `<div class="catalog-item is-pending" aria-disabled="true"><span class="catalog-item-main"><b>${esc(name)}</b><small>기출 준비 중</small></span></div>`;
  }

  function guideRow(name) {
    return `<div class="catalog-item is-pending" aria-disabled="true"><span class="catalog-item-main"><b>${esc(name)}</b><small>기출 준비 중</small></span></div>`;
  }

  function trackPage(track) {
    const linked = isLinkedTrack(track);
    const rows = linked ? linkNames().map(linkedRow) : (GUIDE_TRACKS[track.name] || []).map(guideRow);
    const sectionTitle = linked ? '전공과목' : '시험과목 안내';
    const section = rows.length
      ? `<section class="catalog-list-section"><h2 class="catalog-section-title">${sectionTitle}</h2><div class="catalog-list">${rows.join('')}</div></section>`
      : `<section class="catalog-list-section"><h2 class="catalog-section-title">${sectionTitle}</h2><div class="catalog-pending">과목 안내·기출 준비 중</div></section>`;
    const note = linked
      ? '소방학개론·소방관계법규·행정법총론 기출을 2022~2026년까지 등록했습니다. 과목을 누르면 시험지와 문제풀이로 이어집니다.'
      : '이 직렬의 기출은 아직 준비 중입니다. 표시된 과목은 안내용이며, 해당 연도 공고의 시험과목을 확인해 주세요.';
    return `${appHeader()}
      <button class="back back-exams" data-act="fireReturn">← ${esc(fireExam() ? fireExam().name : '소방 공무원')}</button>
      <h1 class="titleline">${esc(track.name)}</h1>
      <p class="description">${esc(track.name)}의 시험과목을 한곳에서 확인하고 풀어보세요.</p>
      ${section}
      <p class="catalog-footnote">${esc(note)}</p>`;
  }

  const beforeLibrary = library;
  library = function () {
    if (S.examId === FIRE) return fireLibrary();
    return beforeLibrary();
  };

  const beforeSubject = subject;
  subject = function () {
    const id = S.subjectId;
    if (id && isFireTrack(id)) return trackPage(subjectBy(id));
    const html = beforeSubject();
    if (entryLeaf && id === entryLeaf && entryTrack && subjectBy(entryTrack)) {
      return html.replace(
        /<button\b(?=[^>]*\bdata-act="backSubjects")[^>]*>[\s\S]*?<\/button>/,
        `<button class="back back-exams" data-act="fireReturnToTrack">← ${esc(subjectBy(entryTrack).name)}</button>`
      );
    }
    return html;
  };

  function clearEntry() { entryLeaf = null; entryTrack = null; }

  document.addEventListener('click', function (event) {
    const b = event.target.closest?.('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'fireOpenSubject') {
      const sub = subjectBy(b.dataset.val);
      if (!sub) return;
      const track = subjectBy(S.subjectId);
      entryLeaf = sub.id;
      entryTrack = isFireTrack(track && track.id) ? track.id : null;
      S.examId = FIRE;
      S.subjectId = sub.id;
      S.view = 'subject';
    } else if (act === 'fireReturnToTrack') {
      const trackId = entryTrack;
      clearEntry();
      S.examId = FIRE;
      S.subjectId = trackId;
      S.view = trackId ? 'subject' : 'library';
    } else if (act === 'fireReturn') {
      clearEntry();
      S.examId = FIRE;
      S.subjectId = null;
      S.view = 'library';
    } else {
      if (['subject', 'exam', 'view', 'backExams', 'quick', 'nursingOpenSubject',
        'nursingReturn', 'nursingReturnToTrack', 'trackOpenSubject', 'trackReturn',
        'trackReturnToTrack', 'policeOpenSubject', 'policeReturn', 'policeReturnToTrack',
        'historyDetail'].includes(act)) clearEntry();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    render();
  }, true);
})();
