/* PASS v6 — 보기 선택 시 전체 화면 재생성/스크롤 이동 방지
 * 기존 문제 데이터, 통계, 로컬 기록, 타이머, 채점 엔진은 그대로 사용.
 * '보기 선택' 클릭만 DOM 부분 변경; 다른 앱 동작은 기존 app.js에 위임.
 */
(() => {
  'use strict';

  const css = document.createElement('style');
  css.id = 'pass-nojump-choice-css';
  css.textContent = `
    /* 선택 시 버튼 크기·위치·문서 레이아웃을 바꾸지 않습니다. */
    .question.pass-nojump .option .choice-status {
      position:absolute;top:6px;right:6px;pointer-events:none;
    }
    /* 일괄 채점: 정답 공개 전에는 테두리만 바뀌도록 유지. */
    .question.pass-nojump.pass-nojump-batch .option.selected:not(.correct):not(.wrongpick) {
      border-color:#4167f5;
      background:linear-gradient(180deg,#fff 0%,#fbfcff 100%);
      box-shadow:0 0 0 1px rgba(65,103,245,.27);
    }
    .question.pass-nojump.pass-nojump-batch .option.selected:not(.correct):not(.wrongpick) .number {
      background:#f4f6fc;color:#344769;border-color:#e4e9f4;
      box-shadow:inset 0 1px 0 #ffffff99;
    }
    .question.pass-nojump.pass-nojump-batch .choice-status {display:none !important;}
  `;
  document.head.appendChild(css);

  const markQuiz = () => {
    if (typeof S === 'undefined' || S.view !== 'quiz') return;
    if (typeof getAttempt !== 'function') return;
    const z = getAttempt();
    const panel = document.querySelector('.question');
    if (!z || !panel) return;
    panel.classList.add('pass-nojump');
    panel.classList.toggle('pass-nojump-batch', z.mode === 'batch');
  };
  const app = document.getElementById('app');
  if (app) {
    new MutationObserver(markQuiz).observe(app, {childList:true});
    markQuiz();
  }

  // 캡처 단계에서 선택 이벤트를 가로채 기존 render(true) 호출을 차단.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.question .option[data-act="answer"]');
    if (!button || typeof S === 'undefined' || S.view !== 'quiz') return;
    const z = typeof getAttempt === 'function' ? getAttempt() : null;
    if (!z || !Array.isArray(z.items) || !Array.isArray(z.answers)) return;
    const q = z.items[z.index];
    const index = Number(button.dataset.val);
    if (!q || !Array.isArray(q.options) || !Number.isInteger(index) || index < 0 || index >= q.options.length) return;
    if (z.mode === 'instant' && z.checked?.[z.index]) return;

    event.preventDefault();
    event.stopImmediatePropagation(); // 기존 전체 재렌더 핸들러 실행 금지

    if (z.mode === 'instant') checkpointClock();
    z.answers[z.index] = index;
    if (z.mode === 'instant') z.checked[z.index] = true;
    db.draft = z;
    persist();

    const questionPanel = document.querySelector('.question');
    questionPanel?.classList.add('pass-nojump');
    questionPanel?.classList.toggle('pass-nojump-batch', z.mode === 'batch');
    const chosen = z.mode === 'instant';

    // 원래 보기 요소를 그대로 사용해 선택 클래스와 접근성 상태만 변경.
    // innerHTML 교체, scrollTo, focus, scrollIntoView 호출 없음.
    for (const el of document.querySelectorAll('.question .option[data-act="answer"]')) {
      const i = Number(el.dataset.val);
      const picked = i === index;
      const correct = chosen && i === q.answer;
      const wrong = chosen && picked && index !== q.answer;
      el.classList.toggle('selected', picked);
      el.classList.toggle('correct', correct);
      el.classList.toggle('wrongpick', wrong);
      el.setAttribute('aria-pressed', String(picked));
      if (el.hasAttribute('aria-label')) {
        el.setAttribute('aria-label', `${i+1}번 보기, ${correct ? '정답' : wrong ? '오답' : picked ? '선택됨' : '미선택'}`);
      }
      if (chosen) el.disabled = true;
      el.querySelector('.choice-status')?.remove();
      if (chosen && (correct || wrong)) {
        const status = document.createElement('span');
        status.className = 'choice-status';
        status.setAttribute('aria-hidden', 'true');
        status.textContent = correct ? '✓' : '×';
        el.appendChild(status);
      }
    }

    const answered = z.answers.filter(x => x !== null).length;
    const counter = document.querySelector('.quizhead .tag.green');
    if (counter) counter.textContent = `${answered}/${z.items.length} 응답`;

    // 문항 목록을 열어 둔 경우 이 문항 타일만 갱신.
    const palette = document.querySelector(`.overview button[data-act="jump"][data-val="${z.index}"]`);
    if (palette) {
      palette.classList.add('answered');
      palette.classList.toggle('graded-ok', chosen && index === q.answer);
      palette.classList.toggle('graded-no', chosen && index !== q.answer);
      palette.setAttribute('aria-label', `${z.index+1}번 ${chosen ? (index === q.answer ? '정답' : '오답') : '응답'}`);
      palette.querySelector('b')?.remove();
      if (chosen) {
        const badge = document.createElement('b');
        badge.textContent = index === q.answer ? '○' : '×';
        palette.appendChild(badge);
      }
    }

    // 즉시 채점은 선택 영역 아래에 해설만 추가. 기존 버튼/화면은 재생성하지 않음.
    if (chosen && questionPanel && !questionPanel.querySelector('.pass-inline-explain')) {
      const correct = index === q.answer;
      const box = document.createElement('div');
      box.className = 'explain pass-inline-explain';
      box.innerHTML = `<b>${correct ? '✅ 정답입니다' : '❌ 오답입니다'}</b>` +
        `<div style="margin-top:7px">정답: ${Number(q.answer)+1}번</div>` +
        `<div style="margin-top:7px;white-space:pre-line">${showExplanation(q)}</div>` +
        optionExplanationList(q);
      questionPanel.appendChild(box);
      if (typeof refreshClockView === 'function') refreshClockView();
    }
  }, true);
})();
