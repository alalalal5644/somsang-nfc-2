# 솜생 NFC 스마트 키링 — MEMORY ARCHIVE

솜생 환생 키링의 NFC를 태그하면 열리는 인형 전용 페이지입니다.
기존 홈페이지(`index.html`)는 **수정하지 않았고**, NFC 페이지는 별도 파일로 분리되어 있습니다.

## 파일 구성

```
somsang-website/
├─ index.html              ← 기존 홈페이지 (변경 없음)
├─ intro.mp4               ← 기존 파일 (변경 없음)
├─ memory.html             ← NFC 접속 화면 (MEMORY / LOST MODE 자동 전환)
├─ my-somsang.html         ← MY SOMSANG 주인 관리 페이지 (로그인 필요)
├─ NFC-README.md           ← 이 문서
├─ nfc/
│  ├─ css/nfc.css          ← 기존 사이트 디자인 토큰을 그대로 쓴 스타일
│  ├─ js/config.js         ← ★ Supabase 주소/키 입력하는 곳
│  ├─ js/sample-data.js    ← 샘플 인형 SOM-001 ~ 003
│  ├─ js/store.js          ← 데이터 레이어 (Supabase ↔ 데모 모드)
│  ├─ js/ui.js             ← 공통 UI (팝업, 토스트, 날짜 등)
│  ├─ js/memory.js         ← memory.html 동작
│  ├─ js/admin.js          ← my-somsang.html 동작
│  ├─ img/                 ← 샘플 일러스트 + 캐릭터 소미
│  └─ fonts/               ← 로고용 둥근미소 폰트 (로고 글자만 추린 3KB)
└─ supabase/schema.sql     ← DB 테이블·보안 정책·함수·샘플 데이터
```

## 1. 바로 확인하기 (데모 모드)

`config.js`의 Supabase 값이 비어 있으면 **데모 모드**로 동작합니다. 업로드 직후부터 전체 화면을 확인할 수 있어요.

| 주소 | 화면 |
|---|---|
| `memory.html?id=SOM-001` | 토순이 · MEMORY MODE |
| `memory.html?id=SOM-002` | 보리 · LOST MODE (분실 안내 + 메시지 보내기) |
| `memory.html?id=SOM-003` | 두부 · 기억이 아직 적은 상태 |
| `memory.html?id=SOM-004` | 뭉이 · MEMORY MODE (환생 키링 앞/옆/뒤) |
| `my-somsang.html` | 관리 페이지 — 데모 계정 `demo@somsang.com` / `somsang1234` |

데모 모드에서는 수정 내용이 **그 브라우저에만** 저장됩니다. 관리 페이지에서 분실모드를 켜면 같은 브라우저의 NFC 화면이 바로 LOST MODE로 바뀝니다. 실제 서비스용이 아니므로 판매 전에는 꼭 Supabase를 연결하세요.

## 2. Supabase 연결하기

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **SQL Editor**에 `supabase/schema.sql` 전체를 붙여넣고 **Run**을 누릅니다.
   테이블, 보안 정책(RLS), 함수, 사진 저장소(plush-images), 샘플 인형 3개가 한 번에 만들어집니다.
3. **Project Settings → API**에서 `Project URL`과 `anon`(또는 `publishable`) 키를 복사해 `nfc/js/config.js`에 넣습니다.
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
   ⚠️ `service_role` 키는 절대 넣지 마세요.
4. **Authentication → URL Configuration**
   - Site URL: `https://alalalal5644.github.io/somsang-website/my-somsang.html`
   - Redirect URLs에 같은 주소 추가 (회원가입 인증 메일, 비밀번호 재설정 메일이 이 주소로 돌아옵니다)
5. `my-somsang.html`에서 회원가입 → **키링 등록**에 고유번호와 등록 코드를 입력하면 내 인형이 됩니다.
   샘플 등록 코드: `SOM-001` → `MONG-2015`, `SOM-002` → `BORI-2019`, `SOM-003` → `DUBU-2022`, `SOM-004` → `MUNG-2019`

DB에 해당 인형이 없을 때는 샘플 데이터로 화면을 보여줍니다. (`config.js`의 `SAMPLE_FALLBACK: false`로 끌 수 있어요)

## 분실모드 바로 켜기 (NFC 화면에서)

`memory.html` 오른쪽 위 사람 아이콘 → 주인 계정으로 로그인하면 화면 아래에 **분실모드 스위치**가 나타나요.
스위치를 누르고 확인하면 바로 바뀌고, DB에 저장되므로 새로고침하거나 다른 휴대폰으로 태그해도 그대로 유지돼요.
스위치는 이 키링의 주인으로 인증된 경우에만 보이고, 습득자에게는 보이지 않아요.

## 3. NFC 칩에 기록할 주소

인형마다 한 번만 기록하면 됩니다. 이후 화면 전환은 MY SOMSANG의 모드 설정으로 합니다.

```
https://alalalal5644.github.io/somsang-website/memory.html?id=SOM-001
```

NFC Tools 같은 앱에서 **URL/URI 레코드**로 쓰고, 필요하면 칩을 잠가(Lock) 다른 사람이 덮어쓰지 못하게 하세요.

## 4. 새 키링 발급 (관리자)

Supabase SQL Editor에서:

```sql
insert into public.plushes (plush_id, plush_name, claim_code_hash)
values ('SOM-004', '새 친구', extensions.crypt('ABCD-1234', extensions.gen_salt('bf')));
```

키링 패키지에 고유번호(`SOM-004`)와 등록 코드(`ABCD-1234`)가 적힌 카드를 넣어주세요. 등록 코드는 추측하기 어렵게 8자 이상으로 만드는 걸 권장합니다.

## 5. 개인정보 보호 구조

- 일반 방문자는 DB 테이블에 직접 접근할 수 없고, `get_public_plush` 함수로만 조회합니다.
- **LOST MODE**에서는 이름·사진·고유번호만 반환하고, 추억·사진·날짜는 서버에서 아예 내보내지 않습니다.
- 주인의 이메일·연락처·주소는 어떤 모드에서도 공개되지 않습니다.
- 습득자 메시지는 분실모드일 때만 보낼 수 있고 (인형당 10분에 5건 제한), 주인만 읽을 수 있습니다.
- 주인은 자기 인형만 조회·수정할 수 있고, 소유자(`owner_id`)와 등록 코드는 바꿀 수 없습니다.
- 추억 사진은 공개 저장소에 무작위 파일명으로 저장됩니다. 주소를 아는 사람은 볼 수 있으니, 아주 민감한 사진은 올리지 않도록 안내해주세요.

## 6. 기존 홈페이지와 연결 (선택)

기존 `index.html`은 그대로 두었습니다. 환생 서비스 소개 영역에 관리 페이지 링크를 달고 싶다면, 원하는 위치에 아래 한 줄을 추가하세요.

```html
<a href="my-somsang.html" class="btn btn-outline">MY SOMSANG 내 키링 관리</a>
```

## 참고

- 습득자 메시지는 MY SOMSANG의 메시지함으로 전달됩니다. 이메일·카카오 알림까지 보내려면 Supabase Database Webhook + Edge Function을 추가로 연결하면 됩니다.
- 아이콘(Font Awesome 6.5.1)과 본문 폰트(Pretendard)는 기존 사이트와 같은 CDN을 사용합니다.
