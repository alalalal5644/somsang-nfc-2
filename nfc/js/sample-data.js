/* =========================================================
   샘플 인형 데이터
   - SOM-001 토순이 : MEMORY MODE (기본 샘플)
   - SOM-002 보리 : LOST MODE  (분실모드 화면 확인용)
   - SOM-003 두부 : MEMORY MODE (기억이 아직 적은 상태)
   - SOM-004 뭉이 : MEMORY MODE (수능날 선물 받은 강아지 인형)
   데모 계정(demo@somsang.com)이 네 인형을 모두 소유합니다.
   ========================================================= */
window.SOMSANG_SAMPLES = {
  demoOwner: { id: 'demo-owner', email: 'demo@somsang.com', password: 'somsang1234' },
  plushes: [
    {
      plush_id: 'SOM-001',
      plush_name: '토순이',
      plush_image: 'nfc/img/tosun-after-front.jpg',
      greeting: '나와 함께한 소중한 기억을 만나보세요.',
      owner_id: 'demo-owner',
      mode: 'memory',
      lost_status: false,
      first_met_date: '2021-11-11',
      reborn_date: '2026-10-18',
      memory_text: '빼빼로데이, 아빠가 퇴근길에 빼빼로와 함께 사 온 작은 토끼 인형이 토순이였어요.\n\n이사를 세 번 하고, 기숙사 생활을 하고, 처음 혼자 살게 된 방에서도 토순이는 늘 베개 옆에 있었어요. 털이 닳고 귀 한쪽에 바느질 자국이 생겼지만, 그만큼 같이 지낸 시간이 많았다는 뜻이겠죠.\n\n이제는 가방에 달고 어디든 함께 다닐 수 있게 되었어요. 앞으로도 잘 부탁해, 토순아.',
      memory_moments: [
        { date: '2021-11-11', title: '처음 만난 날', text: '빼빼로 상자 옆 작은 선물 상자 속에서 처음 만났어요.' },
        { date: '2022-08-03', title: '첫 가족 여행', text: '제주도 바다를 같이 봤어요. 캐리어 맨 위 자리는 늘 토순이 차지.' },
        { date: '2023-03-02', title: '기숙사 입사', text: '낯선 방에서 잠 못 들던 밤마다 꼭 안고 잤어요.' },
        { date: '2024-06-15', title: '첫 자취', text: '이삿짐 상자 중 가장 먼저 연 상자에 토순이가 있었어요.' }
      ],
      memory_images: [
        { url: 'nfc/img/tosun-memory-1.jpg', caption: '처음 만난 날' },
        { url: 'nfc/img/tosun-memory-2.jpg', caption: '제주 바다 앞에서' },
        { url: 'nfc/img/tosun-memory-3.jpg', caption: '매일 밤 베개 옆' },
        { url: 'nfc/img/tosun-memory-4.jpg', caption: '첫 자취방 이사 날' }
      ],
      original_image: 'nfc/img/tosun-original.jpg',
      reborn_image: 'nfc/img/tosun-after-front.jpg',
      reborn_image_back: 'nfc/img/tosun-after-back.jpg',
      reborn_steps: [
        { date: '2026-09-28', title: '환생 접수', text: '토순이를 솜생에 보내고 환생을 신청했어요.' },
        { date: '2026-10-02', title: '세척 · 상태 확인', text: '저온 세척 후 원단과 솜 상태를 꼼꼼히 확인했어요.' },
        { date: '2026-10-09', title: '키링 제작', text: '얼굴과 귀 원단을 살려 손바닥만 한 키링으로 다시 만들었어요.' },
        { date: '2026-10-18', title: 'NFC 기억 등록', text: '토순이의 기억을 NFC 칩에 연결하고 환생을 마쳤어요.' }
      ]
    },
    {
      plush_id: 'SOM-002',
      plush_name: '보리',
      plush_image: 'nfc/img/bori.svg',
      greeting: '하늘색 귀가 매력인 보리예요.',
      owner_id: 'demo-owner',
      mode: 'lost',
      lost_status: true,
      first_met_date: '2019-05-05',
      reborn_date: '2026-08-30',
      memory_text: '어린이날 선물로 받은 보리. (분실모드에서는 이 내용이 공개되지 않아요)',
      memory_moments: [
        { date: '2019-05-05', title: '처음 만난 날', text: '어린이날 선물로 받았어요.' }
      ],
      memory_images: [],
      original_image: 'nfc/img/mong-original.svg',
      reborn_image: 'nfc/img/bori.svg',
      reborn_steps: [
        { date: '2026-08-30', title: '환생 완료', text: '키링으로 다시 태어났어요.' }
      ]
    },
    {
      plush_id: 'SOM-003',
      plush_name: '두부',
      plush_image: 'nfc/img/dubu.svg',
      greeting: '말랑말랑 두부의 기억 보관함이에요.',
      owner_id: 'demo-owner',
      mode: 'memory',
      lost_status: false,
      first_met_date: '2022-11-11',
      reborn_date: '2026-11-01',
      memory_text: '',
      memory_moments: [],
      memory_images: [],
      original_image: '',
      reborn_image: 'nfc/img/dubu.svg',
      reborn_steps: []
    },
    {
      plush_id: 'SOM-004',
      plush_name: '뭉이',
      plush_image: 'nfc/img/mung-after-front.jpg',
      greeting: '작아져도 코는 그대로! 나와 함께한 기억을 만나보세요.',
      owner_id: 'demo-owner',
      mode: 'memory',
      lost_status: false,
      first_met_date: '2019-11-14',
      reborn_date: '2026-11-06',
      memory_text: '2019년 수능날, 시험장을 나서자 엄마가 \'고생했어\' 하며 작은 상자를 건네주셨어요. 그 안에 있던 갈색 강아지 인형이 뭉이였어요.\n\n대학에 가고, 시험 기간 밤을 새우고, 처음 혼자 살게 된 방까지 뭉이는 늘 곁에 있었어요. 털은 조금 눌렸지만 동그란 갈색 코만은 처음 그대로였죠.\n\n이제는 작은 키링이 되어 가방에 매달려 다녀요. 작아져도 그 코는 그대로야. 앞으로도 잘 부탁해, 뭉이야.',
      memory_moments: [
        { date: '2019-11-14', title: '수능날, 처음 만난 날', text: '시험이 끝나고 엄마가 건네준 선물 상자 속에서 처음 만났어요.' },
        { date: '2020-07-25', title: '첫 여름 여행', text: '대학 첫 여름방학, 바다 여행에 뭉이도 함께 갔어요.' },
        { date: '2021-12-10', title: '시험 기간 밤샘 메이트', text: '기말고사 밤샘 공부 때마다 책상 옆을 지켜줬어요.' },
        { date: '2024-02-24', title: '첫 자취방 이사', text: '새 방에 가장 먼저 자리를 잡은 건 뭉이였어요.' }
      ],
      memory_images: [
        { url: 'nfc/img/mung-memory-1.jpg', caption: '수능날 받은 선물' },
        { url: 'nfc/img/mung-memory-2.jpg', caption: '첫 여름 바다' },
        { url: 'nfc/img/mung-memory-3.jpg', caption: '밤샘 공부 메이트' },
        { url: 'nfc/img/mung-memory-4.jpg', caption: '첫 자취방 이사 날' }
      ],
      original_image: 'nfc/img/mung-original.jpg',
      reborn_image: 'nfc/img/mung-after-front.jpg',
      reborn_image_side: 'nfc/img/mung-after-side.jpg',
      reborn_image_back: 'nfc/img/mung-after-back.jpg',
      reborn_steps: [
        { date: '2026-10-20', title: '환생 접수', text: '뭉이를 솜생에 보내고 환생을 신청했어요.' },
        { date: '2026-10-23', title: '세척 · 상태 확인', text: '저온 세척 후 원단과 솜 상태를 확인하고, 갈색 코는 따로 떼어 보관했어요.' },
        { date: '2026-10-30', title: '키링 제작', text: '몸은 작아졌지만 뭉이의 상징인 동그란 갈색 코를 그대로 살려 키링으로 만들었어요.' },
        { date: '2026-11-06', title: 'NFC 기억 등록', text: '뭉이의 기억을 NFC 칩에 연결하고 환생을 마쳤어요.' }
      ]
    }
  ],
  messages: [
    {
      id: 'msg-sample-1',
      plush_id: 'SOM-002',
      message: '안녕하세요! 2호선 강남역 11번 출구 근처 벤치에서 보리를 발견했어요. 지금 역 안 유실물센터에 맡겨두었습니다.',
      finder_contact: '',
      found_location: '강남역 11번 출구',
      is_read: false,
      created_at: '2026-11-08T10:24:00+09:00'
    }
  ]
};
