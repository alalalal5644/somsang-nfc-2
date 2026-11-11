/* =========================================================
   memory.html — NFC 접속 화면
   URL: memory.html?id=SOM-001
   DB의 mode 값에 따라 MEMORY MODE / LOST MODE를 자동 표시
   ========================================================= */
(function () {
  const U = window.SomsangUI;
  const S = window.SomsangStore;
  const app = document.getElementById('app');
  const FALLBACK_IMG = 'nfc/img/mong.svg';

  const state = { id: '', plush: null, isSample: false, owner: null };

  /* ---------- 공통 ---------- */
  document.getElementById('logo').innerHTML = U.LOGO_SVG + '솜생';
  document.getElementById('footLogo').innerHTML = U.LOGO_SVG + '솜생 <span class="en">SOMSANG</span>';
  const home = (window.SOMSANG_CONFIG || {}).HOME_URL || 'index.html';
  ['homeLink', 'footHome', 'footReborn'].forEach((id) => document.getElementById(id).setAttribute('href', home));

  function josa(name, withC, withoutC) {
    const ch = String(name || '').trim().slice(-1);
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return withoutC;
    return code % 28 ? withC : withoutC;
  }
  function img(src, alt, cls) {
    return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + U.esc(U.safeUrl(src, FALLBACK_IMG)) + '" alt="' + U.esc(alt) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'">';
  }
  function setModePill(mode) {
    const pill = document.getElementById('modePill');
    pill.hidden = false;
    pill.className = 'mode-pill mode-pill--' + mode;
    pill.textContent = mode === 'lost' ? 'LOST MODE' : 'MEMORY MODE';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', mode === 'lost' ? '#123A52' : '#E7F7FF');
  }
  function showDemoBar() {
    const bar = document.getElementById('demoBar');
    if (!(S.isDemo || state.isSample)) return;
    bar.hidden = false;
    bar.innerHTML = '<i class="fa-regular fa-lightbulb"></i> 샘플 데이터로 보는 화면이에요.' +
      (S.isDemo ? '<button type="button" id="demoOwnerBtn">주인으로 로그인해서 분실모드 바꿔보기</button>' : '');
    const b = document.getElementById('demoOwnerBtn');
    if (b) b.addEventListener('click', () => { if (state.owner) document.getElementById('lostSwitch').focus(); else openLogin(); });
  }
  function scrollTop() { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }

  /* ---------- 상태 화면 ---------- */
  function renderState(icon, title, body, actionHtml) {
    app.innerHTML =
      '<section class="state">' +
        '<div class="ic"><i class="' + icon + '"></i></div>' +
        '<h2>' + U.esc(title) + '</h2>' +
        '<p>' + U.esc(body) + '</p>' +
        (actionHtml || '') +
      '</section>';
  }

  /* =======================================================
     MEMORY MODE
     ======================================================= */
  function renderMemory(p) {
    const name = p.plush_name || '이름 없는 인형';
    const days = U.daysSince(p.first_met_date);
    const dur = U.durationText(p.first_met_date);
    const moments = (p.memory_moments || []).filter((m) => m && (m.title || m.text));
    const images = (p.memory_images || []).filter((m) => m && m.url);
    const steps = (p.reborn_steps || []).filter((s) => s && (s.title || s.text));

    // 환생 후 키링 사진: 앞 / 옆 / 뒤 (있는 것만)
    const views = [
      { src: p.reborn_image || p.plush_image, label: '앞' },
      { src: p.reborn_image_side, label: '옆' },
      { src: p.reborn_image_back, label: '뒤' }
    ].filter((v) => v.src);

    const greetingName = '<span class="hl">' + U.esc(name) + '</span>' + josa(name, '이야', '야');

    app.innerHTML =
      /* 첫 화면 */
      '<section class="sky">' +
        '<div class="sky-cloud sc-1"></div><div class="sky-cloud sc-2"></div><div class="sky-cloud sc-3"></div>' +
        '<div class="greet container">' +
          '<div class="greet-photo fade-up"><div class="halo"></div>' + img(p.plush_image, name + ' 대표 사진') + '</div>' +
          '<div class="greet-tags fade-up d2"><span class="id-chip" style="margin-top:0"><i class="fa-solid fa-wifi" style="transform:rotate(90deg)"></i>' + U.esc(p.plush_id) + '</span><span class="mode-pill mode-pill--memory">MEMORY MODE</span></div>' +
          '<h1 class="fade-up d2">안녕, 나는 ' + greetingName + '!</h1>' +
          '<p class="sub fade-up d3">' + U.esc(p.greeting || '나와 함께한 소중한 기억을 만나보세요.') + '</p>' +
          '<div class="greet-cta fade-up d3">' +
            '<a href="#profile" class="btn btn-primary"><i class="fa-regular fa-heart"></i>기억 보러 가기</a>' +
            '<button type="button" class="btn btn-outline" id="shareBtn"><i class="fa-solid fa-arrow-up-from-bracket"></i>공유하기</button>' +
          '</div>' +
          '<div><a href="#profile" class="scroll-hint fade-up d3">SCROLL<i class="fa-solid fa-chevron-down"></i></a></div>' +
        '</div>' +
      '</section>' +

      /* ① 프로필 */
      '<section class="band band--tight" id="profile">' +
        '<div class="container">' +
          '<div class="sec-head"><span class="sec-eyebrow"><span class="n">1</span>PROFILE</span><h2>' + U.esc(name) + '의 프로필</h2></div>' +
          '<div class="card card--lift profile-card">' +
            '<div class="profile-main">' + img(p.plush_image, name) +
              '<div><h3>' + U.esc(name) + '</h3><span>솜생 환생 키링 · ' + U.esc(p.plush_id) + '</span></div>' +
            '</div>' +
            '<div class="stat-grid">' +
              '<div class="stat stat--wide">' +
                '<div><div class="lbl"><i class="fa-regular fa-clock"></i>함께한 시간</div>' +
                '<div class="val">' + (days ? days.toLocaleString('ko-KR') + '<small>일</small>' : '-') + '</div></div>' +
                (dur ? '<div class="aside">' + U.esc(dur) + '째<br>함께하는 중</div>' : '') +
              '</div>' +
              '<div class="stat"><div class="lbl"><i class="fa-regular fa-calendar"></i>처음 만난 날</div><div class="val">' + U.fmtDate(p.first_met_date) + '</div></div>' +
              '<div class="stat"><div class="lbl"><i class="fa-regular fa-star"></i>환생 날짜</div><div class="val">' + U.fmtDate(p.reborn_date) + '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      /* ② MY MEMORY */
      '<section class="band band--cloud" id="memory">' +
        '<div class="container">' +
          '<div class="sec-head"><span class="sec-eyebrow"><span class="n">2</span>MY MEMORY</span><h2>우리의 기억</h2><p>주인이 직접 남긴 ' + U.esc(name) + josa(name, '과', '와') + '의 이야기예요.</p></div>' +
          (p.memory_text
            ? '<article class="letter"><p>' + U.esc(p.memory_text) + '</p><div class="sign">— ' + U.esc(name) + '의 주인이</div></article>'
            : '<div class="empty-note">아직 작성된 추억이 없어요.</div>') +
          '<div class="memory-cols">' +
            '<div>' +
              '<h3 class="sub-title"><i class="fa-regular fa-bookmark"></i>함께했던 순간</h3>' +
              (moments.length
                ? '<ol class="moments">' + moments.map((m) =>
                    '<li class="moment"><time>' + U.fmtDate(m.date) + '</time><strong>' + U.esc(m.title) + '</strong>' + (m.text ? '<p>' + U.esc(m.text) + '</p>' : '') + '</li>'
                  ).join('') + '</ol>'
                : '<div class="empty-note">기록된 순간이 아직 없어요.</div>') +
            '</div>' +
            '<div>' +
              '<h3 class="sub-title"><i class="fa-regular fa-images"></i>추억 사진</h3>' +
              (images.length
                ? '<div class="gallery">' + images.map((g, i) =>
                    '<figure style="margin:0"><button type="button" data-lb="' + i + '" aria-label="' + U.esc(g.caption || '추억 사진 ' + (i + 1)) + ' 크게 보기">' + img(g.url, g.caption || '추억 사진') +
                    (g.caption ? '<figcaption>' + U.esc(g.caption) + '</figcaption>' : '') + '</button></figure>'
                  ).join('') + '</div>'
                : '<div class="empty-note">등록된 사진이 아직 없어요.</div>') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      /* ③ RE-BIRTH RECORD */
      '<section class="band reborn-band" id="reborn">' +
        '<div class="container">' +
          '<div class="sec-head"><span class="sec-eyebrow"><span class="n">3</span>RE-BIRTH RECORD</span><h2 style="color:#fff">' + U.esc(name) + '의 환생 기록</h2><p>오래 함께한 모습 그대로, 곁에 둘 수 있는 키링으로 다시 태어났어요.</p></div>' +
          '<div class="ba">' +
            '<figure><div class="ba-img">' + (p.original_image ? img(p.original_image, '환생 전 ' + name) : '<div class="state" style="min-height:0;height:100%;padding:0"><i class="fa-regular fa-image" style="font-size:1.6rem;color:#8B93BE"></i></div>') + '</div><figcaption><b>BEFORE</b><span>환생 전 원본 인형</span></figcaption></figure>' +
            '<div class="ba-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></div>' +
            '<figure><div class="ba-img' + (views.length > 1 ? ' ba-flip' : '') + '" id="afterImg">' +
              views.map((v, k) => img(v.src, '환생 후 ' + name + ' 키링 ' + v.label + '모습', 'view' + (k === 0 ? ' is-on' : ''))).join('') +
              (views.length > 1
                ? '<div class="flip-tabs" role="group" aria-label="키링 여러 방향 보기">' + views.map((v, k) => '<button type="button" data-view="' + k + '" aria-pressed="' + (k === 0) + '">' + v.label + '</button>').join('') + '</div>'
                : '') +
            '</div><figcaption><b>AFTER</b><span>환생 키링</span></figcaption></figure>' +
          '</div>' +
          (steps.length
            ? '<ol class="rsteps">' + steps.map((s, i) =>
                '<li class="rstep"><div class="num">' + (i + 1) + '</div><div><strong>' + U.esc(s.title) + '</strong>' + (s.date ? '<time>' + U.fmtDate(s.date) + '</time>' : '') + (s.text ? '<p>' + U.esc(s.text) + '</p>' : '') + '</div></li>'
              ).join('') + '</ol>'
            : '') +
          '<div class="reborn-done"><span><i class="fa-regular fa-circle-check"></i>환생 완료</span><b>' + U.fmtDate(p.reborn_date, true) + '</b></div>' +
        '</div>' +
      '</section>' +

      /* ④ 마무리 */
      '<section class="closing">' +
        '<div class="container">' +
          '<p class="q">기억은 사라지지 않고,<br>새로운 모습으로 이어집니다.</p>' +
          '<p class="by">' + U.esc(name) + '의 기억은 솜생이 함께 지켜요.</p>' +
        '</div>' +
      '</section>';

    bindGallery(images);
    const flip = document.getElementById('afterImg');
    if (flip && flip.classList.contains('ba-flip')) {
      const imgs = flip.querySelectorAll('img.view');
      let cur = 0;
      flip.addEventListener('click', (e) => {
        const b = e.target.closest('[data-view]');
        cur = b ? +b.dataset.view : (cur + 1) % imgs.length;
        imgs.forEach((im, k) => im.classList.toggle('is-on', k === cur));
        flip.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.view === cur)));
      });
    }
    document.getElementById('shareBtn').addEventListener('click', async () => {
      const data = { title: name + ' · 솜생 MEMORY ARCHIVE', text: '안녕, 나는 ' + name + josa(name, '이야', '야') + '! 나와 함께한 기억을 만나보세요.', url: location.href };
      if (navigator.share) { try { await navigator.share(data); } catch (e) {} }
      else if (await U.copyText(location.href)) U.toast('링크를 복사했어요');
    });
  }

  /* 갤러리 라이트박스 */
  function bindGallery(images) {
    if (!images.length) return;
    let idx = 0;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '추억 사진');
    lb.innerHTML = '<button class="lb-btn lb-close" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>' +
      (images.length > 1 ? '<button class="lb-btn lb-prev" aria-label="이전 사진"><i class="fa-solid fa-chevron-left"></i></button><button class="lb-btn lb-next" aria-label="다음 사진"><i class="fa-solid fa-chevron-right"></i></button>' : '') +
      '<img alt=""><p></p>';
    document.body.appendChild(lb);
    const im = lb.querySelector('img'), cap = lb.querySelector('p');
    function show(i) {
      idx = (i + images.length) % images.length;
      im.src = U.safeUrl(images[idx].url, FALLBACK_IMG);
      im.alt = images[idx].caption || '추억 사진';
      cap.textContent = (images[idx].caption || '') + '  ' + (idx + 1) + ' / ' + images.length;
    }
    function open(i) { show(i); lb.classList.add('is-open'); lb.querySelector('.lb-close').focus(); document.addEventListener('keydown', onKey); }
    function close() { lb.classList.remove('is-open'); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    }
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.closest('.lb-close')) return close();
      if (e.target.closest('.lb-prev')) return show(idx - 1);
      if (e.target.closest('.lb-next')) return show(idx + 1);
    });
    let sx = null;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
    app.querySelectorAll('[data-lb]').forEach((b) => b.addEventListener('click', () => open(+b.dataset.lb)));
  }

  /* =======================================================
     LOST MODE
     ======================================================= */
  function renderLost(p) {
    const name = p.plush_name || '솜생 키링';
    scrollTop();
    app.innerHTML =
      '<section class="lost-top">' +
        '<div class="container">' +
          '<span class="lost-flag"><i class="fa-solid fa-circle-exclamation"></i>LOST MODE · 가방 주인을 찾고 있어요</span>' +
          '<h1>이 가방의 주인을<br>찾아주세요</h1>' +
          '<p>이 가방에 달린 키링은 주인의 소중한 기억이 담긴 솜생 키링이에요.<br>가방을 발견해 주셔서 감사합니다.</p>' +
        '</div>' +
      '</section>' +
      '<section class="container" style="padding-bottom:64px;">' +
        '<div class="lost-card">' +
          img(p.plush_image, name + ' 사진', 'photo') +
          '<h2>' + U.esc(name) + '</h2>' +
          '<p style="margin-top:4px;font-size:.88rem;color:var(--ink-faint)">이 가방에 달린 솜생 키링이에요</p>' +
          '<div class="lost-meta">' +
            '<div><span>고유번호</span><b>' + U.esc(p.plush_id) + '</b></div>' +
            '<div><span>현재 상태</span><b class="red">분실 신고됨</b></div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-block" id="openMsg"><i class="fa-regular fa-paper-plane"></i>가방 주인에게 메시지 보내기</button>' +
          '<p class="privacy"><i class="fa-solid fa-lock"></i>주인의 연락처와 주소는 공개되지 않아요</p>' +
        '</div>' +
        '<div class="finder-guide">' +
          '<h3>가방을 발견하신 분께</h3>' +
          '<div class="guide-list">' +
            '<div class="guide-item"><div class="ic"><i class="fa-regular fa-comment-dots"></i></div><div><strong>메시지를 남겨주세요</strong><p>가방을 발견한 장소와 맡겨둔 곳을 적어주시면 주인이 빨리 찾을 수 있어요.</p></div></div>' +
            '<div class="guide-item"><div class="ic"><i class="fa-regular fa-envelope"></i></div><div><strong>가방 주인에게 안전하게 전달돼요</strong><p>메시지는 솜생을 통해 가방 주인에게만 전달되고, 서로의 개인정보는 보호돼요.</p></div></div>' +
            '<div class="guide-item"><div class="ic"><i class="fa-regular fa-building"></i></div><div><strong>직접 전달이 어렵다면</strong><p>가방을 가까운 역·건물의 유실물센터나 안내데스크에 맡겨주셔도 괜찮아요.</p></div></div>' +
          '</div>' +
        '</div>' +
      '</section>';
    document.getElementById('openMsg').addEventListener('click', () => renderLostForm(p));
  }

  function renderLostForm(p) {
    const name = p.plush_name || '솜생 키링';
    scrollTop();
    app.innerHTML =
      '<section class="band" style="padding-top:32px;">' +
        '<div class="msg-wrap container">' +
          '<button type="button" class="btn btn-ghost" id="backBtn" style="padding-left:0"><i class="fa-solid fa-arrow-left"></i>돌아가기</button>' +
          '<div class="sec-head" style="margin-top:8px;margin-bottom:22px;">' +
            '<span class="sec-eyebrow">MESSAGE TO OWNER</span>' +
            '<h2 style="font-size:1.45rem">가방 주인에게<br>메시지 보내기</h2>' +
            '<p>남겨주신 메시지는 가방 주인에게만 전달돼요.</p>' +
          '</div>' +
          '<form id="msgForm" novalidate>' +
            '<div class="form-error" id="formError" hidden></div>' +
            '<div class="field" id="fMsg">' +
              '<label for="msg">메시지 <span class="opt">필수</span></label>' +
              '<div class="chip-row" aria-label="빠른 문구">' +
                '<button type="button" class="chip" data-q="가방을 발견해서 보관하고 있어요. ">가방을 보관 중이에요</button>' +
                '<button type="button" class="chip" data-q="가방을 가까운 유실물센터(안내데스크)에 맡겨두었어요. ">유실물센터에 맡겼어요</button>' +
                '<button type="button" class="chip" data-q="가방을 직접 전달해 드리고 싶어요. 아래 연락처로 연락 주세요. ">직접 전해드릴게요</button>' +
              '</div>' +
              '<textarea class="input" id="msg" maxlength="1000" placeholder="예) 오늘 오후 3시쯤 ○○역 2번 출구 벤치에서 이 가방을 발견했어요. 역무실에 맡겨두었습니다." required></textarea>' +
              '<div class="counter"><span id="cnt">0</span> / 1000</div>' +
              '<p class="error">메시지를 입력해주세요.</p>' +
            '</div>' +
            '<div class="field">' +
              '<label for="loc">가방을 발견한 장소 <span class="opt">선택</span></label>' +
              '<input class="input" id="loc" maxlength="100" placeholder="예) 강남역 11번 출구 근처">' +
            '</div>' +
            '<div class="field" id="fContact">' +
              '<label for="contact">답장 받을 연락처 <span class="opt">선택</span></label>' +
              '<input class="input" id="contact" maxlength="100" placeholder="전화번호, 이메일, 카카오톡 ID 등">' +
              '<p class="hint">가방 주인이 연락할 수 있도록 남겨주세요. 원하지 않으면 비워두셔도 돼요.</p>' +
            '</div>' +
            '<label class="consent" id="fConsent"><input type="checkbox" id="agree"><span>작성한 메시지와 연락처가 이 가방의 주인에게 전달되는 것에 동의합니다. 입력한 정보는 가방 주인 외에는 공개되지 않아요.</span></label>' +
            '<div class="form-actions">' +
              '<button type="submit" class="btn btn-primary" id="sendBtn"><i class="fa-regular fa-paper-plane"></i>메시지 보내기</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</section>';

    const msg = document.getElementById('msg');
    const cnt = document.getElementById('cnt');
    msg.addEventListener('input', () => { cnt.textContent = msg.value.length; document.getElementById('fMsg').classList.remove('has-error'); });
    app.querySelectorAll('[data-q]').forEach((c) => c.addEventListener('click', () => {
      msg.value = (msg.value ? msg.value.trim() + ' ' : '') + c.dataset.q;
      msg.dispatchEvent(new Event('input'));
      msg.focus();
    }));
    document.getElementById('backBtn').addEventListener('click', () => renderLost(p));
    document.getElementById('agree').addEventListener('change', () => { document.getElementById('formError').hidden = true; });
    document.getElementById('msgForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('formError');
      errBox.hidden = true;
      const text = msg.value.trim();
      if (!text) { document.getElementById('fMsg').classList.add('has-error'); msg.focus(); return; }
      if (!document.getElementById('agree').checked) {
        errBox.textContent = '메시지 전달 동의에 체크해주세요.'; errBox.hidden = false; return;
      }
      const btn = document.getElementById('sendBtn');
      U.setBusy(btn, true, '보내는 중…');
      try {
        if (state.isSample) {
          // DB에 없는 샘플 인형: 실제 전송 없이 완료 화면만 확인
          await new Promise((r) => setTimeout(r, 500));
        } else {
          await S.sendFinderMessage(p.plush_id, {
            message: text,
            contact: document.getElementById('contact').value.trim(),
            location: document.getElementById('loc').value.trim()
          });
        }
        renderLostDone(p);
      } catch (err) {
        errBox.textContent = err.message || '메시지를 보내지 못했어요. 잠시 후 다시 시도해주세요.';
        errBox.hidden = false;
        U.setBusy(btn, false);
      }
    });
  }

  function renderLostDone(p) {
    const name = p.plush_name || '솜생 키링';
    scrollTop();
    app.innerHTML =
      '<section class="sky">' +
        '<div class="sky-cloud sc-1"></div><div class="sky-cloud sc-3"></div>' +
        '<div class="container"><div class="done">' +
          '<img src="nfc/img/somi.webp" alt="" aria-hidden="true">' +
          '<div class="check"><i class="fa-solid fa-check"></i></div>' +
          '<h2>메시지가 전달되었어요</h2>' +
          '<p>가방 주인이 메시지를 확인하면<br>남겨주신 연락처로 연락드릴 거예요.<br>가방을 찾아주셔서 진심으로 감사드려요.</p>' +
          '<div class="receipt">' +
            '<div><span>키링</span><b>' + U.esc(name) + ' · ' + U.esc(p.plush_id) + '</b></div>' +
            '<div><span>전달 시각</span><b>' + U.fmtDateTime(new Date().toISOString()) + '</b></div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-block" id="againBtn">처음으로</button>' +
          '<a href="' + U.esc((window.SOMSANG_CONFIG || {}).HOME_URL || 'index.html') + '" class="btn btn-ghost btn-block" style="margin-top:6px">솜생 알아보기</a>' +
        '</div></div>' +
      '</section>';
    document.getElementById('againBtn').addEventListener('click', () => renderLost(p));
  }

  function renderCurrent() {
    const plush = state.plush;
    document.title = (plush.plush_name || '솜생') + ' · ' + (plush.mode === 'lost' ? 'LOST MODE' : 'MEMORY ARCHIVE') + ' | 솜생';
    setModePill(plush.mode);
    if (plush.mode === 'lost') renderLost(plush); else renderMemory(plush);
  }

  /* =======================================================
     주인 모드 — 이 화면에서 바로 분실모드 ON/OFF
     (소유자 로그인 + 소유 확인 후에만 표시, 변경은 DB에 저장되어 새로고침해도 유지)
     ======================================================= */
  async function setupOwner() {
    const link = document.getElementById('ownerLink');
    link.addEventListener('click', async (e) => {
      if (state.owner) return; // 이미 주인 인증됨 → 관리 페이지로 이동
      e.preventDefault();
      openLogin();
    });
    if (state.isSample) return;
    try {
      const user = await S.getUser();
      if (user) await checkOwnership(false);
    } catch (e) { /* 로그인 안 됨 */ }
  }

  async function checkOwnership(announce) {
    try {
      const mine = await S.getMyPlush(state.id);
      state.owner = mine;
      renderOwnerBar();
      if (announce) U.toast('주인 인증 완료 · 아래에서 분실모드를 바꿀 수 있어요', 'fa-user-check');
      return true;
    } catch (e) {
      state.owner = null;
      removeOwnerBar();
      if (announce) U.toast('이 키링의 주인 계정이 아니에요', 'fa-circle-info');
      return false;
    }
  }

  function removeOwnerBar() {
    const bar = document.getElementById('ownerBar');
    if (bar) bar.remove();
    document.body.classList.remove('has-owner-bar');
  }

  function renderOwnerBar() {
    removeOwnerBar();
    const lost = state.plush.mode === 'lost';
    const bar = document.createElement('div');
    bar.id = 'ownerBar';
    bar.className = 'owner-bar' + (lost ? ' is-lost' : '');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '주인 메뉴');
    bar.innerHTML =
      '<div class="ob-info"><small>' + (lost ? 'LOST MODE 켜짐' : '주인 모드') + '</small><span>' + U.esc(state.plush.plush_name) + '의 키링</span></div>' +
      '<button type="button" class="switch" role="switch" id="lostSwitch" aria-checked="' + lost + '" aria-label="분실모드">' +
        '분실모드 ' + (lost ? 'ON' : 'OFF') + '<span class="track" aria-hidden="true"></span></button>' +
      '<a class="ob-manage" href="my-somsang.html?id=' + encodeURIComponent(state.id) + '" aria-label="MY SOMSANG 관리 페이지" title="전체 관리"><i class="fa-solid fa-gear"></i></a>';
    document.body.appendChild(bar);
    document.body.classList.add('has-owner-bar');
    document.getElementById('lostSwitch').addEventListener('click', toggleLost);
  }

  async function toggleLost() {
    const toLost = state.plush.mode !== 'lost';
    const name = state.plush.plush_name;
    const ok = await U.confirmDialog(toLost ? {
      title: '분실모드를 켤까요?',
      body: '이 키링을 태그하면 "이 가방의 주인을 찾아주세요" 화면이 표시돼요.',
      bullets: ['기억·사진 등 개인적인 정보는 숨겨져요', '가방을 발견한 사람이 주인에게 메시지를 보낼 수 있어요', '새로고침해도, 다른 휴대폰으로 태그해도 분실모드가 유지돼요'],
      icon: 'fa-bell', tone: 'warn', confirmText: '분실모드 ON', confirmClass: 'btn-danger'
    } : {
      title: '분실모드를 끌까요?',
      body: '가방을 찾으셨나요? 키링을 태그하면 다시 ' + name + '의 기억 화면이 표시돼요.',
      bullets: ['MEMORY MODE로 돌아가요', '받은 메시지는 MY SOMSANG 메시지함에 남아요'],
      icon: 'fa-heart', tone: 'brand', confirmText: '분실모드 OFF', confirmClass: 'btn-primary'
    });
    if (!ok) return;
    const sw = document.getElementById('lostSwitch');
    sw.disabled = true;
    try {
      await S.setMode(state.id, toLost ? 'lost' : 'memory');
      // DB에서 다시 읽어와 화면 갱신 (새로고침한 것과 같은 결과)
      const { plush } = await S.fetchForNfc(state.id);
      state.plush = plush;
      renderCurrent();
      renderOwnerBar();
      scrollTop();
      U.toast(toLost ? '분실모드 ON · 새로고침해도 유지돼요' : '분실모드 OFF · 기억모드로 돌아왔어요', toLost ? 'fa-bell' : 'fa-heart');
    } catch (ex) {
      U.toast(ex.message, 'fa-circle-exclamation');
      sw.disabled = false;
    }
  }

  /* 로그인 시트 */
  function openLogin() {
    const demo = S.isDemo ? window.SOMSANG_SAMPLES.demoOwner : null;
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'loginTitle');
    wrap.innerHTML =
      '<div class="modal-box">' +
        '<div class="modal-ic modal-ic--brand"><i class="fa-solid fa-shield-heart"></i></div>' +
        '<h3 id="loginTitle">이 키링의 주인이신가요?</h3>' +
        '<p>로그인하면 이 화면에서 바로 분실모드를 켜고 끌 수 있어요.</p>' +
        '<form id="sheetLogin" style="margin-top:18px" novalidate>' +
          '<div class="form-error" id="sheetErr" hidden></div>' +
          '<div class="field"><label for="sEmail">이메일</label><input class="input" id="sEmail" type="email" autocomplete="email" placeholder="you@example.com"></div>' +
          '<div class="field"><label for="sPw">비밀번호</label><input class="input" id="sPw" type="password" autocomplete="current-password" placeholder="비밀번호"></div>' +
          '<button type="submit" class="btn btn-primary btn-block" id="sheetBtn">로그인</button>' +
        '</form>' +
        (demo ? '<div class="demo-hint"><b>데모 계정</b> ' + U.esc(demo.email) + ' / ' + U.esc(demo.password) +
          '<button type="button" class="btn btn-deep btn-sm btn-block" id="sheetDemo">데모 계정으로 로그인</button></div>' : '') +
        '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-close>닫기</button>' +
          '<a class="btn btn-ghost btn-sm" href="my-somsang.html?id=' + encodeURIComponent(state.id) + '">회원가입 · 전체 관리</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(() => { wrap.classList.add('is-open'); document.getElementById('sEmail').focus(); });
    const close = () => { wrap.classList.remove('is-open'); document.removeEventListener('keydown', onKey); setTimeout(() => wrap.remove(), 220); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
    const err = document.getElementById('sheetErr');
    async function doLogin(email, pw, btn) {
      err.hidden = true;
      if (!email || !pw) { err.textContent = '이메일과 비밀번호를 입력해주세요.'; err.hidden = false; return; }
      U.setBusy(btn, true, '로그인 중…');
      try {
        await S.signIn(email, pw);
        close();
        if (state.isSample) { U.toast('샘플 화면에서는 주인 모드를 사용할 수 없어요', 'fa-circle-info'); return; }
        await checkOwnership(true);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; U.setBusy(btn, false); }
    }
    document.getElementById('sheetLogin').addEventListener('submit', (e) => {
      e.preventDefault();
      doLogin(document.getElementById('sEmail').value.trim(), document.getElementById('sPw').value, document.getElementById('sheetBtn'));
    });
    const d = document.getElementById('sheetDemo');
    if (d) d.addEventListener('click', () => doLogin(demo.email, demo.password, d));
  }

  /* =======================================================
     시작
     ======================================================= */
  async function start() {
    // ?id=SOM-001 이 기본, 주소 뒤 #SOM-001 형식도 지원 (미리보기·공유용)
    const hashId = /^#?(SOM-\d{3,})$/i.exec(location.hash || '');
    const raw = U.param('id') || (hashId ? hashId[1] : '');
    state.id = S.normalizeId(raw) || S.normalizeId((window.SOMSANG_CONFIG || {}).DEFAULT_PLUSH_ID) || 'SOM-001';
    document.getElementById('ownerLink').href = 'my-somsang.html?id=' + encodeURIComponent(state.id);
    document.getElementById('footOwner').href = 'my-somsang.html?id=' + encodeURIComponent(state.id);

    if (!S.ID_RE.test(state.id)) {
      return renderState('fa-regular fa-circle-question', '올바르지 않은 키링 주소예요', 'NFC 키링을 다시 태그하거나 주소의 고유번호(예: SOM-001)를 확인해주세요.',
        '<a href="memory.html?id=SOM-001" class="btn btn-outline">샘플 키링 보기</a>');
    }
    try {
      await S.init();
      const { plush, isSample } = await S.fetchForNfc(state.id);
      if (!plush) {
        return renderState('fa-regular fa-face-meh', '등록되지 않은 키링이에요', state.id + '에 연결된 인형 정보를 찾을 수 없어요. 키링을 구매하셨다면 MY SOMSANG에서 등록해주세요.',
          '<a href="my-somsang.html?id=' + encodeURIComponent(state.id) + '" class="btn btn-primary">MY SOMSANG에서 등록하기</a>');
      }
      state.plush = plush; state.isSample = isSample;
      showDemoBar();
      renderCurrent();
      setupOwner();
    } catch (e) {
      console.error(e);
      renderState('fa-solid fa-wifi', '정보를 불러오지 못했어요', '네트워크 상태를 확인한 뒤 다시 시도해주세요.',
        '<button type="button" class="btn btn-primary" onclick="location.reload()">다시 시도</button>');
    }
  }

  // 관리 페이지(다른 탭)에서 모드를 바꾸면 데모 모드에서 즉시 반영
  window.addEventListener('storage', (e) => { if (S.isDemo && e.key === 'somsang_nfc_demo_v6') location.reload(); });
  // 탭으로 돌아올 때 모드 재확인 (실서비스에서도 최신 상태 유지)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !state.plush || state.isSample) return;
    try {
      const { plush } = await S.fetchForNfc(state.id);
      if (plush && plush.mode !== state.plush.mode) location.reload();
    } catch (e) {}
  });

  window.addEventListener('hashchange', () => { if (/^#SOM-\d{3,}$/i.test(location.hash)) location.reload(); });

  start();
})();
