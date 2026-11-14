/* PASS 모바일 UX 정리 v8 · 2026-11-14
   설치: pass-target-home.js 및 모든 화면 확장 스크립트 뒤, </body> 바로 위
   변경하지 않음: 문제 데이터, catalog, 응시 완료 기록, Firebase 구성/보안 규칙
*/
(function () {
  'use strict';
  if (window.__PASS_UI_POLISH_V8__) return;
  window.__PASS_UI_POLISH_V8__ = true;

  const style = document.createElement('style');
  style.id = 'pass-ui-polish-v8-style';
  style.textContent = `
    html, body { max-width:100%; overflow-x:clip; }
    #app.phone { width:100%; max-width:460px; min-width:0; margin-left:auto; margin-right:auto; }
    #app .page { width:100%; max-width:100%; min-width:0; overflow-x:clip; }
    #app .page > * { max-width:100%; min-width:0; }
    #app .row > .grow, #app .pass-target-goal-label { min-width:0; }
    #app .pass-target-hero { min-width:0; }
    #app .pass-target-goal-label small { display:none !important; }
    #app .pass-target-hero .pass-target-goal-row { margin-top:13px; }
    #app .pass-target-actions { grid-template-columns:minmax(0,1fr) !important; }
    #app .pass-target-actions .pass-target-secondary { display:none !important; }
    #app .pass-target-draft-details .pass-v8-draft-item { display:flex; align-items:stretch; gap:8px; min-width:0; margin:8px 0; }
    #app .pass-v8-draft-item .pass-drafts-row { flex:1; min-width:0; margin:0 !important; padding:10px 11px; }
    #app .pass-v8-draft-delete { flex:none; border:1px solid #f2cfd5; color:#ae4251; background:#fff6f7; border-radius:12px; padding:9px 10px; font-weight:800; font-size:12px; cursor:pointer; min-width:50px; }
    #app .pass-v8-draft-delete:focus-visible { outline:2px solid #cb5064;outline-offset:2px; }
    #app .pass-v8-draft-delete:active { background:#fbe8ec; }
    #app .pass-drafts-list .pass-v8-draft-item { display:flex; align-items:center; gap:8px; min-width:0; margin:8px 0; }
    #app .pass-v8-chevron { display:inline-block; font-size:25px; line-height:1; font-weight:500; vertical-align:-2px; margin-right:5px; }
    #app .page button.back, #app .page button.pass-library-home { display:inline-flex; align-items:center; gap:2px; white-space:normal; text-align:left; }
    #app .metric b .pass-v8-unit { display:inline; font-size:11px; margin-left:3px; font-weight:700; letter-spacing:0; color:var(--muted,#74829a); }
    /* 홈 통계 카드: 라벨을 위, 숫자를 아래로. 좁은 폰 폭에서도 왼쪽 글자가 잘리지 않도록 정렬/여백 고정 */
    #app .metrics { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
    #app .metrics .metric { display:flex; flex-direction:column-reverse; justify-content:flex-end; align-items:flex-start; gap:5px; padding:12px 12px 13px; min-width:0; max-width:100%; overflow:visible; text-align:left; }
    #app .metrics .metric span { display:block; width:100%; max-width:100%; margin:0; color:var(--muted,#74829a); font-size:11px; line-height:1.25; letter-spacing:-.02em; white-space:normal; word-break:keep-all; overflow-wrap:break-word; }
    #app .metrics .metric b { display:flex; align-items:baseline; width:100%; max-width:100%; margin:0; font-size:19px; line-height:1.12; letter-spacing:-.05em; white-space:nowrap; }
    #app .wrong-entry .pass-v8-paper-title { max-width:100%; white-space:normal; word-break:keep-all; overflow-wrap:anywhere; text-align:left; line-height:1.45; font-size:11px; }
    #app .sectionbar button.link { white-space:nowrap; }
    @media (max-width:389px) {
      #app .pass-v8-draft-delete { padding:7px 8px; font-size:11px; }
      #app .pass-v8-draft-item .pass-drafts-row b { font-size:12px; }
      #app .metrics { gap:7px; }
      #app .metrics .metric { padding:11px 10px 12px; gap:4px; }
      #app .metrics .metric b { font-size:17.5px; }
    }
  `;
  document.head.appendChild(style);

  const text = el => (el?.textContent || '').replace(/\s+/g,' ').trim();
  const cleanTrailingArrow = s => s.replace(/\s*[→›➜]\s*$/u, '').trim();
  const dataAvailable = () => typeof db !== 'undefined' && db && typeof S !== 'undefined' && S;

  function draftsDeleteControls() {
    // 원래 이어풀기 버튼은 독립적으로 유지하고, 옆에 '삭제'만 추가.
    const wrappers = document.querySelectorAll('.page .pass-drafts-list');
    wrappers.forEach(w => {
      [...w.querySelectorAll('.pass-drafts-row[data-act="resumePassDraft"]')].forEach(btn => {
        if (btn.closest('.pass-v8-draft-item')) return;
        const key = btn.getAttribute('data-val') || '';
        if (!key) return;
        const container = document.createElement('div');
        container.className = 'pass-v8-draft-item';
        btn.parentNode.insertBefore(container, btn);
        container.appendChild(btn);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'pass-v8-draft-delete';
        del.dataset.passV8 = 'delete-draft';
        del.dataset.draftKey = key;
        del.setAttribute('aria-label', text(btn.querySelector('b')) + ' 진행 중인 풀이 삭제');
        del.textContent = '삭제';
        container.appendChild(del);
      });
    });
  }

  function deleteDraft(key) {
    if (!dataAvailable()) return;
    const stored = db.drafts && Object.prototype.hasOwnProperty.call(db.drafts,key) ? db.drafts[key] : null;
    if (!stored) {
      if (typeof toast === 'function') toast('해당 진행 기록이 없습니다.');
      if (typeof render === 'function') render(true);
      return;
    }
    const confirmed = window.confirm('이 시험지의 기존 풀이 기록이 삭제됩니다.\n다시 시작하면 1번 문제부터 풉니다.\n채점 완료 기록은 유지됩니다.\n삭제하시겠습니까?');
    if (!confirmed) return;
    const draftKey = z => z?.source === 'wrong' ? 'review:wrong' : z?.paperId ? 'paper:' + z.paperId : '';
    // v7 persist()가 db.draft를 db.drafts에 재삽입하므로 먼저 두 저장 위치를 함께 비웁니다.
    delete db.drafts[key];
    if (db.draft && (db.draft === stored || draftKey(db.draft) === key)) db.draft = null;
    if (S.attempt && (S.attempt === stored || draftKey(S.attempt) === key)) S.attempt = null;
    if (typeof persist === 'function') persist(); // Firebase stage1의 클라우드 삭제 동기화 포함
    if (typeof toast === 'function') toast('진행 중인 풀이를 삭제했습니다. 다시 풀면 1번부터 시작합니다.');
    if (typeof render === 'function') render(true);
  }

  function cleanBackButtons(page) {
    page.querySelectorAll('button.back, button.pass-library-home').forEach(btn => {
      // 기존 data-act/data-val 이벤트는 수정하지 않음.
      const original = text(btn);
      if (!original.startsWith('←')) return;
      btn.replaceChildren();
      const symbol = document.createElement('span');
      symbol.className = 'pass-v8-chevron'; symbol.setAttribute('aria-hidden','true'); symbol.textContent = '‹';
      btn.appendChild(symbol);
      btn.appendChild(document.createTextNode(original.slice(1).trim()));
    });
  }

  function cleanHome(page) {
    page.querySelector('.pass-target-goal-label small')?.remove();
    page.querySelector('.pass-target-actions .pass-target-secondary')?.remove();
    const goalActions = page.querySelector('.pass-target-actions');
    if (goalActions) goalActions.style.gridTemplateColumns = 'minmax(0,1fr)';
    // '진행 중'과 혼동되지 않게 완료 기록에 별도 제목 지정.
    page.querySelectorAll('.sectionbar h2').forEach(h => {
      if (/^내가 푼 기출/.test(text(h))) h.textContent = '풀이 완료 기록';
    });
    const entries = Array.isArray(db.history) ? db.history : [];
    page.querySelectorAll('[data-act="historyDetail"]').forEach(btn => {
      const item = entries.find(h => h.id === btn.getAttribute('data-val'));
      if (!item) return;
      const summary = btn.querySelector('.grow p');
      if (item.source === 'wrong' && summary && !text(summary).includes('오답 복습')) {
        summary.textContent = '오답 복습 완료 · ' + text(summary);
      }
    });
    const metrics = page.querySelectorAll('.metrics .metric');
    [0,2].forEach(i => {
      const el = metrics[i]?.querySelector('b');
      if (el && !el.querySelector('.pass-v8-unit')) {
        const label = document.createElement('small'); label.className = 'pass-v8-unit'; label.textContent = '문항'; el.appendChild(label);
      }
    });
  }

  function paperTitleForQuestion(q) {
    if (!q) return '';
    const qid = q.id;
    const original = q.paperId || db.wrongSnapshots?.[qid]?.paperId;
    const paper = (db.papers || []).find(p => p.id === original);
    if (paper?.title) return paper.title;
    const history = [...(db.history || [])].reverse().find(h =>
      Array.isArray(h.items) && h.items.some(item => item?.id === qid));
    return history?.title || '';
  }

  function cleanWrong(page) {
    page.querySelectorAll('.description').forEach(el => {
      if (/맞힌 오답도 복습완료 상태|삭제는 직접 선택/.test(text(el))) el.remove();
    });
    if (typeof importedQuestions !== 'function') return;
    const filtered = importedQuestions()
      .filter(q => db.wrongIds?.includes(q.id))
      .filter(q => S.wrongFilter === '전체' || S.wrongFilter == null ||
        (db.papers || []).find(p => p.id === q.paperId)?.subjectId === S.wrongFilter);
    const cards = page.querySelectorAll('.wrong-entry');
    cards.forEach((card,i) => {
      const title = paperTitleForQuestion(filtered[i]);
      if (!title) return; // 원본 제목을 알 수 없다면 잘못된 제목을 만들어 넣지 않습니다.
      const tag = card.querySelector('.row.between .tag');
      if (tag) { tag.textContent = title; tag.classList.add('pass-v8-paper-title'); tag.title = title; }
    });
  }

  function cleanSubjectOrTrack(page) {
    // 설명/영문 라벨을 없애더라도 실제 과목 카드, 연도, 문제 제목은 남겨 둡니다.
    page.querySelectorAll('.eyebrow').forEach(el => {
      if (el.closest('.header, .hero, .pass-target-hero')) return;
      const t = text(el);
      if (t.includes('/') && /[A-Z]{2,}/.test(t)) el.remove();
    });
    page.querySelectorAll('.description, .notice, p').forEach(el => {
      if (el.closest('button, .paper, .listrow, .header, .pass-target-editor, .panel, .quizhead, .question')) return;
      const t = text(el);
      if (/원하는 시험지를 선택하고 풀이를 시작하세요|시험과목을 한곳에서 확인하고|기존 공통과목과 .* 전공과목을 한곳에서|과목 안내는 메뉴 구성용입니다|기존 한국사 기출은 공무원 과목 목록에|과목을 누르면 시험지와 문제풀이로 이어집니다|형사법[·ㆍ]경찰학[·ㆍ]헌법 기출을 20\d\d/.test(t)) el.remove();
    });
    // 과목 화면의 쓸모 없는 소속 시험 태그만 제거, 시험지 개수는 남김.
    if (S.view === 'subject') {
      page.querySelectorAll(':scope > .row.between').forEach(row => {
        const tag = row.querySelector('.tag');
        if (tag && /시험지/.test(text(row)) && !tag.closest('.paper')) tag.remove();
      });
    }
  }

  function cleanMyAndHistory(page) {
    if (S.view === 'my') {
      page.querySelectorAll('.sectionbar h2').forEach(h => {
        if (/내가 푼 기출/.test(text(h))) h.textContent = '풀이 완료 기록';
      });
      page.querySelectorAll('[data-act="view"][data-val="history"] .grow b').forEach(b => {
        if (/내가 푼 기출/.test(text(b))) b.textContent = '풀이 완료 기록';
      });
    }
    if (S.view === 'history') {
      page.querySelectorAll('h1.titleline').forEach(el => {if (/내가 푼 기출/.test(text(el))) el.textContent='풀이 완료 기록';});
      page.querySelectorAll('.description').forEach(el => { if (/시험지를 선택하면 채점 결과를 확인/.test(text(el))) el.remove(); });
    }
  }

  function removeArrows(page) {
    page.querySelectorAll('.sectionbar button.link').forEach(btn => {
      const t = text(btn);
      if (/^전체\s*(?:기록\s*)?보기/.test(t)) btn.textContent = cleanTrailingArrow(t);
    });
  }

  function clearHorizontalDrift() {
    // Safari iOS: 예전 컨텐츠 너비 때문에 수평 스크롤이 남는 경우를 복구.
    const root = document.scrollingElement;
    if ((root && root.scrollLeft) || window.scrollX) {
      const top = window.scrollY;
      try { window.scrollTo({left:0, top, behavior:'instant'}); }
      catch (_) { window.scrollTo(0,top); }
      if (root) root.scrollLeft = 0;
    }
  }

  function polish() {
    if (!dataAvailable()) return;
    const page = document.querySelector('#app .page');
    if (!page) return;
    page.querySelectorAll('button').forEach(btn => {
      const t=text(btn);
      if (t.includes('내가 푼 기출 목록') && !btn.querySelector('.grow')) btn.textContent=t.replace('내가 푼 기출 목록','풀이 완료 기록');
    });
    cleanBackButtons(page);
    if (S.view === 'home') cleanHome(page);
    if (S.view === 'wrong') cleanWrong(page);
    if (S.view === 'subject' || S.view === 'library' || page.querySelector('.eyebrow')) cleanSubjectOrTrack(page);
    if (S.view === 'my' || S.view === 'history') cleanMyAndHistory(page);
    removeArrows(page);
    draftsDeleteControls();
    clearHorizontalDrift();
  }

  // 최신 렌더링 체인 최하단에 추가한다. 이전 기능들의 render()를 그대로 호출.
  if (typeof render === 'function') {
    const precedingRender = render;
    render = function(...args) { const result = precedingRender.apply(this,args); polish(); return result; };
    polish();
  } else {
    document.addEventListener('DOMContentLoaded',polish,{once:true});
  }

  document.addEventListener('click', function (event) {
    const btn = event.target.closest?.('[data-pass-v8="delete-draft"]');
    if (!btn) return;
    event.preventDefault(); event.stopImmediatePropagation();
    deleteDraft(btn.dataset.draftKey || '');
  },true);
})();
