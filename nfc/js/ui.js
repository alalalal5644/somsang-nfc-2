/* 공통 UI 유틸 */
(function () {
  const CFG = window.SOMSANG_CONFIG || {};

  const LOGO_SVG = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 4c2.4 0 4.4 2 4.4 4.4S22.4 12.8 20 12.8s-4.4-2-4.4-4.4S17.6 4 20 4z" fill="none" stroke="currentColor" stroke-width="2.4"/><g fill="currentColor"><circle cx="20" cy="26" r="6.2"/><circle cx="20" cy="16.5" r="5"/><circle cx="20" cy="35.5" r="5"/><circle cx="10.5" cy="26" r="5"/><circle cx="29.5" cy="26" r="5"/><circle cx="13.3" cy="19.3" r="4.6"/><circle cx="26.7" cy="19.3" r="4.6"/><circle cx="13.3" cy="32.7" r="4.6"/><circle cx="26.7" cy="32.7" r="4.6"/></g><circle cx="20" cy="26" r="4.2" class="logo-hole"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // 이미지 URL은 http(s), data:image, 상대경로만 허용
  function safeUrl(u, fallback) {
    const s = String(u || '').trim();
    if (!s) return fallback || '';
    if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s) || /^[\w./-]+$/.test(s)) return s;
    return fallback || '';
  }
  function parseDate(d) {
    if (!d) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const x = new Date(d);
    return isNaN(x) ? null : x;
  }
  function fmtDate(d, withDay) {
    const x = parseDate(d);
    if (!x) return '-';
    const s = x.getFullYear() + '. ' + (x.getMonth() + 1) + '. ' + x.getDate() + '.';
    return withDay ? s + ' (' + '일월화수목금토'[x.getDay()] + ')' : s;
  }
  function fmtDateTime(iso) {
    const x = new Date(iso);
    if (isNaN(x)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return x.getFullYear() + '.' + p(x.getMonth() + 1) + '.' + p(x.getDate()) + ' ' + p(x.getHours()) + ':' + p(x.getMinutes());
  }
  function daysSince(d) {
    const x = parseDate(d);
    if (!x) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.floor((today - x) / 86400000) + 1; // 처음 만난 날 = 1일
  }
  function durationText(d) {
    const x = parseDate(d);
    if (!x) return '';
    const now = new Date();
    let y = now.getFullYear() - x.getFullYear();
    let m = now.getMonth() - x.getMonth();
    if (now.getDate() < x.getDate()) m -= 1;
    if (m < 0) { y -= 1; m += 12; }
    if (y <= 0 && m <= 0) return '이제 막 시작';
    return (y > 0 ? y + '년 ' : '') + (m > 0 ? m + '개월' : '').trim();
  }
  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function nfcUrl(id) {
    const base = CFG.PUBLIC_BASE_URL || (location.origin + location.pathname.replace(/[^/]*$/, '') + 'memory.html');
    return base + '?id=' + encodeURIComponent(id);
  }

  let toastTimer = null;
  function toast(msg, icon) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.innerHTML = '<i class="fa-solid ' + (icon || 'fa-circle-check') + '"></i><span></span>';
    el.querySelector('span').textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600);
  }

  /**
   * 확인 팝업
   * opts: { title, body, bullets[], icon, tone:'warn'|'brand', confirmText, cancelText, confirmClass }
   * 반환: Promise<boolean>
   */
  function confirmDialog(opts) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.innerHTML =
        '<div class="modal-box">' +
          '<div class="modal-ic modal-ic--' + (opts.tone || 'brand') + '"><i class="fa-solid ' + (opts.icon || 'fa-circle-question') + '"></i></div>' +
          '<h3 id="dlgTitle">' + esc(opts.title) + '</h3>' +
          (opts.body ? '<p>' + esc(opts.body) + '</p>' : '') +
          (opts.bullets && opts.bullets.length ? '<ul>' + opts.bullets.map((b) => '<li><i class="fa-solid fa-check"></i><span>' + esc(b) + '</span></li>').join('') + '</ul>' : '') +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-line" data-act="no">' + esc(opts.cancelText || '취소') + '</button>' +
            '<button type="button" class="btn ' + (opts.confirmClass || 'btn-primary') + '" data-act="yes">' + esc(opts.confirmText || '확인') + '</button>' +
          '</div>' +
        '</div>';
      wrap.setAttribute('aria-labelledby', 'dlgTitle');
      document.body.appendChild(wrap);
      const prevFocus = document.activeElement;
      requestAnimationFrame(() => { wrap.classList.add('is-open'); wrap.querySelector('[data-act="yes"]').focus(); });
      function close(v) {
        wrap.classList.remove('is-open');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => wrap.remove(), 220);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(v);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) return close(false);
        const b = e.target.closest('[data-act]');
        if (b) close(b.dataset.act === 'yes');
      });
    });
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" aria-hidden="true"></span>' + esc(label || '처리 중…');
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      t.remove(); return ok;
    }
  }

  window.SomsangUI = { LOGO_SVG, esc, safeUrl, parseDate, fmtDate, fmtDateTime, daysSince, durationText, param, nfcUrl, toast, confirmDialog, setBusy, copyText };
})();
