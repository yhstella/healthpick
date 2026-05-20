// 사이트 전역 설정 — 도메인/이름/카테고리 등은 여기서 한 곳에서 관리.

export const SITE = {
  name: '헬스픽',
  brandEn: 'HealthPick',
  tagline: '건강·생활·돈, 검색하면 답이 나오는 정보 큐레이션',
  description:
    '건강·질병·증상·약·영양제·재테크·생활 정보를 한 곳에서 빠르게. 헬스픽(HealthPick)은 검색 한 번으로 필요한 답을 찾을 수 있도록 정리된 정보 큐레이션 사이트입니다.',
  url: import.meta.env.SITE || 'https://healthpick.kr',
  ogImage: '/og-default.png',
  locale: 'ko-KR',
  author: '헬스픽 검증팀',
  twitter: '',
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
