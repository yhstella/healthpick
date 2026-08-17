// 사이트 전역 설정 — 도메인/이름/카테고리 등은 여기서 한 곳에서 관리.

export const SITE = {
  name: '헬스픽',
  brandEn: 'HealthPick',
  tagline: '한 줄 검색이 안 되는 실제 상황에 답하는 생활 가이드',
  description:
    '건강검진 수치, 보험 청구, 자동차·앱 문제, 육아·여행 절차 등 일상에서 마주치는 구체적인 질문에 결론부터 짧고 정확하게 답하는 생활 검색형 가이드입니다.',
  url: import.meta.env.SITE || 'https://healthpick.kr',
  ogImage: '/og-default.png',
  // og:locale 표준은 언더스코어(ko_KR). html lang 은 ko (BaseLayout 에서 별도 설정).
  locale: 'ko_KR',
  author: '헬스픽 편집부',
  // 편집 총괄·의료 콘텐츠 감수 책임자 (실명). 큐레이션랩이 헬스픽을 운영·발행.
  // 🚨 YMYL E-E-A-T 핵심 — 여기 값은 전부 실제 사실이어야 하고, 임의로 부풀리지 말 것.
  //    구글은 이름이 아니라 "외부에서 대조 가능한 실체"를 본다. 진료 소속(clinic)이 그 앵커.
  editor: {
    name: '성주현',
    // 임상 자격 — 표기·스키마(hasCredential) 양쪽에서 사용.
    specialty: '내과 전문의',
    credentials: '내과 전문의',
    medicalCredential: '내과 전문의',
    role: '편집장 · 의료 콘텐츠 감수',
    // 진료 소속 — Person.worksFor(MedicalClinic) 로 연결되는 실체 앵커.
    clinic: '서울공감내과',
    // 🚨 개원 상태. 'preparing' 이면 소속을 현재형("~에서 진료")으로 쓰지 않고
    //    worksFor(MedicalClinic) 도 스키마에서 뺀다. 아직 진료하지 않는 곳을 소속으로
    //    표기하면 YMYL 신뢰 신호가 아니라 사실관계 리스크가 된다.
    //    개원하면 'open' 으로 바꾸기만 하면 표기·스키마가 한꺼번에 켜진다.
    clinicStatus: 'open' as 'preparing' | 'open',
    // 운영 법인 — 헬스픽 발행 주체.
    org: '큐레이션랩',
    orgRole: '대표',
    // 실제 진료·감수 영역. knowsAbout 에 그대로 들어간다.
    // 🚨 전 카테고리를 나열하면 전문성이 희석된다. 내과 진료 범위만 유지할 것.
    expertise: [
      '내과',
      '건강검진 결과 해석',
      '고혈압',
      '당뇨병',
      '이상지질혈증',
      '간 기능 검사',
      '소화기 증상',
      '갑상선 질환',
      '만성질환 관리',
    ],
    // 외부 프로필(sameAs) — 실재하는 URL만 넣을 것. 없으면 빈 배열 유지(날조 금지).
    // 후보: 의원 홈페이지, 네이버 플레이스, 심평원 병원정보, 학회 프로필 등.
    sameAs: [] as string[],
  },
  twitter: '@dfgnejdkw',
  // 큐레이션 팀 연락처 — 제안·문의에 사용 (개인 메일 노출 X, 도메인 메일 사용)
  contactEmail: 'info@healthpick.kr',
  // 편집부 운영 원칙 — about 페이지·메인 페이지 양쪽에서 참조
  editorialPrinciples: [
    {
      title: '출처를 답니다',
      desc: '참고한 자료는 글 끝에 그대로 적어둡니다. 더 보고 싶을 때 바로 따라갈 수 있게요.',
    },
    {
      title: '시간을 안 뺏습니다',
      desc: '핵심을 맨 앞에, 자주 묻는 질문은 같은 페이지 끝에. 여기저기 옮겨다닐 일 없게요.',
    },
    {
      title: '의료·돈은 신중하게',
      desc: '사람마다 다른 일이라, 본문에서 늘 전문가와 한 번 더 확인하시라고 적어둡니다.',
    },
    {
      title: '독자 질문에서 출발',
      desc: '사람들이 자주 검색하는 질문, 메일로 보내주신 의견을 다음 글 우선순위에 넣습니다.',
    },
  ],
  adsense: {
    // Google AdSense publisher ID — 2026-05-20 발급
    clientId: 'ca-pub-6379260939821422',
    enabled: true,
  },
  ga4: 'G-8P297QRVGY', // Google Analytics 4 — 2026-05-20 발급
  gsc: 'nKvkrCoGdLE7agIpbtDIm2op1ClFM5jni3vJOjL5FrQ', // Google Search Console 인증 (meta tag)
  naverSearchAdvisor: 'e5b5f5775ab97bdab7ff0d83f4e1d4b514b9e09f', // 네이버 웹마스터 인증
};

export type CategorySlug =
  | 'health'
  | 'living'
  | 'finance'
  | 'tech'
  | 'auto'
  | 'travel'
  | 'study';

export const CATEGORIES: Record<
  CategorySlug,
  { slug: CategorySlug; name: string; description: string; emoji: string; color: string }
> = {
  health: {
    slug: 'health',
    name: '건강',
    description: '질병·증상·영양·운동·다이어트·정신건강까지, 일상에서 궁금한 건강 정보.',
    emoji: '🩺',
    color: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  living: {
    slug: 'living',
    name: '생활',
    description: '인테리어, 청소·정리, 요리 레시피, 육아, 반려동물까지 살림에 꼭 필요한 정보.',
    emoji: '🏠',
    color: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  finance: {
    slug: 'finance',
    name: '재테크',
    description: '주식·부동산·예적금·연금·세금·정부지원금까지 돈 되는 정보 모음.',
    emoji: '💰',
    color: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  tech: {
    slug: 'tech',
    name: 'IT·디지털',
    description: '스마트폰·PC 활용법, 앱 추천, 보안, 인터넷 꿀팁.',
    emoji: '💻',
    color: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  auto: {
    slug: 'auto',
    name: '자동차',
    description: '차량 관리·세차·연비·중고차·운전 꿀팁.',
    emoji: '🚗',
    color: 'bg-slate-100 text-slate-700 ring-slate-300',
  },
  travel: {
    slug: 'travel',
    name: '여행',
    description: '국내·해외 여행지, 캠핑, 맛집, 여행 준비물.',
    emoji: '✈️',
    color: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  study: {
    slug: 'study',
    name: '학습·자기계발',
    description: '공부법, 영어, 자격증, 책 추천, 시간 관리.',
    emoji: '📚',
    color: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
};

export const CATEGORY_ORDER: CategorySlug[] = [
  'health',
  'living',
  'finance',
  'tech',
  'auto',
  'travel',
  'study',
];

// ============================================================================
// 주제 군집 (topical cluster)
// ============================================================================
// 왜 나누나 —
//   healthpick 은 "내과 전문의가 감수하는 건강 사이트"를 정체성으로 세운다.
//   그런데 건강 글 사이드바에서 자동차·여행 글로 내부링크가 나가면, 크롤러가 그 글의
//   주제 맥락을 건강으로 좁히지 못한다. 글을 지우지 않고도 '섞임'만 끊는 방법이
//   내부링크·추천을 군집 안에 가두는 것.
//   🚨 같은 도메인인 이상 도메인 수준 신호까지 완전히 분리되지는 않는다. 완전 분리가
//      필요해지면 그때 서브도메인으로 옮긴다(파일 구조는 그대로 두었으므로 가능).
export const CLUSTERS = {
  // 의료 군집 — 감수자(내과 전문의) 권위가 붙는 영역.
  medical: ['health'] as CategorySlug[],
  // 생활 군집 — 관심사 기반 글. 의료 권위 주장과 분리해서 다룬다.
  life: ['living', 'finance', 'tech', 'auto', 'travel', 'study'] as CategorySlug[],
} as const;

/** 카테고리가 속한 군집을 돌려준다. 내부링크·추천을 이 경계 안에 가두는 데 사용. */
export function clusterOf(category: CategorySlug): 'medical' | 'life' {
  return CLUSTERS.medical.includes(category) ? 'medical' : 'life';
}
