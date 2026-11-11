-- =========================================================
-- SOMSANG NFC Memory Archive — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 작성했습니다.
--
-- 보안 구조
--  · anon(일반 방문자)은 테이블에 직접 접근할 수 없습니다.
--    NFC 화면은 get_public_plush() 함수로만 조회하며,
--    LOST MODE일 때는 이름·사진·고유번호만 반환합니다.
--  · 습득자 메시지는 send_finder_message() 함수로만 보낼 수 있고
--    (분실모드일 때만, 10분에 5건 제한) 주인만 읽을 수 있습니다.
--  · 주인은 RLS로 자기 인형(owner_id = auth.uid())만 조회·수정합니다.
--    owner_id, 등록 코드, plush_id 는 클라이언트에서 바꿀 수 없습니다.
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------
-- 1. 인형 테이블
-- ---------------------------------------------------------
create table if not exists public.plushes (
  plush_id         text primary key check (plush_id ~ '^SOM-[0-9]{3,}$'),
  plush_name       text not null check (char_length(plush_name) between 1 and 20),
  plush_image      text,
  greeting         text check (char_length(greeting) <= 60),
  owner_id         uuid references auth.users(id) on delete set null,
  mode             text not null default 'memory' check (mode in ('memory','lost')),
  lost_status      boolean not null default false,
  lost_since       timestamptz,
  first_met_date   date,
  reborn_date      date,
  memory_text      text check (char_length(memory_text) <= 3000),
  memory_images    jsonb not null default '[]'::jsonb,   -- [{url, caption}]
  memory_moments   jsonb not null default '[]'::jsonb,   -- [{date, title, text}]
  original_image   text,
  reborn_image     text,                                 -- 환생 키링 (앞)
  reborn_image_side text,                                -- 환생 키링 (옆)
  reborn_image_back text,                                -- 환생 키링 (뒤)
  reborn_steps     jsonb not null default '[]'::jsonb,   -- [{date, title, text}]
  claim_code_hash  text,                                 -- 키링 등록 코드 (bcrypt)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists plushes_owner_idx on public.plushes(owner_id);
-- 이전 버전 스키마를 이미 실행했다면 컬럼만 추가
alter table public.plushes add column if not exists reborn_image_side text;
alter table public.plushes add column if not exists reborn_image_back text;

-- mode ↔ lost_status 자동 동기화 + updated_at 갱신
create or replace function public.plushes_sync()
returns trigger language plpgsql as $$
begin
  new.lost_status := (new.mode = 'lost');
  if new.mode = 'lost' and (tg_op = 'INSERT' or old.mode is distinct from 'lost') then
    new.lost_since := now();
  elsif new.mode = 'memory' then
    new.lost_since := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists plushes_sync_trg on public.plushes;
create trigger plushes_sync_trg
  before insert or update on public.plushes
  for each row execute function public.plushes_sync();

-- ---------------------------------------------------------
-- 2. 습득자 메시지 테이블
-- ---------------------------------------------------------
create table if not exists public.finder_messages (
  id              uuid primary key default gen_random_uuid(),
  plush_id        text not null references public.plushes(plush_id) on delete cascade,
  message         text not null check (char_length(message) between 1 and 1000),
  finder_contact  text check (char_length(finder_contact) <= 100),
  found_location  text check (char_length(found_location) <= 100),
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists finder_messages_plush_idx on public.finder_messages(plush_id, created_at desc);

-- ---------------------------------------------------------
-- 3. 권한 (컬럼 단위) + RLS
-- ---------------------------------------------------------
alter table public.plushes enable row level security;
alter table public.finder_messages enable row level security;

revoke all on public.plushes from anon, authenticated;
revoke all on public.finder_messages from anon, authenticated;

-- 주인: 등록 코드(claim_code_hash)를 제외한 컬럼만 조회
grant select (plush_id, plush_name, plush_image, greeting, owner_id, mode, lost_status, lost_since,
              first_met_date, reborn_date, memory_text, memory_images, memory_moments,
              original_image, reborn_image, reborn_image_side, reborn_image_back, reborn_steps, created_at, updated_at)
  on public.plushes to authenticated;
-- 주인: 내용·모드만 수정 가능 (owner_id / plush_id / 등록 코드는 수정 불가)
grant update (plush_name, plush_image, greeting, mode, first_met_date, reborn_date,
              memory_text, memory_images, memory_moments, original_image, reborn_image, reborn_image_side, reborn_image_back, reborn_steps)
  on public.plushes to authenticated;

drop policy if exists "owner can read own plush" on public.plushes;
create policy "owner can read own plush" on public.plushes
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "owner can update own plush" on public.plushes;
create policy "owner can update own plush" on public.plushes
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, delete on public.finder_messages to authenticated;
grant update (is_read) on public.finder_messages to authenticated;

drop policy if exists "owner reads messages" on public.finder_messages;
create policy "owner reads messages" on public.finder_messages
  for select to authenticated
  using (exists (select 1 from public.plushes p where p.plush_id = finder_messages.plush_id and p.owner_id = auth.uid()));

drop policy if exists "owner updates messages" on public.finder_messages;
create policy "owner updates messages" on public.finder_messages
  for update to authenticated
  using (exists (select 1 from public.plushes p where p.plush_id = finder_messages.plush_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.plushes p where p.plush_id = finder_messages.plush_id and p.owner_id = auth.uid()));

drop policy if exists "owner deletes messages" on public.finder_messages;
create policy "owner deletes messages" on public.finder_messages
  for delete to authenticated
  using (exists (select 1 from public.plushes p where p.plush_id = finder_messages.plush_id and p.owner_id = auth.uid()));

-- ---------------------------------------------------------
-- 4. 공개 함수 (NFC 화면용)
-- ---------------------------------------------------------
-- NFC 화면 조회: mode 에 따라 공개 범위가 달라집니다.
create or replace function public.get_public_plush(p_plush_id text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare r public.plushes;
begin
  select * into r from public.plushes where plush_id = upper(trim(p_plush_id));
  if not found then return null; end if;

  if r.mode = 'lost' then
    -- LOST MODE: 습득자에게 필요한 최소 정보만
    return jsonb_build_object(
      'plush_id', r.plush_id,
      'plush_name', r.plush_name,
      'plush_image', r.plush_image,
      'mode', 'lost'
    );
  end if;

  -- MEMORY MODE: 기억 정보 (owner_id·등록 코드는 절대 반환하지 않음)
  return jsonb_build_object(
    'plush_id', r.plush_id,
    'plush_name', r.plush_name,
    'plush_image', r.plush_image,
    'greeting', r.greeting,
    'mode', 'memory',
    'first_met_date', r.first_met_date,
    'reborn_date', r.reborn_date,
    'memory_text', r.memory_text,
    'memory_images', r.memory_images,
    'memory_moments', r.memory_moments,
    'original_image', r.original_image,
    'reborn_image', r.reborn_image,
    'reborn_image_side', r.reborn_image_side,
    'reborn_image_back', r.reborn_image_back,
    'reborn_steps', r.reborn_steps
  );
end $$;

-- 습득자 → 주인 메시지 (분실모드일 때만, 인형별 10분에 5건 제한)
create or replace function public.send_finder_message(
  p_plush_id text, p_message text, p_contact text default null, p_location text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare v_mode text; v_recent int; v_row public.finder_messages;
begin
  select mode into v_mode from public.plushes where plush_id = upper(trim(p_plush_id));
  if v_mode is null then raise exception 'NOT_FOUND'; end if;
  if v_mode <> 'lost' then raise exception 'NOT_LOST'; end if;
  if p_message is null or char_length(trim(p_message)) = 0 or char_length(p_message) > 1000 then
    raise exception 'INVALID_MESSAGE';
  end if;

  select count(*) into v_recent from public.finder_messages
   where plush_id = upper(trim(p_plush_id)) and created_at > now() - interval '10 minutes';
  if v_recent >= 5 then raise exception 'RATE_LIMIT'; end if;

  insert into public.finder_messages(plush_id, message, finder_contact, found_location)
  values (upper(trim(p_plush_id)), trim(p_message),
          nullif(left(trim(coalesce(p_contact,'')), 100), ''),
          nullif(left(trim(coalesce(p_location,'')), 100), ''))
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'created_at', v_row.created_at);
end $$;

-- 키링 등록: 패키지의 고유번호 + 등록 코드로 내 계정에 연결
create or replace function public.claim_plush(p_plush_id text, p_code text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare r public.plushes;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into r from public.plushes where plush_id = upper(trim(p_plush_id)) for update;
  if not found or r.claim_code_hash is null
     or r.claim_code_hash <> crypt(trim(p_code), r.claim_code_hash) then
    perform pg_sleep(0.5);               -- 무차별 대입 완화
    raise exception 'INVALID_CODE';
  end if;
  if r.owner_id is not null and r.owner_id <> auth.uid() then raise exception 'ALREADY_CLAIMED'; end if;
  update public.plushes set owner_id = auth.uid() where plush_id = r.plush_id;
  return jsonb_build_object('plush_id', r.plush_id);
end $$;

revoke all on function public.get_public_plush(text) from public;
revoke all on function public.send_finder_message(text, text, text, text) from public;
revoke all on function public.claim_plush(text, text) from public;
grant execute on function public.get_public_plush(text) to anon, authenticated;
grant execute on function public.send_finder_message(text, text, text, text) to anon, authenticated;
grant execute on function public.claim_plush(text, text) to authenticated;

-- ---------------------------------------------------------
-- 5. 사진 저장소 (Storage)
--    경로 규칙: plush-images/{plush_id}/{uuid}.jpg
--    주인만 자기 인형 폴더에 업로드/삭제 가능, 읽기는 공개
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plush-images', 'plush-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owner uploads plush images" on storage.objects;
create policy "owner uploads plush images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'plush-images'
    and exists (select 1 from public.plushes p
                where p.plush_id = (storage.foldername(name))[1] and p.owner_id = auth.uid())
  );

drop policy if exists "owner deletes plush images" on storage.objects;
create policy "owner deletes plush images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'plush-images'
    and exists (select 1 from public.plushes p
                where p.plush_id = (storage.foldername(name))[1] and p.owner_id = auth.uid())
  );

-- ---------------------------------------------------------
-- 6. 샘플 데이터 (SOM-001 ~ SOM-004)
--    등록 코드: SOM-001 → MONG-2015 / SOM-002 → BORI-2019 / SOM-003 → DUBU-2022 / SOM-004 → MUNG-2019
--    MY SOMSANG 에서 회원가입 → [키링 등록]에 위 코드를 넣으면 내 인형이 됩니다.
--    실제 판매용 키링은 아래 "7. 운영 메모"의 방식으로 추가하세요.
-- ---------------------------------------------------------
insert into public.plushes (plush_id, plush_name, plush_image, greeting, mode, first_met_date, reborn_date,
  memory_text, memory_moments, memory_images, original_image, reborn_image, reborn_image_side, reborn_image_back, reborn_steps, claim_code_hash)
values
('SOM-001', '토순이', 'nfc/img/tosun-after-front.jpg', '나와 함께한 소중한 기억을 만나보세요.', 'memory', '2021-11-11', '2026-10-18',
 E'빼빼로데이, 아빠가 퇴근길에 빼빼로와 함께 사 온 작은 토끼 인형이 토순이였어요.\n\n이사를 세 번 하고, 기숙사 생활을 하고, 처음 혼자 살게 된 방에서도 토순이는 늘 베개 옆에 있었어요. 털이 닳고 귀 한쪽에 바느질 자국이 생겼지만, 그만큼 같이 지낸 시간이 많았다는 뜻이겠죠.\n\n이제는 가방에 달고 어디든 함께 다닐 수 있게 되었어요. 앞으로도 잘 부탁해, 토순아.',
 '[{"date":"2021-11-11","title":"처음 만난 날","text":"빼빼로 상자 옆 작은 선물 상자 속에서 처음 만났어요."},
   {"date":"2022-08-03","title":"첫 가족 여행","text":"제주도 바다를 같이 봤어요. 캐리어 맨 위 자리는 늘 토순이 차지."},
   {"date":"2023-03-02","title":"기숙사 입사","text":"낯선 방에서 잠 못 들던 밤마다 꼭 안고 잤어요."},
   {"date":"2024-06-15","title":"첫 자취","text":"이삿짐 상자 중 가장 먼저 연 상자에 토순이가 있었어요."}]',
 '[{"url":"nfc/img/tosun-memory-1.jpg","caption":"처음 만난 날"},
   {"url":"nfc/img/tosun-memory-2.jpg","caption":"제주 바다 앞에서"},
   {"url":"nfc/img/tosun-memory-3.jpg","caption":"매일 밤 베개 옆"},
   {"url":"nfc/img/tosun-memory-4.jpg","caption":"첫 자취방 이사 날"}]',
 'nfc/img/tosun-original.jpg', 'nfc/img/tosun-after-front.jpg', null, 'nfc/img/tosun-after-back.jpg',
 '[{"date":"2026-09-28","title":"환생 접수","text":"토순이를 솜생에 보내고 환생을 신청했어요."},
   {"date":"2026-10-02","title":"세척 · 상태 확인","text":"저온 세척 후 원단과 솜 상태를 꼼꼼히 확인했어요."},
   {"date":"2026-10-09","title":"키링 제작","text":"얼굴과 귀 원단을 살려 손바닥만 한 키링으로 다시 만들었어요."},
   {"date":"2026-10-18","title":"NFC 기억 등록","text":"토순이의 기억을 NFC 칩에 연결하고 환생을 마쳤어요."}]',
 extensions.crypt('MONG-2015', extensions.gen_salt('bf'))),
('SOM-002', '보리', 'nfc/img/bori.svg', '하늘색 귀가 매력인 보리예요.', 'lost', '2019-05-05', '2026-08-30',
 '어린이날 선물로 받은 보리. (분실모드에서는 이 내용이 공개되지 않아요)',
 '[{"date":"2019-05-05","title":"처음 만난 날","text":"어린이날 선물로 받았어요."}]', '[]',
 'nfc/img/mong-original.svg', 'nfc/img/bori.svg', null, null,
 '[{"date":"2026-08-30","title":"환생 완료","text":"키링으로 다시 태어났어요."}]',
 extensions.crypt('BORI-2019', extensions.gen_salt('bf'))),
('SOM-003', '두부', 'nfc/img/dubu.svg', '말랑말랑 두부의 기억 보관함이에요.', 'memory', '2022-11-11', '2026-11-01',
 '', '[]', '[]', '', 'nfc/img/dubu.svg', null, null, '[]',
 extensions.crypt('DUBU-2022', extensions.gen_salt('bf'))),
('SOM-004', '뭉이', 'nfc/img/mung-after-front.jpg', '작아져도 코는 그대로! 나와 함께한 기억을 만나보세요.', 'memory', '2019-11-14', '2026-11-06',
 E'2019년 수능날, 시험장을 나서자 엄마가 \'고생했어\' 하며 작은 상자를 건네주셨어요. 그 안에 있던 갈색 강아지 인형이 뭉이였어요.\n\n대학에 가고, 시험 기간 밤을 새우고, 처음 혼자 살게 된 방까지 뭉이는 늘 곁에 있었어요. 털은 조금 눌렸지만 동그란 갈색 코만은 처음 그대로였죠.\n\n이제는 작은 키링이 되어 가방에 매달려 다녀요. 작아져도 그 코는 그대로야. 앞으로도 잘 부탁해, 뭉이야.',
 '[{"date":"2019-11-14","title":"수능날, 처음 만난 날","text":"시험이 끝나고 엄마가 건네준 선물 상자 속에서 처음 만났어요."},
   {"date":"2020-07-25","title":"첫 여름 여행","text":"대학 첫 여름방학, 바다 여행에 뭉이도 함께 갔어요."},
   {"date":"2021-12-10","title":"시험 기간 밤샘 메이트","text":"기말고사 밤샘 공부 때마다 책상 옆을 지켜줬어요."},
   {"date":"2024-02-24","title":"첫 자취방 이사","text":"새 방에 가장 먼저 자리를 잡은 건 뭉이였어요."}]',
 '[{"url":"nfc/img/mung-memory-1.jpg","caption":"수능날 받은 선물"},
   {"url":"nfc/img/mung-memory-2.jpg","caption":"첫 여름 바다"},
   {"url":"nfc/img/mung-memory-3.jpg","caption":"밤샘 공부 메이트"},
   {"url":"nfc/img/mung-memory-4.jpg","caption":"첫 자취방 이사 날"}]',
 'nfc/img/mung-original.jpg', 'nfc/img/mung-after-front.jpg', 'nfc/img/mung-after-side.jpg', 'nfc/img/mung-after-back.jpg',
 '[{"date":"2026-10-20","title":"환생 접수","text":"뭉이를 솜생에 보내고 환생을 신청했어요."},
   {"date":"2026-10-23","title":"세척 · 상태 확인","text":"저온 세척 후 원단과 솜 상태를 확인하고, 갈색 코는 따로 떼어 보관했어요."},
   {"date":"2026-10-30","title":"키링 제작","text":"몸은 작아졌지만 뭉이의 상징인 동그란 갈색 코를 그대로 살려 키링으로 만들었어요."},
   {"date":"2026-11-06","title":"NFC 기억 등록","text":"뭉이의 기억을 NFC 칩에 연결하고 환생을 마쳤어요."}]',
 extensions.crypt('MUNG-2019', extensions.gen_salt('bf')))
on conflict (plush_id) do nothing;

-- ---------------------------------------------------------
-- 7. 운영 메모 (SQL Editor 에서 관리자만 실행)
-- ---------------------------------------------------------
-- 새 키링 발급:
--   insert into public.plushes (plush_id, plush_name, claim_code_hash)
--   values ('SOM-004', '새 친구', extensions.crypt('여기에-등록코드', extensions.gen_salt('bf')));
--   → NFC 칩에는 https://alalalal5644.github.io/somsang-website/memory.html?id=SOM-004 기록
--
-- 특정 계정에 직접 연결:
--   update public.plushes set owner_id = (select id from auth.users where email = 'owner@example.com')
--   where plush_id = 'SOM-004';
