/* =========================================================
   my-somsang.html — MY SOMSANG 주인 관리 페이지
   - 소유자 인증(로그인) 후에만 접근
   - 인형 정보 수정 / 모드 설정 / 분실모드 ON·OFF / 습득자 메시지함
   ========================================================= */
(function () {
  const U = window.SomsangUI;
  const S = window.SomsangStore;
  const app = document.getElementById('app');
  const saveBar = document.getElementById('saveBar');
  const FALLBACK_IMG = 'nfc/img/mong.svg';

  const st = {
    user: null,
    plushes: [],
    current: null,   // 서버 기준 데이터
    draft: null,     // 편집 중 데이터
    dirty: false,
    tab: 'mode',
    messages: [],
    authTab: 'login'
  };

  document.getElementById('logo').innerHTML = U.LOGO_SVG + '솜생';
  document.getElementById('homeLink').setAttribute('href', (window.SOMSANG_CONFIG || {}).HOME_URL || 'index.html');

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const img = (src, alt) => '<img src="' + U.esc(U.safeUrl(src, FALLBACK_IMG)) + '" alt="' + U.esc(alt || '') + '" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'">';

  if (S.isDemo) {
    const bar = document.getElementById('demoBar');
    bar.hidden = false;
    bar.innerHTML = '<i class="fa-regular fa-lightbulb"></i> 데모 모드 · 변경 내용은 이 브라우저에만 저장돼요.<button type="button" id="resetDemo">샘플 초기화</button>';
    document.getElementById('resetDemo').addEventListener('click', async () => {
      const ok = await U.confirmDialog({ title: '샘플 데이터를 초기화할까요?', body: '데모에서 수정한 내용과 받은 메시지가 처음 상태로 돌아가요.', icon: 'fa-rotate-left', confirmText: '초기화' });
      if (!ok) return;
      S.resetDemo();
      st.dirty = false;
      location.reload();
    });
  }

  /* =======================================================
     인증 화면
     ======================================================= */
  function renderAuth(notice) {
    document.getElementById('logoutBtn').hidden = true;
    setDirty(false);
    const isLogin = st.authTab === 'login';
    const demo = S.isDemo ? window.SOMSANG_SAMPLES.demoOwner : null;
    app.innerHTML =
      '<div class="auth-wrap">' +
        '<div class="auth-card">' +
          '<div class="ic"><i class="fa-solid fa-shield-heart"></i></div>' +
          '<h1>소유자 인증</h1>' +
          '<p>MY SOMSANG은 키링 주인만 이용할 수 있어요.<br>등록한 계정으로 로그인해주세요.</p>' +
          (notice ? '<div class="form-error" style="margin-top:16px;background:var(--brand-softer);color:var(--brand-deep)">' + U.esc(notice) + '</div>' : '') +
          '<div class="seg" role="tablist">' +
            '<button type="button" role="tab" aria-selected="' + isLogin + '" class="' + (isLogin ? 'is-active' : '') + '" data-auth="login">로그인</button>' +
            '<button type="button" role="tab" aria-selected="' + !isLogin + '" class="' + (!isLogin ? 'is-active' : '') + '" data-auth="signup">회원가입</button>' +
          '</div>' +
          '<form id="authForm" novalidate>' +
            '<div class="form-error" id="authErr" hidden></div>' +
            '<div class="field"><label for="email">이메일</label><input class="input" id="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>' +
            '<div class="field"><label for="pw">비밀번호</label><input class="input" id="pw" type="password" autocomplete="' + (isLogin ? 'current-password' : 'new-password') + '" placeholder="' + (isLogin ? '비밀번호' : '6자 이상') + '" required minlength="6"></div>' +
            '<button type="submit" class="btn btn-primary btn-block" id="authBtn">' + (isLogin ? '로그인' : '회원가입') + '</button>' +
            (isLogin ? '<button type="button" class="btn btn-ghost btn-block" id="forgotBtn" style="margin-top:4px">비밀번호를 잊으셨나요?</button>' : '<p class="hint" style="margin-top:12px;font-size:.82rem;color:var(--ink-faint)">가입 후 키링 패키지의 고유번호와 등록 코드로 내 인형을 연결할 수 있어요.</p>') +
          '</form>' +
          (demo
            ? '<div class="demo-hint"><b>데모 계정</b><br>이메일 ' + U.esc(demo.email) + ' · 비밀번호 ' + U.esc(demo.password) +
              '<button type="button" class="btn btn-deep btn-sm btn-block" id="demoLogin">데모 계정으로 로그인</button></div>'
            : '') +
        '</div>' +
        '<p style="text-align:center;margin-top:18px;font-size:.84rem;color:var(--ink-faint)"><a href="memory.html' + (U.param('id') ? '?id=' + encodeURIComponent(U.param('id')) : '') + '" style="text-decoration:underline">NFC 화면으로 돌아가기</a></p>' +
      '</div>';

    app.querySelectorAll('[data-auth]').forEach((b) => b.addEventListener('click', () => { st.authTab = b.dataset.auth; renderAuth(); }));
    const err = document.getElementById('authErr');
    const showErr = (m) => { err.textContent = m; err.hidden = false; };

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const email = document.getElementById('email').value.trim();
      const pw = document.getElementById('pw').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('이메일 주소를 확인해주세요.');
      if (pw.length < 6) return showErr('비밀번호는 6자 이상이어야 해요.');
      const btn = document.getElementById('authBtn');
      U.setBusy(btn, true);
      try {
        if (isLogin) {
          st.user = await S.signIn(email, pw);
          await afterLogin();
        } else {
          const r = await S.signUp(email, pw);
          if (r.needsConfirm) {
            st.authTab = 'login';
            renderAuth('인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해주세요.');
          } else { st.user = await S.getUser(); await afterLogin(); }
        }
      } catch (ex) { showErr(ex.message); U.setBusy(btn, false); }
    });
    const forgot = document.getElementById('forgotBtn');
    if (forgot) forgot.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      if (!email) { showErr('비밀번호를 재설정할 이메일을 먼저 입력해주세요.'); document.getElementById('email').focus(); return; }
      try { await S.resetPassword(email); U.toast('재설정 메일을 보냈어요'); }
      catch (ex) { showErr(ex.message); }
    });
    const dl = document.getElementById('demoLogin');
    if (dl) dl.addEventListener('click', async () => {
      document.getElementById('email').value = demo.email;
      document.getElementById('pw').value = demo.password;
      U.setBusy(dl, true, '로그인 중…');
      try { st.user = await S.signIn(demo.email, demo.password); await afterLogin(); }
      catch (ex) { showErr(ex.message); U.setBusy(dl, false); }
    });
  }

  /* =======================================================
     로그인 이후
     ======================================================= */
  async function afterLogin(preferId) {
    document.getElementById('logoutBtn').hidden = false;
    st.plushes = await S.listMyPlushes();
    const want = S.normalizeId(preferId || U.param('id') || (window.SOMSANG_CONFIG || {}).DEFAULT_PLUSH_ID);
    if (!st.plushes.length) return renderClaim(true);
    let target = st.plushes.find((p) => p.plush_id === want);
    if (want && !target && S.ID_RE.test(want)) U.toast(want + '은(는) 내 계정에 등록된 키링이 아니에요', 'fa-circle-info');
    target = target || st.plushes[0];
    await selectPlush(target.plush_id);
  }

  async function selectPlush(id) {
    if (st.dirty && !(await confirmDiscard())) return;
    st.current = await S.getMyPlush(id);
    st.draft = clone(st.current);
    setDirty(false);
    try { st.messages = await S.listMessages(id); } catch (e) { st.messages = []; }
    const url = new URL(location.href);
    url.searchParams.set('id', id);
    history.replaceState(null, '', url);
    renderDashboard();
  }

  function confirmDiscard() {
    return U.confirmDialog({ title: '저장하지 않은 변경사항이 있어요', body: '이동하면 수정한 내용이 사라져요.', icon: 'fa-triangle-exclamation', tone: 'warn', confirmText: '버리고 이동', confirmClass: 'btn-danger' });
  }

  /* ---------- 키링 등록(소유권 연결) ---------- */
  function renderClaim(isEmpty) {
    setDirty(false);
    app.innerHTML =
      '<div class="auth-wrap">' +
        '<div class="auth-card">' +
          '<div class="ic"><i class="fa-solid fa-link"></i></div>' +
          '<h1>' + (isEmpty ? '아직 등록된 키링이 없어요' : '새 키링 등록') + '</h1>' +
          '<p>키링 패키지에 동봉된 <b>고유번호</b>와 <b>등록 코드</b>를 입력하면 내 계정에 연결돼요.</p>' +
          '<form id="claimForm" style="margin-top:22px" novalidate>' +
            '<div class="form-error" id="claimErr" hidden></div>' +
            '<div class="field"><label for="cid">고유번호</label><input class="input" id="cid" placeholder="SOM-001" value="' + U.esc(S.normalizeId(U.param('id')) || '') + '" autocapitalize="characters"></div>' +
            '<div class="field"><label for="ccode">등록 코드</label><input class="input" id="ccode" placeholder="패키지 카드에 적힌 코드" autocomplete="off"></div>' +
            '<button type="submit" class="btn btn-primary btn-block" id="claimBtn">내 키링으로 등록</button>' +
            (!isEmpty ? '<button type="button" class="btn btn-ghost btn-block" id="claimCancel" style="margin-top:4px">취소</button>' : '') +
          '</form>' +
        '</div>' +
      '</div>';
    const err = document.getElementById('claimErr');
    document.getElementById('claimForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const id = S.normalizeId(document.getElementById('cid').value);
      const code = document.getElementById('ccode').value.trim();
      if (!S.ID_RE.test(id)) { err.textContent = '고유번호를 SOM-001 형식으로 입력해주세요.'; err.hidden = false; return; }
      if (!code) { err.textContent = '등록 코드를 입력해주세요.'; err.hidden = false; return; }
      const btn = document.getElementById('claimBtn');
      U.setBusy(btn, true);
      try {
        await S.claimPlush(id, code);
        U.toast(id + ' 키링이 등록되었어요');
        await afterLogin(id);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; U.setBusy(btn, false); }
    });
    const cancel = document.getElementById('claimCancel');
    if (cancel) cancel.addEventListener('click', () => renderDashboard());
  }

  /* =======================================================
     대시보드
     ======================================================= */
  function unreadCount() { return st.messages.filter((m) => !m.is_read).length; }

  function renderDashboard() {
    const p = st.current;
    const lost = p.mode === 'lost';
    const unread = unreadCount();
    const nfc = U.nfcUrl(p.plush_id);

    app.innerHTML =
      '<div class="admin-top">' +
        '<div><h1>내 키링 관리</h1><p>' + U.esc(st.user ? st.user.email : '') + '</p></div>' +
      '</div>' +
      '<div class="plush-switch" role="tablist" aria-label="내 인형 선택">' +
        st.plushes.map((x) =>
          '<button type="button" class="' + (x.plush_id === p.plush_id ? 'is-active' : '') + '" data-pick="' + U.esc(x.plush_id) + '">' + img(x.plush_image, '') + U.esc(x.plush_name) +
          (x.mode === 'lost' ? ' <i class="fa-solid fa-circle-exclamation" style="color:var(--warn)" title="분실모드"></i>' : '') + '</button>'
        ).join('') +
        '<button type="button" class="add" id="addPlush"><i class="fa-solid fa-plus"></i> 키링 등록</button>' +
      '</div>' +
      '<div class="admin-grid">' +
        '<aside class="summary">' +
          '<div class="summary-head">' + img(p.plush_image, p.plush_name) +
            '<div><h2>' + U.esc(p.plush_name) + '</h2><div class="meta"><code>' + U.esc(p.plush_id) + '</code>' +
            '<span class="mode-pill mode-pill--' + (lost ? 'lost' : 'memory') + '">' + (lost ? 'LOST MODE' : 'MEMORY MODE') + '</span></div></div>' +
          '</div>' +
          '<div class="url-box" title="NFC 칩에 기록된 주소"><i class="fa-solid fa-wifi"></i><span>' + U.esc(nfc) + '</span>' +
            '<button type="button" class="btn btn-line btn-xs" id="copyUrl"><i class="fa-regular fa-copy"></i>복사</button></div>' +
          '<div class="summary-actions">' +
            '<a class="btn btn-outline btn-sm" href="memory.html?id=' + encodeURIComponent(p.plush_id) + '" target="_blank" rel="noopener"><i class="fa-regular fa-eye"></i>NFC 화면 보기</a>' +
            '<button type="button" class="btn btn-line btn-sm" id="goInbox"><i class="fa-regular fa-envelope"></i>메시지 ' + (unread ? '<span class="tabs-badge" style="color:var(--warn);font-weight:800">' + unread + '</span>' : '') + '</button>' +
          '</div>' +
        '</aside>' +
        '<div>' +
          '<nav class="tabs" role="tablist">' +
            tabBtn('mode', 'fa-solid fa-sliders', '모드 설정') +
            tabBtn('edit', 'fa-regular fa-pen-to-square', '정보 관리') +
            tabBtn('inbox', 'fa-regular fa-envelope', '메시지', unread) +
          '</nav>' +
          '<section class="panel" data-panel="mode"></section>' +
          '<section class="panel" data-panel="edit"></section>' +
          '<section class="panel" data-panel="inbox"></section>' +
        '</div>' +
      '</div>';

    app.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.pick !== p.plush_id) selectPlush(b.dataset.pick); }));
    document.getElementById('addPlush').addEventListener('click', async () => {
      if (st.dirty && !(await confirmDiscard())) return;
      renderClaim(false);
    });
    document.getElementById('copyUrl').addEventListener('click', async () => {
      if (await U.copyText(nfc)) U.toast('NFC 주소를 복사했어요');
    });
    document.getElementById('goInbox').addEventListener('click', () => switchTab('inbox', true));
    app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    renderModePanel();
    renderEditPanel();
    renderInbox();
    switchTab(st.tab);
  }

  function tabBtn(key, icon, label, badge) {
    return '<button type="button" role="tab" data-tab="' + key + '"><i class="' + icon + '"></i>' + label + (badge ? '<span class="badge">' + badge + '</span>' : '') + '</button>';
  }
  function switchTab(key, scroll) {
    st.tab = key;
    app.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === key; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
    app.querySelectorAll('[data-panel]').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === key));
    saveBar.classList.toggle('is-show', st.dirty);
    if (scroll) app.querySelector('.tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 모드 설정 / 분실모드 전환 ---------- */
  function renderModePanel() {
    const p = st.current;
    const lost = p.mode === 'lost';
    const el = app.querySelector('[data-panel="mode"]');
    el.innerHTML =
      '<div class="panel-card">' +
        '<h3><i class="fa-solid fa-sliders"></i>모드 설정</h3>' +
        '<p class="desc">NFC를 태그했을 때 보여줄 화면을 선택하세요. 칩을 다시 등록할 필요 없이 바로 바뀌어요.</p>' +
        '<div class="mode-options">' +
          '<button type="button" class="mode-opt mode-opt--memory' + (!lost ? ' is-current' : '') + '" data-mode="memory" aria-pressed="' + !lost + '">' +
            '<span class="ic"><i class="fa-regular fa-heart"></i></span>' +
            '<span><strong>MEMORY MODE <span class="now">현재</span></strong><p>인형의 기억과 환생 기록을 보여줘요.</p></span>' +
          '</button>' +
          '<button type="button" class="mode-opt mode-opt--lost' + (lost ? ' is-current' : '') + '" data-mode="lost" aria-pressed="' + lost + '">' +
            '<span class="ic"><i class="fa-regular fa-bell"></i></span>' +
            '<span><strong>LOST MODE <span class="now">현재</span></strong><p>습득자가 주인에게 메시지를 보낼 수 있어요. 기억은 숨겨져요.</p></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<h3><i class="fa-regular fa-bell"></i>분실모드 전환</h3>' +
        '<p class="desc">키링을 단 가방을 잃어버렸다면 분실모드를 켜주세요. 찾으면 꺼서 다시 기억모드로 돌아가요.</p>' +
        '<div class="lost-switch' + (lost ? ' on' : '') + '">' +
          '<div class="st">분실모드<b>' + (lost ? 'ON' : 'OFF') + '</b>' +
            (lost && p.lost_since ? '<small>' + U.fmtDateTime(p.lost_since) + '부터</small>' : '') + '</div>' +
          '<div class="lost-btns">' +
            '<button type="button" class="btn btn-danger btn-sm" id="lostOn"' + (lost ? ' disabled' : '') + '>분실모드 ON</button>' +
            '<button type="button" class="btn btn-primary btn-sm" id="lostOff"' + (!lost ? ' disabled' : '') + '>분실모드 OFF</button>' +
          '</div>' +
        '</div>' +
        '<ul class="info-list">' +
          '<li><i class="fa-solid fa-lock"></i><span>분실모드에서는 추억·사진·날짜 등 개인적인 기억이 공개되지 않아요.</span></li>' +
          '<li><i class="fa-solid fa-user-shield"></i><span>주인의 연락처와 주소는 어떤 모드에서도 공개되지 않아요.</span></li>' +
          '<li><i class="fa-regular fa-envelope"></i><span>습득자 메시지는 이 페이지의 메시지함으로 전달돼요.</span></li>' +
        '</ul>' +
      '</div>';
    el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.mode !== st.current.mode) changeMode(b.dataset.mode); }));
    document.getElementById('lostOn').addEventListener('click', () => changeMode('lost'));
    document.getElementById('lostOff').addEventListener('click', () => changeMode('memory'));
  }

  async function changeMode(mode) {
    const p = st.current;
    const toLost = mode === 'lost';
    const ok = await U.confirmDialog(toLost ? {
      title: '분실모드를 켤까요?',
      body: p.plush_name + ' 키링을 태그하면 "이 가방의 주인을 찾아주세요" 안내 화면이 표시돼요.',
      bullets: ['기억·사진 등 개인적인 정보는 숨겨져요', '가방을 발견한 사람이 주인에게 메시지를 보낼 수 있어요', '주인의 연락처는 공개되지 않아요'],
      icon: 'fa-bell', tone: 'warn', confirmText: '분실모드 ON', confirmClass: 'btn-danger'
    } : {
      title: '분실모드를 끌까요?',
      body: '가방을 찾으셨나요? 키링을 태그하면 다시 기억 화면이 표시돼요.',
      bullets: ['MEMORY MODE로 돌아가요', '받은 메시지는 메시지함에 그대로 남아요'],
      icon: 'fa-heart', tone: 'brand', confirmText: '분실모드 OFF', confirmClass: 'btn-primary'
    });
    if (!ok) return;
    const btn = document.getElementById(toLost ? 'lostOn' : 'lostOff');
    U.setBusy(btn, true, '변경 중…');
    try {
      const updated = await S.setMode(p.plush_id, mode);
      st.current = Object.assign(st.current, { mode: updated.mode, lost_status: updated.lost_status, lost_since: updated.lost_since });
      st.draft.mode = updated.mode;
      const li = st.plushes.find((x) => x.plush_id === p.plush_id);
      if (li) li.mode = updated.mode;
      const keepDirty = st.dirty;
      renderDashboard();
      setDirty(keepDirty);
      U.toast(toLost ? '분실모드가 켜졌어요 · NFC 화면이 LOST MODE로 바뀌었어요' : '분실모드가 꺼졌어요 · MEMORY MODE로 돌아왔어요', toLost ? 'fa-bell' : 'fa-heart');
    } catch (ex) {
      U.toast(ex.message, 'fa-circle-exclamation');
      U.setBusy(btn, false);
    }
  }

  /* ---------- 정보 관리 ---------- */
  function renderEditPanel() {
    const d = st.draft;
    const el = app.querySelector('[data-panel="edit"]');
    el.innerHTML =
      '<div class="panel-card">' +
        '<h3><i class="fa-regular fa-id-card"></i>인형 정보</h3>' +
        '<div class="photo-edit" style="margin-top:16px">' + img(d.plush_image, '대표 사진') +
          '<div class="btns"><label class="btn btn-outline btn-sm" style="cursor:pointer"><i class="fa-solid fa-camera"></i>대표 사진 변경<input type="file" accept="image/*" data-upload="plush_image" hidden></label>' +
          '<small>정사각형 사진을 추천해요</small></div>' +
        '</div>' +
        '<div class="grid-2" style="margin-top:18px">' +
          field('plush_name', '인형 이름', 'text', d.plush_name, 'maxlength="20" required') +
          field('greeting', '인사말', 'text', d.greeting, 'maxlength="60" placeholder="나와 함께한 소중한 기억을 만나보세요."') +
          field('first_met_date', '처음 만난 날', 'date', d.first_met_date) +
          field('reborn_date', '환생 날짜', 'date', d.reborn_date) +
        '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<h3><i class="fa-regular fa-heart"></i>MY MEMORY</h3>' +
        '<div class="field" style="margin-top:16px"><label for="f_memory_text">인형과의 추억 <span class="opt" id="memCnt"></span></label>' +
          '<textarea class="input" id="f_memory_text" data-k="memory_text" maxlength="3000" rows="7" placeholder="인형과 함께한 이야기를 자유롭게 적어주세요.">' + U.esc(d.memory_text) + '</textarea></div>' +
        '<label style="display:block;font-weight:600;font-size:.94rem;margin:6px 0 10px">함께했던 순간</label>' +
        '<div class="row-editor" id="momentsEd"></div>' +
        '<button type="button" class="add-row" data-add="memory_moments"><i class="fa-solid fa-plus"></i> 순간 추가</button>' +
        '<label style="display:block;font-weight:600;font-size:.94rem;margin:24px 0 10px">추억 사진 갤러리 <span style="font-weight:500;color:var(--ink-faint);font-size:.8rem">(최대 12장)</span></label>' +
        '<div class="g-edit" id="galleryEd"></div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<h3><i class="fa-regular fa-star"></i>RE-BIRTH RECORD</h3>' +
        '<div class="ba-edit" style="margin-top:16px">' +
          '<label class="slot"><div class="slot-img">' + (d.original_image ? img(d.original_image, '') : '') + '</div><span>환생 전 원본 인형</span><input type="file" accept="image/*" data-upload="original_image"></label>' +
          '<label class="slot"><div class="slot-img">' + (d.reborn_image ? img(d.reborn_image, '') : '') + '</div><span>환생 키링 (앞)</span><input type="file" accept="image/*" data-upload="reborn_image"></label>' +
          '<label class="slot"><div class="slot-img">' + (d.reborn_image_side ? img(d.reborn_image_side, '') : '') + '</div><span>환생 키링 (옆)</span><input type="file" accept="image/*" data-upload="reborn_image_side"></label>' +
          '<label class="slot"><div class="slot-img">' + (d.reborn_image_back ? img(d.reborn_image_back, '') : '') + '</div><span>환생 키링 (뒤)</span><input type="file" accept="image/*" data-upload="reborn_image_back"></label>' +
        '</div>' +
        '<label style="display:block;font-weight:600;font-size:.94rem;margin:22px 0 10px">환생 과정 기록</label>' +
        '<div class="row-editor" id="stepsEd"></div>' +
        '<button type="button" class="add-row" data-add="reborn_steps"><i class="fa-solid fa-plus"></i> 과정 추가</button>' +
      '</div>';

    renderRows('memory_moments', 'momentsEd', '제목 (예: 처음 만난 날)', '내용');
    renderRows('reborn_steps', 'stepsEd', '단계 (예: 키링 제작)', '설명');
    renderGallery();
    updateMemCount();

    el.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('input', () => {
      st.draft[inp.dataset.k] = inp.value || (inp.type === 'date' ? null : '');
      if (inp.dataset.k === 'memory_text') updateMemCount();
      setDirty(true);
    }));
    el.querySelectorAll('[data-upload]').forEach((inp) => inp.addEventListener('change', () => handleUpload(inp, inp.dataset.upload)));
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.add;
      st.draft[key] = st.draft[key] || [];
      if (st.draft[key].length >= 20) return U.toast('최대 20개까지 추가할 수 있어요', 'fa-circle-info');
      st.draft[key].push({ date: '', title: '', text: '' });
      renderRows(key, key === 'memory_moments' ? 'momentsEd' : 'stepsEd');
      setDirty(true);
      const rows = document.getElementById(key === 'memory_moments' ? 'momentsEd' : 'stepsEd').querySelectorAll('.row-item');
      rows[rows.length - 1].querySelector('input[type="text"]').focus();
    }));
  }

  function field(k, label, type, val, attrs) {
    return '<div class="field"><label for="f_' + k + '">' + label + '</label><input class="input" id="f_' + k + '" type="' + type + '" data-k="' + k + '" value="' + U.esc(val || '') + '" ' + (attrs || '') + '></div>';
  }
  function updateMemCount() {
    const c = document.getElementById('memCnt');
    if (c) c.textContent = (st.draft.memory_text || '').length + ' / 3000';
  }

  function renderRows(key, boxId, titlePh, textPh) {
    const box = document.getElementById(boxId);
    titlePh = titlePh || box.dataset.tph; textPh = textPh || box.dataset.xph;
    box.dataset.tph = titlePh; box.dataset.xph = textPh;
    const rows = st.draft[key] || [];
    box.innerHTML = rows.length ? rows.map((r, i) =>
      '<div class="row-item">' +
        '<button type="button" class="row-del" data-del="' + i + '" aria-label="삭제"><i class="fa-solid fa-xmark"></i></button>' +
        '<div class="row-top"><input class="input" type="date" data-f="date" data-i="' + i + '" value="' + U.esc(r.date || '') + '" aria-label="날짜">' +
        '<input class="input" type="text" data-f="title" data-i="' + i + '" value="' + U.esc(r.title || '') + '" placeholder="' + U.esc(titlePh) + '" maxlength="40"></div>' +
        '<textarea class="input" data-f="text" data-i="' + i + '" placeholder="' + U.esc(textPh) + '" maxlength="300">' + U.esc(r.text || '') + '</textarea>' +
      '</div>'
    ).join('') : '<div class="empty-note">아직 기록이 없어요.</div>';
    box.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('input', () => {
      st.draft[key][+inp.dataset.i][inp.dataset.f] = inp.value;
      setDirty(true);
    }));
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      st.draft[key].splice(+b.dataset.del, 1);
      renderRows(key, boxId);
      setDirty(true);
    }));
  }

  function renderGallery() {
    const box = document.getElementById('galleryEd');
    const list = st.draft.memory_images || (st.draft.memory_images = []);
    box.innerHTML = list.map((g, i) =>
      '<div class="g-item">' + img(g.url, g.caption) +
        '<button type="button" class="row-del" data-gdel="' + i + '" aria-label="사진 삭제"><i class="fa-solid fa-xmark"></i></button>' +
        '<input type="text" data-gcap="' + i + '" value="' + U.esc(g.caption || '') + '" placeholder="사진 설명" maxlength="30">' +
      '</div>'
    ).join('') +
    (list.length < 12 ? '<label class="g-add"><i class="fa-regular fa-image" style="font-size:1.3rem"></i>사진 추가<input type="file" accept="image/*" multiple id="gAdd"></label>' : '');
    box.querySelectorAll('[data-gcap]').forEach((inp) => inp.addEventListener('input', () => { list[+inp.dataset.gcap].caption = inp.value; setDirty(true); }));
    box.querySelectorAll('[data-gdel]').forEach((b) => b.addEventListener('click', () => { list.splice(+b.dataset.gdel, 1); renderGallery(); setDirty(true); }));
    const add = document.getElementById('gAdd');
    if (add) add.addEventListener('change', async () => {
      const files = Array.from(add.files).slice(0, 12 - list.length);
      if (!files.length) return;
      const label = add.parentElement;
      label.style.pointerEvents = 'none'; label.innerHTML = '<span class="spin" style="width:20px;height:20px;border:2px solid var(--brand);border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span>업로드 중…';
      let failed = 0;
      for (const f of files) {
        try { list.push({ url: await S.uploadImage(st.current.plush_id, f), caption: '' }); }
        catch (ex) { failed++; U.toast(ex.message, 'fa-circle-exclamation'); }
      }
      renderGallery();
      if (files.length > failed) { setDirty(true); U.toast('사진을 추가했어요 · 저장하기를 눌러 반영해주세요', 'fa-image'); }
    });
  }

  async function handleUpload(inp, key) {
    const file = inp.files && inp.files[0];
    if (!file) return;
    const holder = inp.closest('.slot') || inp.closest('.photo-edit');
    holder.style.opacity = '.5';
    try {
      st.draft[key] = await S.uploadImage(st.current.plush_id, file);
      setDirty(true);
      const keepTab = st.tab;
      renderEditPanel();
      switchTab(keepTab);
      U.toast('사진을 바꿨어요 · 저장하기를 눌러 반영해주세요', 'fa-image');
    } catch (ex) {
      U.toast(ex.message, 'fa-circle-exclamation');
      holder.style.opacity = '';
    }
    inp.value = '';
  }

  function setDirty(v) {
    st.dirty = !!v;
    saveBar.classList.toggle('is-show', st.dirty);
  }

  async function save() {
    const d = st.draft;
    const name = String(d.plush_name || '').trim();
    if (!name) {
      switchTab('edit');
      const f = document.getElementById('f_plush_name');
      f.closest('.field').classList.add('has-error');
      f.focus();
      return U.toast('인형 이름을 입력해주세요', 'fa-circle-exclamation');
    }
    const cleanRows = (rows) => (rows || []).map((r) => ({ date: r.date || '', title: String(r.title || '').trim(), text: String(r.text || '').trim() }))
      .filter((r) => r.title || r.text)
      .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const patch = {
      plush_name: name,
      greeting: String(d.greeting || '').trim(),
      plush_image: d.plush_image || '',
      first_met_date: d.first_met_date || null,
      reborn_date: d.reborn_date || null,
      memory_text: d.memory_text || '',
      memory_moments: cleanRows(d.memory_moments),
      memory_images: (d.memory_images || []).map((g) => ({ url: g.url, caption: String(g.caption || '').trim() })),
      original_image: d.original_image || '',
      reborn_image: d.reborn_image || '',
      reborn_image_side: d.reborn_image_side || '',
      reborn_image_back: d.reborn_image_back || '',
      reborn_steps: cleanRows(d.reborn_steps)
    };
    const btn = document.getElementById('saveBtn');
    U.setBusy(btn, true, '저장 중…');
    try {
      const updated = await S.updatePlush(st.current.plush_id, patch);
      st.current = updated;
      st.draft = clone(updated);
      const li = st.plushes.findIndex((x) => x.plush_id === updated.plush_id);
      if (li > -1) st.plushes[li] = clone(updated);
      setDirty(false);
      renderDashboard();
      U.toast('저장했어요 · NFC 화면에 바로 반영돼요');
    } catch (ex) {
      U.toast(ex.message, 'fa-circle-exclamation');
    } finally {
      U.setBusy(btn, false);
    }
  }

  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('discardBtn').addEventListener('click', async () => {
    const ok = await U.confirmDialog({ title: '변경사항을 되돌릴까요?', body: '마지막으로 저장한 상태로 돌아가요.', icon: 'fa-rotate-left', confirmText: '되돌리기' });
    if (!ok) return;
    st.draft = clone(st.current);
    setDirty(false);
    renderDashboard();
  });

  /* ---------- 메시지함 ---------- */
  function renderInbox() {
    const el = app.querySelector('[data-panel="inbox"]');
    const list = st.messages;
    el.innerHTML =
      '<div class="panel-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<h3><i class="fa-regular fa-envelope"></i>습득자 메시지</h3>' +
          '<button type="button" class="btn btn-line btn-xs" id="refreshMsg"><i class="fa-solid fa-rotate-right"></i>새로고침</button>' +
        '</div>' +
        '<p class="desc">분실모드에서 습득자가 보낸 메시지예요. 습득자에게는 주인의 정보가 공개되지 않아요.</p>' +
        (list.length
          ? '<div class="msg-list">' + list.map((m) =>
              '<article class="msg-item' + (m.is_read ? '' : ' unread') + '">' +
                '<div class="mh"><span>' + (m.is_read ? '' : '<span class="new">NEW · </span>') + U.fmtDateTime(m.created_at) + '</span></div>' +
                '<p>' + U.esc(m.message) + '</p>' +
                ((m.found_location || m.finder_contact) ? '<div class="mf">' +
                  (m.found_location ? '<span class="tag"><i class="fa-solid fa-location-dot"></i>' + U.esc(m.found_location) + '</span>' : '') +
                  (m.finder_contact ? '<span class="tag"><i class="fa-regular fa-address-card"></i>' + U.esc(m.finder_contact) + '</span>' : '') +
                '</div>' : '') +
                '<div class="ma">' +
                  (m.finder_contact ? '<button type="button" class="btn btn-line btn-xs" data-copy="' + U.esc(m.finder_contact) + '"><i class="fa-regular fa-copy"></i>연락처 복사</button>' : '') +
                  '<button type="button" class="btn btn-line btn-xs" data-read="' + U.esc(m.id) + '" data-val="' + (m.is_read ? '0' : '1') + '">' + (m.is_read ? '안 읽음으로' : '<i class="fa-solid fa-check"></i>읽음') + '</button>' +
                  '<button type="button" class="btn btn-line btn-xs" data-mdel="' + U.esc(m.id) + '" aria-label="메시지 삭제"><i class="fa-regular fa-trash-can"></i></button>' +
                '</div>' +
              '</article>'
            ).join('') + '</div>'
          : '<div class="empty-note" style="margin-top:16px"><i class="fa-regular fa-envelope-open" style="font-size:1.3rem;display:block;margin-bottom:8px;color:var(--brand-soft)"></i>받은 메시지가 없어요.' +
            (st.current.mode !== 'lost' ? '<br>분실모드를 켜면 습득자가 메시지를 보낼 수 있어요.' : '') + '</div>') +
      '</div>';

    document.getElementById('refreshMsg').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      U.setBusy(b, true, '');
      try { st.messages = await S.listMessages(st.current.plush_id); refreshInboxUi(); U.toast('메시지함을 새로고침했어요'); }
      catch (ex) { U.toast(ex.message, 'fa-circle-exclamation'); U.setBusy(b, false); }
    });
    el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => { if (await U.copyText(b.dataset.copy)) U.toast('연락처를 복사했어요'); }));
    el.querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', async () => {
      try {
        await S.setMessageRead(b.dataset.read, b.dataset.val === '1');
        const m = st.messages.find((x) => String(x.id) === b.dataset.read);
        if (m) m.is_read = b.dataset.val === '1';
        refreshInboxUi();
      } catch (ex) { U.toast(ex.message, 'fa-circle-exclamation'); }
    }));
    el.querySelectorAll('[data-mdel]').forEach((b) => b.addEventListener('click', async () => {
      const ok = await U.confirmDialog({ title: '메시지를 삭제할까요?', body: '삭제한 메시지는 되돌릴 수 없어요.', icon: 'fa-trash-can', tone: 'warn', confirmText: '삭제', confirmClass: 'btn-danger' });
      if (!ok) return;
      try {
        await S.deleteMessage(b.dataset.mdel);
        st.messages = st.messages.filter((x) => String(x.id) !== b.dataset.mdel);
        refreshInboxUi();
        U.toast('메시지를 삭제했어요');
      } catch (ex) { U.toast(ex.message, 'fa-circle-exclamation'); }
    }));
  }
  function refreshInboxUi() {
    // 탭 배지와 요약 카드까지 갱신 (편집 중인 내용은 유지)
    const keepDirty = st.dirty;
    renderDashboard();
    setDirty(keepDirty);
  }

  /* ---------- 비밀번호 재설정 (메일 링크로 돌아왔을 때) ---------- */
  function renderNewPassword() {
    setDirty(false);
    app.innerHTML =
      '<div class="auth-wrap"><div class="auth-card">' +
        '<div class="ic"><i class="fa-solid fa-key"></i></div>' +
        '<h1>새 비밀번호 설정</h1><p>앞으로 사용할 비밀번호를 입력해주세요.</p>' +
        '<form id="pwForm" style="margin-top:20px" novalidate>' +
          '<div class="form-error" id="pwErr" hidden></div>' +
          '<div class="field"><label for="npw">새 비밀번호</label><input class="input" id="npw" type="password" autocomplete="new-password" placeholder="6자 이상"></div>' +
          '<button type="submit" class="btn btn-primary btn-block" id="pwBtn">비밀번호 변경</button>' +
        '</form>' +
      '</div></div>';
    document.getElementById('pwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('pwErr');
      const pw = document.getElementById('npw').value;
      if (pw.length < 6) { err.textContent = '비밀번호는 6자 이상이어야 해요.'; err.hidden = false; return; }
      const btn = document.getElementById('pwBtn');
      U.setBusy(btn, true);
      try { await S.updatePassword(pw); U.toast('비밀번호를 변경했어요'); st.user = await S.getUser(); await afterLogin(); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; U.setBusy(btn, false); }
    });
  }

  /* =======================================================
     시작
     ======================================================= */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (st.dirty && !(await confirmDiscard())) return;
    await S.signOut();
    st.user = null; st.current = null; st.draft = null; st.tab = 'mode';
    st.authTab = 'login';
    renderAuth();
    U.toast('로그아웃했어요', 'fa-arrow-right-from-bracket');
  });
  window.addEventListener('beforeunload', (e) => { if (st.dirty) { e.preventDefault(); e.returnValue = ''; } });

  (async function start() {
    try {
      await S.init();
      if (!S.isDemo) {
        S.onAuthChange((evt) => {
          if (evt === 'SIGNED_OUT' && st.user) { st.user = null; renderAuth('세션이 만료되었어요. 다시 로그인해주세요.'); }
          if (evt === 'PASSWORD_RECOVERY') renderNewPassword();
        });
      }
      st.user = await S.getUser();
      if (st.user) await afterLogin(); else renderAuth();
    } catch (e) {
      console.error(e);
      app.innerHTML = '<section class="state"><div class="ic"><i class="fa-solid fa-wifi"></i></div><h2>정보를 불러오지 못했어요</h2><p>' + U.esc(e.message) + '</p><button type="button" class="btn btn-primary" onclick="location.reload()">다시 시도</button></section>';
    }
  })();
})();
