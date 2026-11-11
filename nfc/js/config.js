/* =========================================================
   SOMSANG NFC 설정
   ---------------------------------------------------------
   Supabase 프로젝트를 연결하려면 아래 두 값을 채워주세요.
   (Supabase 대시보드 → Project Settings → API)

   - 비워두면 "데모 모드"로 동작합니다.
     데모 모드는 브라우저(localStorage)에만 저장되며 실제 서비스용이 아닙니다.
   - anon / publishable 키는 공개되어도 되는 키입니다.
     (보안은 supabase/schema.sql 의 RLS 정책과 RPC 함수가 담당합니다)
   - service_role 키는 절대 여기에 넣지 마세요.
   ========================================================= */
window.SOMSANG_CONFIG = {
  SUPABASE_URL: '',        // 예: 'https://abcdefgh.supabase.co'
  SUPABASE_ANON_KEY: '',   // 예: 'eyJhbGciOi...' 또는 'sb_publishable_...'
  STORAGE_BUCKET: 'plush-images',

  // NFC 칩에 기록할 기본 주소 (끝에 ?id=SOM-001 이 붙습니다)
  PUBLIC_BASE_URL: 'https://alalalal5644.github.io/somsang-website/memory.html',

  // 솜생 메인 홈페이지
  HOME_URL: 'index.html',

  // 주소에 ?id= 가 없을 때 처음 보여줄 인형 (index.html 로 접속했을 때)
  DEFAULT_PLUSH_ID: 'SOM-004',

  // 실제 DB에 데이터가 없을 때 샘플 인형(SOM-001~003)으로 화면을 보여줄지 여부
  SAMPLE_FALLBACK: true
};
