/* PASS 목표 직렬 + 오늘의 학습 + 이어풀기 통합 카드
 * 설치: 기존 pass-ux-v7.js / pass-account-stage1.js보다 아래, </body> 위
 * catalog / questions / attempts / grading / Firebase 기존 필드에 손대지 않음.
 * Target is stored independently at users/{uid}/settings/targetTrack on Firebase Spark.
 */
(function () {
  'use strict';
  const GUEST_KEY = 'PASS_TARGET_TRACK_GUEST_V1';
  const UID_PREFIX = 'PASS_TARGET_TRACK_UID_V1_';
  const config = window.PASS_FIREBASE_CONFIG;
  const sdkVersion = '13.3.0';
  let firebase = null;
  let signedInUid = null;
  let authInitialized = false;
  let syncSeq = 0;

  const read = key => { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } };
  const write = (key, val) => { try { localStorage.setItem(key, val); } catch (_) {} };
  const safe = x => typeof esc === 'function' ? esc(x) : String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function keyFor(uid) { return uid ? UID_PREFIX + uid : GUEST_KEY; }
  function selectedId() {
    // Firebase 연결이 없는 동안에도 기존 Stage 1 회원 UID를 지원합니다.
    const uid = signedInUid || (window.PASS_ACCOUNT_STAGE1?.getStatus?.().uid || null);
    return read(keyFor(uid)) || (uid ? read(GUEST_KEY) : '');
  }
  function goals() {
    if (typeof db === 'undefined' || !Array.isArray(db.subjects)) return [];
    // AI 에이전트가 추가한 직렬도 현재 데이터에 존재하면 자동 선택지로 포함.
    // '(지역구분)' 중복 직렬은 기본 직렬과 같은 시험이라 선택지에서 빼고,
    // 이미 그 직렬을 목표로 저장한 사용자는 goalById가 기본 직렬로 이어 줍니다.
    return db.subjects.filter(s => s && s.id && s.examId && s.kind === 'track' &&
      !isDuplicateTrack(s) &&
      db.exams.some(ex => ex.id === s.examId));
  }
  function displayRule() { return window.PASS_TRACK_DISPLAY || null; }
  function isDuplicateTrack(s) {
    const rule = displayRule();
    return !!(rule && typeof rule.isDuplicate === 'function' && rule.isDuplicate(s));
  }
  function goalById(id) {
    const found = goals().find(s => s.id === id);
    if (found) return found;
    const rule = displayRule();
    if (!rule || typeof rule.baseOf !== 'function' || typeof db === 'undefined') return undefined;
    const saved = db.subjects.find(s => s && s.id === id && s.kind === 'track');
    if (!saved || !rule.isDuplicate(saved)) return undefined;
    const base = rule.baseOf(saved);
    return base && base.id !== saved.id ? goals().find(s => s.id === base.id) : undefined;
  }
  function examLabel(s) { return db.exams.find(ex => ex.id === s.examId)?.name || '시험 분야'; }
  /* 공무원(9급·8급) 트랙은 시험 분야 이름 대신 급수만 붙여 '9급 · 일반행정'처럼 짧게 표시합니다. */
  function shortExamExamId(s) { return s.examId === 'civil' || s.examId === 'nursing'; }
  function gradeOf(s) {
    if (s.examId === 'nursing') return '8급';
    // 8급은 섹션에 '8급'이 있을 때만('8급 간호·보건진료'), 9급 공무원 트랙의 급수 표기가 없는 섹션('행정' 등)은 9급입니다.
    const section = String(s.section || '');
    if (section.indexOf('8급') >= 0) return '8급';
    if (s.examId === 'civil') return '9급';
    const m = /^([89])급/.exec(section);
    return m ? m[1] + '급' : '';
  }
  function goalLabel(s) {
    const grade = gradeOf(s);
    if (shortExamExamId(s)) return grade ? `${grade} · ${s.name}` : s.name;
    return `${examLabel(s)} · ${s.name}`;
  }
  function trackOptionLabel(s) {
    if (shortExamExamId(s)) return goalLabel(s);
    return `${s.section ? s.section + ' · ' : ''}${s.name}`;
  }
  function optionsForExams(preferred) {
    const tracks = goals();
    const ids = new Set(tracks.map(s => s.examId));
    return db.exams.filter(ex => ids.has(ex.id)).map(ex =>
      `<option value="${safe(ex.id)}" ${ex.id === preferred ? 'selected' : ''}>${safe(ex.name)}</option>`).join('');
  }
  function optionsForTracks(examId, preferred) {
    return goals().filter(s => s.examId === examId).map(s =>
      `<option value="${safe(s.id)}" ${s.id === preferred ? 'selected' : ''}>${safe(trackOptionLabel(s))}</option>`).join('');
  }
  function draftsListInto(card) {
    // v7이 만든 이어풀기 목록의 실제 버튼 노드를 이동만 합니다.
    // 기존 이벤트/데이터는 그대로 작동하며 시험지가 여러 개인 경우에도 모두 남습니다.
    const source = document.querySelector('.page > .pass-drafts-list');
    if (!source) return;
    const count = source.querySelectorAll('[data-act="resumePassDraft"]').length;
    if (!count) return;
    const slot = card.querySelector('.pass-target-draft-slot');
    if (!slot) return;
    const details = document.createElement('details');
    details.className = 'pass-target-draft-details';
    const summary = document.createElement('summary');
    summary.textContent = `진행 중인 시험지 ${count}개 · 모두 보기`;
    details.appendChild(summary);
    source.querySelector('h2')?.remove();
    details.appendChild(source);
    slot.appendChild(details);
  }
  function compactHome() {
    if (typeof S === 'undefined' || typeof db === 'undefined' || S.view !== 'home') return;
    const hero = document.querySelector('.page .hero');
    if (!hero || hero.classList.contains('pass-target-hero')) return;
    document.querySelector('.page .intro')?.remove();
    const chosen = goalById(selectedId());
    const defaultExam = chosen?.examId || goals()[0]?.examId || '';
    const completed = typeof todaySolved === 'function' ? Math.max(0, Number(todaySolved()) || 0) : 0;
    const daily = Math.max(1, Number(db.dailyGoal) || 20);
    const pct = Math.min(100, Math.round(completed / daily * 100));
    const draftCount = Object.values(db.drafts || {}).filter(z => z && Array.isArray(z.items) && z.items.length).length;
    const hasDraft = draftCount > 0 || !!db.draft?.items?.length;
    hero.classList.add('pass-target-hero');
    hero.innerHTML = `
      <div class="pass-target-head"><span class="pass-target-eyebrow">MY STUDY</span><span>오늘 <b>${completed}</b> / ${daily}문항</span></div>
      <div class="pass-target-goal-row">
        <div class="pass-target-goal-label"><small>내 목표 시험</small><strong>${chosen ? safe(goalLabel(chosen)) : '목표 직렬을 설정해 주세요'}</strong></div>
        <button type="button" data-pass-target="change" class="pass-target-change">변경</button>
      </div>
      <div class="pass-target-bar" role="progressbar" aria-label="오늘의 문제풀이 목표" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
      <div class="pass-target-actions"><button type="button" class="pass-target-primary" data-pass-target="open">내 시험 기출 보기 <span aria-hidden="true">›</span></button><button type="button" class="pass-target-secondary" data-act="quick">${hasDraft ? '이어서 문제 풀기' : '문제은행 둘러보기'}</button></div>
      <div class="pass-target-editor" hidden>
        <label>시험 분야<select id="passTargetExam">${optionsForExams(defaultExam)}</select></label>
        <label>직렬·종목<select id="passTargetTrack">${optionsForTracks(defaultExam, chosen?.id)}</select></label>
        <div class="pass-target-editor-actions"><button type="button" data-pass-target="cancel">취소</button><button type="button" data-pass-target="save">이 목표로 설정</button></div>
      </div>
      <div class="pass-target-draft-slot"></div>`;
    draftsListInto(hero);
  }
  function openEditor() {
    const editor = document.querySelector('.pass-target-editor');
    if (!editor) return;
    editor.hidden = false;
    document.querySelector('#passTargetExam')?.focus();
  }
  function saveChoice() {
    const id = document.querySelector('#passTargetTrack')?.value;
    if (!goalById(id)) { typeof toast === 'function' && toast('목표 직렬을 선택해 주세요.'); return; }
    const uid = signedInUid || window.PASS_ACCOUNT_STAGE1?.getStatus?.().uid || null;
    write(keyFor(uid), id);
    // uid 인증이 아직 완료되지 않아도 게스트 설정을 보존.
    if (!uid) write(GUEST_KEY, id);
    if (firebase && uid && firebase.uid === uid) {
      void firebase.save(id).catch(err => console.warn('목표 직렬 클라우드 저장 실패:', err));
    }
    if (typeof render === 'function') render(true);
  }
  document.addEventListener('click', event => {
    const b = event.target.closest?.('[data-pass-target]');
    if (!b) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const action = b.dataset.passTarget;
    if (action === 'change') { openEditor(); return; }
    if (action === 'cancel') { document.querySelector('.pass-target-editor')?.setAttribute('hidden', ''); return; }
    if (action === 'save') { saveChoice(); return; }
    if (action === 'open') {
      const chosen = goalById(selectedId());
      if (!chosen) { openEditor(); return; }
      S.examId = chosen.examId;
      S.subjectId = chosen.id;
      S.view = 'subject';
      S.reviewId = null;
      if (typeof render === 'function') render();
    }
  }, true);
  document.addEventListener('change', event => {
    if (event.target?.id !== 'passTargetExam') return;
    const el = document.querySelector('#passTargetTrack');
    if (el) el.innerHTML = optionsForTracks(event.target.value, '');
  });
  const styles = `
    .hero.pass-target-hero{min-height:0!important;padding:17px!important;margin-top:2px!important;overflow:visible!important;border-radius:18px!important}
    .hero.pass-target-hero:after{pointer-events:none;opacity:.42}
    .pass-target-hero .pass-target-head{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px;letter-spacing:.08em;color:#e2e8ff;font-weight:700;position:relative;z-index:1}
    .pass-target-head .pass-target-eyebrow{white-space:nowrap}
    .pass-target-head b{color:#fff;font-variant-numeric:tabular-nums}
    .pass-target-goal-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0 12px;position:relative;z-index:1}
    .pass-target-goal-label{min-width:0;display:grid;gap:5px}
    .pass-target-goal-label small{font-size:11px;color:#d6e1ff;font-weight:700}
    .pass-target-goal-label strong{font-size:17px;color:white;letter-spacing:-.035em;line-height:1.35;overflow-wrap:anywhere}
    .pass-target-change{border:1px solid #ffffff55;background:#ffffff16;color:#fff;border-radius:10px;padding:7px 11px;font-size:12px;font-weight:800;flex-shrink:0}
    .pass-target-bar{height:6px;background:#ffffff30;border-radius:100px;overflow:hidden;position:relative;z-index:1}
    .pass-target-bar span{display:block;height:100%;background:#97e2cf;border-radius:100px}
    .pass-target-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px;position:relative;z-index:1}
    .pass-target-actions button{min-height:43px;border-radius:11px;padding:9px 7px;font-weight:850;font-size:12px;letter-spacing:-.03em;display:flex;align-items:center;justify-content:center;text-align:center;gap:4px}
    .pass-target-primary{background:white;color:#243f8d;border:1px solid #fff}
    .pass-target-primary span{font-size:19px;line-height:1}
    .pass-target-secondary{color:#fff;background:#ffffff18;border:1px solid #ffffff5b}
    .pass-target-editor[hidden]{display:none!important}
    .pass-target-editor{margin-top:13px;display:grid;gap:9px;padding:12px;background:#ffffff15;border:1px solid #ffffff38;border-radius:12px;position:relative;z-index:2}
    .pass-target-editor label{display:grid;gap:5px;font-size:11px;color:#e3e9ff;font-weight:800}
    .pass-target-editor select{display:block;width:100%;max-width:100%;height:38px;background:#fff;color:#1e315e;border:0;border-radius:9px;padding:6px 8px;font-size:13px}
    .pass-target-editor-actions{display:flex;gap:8px;justify-content:flex-end}
    .pass-target-editor-actions button{border-radius:9px;padding:9px 12px;background:#ffffff20;border:1px solid #ffffff55;color:#fff;font-size:12px;font-weight:800}
    .pass-target-editor-actions button:last-child{background:#fff;color:#253d8b}
    .pass-target-draft-details{margin-top:12px;border-top:1px solid #ffffff35;padding-top:10px;position:relative;z-index:1}
    .pass-target-draft-details summary{color:#e8eeff;cursor:pointer;font-size:12px;font-weight:700;list-style:revert;padding:2px 0}
    .pass-target-draft-details .pass-drafts-list{margin:9px 0 0!important}
    .pass-target-draft-details .pass-drafts-row{box-shadow:none!important;margin:6px 0!important}
    .pass-target-draft-details .pass-drafts-row b{color:#26385b}
    .pass-target-draft-details .pass-drafts-row small{color:#71809a}
    .pass-target-draft-details .pass-resume{color:#3c5ace}
    .pass-target-hero button:focus-visible,.pass-target-hero select:focus-visible{outline:3px solid #8ddacf;outline-offset:2px}
    @media(max-width:390px){.hero.pass-target-hero{padding:14px!important}.pass-target-goal-label strong{font-size:15px}.pass-target-actions button{font-size:11px}}
  `;
  if (!document.getElementById('pass-target-home-style')) {
    const st = document.createElement('style'); st.id = 'pass-target-home-style'; st.textContent = styles;
    document.head.appendChild(st);
  }
  // 마지막에 설치되어 기존 v7 / Firebase 사용자 화면 갱신 래퍼를 보존.
  if (typeof render === 'function') {
    const oldRender = render;
    render = function(preserve) { oldRender(preserve); compactHome(); };
    compactHome();
  }

  // Firebase Spark에서 별도 Firestore 문서로 직렬 선택만 동기화.
  // 기존 학습기록 syncCloud의 settings/main 문서를 절대 덮어쓰지 않음.
  async function connectGoalCloud() {
    if (!config?.enabled || !config?.firebase?.projectId) return;
    try {
      const [apps, authOps, dbOps] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-firestore.js`)
      ]);
      // pass-account-stage1.js의 Firebase 초기화와 경쟁하지 않도록 대기.
      let app = null;
      for (let i = 0; i < 25; i++) {
        app = apps.getApps().find(a => a.name === 'pass-main');
        if (app) break;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      if (!app) return;
      const auth = authOps.getAuth(app);
      const store = dbOps.getFirestore(app);
      authOps.onAuthStateChanged(auth, async user => {
        const seq = ++syncSeq;
        signedInUid = user?.uid || null;
        if (!user) { firebase = null; if (S.view === 'home') render(true); return; }
        const uid = user.uid;
        const ref = dbOps.doc(store, 'users', uid, 'settings', 'targetTrack');
        const save = id => dbOps.setDoc(ref, { trackId:id, updatedAt:dbOps.serverTimestamp() }, {merge:true});
        firebase = {uid, save};
        try {
          const result = await dbOps.getDoc(ref);
          if (seq !== syncSeq || signedInUid !== uid) return;
          const remote = result.exists() ? String(result.data()?.trackId || '') : '';
          if (remote && goalById(remote)) {
            write(keyFor(uid), remote);
          } else {
            const local = read(keyFor(uid)) || read(GUEST_KEY);
            if (local && goalById(local)) { write(keyFor(uid), local); await save(local); }
          }
          if (seq === syncSeq && S.view === 'home') render(true);
        } catch (error) {
          console.warn('목표 직렬 동기화 실패 (이 기기의 설정은 유지):', error);
        }
      });
      authInitialized = true;
    } catch (err) { console.warn('목표 직렬 클라우드 연동을 건너뜁니다:', err); }
  }
  void connectGoalCloud();
})();
