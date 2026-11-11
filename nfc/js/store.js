/* =========================================================
   SOMSANG NFC 데이터 레이어
   - config.js 에 Supabase 정보가 있으면 Supabase 사용
   - 없으면 데모 모드(localStorage)로 동작
   두 모드 모두 같은 함수 이름을 제공하므로 화면 코드는 모드를 몰라도 됩니다.
   ========================================================= */
(function () {
  const CFG = window.SOMSANG_CONFIG || {};
  const SAMPLES = window.SOMSANG_SAMPLES || { plushes: [], messages: [] };
  const DEMO_KEY = 'somsang_nfc_demo_v6';
  const DEMO_SESSION = 'somsang_nfc_demo_session';
  const ID_RE = /^SOM-\d{3,}$/;

  const useSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  let sb = null;

  /* ---------- 공통 유틸 ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));

  function normalizeId(raw) {
    if (!raw) return '';
    return String(raw).trim().toUpperCase();
  }

  // 공개용 데이터: LOST MODE에서는 기억/개인 정보를 모두 제거합니다.
  function toPublic(p) {
    if (!p) return null;
    const base = {
      plush_id: p.plush_id,
      plush_name: p.plush_name,
      plush_image: p.plush_image,
      mode: p.mode === 'lost' ? 'lost' : 'memory'
    };
    if (base.mode === 'lost') return base;
    return Object.assign(base, {
      greeting: p.greeting || '',
      first_met_date: p.first_met_date || null,
      reborn_date: p.reborn_date || null,
      memory_text: p.memory_text || '',
      memory_moments: p.memory_moments || [],
      memory_images: p.memory_images || [],
      original_image: p.original_image || '',
      reborn_image: p.reborn_image || '',
      reborn_image_side: p.reborn_image_side || '',
      reborn_image_back: p.reborn_image_back || '',
      reborn_steps: p.reborn_steps || []
    });
  }

  function samplePlush(id) {
    return (SAMPLES.plushes || []).find((p) => p.plush_id === id) || null;
  }

  // 이미지 리사이즈 (용량 절약)
  function resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('이미지 파일만 올릴 수 있어요.'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('15MB 이하의 이미지만 올릴 수 있어요.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('지원하지 않는 이미지 형식이에요.'));
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          c.toBlob((blob) => {
            if (!blob) return reject(new Error('이미지 변환에 실패했어요.'));
            resolve({ blob, dataUrl: c.toDataURL('image/jpeg', quality) });
          }, 'image/jpeg', quality);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* =======================================================
     DEMO (localStorage)
     ======================================================= */
  const Demo = {
    load() {
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* storage 사용 불가 */ }
      return { plushes: clone(SAMPLES.plushes), messages: clone(SAMPLES.messages) };
    },
    save(db) {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); }
      catch (e) { throw new Error('브라우저 저장 공간이 부족해요. 사진 수를 줄여주세요.'); }
    },
    session() {
      try { return JSON.parse(sessionStorage.getItem(DEMO_SESSION) || localStorage.getItem(DEMO_SESSION) || 'null'); }
      catch (e) { return null; }
    },
    requireUser() {
      const s = Demo.session();
      if (!s) throw new Error('로그인이 필요해요.');
      return s;
    },
    ownedOrThrow(db, id) {
      const user = Demo.requireUser();
      const p = db.plushes.find((x) => x.plush_id === id);
      if (!p || p.owner_id !== user.id) throw new Error('이 인형을 관리할 권한이 없어요.');
      return p;
    }
  };

  const demoApi = {
    async getPublicPlush(id) {
      const db = Demo.load();
      return toPublic(db.plushes.find((p) => p.plush_id === id));
    },
    async sendFinderMessage(id, { message, contact, location }) {
      const db = Demo.load();
      const p = db.plushes.find((x) => x.plush_id === id);
      if (!p) throw new Error('인형 정보를 찾을 수 없어요.');
      if (p.mode !== 'lost') throw new Error('현재 분실 상태인 인형이 아니에요.');
      const recent = db.messages.filter((m) => m.plush_id === id && Date.now() - new Date(m.created_at).getTime() < 10 * 60 * 1000);
      if (recent.length >= 5) throw new Error('잠시 후 다시 시도해주세요. (10분에 5건까지 보낼 수 있어요)');
      const row = { id: uid(), plush_id: id, message, finder_contact: contact || '', found_location: location || '', is_read: false, created_at: new Date().toISOString() };
      db.messages.unshift(row);
      Demo.save(db);
      return { id: row.id, created_at: row.created_at };
    },
    async getUser() { return Demo.session(); },
    async signIn(email, password) {
      const o = SAMPLES.demoOwner;
      if (String(email).trim().toLowerCase() !== o.email || password !== o.password) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않아요.');
      }
      const s = { id: o.id, email: o.email };
      sessionStorage.setItem(DEMO_SESSION, JSON.stringify(s));
      return s;
    },
    async signUp() { throw new Error('데모 모드에서는 회원가입을 사용할 수 없어요. 데모 계정으로 로그인해주세요.'); },
    async resetPassword() { throw new Error('데모 모드에서는 비밀번호 재설정을 사용할 수 없어요.'); },
    async updatePassword() { throw new Error('데모 모드에서는 비밀번호를 바꿀 수 없어요.'); },
    async signOut() { sessionStorage.removeItem(DEMO_SESSION); localStorage.removeItem(DEMO_SESSION); },
    onAuthChange() { /* 데모 모드: 없음 */ },
    async listMyPlushes() {
      const user = Demo.requireUser();
      return Demo.load().plushes.filter((p) => p.owner_id === user.id).map(clone);
    },
    async getMyPlush(id) {
      return clone(Demo.ownedOrThrow(Demo.load(), id));
    },
    async updatePlush(id, patch) {
      const db = Demo.load();
      const p = Demo.ownedOrThrow(db, id);
      const allowed = ['plush_name', 'plush_image', 'greeting', 'first_met_date', 'reborn_date', 'memory_text', 'memory_moments', 'memory_images', 'original_image', 'reborn_image', 'reborn_image_side', 'reborn_image_back', 'reborn_steps'];
      allowed.forEach((k) => { if (k in patch) p[k] = patch[k]; });
      Demo.save(db);
      return clone(p);
    },
    async setMode(id, mode) {
      const db = Demo.load();
      const p = Demo.ownedOrThrow(db, id);
      p.mode = mode === 'lost' ? 'lost' : 'memory';
      p.lost_status = p.mode === 'lost';
      p.lost_since = p.lost_status ? new Date().toISOString() : null;
      Demo.save(db);
      return clone(p);
    },
    async uploadImage(id, file) {
      Demo.ownedOrThrow(Demo.load(), id);
      const { dataUrl } = await resizeImage(file, 900, 0.82);
      return dataUrl;
    },
    async listMessages(id) {
      const db = Demo.load();
      Demo.ownedOrThrow(db, id);
      return db.messages.filter((m) => m.plush_id === id).map(clone);
    },
    async setMessageRead(msgId, isRead) {
      const db = Demo.load();
      const m = db.messages.find((x) => x.id === msgId);
      if (!m) return;
      Demo.ownedOrThrow(db, m.plush_id);
      m.is_read = !!isRead;
      Demo.save(db);
    },
    async deleteMessage(msgId) {
      const db = Demo.load();
      const m = db.messages.find((x) => x.id === msgId);
      if (!m) return;
      Demo.ownedOrThrow(db, m.plush_id);
      db.messages = db.messages.filter((x) => x.id !== msgId);
      Demo.save(db);
    },
    async claimPlush() {
      throw new Error('데모 모드에서는 새 키링 등록을 사용할 수 없어요. Supabase를 연결하면 사용할 수 있어요.');
    },
    resetDemo() {
      localStorage.removeItem(DEMO_KEY);
    }
  };

  /* =======================================================
     SUPABASE
     ======================================================= */
  function friendly(err) {
    const msg = (err && (err.message || err.error_description)) || String(err);
    const map = {
      'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않아요.',
      'Email not confirmed': '이메일 인증을 먼저 완료해주세요. 받은편지함을 확인해주세요.',
      'User already registered': '이미 가입된 이메일이에요. 로그인해주세요.',
      NOT_LOST: '현재 분실 상태인 인형이 아니에요.',
      RATE_LIMIT: '잠시 후 다시 시도해주세요. (10분에 5건까지 보낼 수 있어요)',
      NOT_FOUND: '인형 정보를 찾을 수 없어요.',
      INVALID_MESSAGE: '메시지를 1~1000자로 입력해주세요.',
      AUTH_REQUIRED: '로그인이 필요해요.',
      ALREADY_CLAIMED: '이미 다른 계정에 등록된 키링이에요.',
      INVALID_CODE: '고유번호 또는 등록 코드가 올바르지 않아요.'
    };
    for (const k in map) if (msg.indexOf(k) !== -1) return new Error(map[k]);
    if (/Password should be/i.test(msg)) return new Error('비밀번호는 6자 이상이어야 해요.');
    if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('네트워크 연결을 확인해주세요.');
    return new Error(msg);
  }
  const must = ({ data, error }) => { if (error) throw friendly(error); return data; };

  function loadSupabaseLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Supabase 라이브러리를 불러오지 못했어요.'));
      document.head.appendChild(s);
    });
  }

  const PLUSH_COLUMNS = 'plush_id,plush_name,plush_image,greeting,owner_id,mode,lost_status,lost_since,first_met_date,reborn_date,memory_text,memory_moments,memory_images,original_image,reborn_image,reborn_image_side,reborn_image_back,reborn_steps,updated_at';

  const sbApi = {
    async getPublicPlush(id) {
      return must(await sb.rpc('get_public_plush', { p_plush_id: id }));
    },
    async sendFinderMessage(id, { message, contact, location }) {
      return must(await sb.rpc('send_finder_message', {
        p_plush_id: id, p_message: message, p_contact: contact || null, p_location: location || null
      }));
    },
    async getUser() {
      const { data } = await sb.auth.getSession();
      return data.session ? { id: data.session.user.id, email: data.session.user.email } : null;
    },
    async signIn(email, password) {
      const data = must(await sb.auth.signInWithPassword({ email, password }));
      return { id: data.user.id, email: data.user.email };
    },
    async signUp(email, password) {
      const data = must(await sb.auth.signUp({
        email, password, options: { emailRedirectTo: location.origin + location.pathname }
      }));
      return { needsConfirm: !data.session, user: data.user };
    },
    async resetPassword(email) {
      must(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
    },
    async updatePassword(pw) { must(await sb.auth.updateUser({ password: pw })); },
    async signOut() { await sb.auth.signOut(); },
    onAuthChange(cb) { sb.auth.onAuthStateChange((evt) => cb(evt)); },
    async listMyPlushes() {
      const user = await sbApi.getUser();
      if (!user) throw new Error('로그인이 필요해요.');
      return must(await sb.from('plushes').select(PLUSH_COLUMNS).eq('owner_id', user.id).order('plush_id'));
    },
    async getMyPlush(id) {
      const rows = must(await sb.from('plushes').select(PLUSH_COLUMNS).eq('plush_id', id).limit(1));
      if (!rows.length) throw new Error('이 인형을 관리할 권한이 없어요.');
      return rows[0];
    },
    async updatePlush(id, patch) {
      const rows = must(await sb.from('plushes').update(patch).eq('plush_id', id).select(PLUSH_COLUMNS));
      if (!rows.length) throw new Error('저장 권한이 없어요.');
      return rows[0];
    },
    async setMode(id, mode) {
      const rows = must(await sb.from('plushes').update({ mode: mode === 'lost' ? 'lost' : 'memory' }).eq('plush_id', id).select(PLUSH_COLUMNS));
      if (!rows.length) throw new Error('모드를 변경할 권한이 없어요.');
      return rows[0];
    },
    async uploadImage(id, file) {
      const { blob } = await resizeImage(file, 1600, 0.86);
      const path = id + '/' + uid() + '.jpg';
      must(await sb.storage.from(CFG.STORAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
      return sb.storage.from(CFG.STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async listMessages(id) {
      return must(await sb.from('finder_messages').select('*').eq('plush_id', id).order('created_at', { ascending: false }));
    },
    async setMessageRead(msgId, isRead) {
      must(await sb.from('finder_messages').update({ is_read: !!isRead }).eq('id', msgId));
    },
    async deleteMessage(msgId) {
      must(await sb.from('finder_messages').delete().eq('id', msgId));
    },
    async claimPlush(id, code) {
      return must(await sb.rpc('claim_plush', { p_plush_id: id, p_code: code }));
    },
    resetDemo() {}
  };

  /* =======================================================
     Public facade
     ======================================================= */
  const api = useSupabase ? sbApi : demoApi;

  const Store = {
    isDemo: !useSupabase,
    ID_RE,
    normalizeId,
    toPublic,
    async init() {
      if (!useSupabase) return;
      await loadSupabaseLib();
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    },
    /**
     * NFC 화면용 조회. 실제 데이터가 없으면 샘플(SOM-001~003)로 대체합니다.
     * 반환: { plush, isSample }
     */
    async fetchForNfc(id) {
      let plush = null, failed = null;
      try { plush = await api.getPublicPlush(id); }
      catch (e) { failed = e; }
      if (plush) return { plush, isSample: false };
      if (useSupabase && CFG.SAMPLE_FALLBACK && samplePlush(id)) {
        return { plush: toPublic(samplePlush(id)), isSample: true };
      }
      if (failed) throw failed;
      return { plush: null, isSample: false };
    }
  };
  Object.keys(api).forEach((k) => { if (!(k in Store)) Store[k] = api[k]; });

  window.SomsangStore = Store;
})();
