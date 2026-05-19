// 1000+ 페이지 콘텐츠 일괄 생성기.
// 토픽 × 앵글 조합으로 마크다운 파일을 생성한다.
//
// 사용:
//   node scripts/generate-content.mjs           # 누락된 것만 추가 생성
//   node scripts/generate-content.mjs --clean   # 기존 파일 모두 지우고 재생성

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { HEALTH, LIVING, FINANCE, TECH, AUTO, TRAVEL, STUDY } from './topics.mjs';
import {
  HEALTH_EXTRA, FINANCE_EXTRA, LIVING_EXTRA, TECH_EXTRA, TRAVEL_EXTRA, STUDY_EXTRA, AUTO_EXTRA,
} from './topics-extra.mjs';
import {
  HEALTH_C3, FINANCE_C3, LIVING_C3, TRAVEL_C3, STUDY_C3, TECH_C3, AUTO_C3,
} from './topics-cycle3.mjs';
import {
  HEALTH_C4, FINANCE_C4, LIVING_C4, TRAVEL_C4, STUDY_C4, TECH_C4, AUTO_C4,
} from './topics-cycle4.mjs';
import {
  HEALTH_C5, FINANCE_C5, LIVING_C5, TRAVEL_C5, STUDY_C5, TECH_C5, AUTO_C5,
} from './topics-cycle5.mjs';
import {
  HEALTH_C6, FINANCE_C6, LIVING_C6, TRAVEL_C6, STUDY_C6, TECH_C6, AUTO_C6,
} from './topics-cycle6.mjs';
import {
  HEALTH_C7, FINANCE_C7, LIVING_C7, TRAVEL_C7, STUDY_C7, TECH_C7, AUTO_C7,
} from './topics-cycle7.mjs';
import {
  HEALTH_C8, FINANCE_C8, LIVING_C8, TRAVEL_C8, STUDY_C8, TECH_C8, AUTO_C8,
} from './topics-cycle8.mjs';
import {
  HEALTH_C9, FINANCE_C9, LIVING_C9, TRAVEL_C9, STUDY_C9, TECH_C9, AUTO_C9,
} from './topics-cycle9.mjs';
import {
  HEALTH_C10, FINANCE_C10, LIVING_C10, TRAVEL_C10, STUDY_C10, TECH_C10, AUTO_C10,
} from './topics-cycle10.mjs';
import { renderBody, buildFAQs, buildTLDR } from './templates.mjs';
import { seedrand, slugify, pick, pickN, pubDateFor, fixKoreanParticles, replaceTopic } from './util.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'content', 'articles');

const args = new Set(process.argv.slice(2));
const CLEAN = args.has('--clean');

// 각 카테고리의 토픽군과 적용할 앵글 매핑.
const PLAN = {
  health: {
    diseases: { source: HEALTH.diseases, angles: ['cause', 'symptom', 'prevent', 'food'], subname: '질병정보' },
    foods: { source: HEALTH.foods, angles: ['food'], subname: '영양·음식' },
    exercises: { source: HEALTH.exercises, angles: ['routine'], subname: '운동·피트니스' },
    symptoms: { source: HEALTH.symptoms, angles: ['symptom'], subname: '증상' },
    // 사이클 2 확장
    mentalHealth: { source: HEALTH_EXTRA.mentalHealth, angles: ['cause', 'prevent'], subname: '정신건강' },
    womensHealth: { source: HEALTH_EXTRA.womensHealth, angles: ['symptom', 'prevent'], subname: '여성 건강' },
    mensHealth: { source: HEALTH_EXTRA.mensHealth, angles: ['symptom'], subname: '남성 건강' },
    chronicCare: { source: HEALTH_EXTRA.chronicCare, angles: ['prevent', 'food'], subname: '만성질환 관리' },
    digestive: { source: HEALTH_EXTRA.digestive, angles: ['cause', 'food'], subname: '소화기 건강' },
    immuneAllergy: { source: HEALTH_EXTRA.immuneAllergy, angles: ['cause', 'prevent'], subname: '면역·알레르기' },
    supplements: { source: HEALTH_EXTRA.supplements, angles: ['food'], subname: '영양제·보충제' },
    // 사이클 3
    symptomSearch: { source: HEALTH_C3.symptomSearch, angles: ['symptom'], subname: '증상 검색' },
    drugInfo: { source: HEALTH_C3.drugInfo, angles: ['prevent'], subname: '약·복용 정보' },
    testInfo: { source: HEALTH_C3.testInfo, angles: ['symptom'], subname: '건강검진·수치' },
    babyChild: { source: HEALTH_C3.babyChild, angles: ['symptom'], subname: '영유아 건강' },
    // 사이클 4
    postOp: { source: HEALTH_C4.postOp, angles: ['prevent'], subname: '수술·회복' },
    agingHealth: { source: HEALTH_C4.agingHealth, angles: ['prevent'], subname: '노인 건강' },
    womenPregnancy: { source: HEALTH_C4.womenPregnancy, angles: ['symptom'], subname: '임신·출산' },
    workoutDeep: { source: HEALTH_C4.workoutDeep, angles: ['routine'], subname: '운동 심화' },
    // 사이클 5
    skinHair: { source: HEALTH_C5.skinHair, angles: ['prevent'], subname: '피부·모발' },
    weightDiet: { source: HEALTH_C5.weightDiet, angles: ['food'], subname: '체중·다이어트' },
    sleepRecovery: { source: HEALTH_C5.sleepRecovery, angles: ['prevent'], subname: '수면·회복' },
    // 사이클 6
    rehab: { source: HEALTH_C6.rehab, angles: ['routine'], subname: '재활·물리치료' },
    preventiveCare: { source: HEALTH_C6.preventiveCare, angles: ['prevent'], subname: '예방·검진' },
    // 사이클 7
    oralHealth: { source: HEALTH_C7.oralHealth, angles: ['prevent'], subname: '치아·구강' },
    eyeCare: { source: HEALTH_C7.eyeCare, angles: ['prevent'], subname: '눈·시력' },
    // 사이클 8
    seasonHealth: { source: HEALTH_C8.seasonHealth, angles: ['prevent'], subname: '시즌 건강' },
    // 사이클 9
    cancers: { source: HEALTH_C9.cancers, angles: ['symptom'], subname: '암 정보' },
    cardio: { source: HEALTH_C9.cardio, angles: ['symptom'], subname: '심뇌혈관' },
    respiratory: { source: HEALTH_C9.respiratory, angles: ['symptom'], subname: '호흡기' },
    endocrine: { source: HEALTH_C9.endocrine, angles: ['symptom'], subname: '내분비·호르몬' },
    pediatric: { source: HEALTH_C9.pediatric, angles: ['symptom'], subname: '소아 질환' },
    geriatric: { source: HEALTH_C9.geriatric, angles: ['prevent'], subname: '노년 건강' },
    // 사이클 10
    painManage: { source: HEALTH_C10.painManage, angles: ['routine'], subname: '통증 관리' },
    digestive2: { source: HEALTH_C10.digestive2, angles: ['food'], subname: '소화기 심화' },
    reproductive: { source: HEALTH_C10.reproductive, angles: ['food'], subname: '여성·임신' },
  },
  living: {
    recipes: { source: LIVING.recipes, angles: ['recipe'], subname: '레시피' },
    cleaning: { source: LIVING.cleaning, angles: ['cleaning'], subname: '청소·정리' },
    parenting: { source: LIVING.parenting, angles: ['parenting'], subname: '육아' },
    pets: { source: LIVING.pets, angles: ['pets'], subname: '반려동물' },
    // 사이클 2 확장
    cookingMore: { source: LIVING_EXTRA.cookingMore, angles: ['recipe'], subname: '레시피' },
    homeOrganize: { source: LIVING_EXTRA.homeOrganize, angles: ['cleaning'], subname: '정리수납' },
    selfCare: { source: LIVING_EXTRA.selfCare, angles: ['cleaning'], subname: '셀프 케어' },
    // 사이클 3
    babyMomCare: { source: LIVING_C3.babyMomCare, angles: ['parenting'], subname: '임신·산후' },
    homeMaint: { source: LIVING_C3.homeMaint, angles: ['cleaning'], subname: '집 관리' },
    // 사이클 4
    seasonalLife: { source: LIVING_C4.seasonalLife, angles: ['cleaning'], subname: '계절 생활' },
    recipesC4: { source: LIVING_C4.recipesC4, angles: ['recipe'], subname: '요리·디저트' },
    // 사이클 5
    seasonRecipe: { source: LIVING_C5.seasonRecipe, angles: ['recipe'], subname: '계절 요리' },
    hobbies2: { source: LIVING_C5.hobbies2, angles: ['pets'], subname: '식물·동물 키우기' },
    // 사이클 6
    cooking3: { source: LIVING_C6.cooking3, angles: ['recipe'], subname: '글로벌 요리' },
    ecoLife: { source: LIVING_C6.ecoLife, angles: ['cleaning'], subname: '에코·제로웨이스트' },
    // 사이클 7
    cleaning2: { source: LIVING_C7.cleaning2, angles: ['cleaning'], subname: '주방·욕실 청소' },
    childCare: { source: LIVING_C7.childCare, angles: ['parenting'], subname: '영유아 양육 도구' },
    // 사이클 8
    seasonHome: { source: LIVING_C8.seasonHome, angles: ['cleaning'], subname: '시즌 살림' },
    // 사이클 9
    meals: { source: LIVING_C9.meals, angles: ['recipe'], subname: '식단 가이드' },
    // 사이클 10
    diy: { source: LIVING_C10.diy, angles: ['cleaning'], subname: '집 DIY' },
  },
  finance: {
    stocks: { source: FINANCE.stocks, angles: ['invest', 'concept'], subname: '주식·투자' },
    realestate: { source: FINANCE.realestate, angles: ['process'], subname: '부동산' },
    benefits: { source: FINANCE.benefits, angles: ['process'], subname: '정부지원금' },
    saving: { source: FINANCE.saving, angles: ['concept'], subname: '절약·짠테크' },
    tax: { source: FINANCE.tax, angles: ['process'], subname: '세금·연말정산' },
    // 사이클 2 확장
    loans: { source: FINANCE_EXTRA.loans, angles: ['concept'], subname: '대출' },
    insurance: { source: FINANCE_EXTRA.insurance, angles: ['concept'], subname: '보험' },
    retirement: { source: FINANCE_EXTRA.retirement, angles: ['process'], subname: '연금·노후' },
    taxAdvanced: { source: FINANCE_EXTRA.taxAdvanced, angles: ['process'], subname: '세금 심화' },
    invest2: { source: FINANCE_EXTRA.invest2, angles: ['invest'], subname: '해외 투자·ETF' },
    saving2: { source: FINANCE_EXTRA.saving2, angles: ['concept'], subname: '신용·저축' },
    // 사이클 3
    realestateMore: { source: FINANCE_C3.realestateMore, angles: ['process'], subname: '부동산 심화' },
    jobIncome: { source: FINANCE_C3.jobIncome, angles: ['concept'], subname: '근로·급여' },
    startupSmall: { source: FINANCE_C3.startupSmall, angles: ['process'], subname: '창업·소상공인' },
    // 사이클 4
    lifeEvents: { source: FINANCE_C4.lifeEvents, angles: ['concept'], subname: '라이프 이벤트' },
    emergencyDebt: { source: FINANCE_C4.emergencyDebt, angles: ['process'], subname: '연체·구제' },
    smartConsumer: { source: FINANCE_C4.smartConsumer, angles: ['concept'], subname: '소비자 권리' },
    // 사이클 5
    smartLife: { source: FINANCE_C5.smartLife, angles: ['concept'], subname: '가계 관리' },
    digitalAsset: { source: FINANCE_C5.digitalAsset, angles: ['invest'], subname: '디지털 자산' },
    // 사이클 6
    smallBusiness: { source: FINANCE_C6.smallBusiness, angles: ['process'], subname: '온라인 창업' },
    childMoney: { source: FINANCE_C6.childMoney, angles: ['concept'], subname: '자녀 재무' },
    // 사이클 7
    insurance2: { source: FINANCE_C7.insurance2, angles: ['concept'], subname: '보험 심화' },
    bigBuy: { source: FINANCE_C7.bigBuy, angles: ['concept'], subname: '가전·가구 구매' },
    // 사이클 8
    yearEnd: { source: FINANCE_C8.yearEnd, angles: ['process'], subname: '연말정산 심화' },
    seasonMoney: { source: FINANCE_C8.seasonMoney, angles: ['concept'], subname: '시즌 비용' },
    // 사이클 9
    scenarios: { source: FINANCE_C9.scenarios, angles: ['process'], subname: '복잡 사례' },
    retire2: { source: FINANCE_C9.retire2, angles: ['process'], subname: '은퇴·연금 심화' },
    // 사이클 10
    micro: { source: FINANCE_C10.micro, angles: ['concept'], subname: '월급별·연령별 가계' },
    cardOptim: { source: FINANCE_C10.cardOptim, angles: ['concept'], subname: '카드·신용' },
  },
  tech: {
    smartphone: { source: TECH.smartphone, angles: ['howto'], subname: '스마트폰' },
    pc: { source: TECH.pc, angles: ['howto'], subname: 'PC·소프트웨어' },
    apps: { source: TECH.apps, angles: ['recommend'], subname: '앱 추천' },
    security: { source: TECH.security, angles: ['security'], subname: '보안·계정' },
    // 사이클 2 확장
    ai: { source: TECH_EXTRA.ai, angles: ['recommend'], subname: 'AI 도구' },
    productivity: { source: TECH_EXTRA.productivity, angles: ['howto'], subname: '생산성·자동화' },
    digitalLife: { source: TECH_EXTRA.digitalLife, angles: ['howto'], subname: '디지털 라이프' },
    // 사이클 3
    homeOffice: { source: TECH_C3.homeOffice, angles: ['recommend'], subname: '재택근무' },
    // 사이클 4
    contentCreate: { source: TECH_C4.contentCreate, angles: ['recommend'], subname: '콘텐츠 제작' },
    // 사이클 5
    workTools: { source: TECH_C5.workTools, angles: ['howto'], subname: '업무 도구' },
    // 사이클 6
    cybersec: { source: TECH_C6.cybersec, angles: ['security'], subname: '사이버 보안' },
    // 사이클 7
    homeNetwork: { source: TECH_C7.homeNetwork, angles: ['howto'], subname: '홈 네트워크·IoT' },
    // 사이클 8
    seasonTech: { source: TECH_C8.seasonTech, angles: ['howto'], subname: '시즌 디지털' },
    // 사이클 9
    privacy: { source: TECH_C9.privacy, angles: ['security'], subname: '개인정보 관리' },
    // 사이클 10
    workflow: { source: TECH_C10.workflow, angles: ['howto'], subname: '워크플로 자동화' },
  },
  auto: {
    maintenance: { source: AUTO.maintenance, angles: ['maint'], subname: '차량 관리' },
    driving: { source: AUTO.driving, angles: ['drive'], subname: '운전 팁' },
    used: { source: AUTO.used, angles: ['used'], subname: '중고차·보험' },
    parts: { source: AUTO.parts, angles: ['feature'], subname: '기능·부품' },
    // 사이클 2 확장
    evHybrid: { source: AUTO_EXTRA.evHybrid, angles: ['feature'], subname: '전기·하이브리드' },
    driveSkills: { source: AUTO_EXTRA.driveSkills, angles: ['drive'], subname: '운전 기술' },
    // 사이클 3
    legalSafety: { source: AUTO_C3.legalSafety, angles: ['drive'], subname: '교통·법규' },
    // 사이클 4
    bikesScooters: { source: AUTO_C4.bikesScooters, angles: ['feature'], subname: '자전거·이륜차' },
    // 사이클 5
    longTrip: { source: AUTO_C5.longTrip, angles: ['drive'], subname: '장거리 운전' },
    // 사이클 6
    carDIY: { source: AUTO_C6.carDIY, angles: ['maint'], subname: '셀프 정비·DIY' },
    // 사이클 7
    driveAdvanced: { source: AUTO_C7.driveAdvanced, angles: ['feature'], subname: '운전 심화' },
    // 사이클 8
    seasonAuto: { source: AUTO_C8.seasonAuto, angles: ['drive'], subname: '시즌 운전' },
    // 사이클 9
    buyGuide: { source: AUTO_C9.buyGuide, angles: ['used'], subname: '신차 비교' },
    // 사이클 10
    trafficLaw: { source: AUTO_C10.trafficLaw, angles: ['drive'], subname: '교통 법규' },
  },
  travel: {
    domestic: { source: TRAVEL.domestic, angles: ['course'], subname: '국내 여행' },
    abroad: { source: TRAVEL.abroad, angles: ['course'], subname: '해외 여행' },
    camping: { source: TRAVEL.camping, angles: ['camping'], subname: '캠핑·아웃도어' },
    tips: { source: TRAVEL.tips, angles: ['tip'], subname: '여행 준비' },
    // 사이클 2 확장
    domesticMore: { source: TRAVEL_EXTRA.domesticMore, angles: ['course'], subname: '국내 여행' },
    abroadMore: { source: TRAVEL_EXTRA.abroadMore, angles: ['course'], subname: '해외 여행' },
    // 사이클 3
    themedTravel: { source: TRAVEL_C3.themedTravel, angles: ['course'], subname: '테마 여행' },
    // 사이클 4
    budgetSolo: { source: TRAVEL_C4.budgetSolo, angles: ['tip'], subname: '저예산·혼행' },
    // 사이클 5
    domesticAttract: { source: TRAVEL_C5.domesticAttract, angles: ['course'], subname: '국내 명소' },
    // 사이클 6
    family: { source: TRAVEL_C6.family, angles: ['course'], subname: '가족 여행' },
    weekend: { source: TRAVEL_C6.weekend, angles: ['course'], subname: '주말·근교' },
    // 사이클 7
    shoppingFood: { source: TRAVEL_C7.shoppingFood, angles: ['course'], subname: '쇼핑·맛집' },
    // 사이클 8
    seasonTravel: { source: TRAVEL_C8.seasonTravel, angles: ['course'], subname: '시즌 여행' },
    // 사이클 9
    themeFood: { source: TRAVEL_C9.themeFood, angles: ['course'], subname: '미식·맛집' },
    // 사이클 10
    bucket: { source: TRAVEL_C10.bucket, angles: ['course'], subname: '버킷리스트' },
  },
  study: {
    english: { source: STUDY.english, angles: ['english'], subname: '영어 학습' },
    certs: { source: STUDY.certs, angles: ['cert'], subname: '자격증' },
    studymethod: { source: STUDY.studymethod, angles: ['method'], subname: '공부법' },
    books: { source: STUDY.books, angles: ['book'], subname: '책 추천' },
    self: { source: STUDY.self, angles: ['self'], subname: '자기계발' },
    // 사이클 2 확장
    jobSkills: { source: STUDY_EXTRA.jobSkills, angles: ['method'], subname: '직무 스킬' },
    langOther: { source: STUDY_EXTRA.langOther, angles: ['english'], subname: '외국어' },
    // 사이클 3
    examPrep: { source: STUDY_C3.examPrep, angles: ['cert'], subname: '입시·시험' },
    hobbies: { source: STUDY_C3.hobbies, angles: ['method'], subname: '취미·실용' },
    // 사이클 4
    parentingStudy: { source: STUDY_C4.parentingStudy, angles: ['method'], subname: '자녀 학습' },
    // 사이클 5
    collegeWork: { source: STUDY_C5.collegeWork, angles: ['method'], subname: '대학·진로' },
    // 사이클 6
    childLearn: { source: STUDY_C6.childLearn, angles: ['method'], subname: '어린이 학습' },
    abroadStudy: { source: STUDY_C6.abroadStudy, angles: ['cert'], subname: '유학·국제 입시' },
    // 사이클 7
    itLearn: { source: STUDY_C7.itLearn, angles: ['method'], subname: 'IT·코딩 학습' },
    // 사이클 8
    seasonStudy: { source: STUDY_C8.seasonStudy, angles: ['method'], subname: '시즌 학습' },
    // 사이클 9
    newSkills: { source: STUDY_C9.newSkills, angles: ['method'], subname: '디자인·영상·음악' },
    // 사이클 10
    finance_study: { source: STUDY_C10.finance_study, angles: ['method'], subname: '경제·금융 공부' },
  },
};

// 앵글별 제목·설명 변형 (의미 있는 다양성을 위해 1~3개씩)
const ANGLE_FORMS = {
  // HEALTH
  cause: {
    titles: [
      '{topic} 원인과 위험 요인 정리',
      '{topic}, 왜 생길까? 자주 지목되는 원인',
      '{topic} 발생 원인과 가족력 체크',
    ],
    descs: [
      '{topic}의 원인으로 자주 지목되는 요인과 위험 인자를 정리했습니다. 평소 점검하면 좋은 항목까지 함께 안내합니다.',
      '{topic}와 관련해 알려진 일반적인 원인들을 한곳에 모았습니다. 가족력이 있다면 특히 챙겨 두세요.',
    ],
    tags: ['원인', '위험요인'],
  },
  symptom: {
    titles: [
      '{topic} 주요 증상과 신호',
      '{topic} 증상, 이런 변화는 주의',
      '{topic} 의심 증상 체크리스트',
    ],
    descs: [
      '{topic}에서 자주 보고되는 증상과 “병원에 가야 하는” 신호들을 정리했습니다.',
      '{topic} 의심 시 점검할 만한 증상과 진료 전 메모해 두면 좋은 항목들을 안내합니다.',
    ],
    tags: ['증상', '진단'],
  },
  prevent: {
    titles: [
      '{topic} 예방을 위한 생활 습관',
      '{topic} 미리 막는 5가지 점검',
      '{topic} 예방, 식단·운동·검진까지',
    ],
    descs: [
      '{topic} 예방을 위해 식생활, 운동, 수면, 정기 검진 단계로 정리했습니다.',
      '{topic} 위험을 낮추는 데 도움이 될 수 있는 습관들을 한곳에 모았습니다.',
    ],
    tags: ['예방', '생활습관'],
  },
  food: {
    titles: [
      '{topic}에 좋은 음식과 식단',
      '{topic} 관리에 도움이 되는 식품 정리',
      '{topic}, 어떤 음식을 챙길까',
    ],
    descs: [
      '{topic}와 관련해 자주 추천되는 음식과 줄여야 할 음식, 식단 예시까지 정리했습니다.',
      '{topic} 관리에 흔히 거론되는 식품들을 한 번에 모았습니다.',
    ],
    tags: ['음식', '식단'],
  },
  routine: {
    titles: [
      '{topic} 운동, 효과와 자세',
      '{topic} 초보 가이드: 자세와 빈도',
      '{topic}, 어디에 좋고 어떻게 시작할까',
    ],
    descs: [
      '{topic} 운동의 효과, 부위, 시작하는 자세, 주간 빈도를 한 번에 정리했습니다.',
      '{topic}을 처음 시작하시는 분을 위한 자세·강도·주의점 안내입니다.',
    ],
    tags: ['운동', '자세'],
  },

  // LIVING
  recipe: {
    titles: [
      '{topic} 만드는 법 (기본 레시피)',
      '{topic} 레시피, 실패 없이 만드는 법',
      '{topic} 황금 레시피와 응용',
    ],
    descs: [
      '{topic}의 기본 재료부터 단계별 조리법, 맛있게 만드는 포인트와 보관까지 정리했습니다.',
      '집에서 쉽게 따라 할 수 있는 {topic} 레시피와 변형 아이디어를 정리했습니다.',
    ],
    tags: ['레시피', '요리'],
  },
  cleaning: {
    titles: [
      '{topic} 제대로 하는 법',
      '{topic} 깔끔하게 끝내는 순서',
      '{topic}, 쉽게 따라 하는 청소법',
    ],
    descs: [
      '{topic}을 안전하게, 효율적으로 끝내는 도구·순서·자주 묻는 문제까지 정리했습니다.',
      '{topic}을 처음 해보시는 분도 따라 할 수 있는 정리법과 유지 팁을 안내합니다.',
    ],
    tags: ['청소', '정리'],
  },
  parenting: {
    titles: [
      '{topic}, 부모가 알아두면 좋은 점',
      '{topic} 상황별 대처법',
      '{topic} 어떻게 다룰까',
    ],
    descs: [
      '{topic} 상황에서 아이를 이해하고, 집에서 시도해 볼 만한 방법과 도움받을 시기를 정리했습니다.',
      '{topic} 고민에 대해 자주 추천되는 접근과 부모의 컨디션 관리까지 함께 짚어 봅니다.',
    ],
    tags: ['육아', '아이'],
  },
  pets: {
    titles: [
      '{topic} 처음 시작하는 분을 위한 가이드',
      '{topic} 환경과 루틴 정리',
      '{topic}, 챙겨야 할 점과 비용',
    ],
    descs: [
      '{topic}을 위한 환경 점검, 루틴 만들기, 주의 신호와 비용까지 한 번에 정리했습니다.',
      '{topic}을 시작하기 전 알아두면 좋은 기본 사항을 한곳에 모았습니다.',
    ],
    tags: ['반려동물', '입양'],
  },

  // FINANCE
  invest: {
    titles: [
      '{topic}, 초보가 알아야 할 기본',
      '{topic} 시작 전 체크할 4가지',
      '{topic} 입문 가이드',
    ],
    descs: [
      '{topic}을 처음 다루는 분을 위한 기본 개념, 진행 흐름, 자주 하는 실수까지 정리했습니다.',
      '{topic}에 대해 가장 자주 검색되는 기본 지식을 한 번에 정리했습니다.',
    ],
    tags: ['투자', '재테크'],
  },
  concept: {
    titles: [
      '{topic} 개념과 적용 조건',
      '{topic}, 내게 해당될까',
      '{topic} 한눈에 정리',
    ],
    descs: [
      '{topic}의 기본 개념과 본인에게 해당되는 조건을 정리했습니다.',
      '{topic} 관련 용어와 적용 대상을 한 번에 정리했습니다.',
    ],
    tags: ['개념', '기초'],
  },
  process: {
    titles: [
      '{topic} 신청 절차와 서류',
      '{topic} 진행 흐름 정리',
      '{topic}, 어떻게 신청할까',
    ],
    descs: [
      '{topic}의 신청 절차, 필요 서류, 자주 막히는 부분까지 단계별로 정리했습니다.',
      '{topic}을 진행할 때 알아두면 좋은 흐름과 체크리스트를 안내합니다.',
    ],
    tags: ['신청', '절차'],
  },

  // TECH
  howto: {
    titles: [
      '{topic} 방법 (단계별 가이드)',
      '{topic}, 5분 안에 따라 하기',
      '{topic} 한 번에 정리',
    ],
    descs: [
      '{topic}을 단계별로 따라 할 수 있도록 화면 흐름과 함께 정리했습니다.',
      '{topic} 진행 전 준비, 단계, 막힐 때 점검 사항을 한곳에 모았습니다.',
    ],
    tags: ['방법', '가이드'],
  },
  recommend: {
    titles: [
      '{topic} 고르는 기준',
      '{topic}, 상황별 추천',
      '{topic} 추천과 비교 포인트',
    ],
    descs: [
      '{topic}을 고를 때 자주 확인하는 기준과 상황별 추천 흐름을 정리했습니다.',
      '{topic} 선택 시 놓치기 쉬운 포인트와 초기 설정 팁까지 안내합니다.',
    ],
    tags: ['추천', '비교'],
  },
  security: {
    titles: [
      '{topic} 점검 체크리스트',
      '{topic}, 미리 챙겨두면 좋은 설정',
      '{topic} 사고를 막는 습관',
    ],
    descs: [
      '{topic} 관련해 자주 권장되는 보안 점검 항목과 의심 상황 대처법을 정리했습니다.',
      '{topic} 사고를 예방하기 위해 오늘 바로 점검할 만한 설정들을 안내합니다.',
    ],
    tags: ['보안', '점검'],
  },

  // AUTO
  maint: {
    titles: [
      '{topic} 점검·교체 주기',
      '{topic}, 차주가 알아둘 기본',
      '{topic} 셀프 점검 가이드',
    ],
    descs: [
      '{topic}의 점검 주기, 자가 점검 포인트, 비용 절감 팁까지 정리했습니다.',
      '{topic}을 미루지 말아야 하는 이유와 일반적으로 권장되는 주기를 안내합니다.',
    ],
    tags: ['차량관리', '점검'],
  },
  drive: {
    titles: [
      '{topic} 안전 운전법',
      '{topic}, 초보도 가능한 요령',
      '{topic} 단계별 가이드',
    ],
    descs: [
      '{topic} 상황에서의 운전 요령과 자주 하는 실수, 법규 측면 주의점까지 정리했습니다.',
      '{topic}을 안전하게 통과하는 단계별 흐름을 안내합니다.',
    ],
    tags: ['운전', '안전'],
  },
  used: {
    titles: [
      '{topic} 살 때 체크리스트',
      '{topic} 시승·계약 흐름',
      '{topic}, 호구 안 되는 법',
    ],
    descs: [
      '{topic}을 고를 때 확인할 차량 상태, 시승 포인트, 계약 흐름을 정리했습니다.',
      '{topic} 거래 시 꼭 챙겨야 할 사항을 단계별로 안내합니다.',
    ],
    tags: ['중고차', '계약'],
  },
  feature: {
    titles: [
      '{topic} 기능 이해하기',
      '{topic}, 어떤 상황에서 유용할까',
      '{topic} 활용 가이드',
    ],
    descs: [
      '{topic}의 원리, 활용 상황, 한계와 주의점까지 한 번에 정리했습니다.',
      '{topic}이 운전 중 어떻게 도움이 되는지, 어떤 상황에서 빛을 발하는지 안내합니다.',
    ],
    tags: ['차량기능', '편의'],
  },

  // TRAVEL
  course: {
    titles: [
      '{topic} 추천 코스와 동선',
      '{topic} 1박 2일 일정 예시',
      '{topic} 처음 가도 알차게',
    ],
    descs: [
      '{topic}의 기본 동선, 추천 명소, 맛집·카페와 교통까지 정리했습니다.',
      '{topic}을 알차게 즐길 수 있는 추천 흐름과 시기를 안내합니다.',
    ],
    tags: ['여행', '코스'],
  },
  camping: {
    titles: [
      '{topic} 초보 가이드',
      '{topic} 시작 전 체크',
      '{topic}, 무엇부터 챙길까',
    ],
    descs: [
      '{topic}을 처음 시작할 때 챙겨야 할 장비, 캠핑장 선택 기준, 에티켓까지 정리했습니다.',
      '{topic}을 무리 없이 시작할 수 있도록 단계별로 안내합니다.',
    ],
    tags: ['캠핑', '아웃도어'],
  },
  tip: {
    titles: [
      '{topic} 출발 전 체크리스트',
      '{topic}, 미리 챙기면 편한 것들',
      '{topic} 준비 가이드',
    ],
    descs: [
      '{topic} 전에 미리 챙기면 좋은 항목, 짐 싸기 노하우, 현지 적응 팁까지 정리했습니다.',
      '{topic}을 더 즐겁게 만드는 작은 준비들을 한곳에 모았습니다.',
    ],
    tags: ['여행준비', '체크리스트'],
  },

  // STUDY
  english: {
    titles: [
      '{topic}, 작게 시작하는 법',
      '{topic} 추천 흐름과 자료',
      '{topic} 매일 5분 루틴',
    ],
    descs: [
      '{topic}을 매일 짧게라도 꾸준히 이어갈 수 있도록 흐름, 자료, 슬럼프 대처법까지 정리했습니다.',
      '{topic}을 처음 시작하는 분도 따라 할 수 있는 단계와 도구를 안내합니다.',
    ],
    tags: ['영어', '학습'],
  },
  cert: {
    titles: [
      '{topic} 합격 전략',
      '{topic} 한 달 학습 흐름',
      '{topic} 처음 도전 가이드',
    ],
    descs: [
      '{topic}의 시험 구조, 일반적인 학습 순서, 교재 선택, 당일 팁까지 한 번에 정리했습니다.',
      '{topic} 도전 시 흔히 챙기는 과목 비중과 단계별 계획을 안내합니다.',
    ],
    tags: ['자격증', '시험'],
  },
  method: {
    titles: [
      '{topic} 실전 적용법',
      '{topic}, 루틴으로 만드는 법',
      '{topic} 효과적으로 쓰는 법',
    ],
    descs: [
      '{topic}을 일상에 자리 잡게 만드는 원칙, 루틴, 복습·기록, 슬럼프 다루는 법까지 정리했습니다.',
      '{topic}을 매일 실천 가능한 형태로 풀어 안내합니다.',
    ],
    tags: ['공부법', '루틴'],
  },
  book: {
    titles: [
      '{topic}, 입문~심화 흐름',
      '{topic} 추천 도서와 읽는 법',
      '{topic} 한 달 한 권 추천',
    ],
    descs: [
      '{topic}을 가볍게 시작해 깊이까지 이어갈 수 있는 도서 흐름과 메모법을 정리했습니다.',
      '{topic} 분야에서 자주 추천되는 책의 성격과 독서 환경 만들기를 안내합니다.',
    ],
    tags: ['독서', '책추천'],
  },
  self: {
    titles: [
      '{topic}, 오늘 바로 시작하기',
      '{topic} 한 달 챌린지',
      '{topic} 작은 습관 만들기',
    ],
    descs: [
      '{topic}을 의지에 기대지 않고 오래 가는 습관으로 만드는 작은 장치들을 정리했습니다.',
      '{topic}에 대해 오늘 5분 안에 시작할 수 있는 행동과 한 달 단위 점검 흐름을 안내합니다.',
    ],
    tags: ['자기계발', '습관'],
  },
};

function heroEmojiFor(category, angle) {
  const map = {
    health: { cause: '🧬', symptom: '🩹', prevent: '🛡️', food: '🥗', routine: '🏃' },
    living: { recipe: '🍳', cleaning: '🧽', parenting: '🧸', pets: '🐶' },
    finance: { invest: '📈', concept: '📊', process: '📝' },
    tech: { howto: '⚙️', recommend: '⭐', security: '🔐' },
    auto: { maint: '🔧', drive: '🛣️', used: '🚙', feature: '✨' },
    travel: { course: '🗺️', camping: '⛺', tip: '🧳' },
    study: { english: '🇬🇧', cert: '📜', method: '🧠', book: '📖', self: '🌱' },
  };
  return (map[category] && map[category][angle]) || '📌';
}

function yamlEscape(s) {
  if (s == null) return '';
  if (typeof s !== 'string') return String(s);
  if (/[:#"'\n]/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

function toFrontmatter(fm) {
  const lines = ['---'];
  lines.push(`title: ${yamlEscape(fm.title)}`);
  lines.push(`description: ${yamlEscape(fm.description)}`);
  lines.push(`category: ${fm.category}`);
  if (fm.subcategory) lines.push(`subcategory: ${yamlEscape(fm.subcategory)}`);
  lines.push(`pubDate: ${fm.pubDate}`);
  lines.push(`author: ${yamlEscape(fm.author)}`);
  if (fm.heroEmoji) lines.push(`heroEmoji: ${yamlEscape(fm.heroEmoji)}`);
  if (fm.tags && fm.tags.length) {
    lines.push(`tags:`);
    for (const t of fm.tags) lines.push(`  - ${yamlEscape(t)}`);
  }
  if (fm.tldr && fm.tldr.length) {
    lines.push(`tldr:`);
    for (const t of fm.tldr) lines.push(`  - ${yamlEscape(t)}`);
  }
  if (fm.faqs && fm.faqs.length) {
    lines.push(`faqs:`);
    for (const f of fm.faqs) {
      lines.push(`  - q: ${yamlEscape(f.q)}`);
      lines.push(`    a: ${yamlEscape(f.a)}`);
    }
  }
  if (fm.medical) {
    lines.push(`medical: true`);
  }
  lines.push('---');
  return lines.join('\n');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// manual: true 가 프론트매터에 있는 글은 손으로 다듬은 글이므로 절대 덮어쓰지 않는다.
function hasManualFlag(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const head = fs.readFileSync(filePath, 'utf8').slice(0, 2000);
    return /^manual:\s*true\s*$/m.test(head);
  } catch {
    return false;
  }
}

async function main() {
  if (CLEAN && fs.existsSync(OUT_DIR)) {
    // manual: true 글은 보존하고 나머지만 삭제.
    let removed = 0, kept = 0;
    for (const cat of fs.readdirSync(OUT_DIR)) {
      const catDir = path.join(OUT_DIR, cat);
      if (!fs.statSync(catDir).isDirectory()) continue;
      for (const f of fs.readdirSync(catDir)) {
        const fp = path.join(catDir, f);
        if (hasManualFlag(fp)) { kept += 1; continue; }
        fs.unlinkSync(fp);
        removed += 1;
      }
    }
    console.log(`[clean] removed=${removed} kept-manual=${kept}`);
  }
  ensureDir(OUT_DIR);

  let total = 0;
  let written = 0;
  let skipped = 0;
  const usedSlugs = new Set();

  for (const [category, groups] of Object.entries(PLAN)) {
    const catDir = path.join(OUT_DIR, category);
    ensureDir(catDir);
    for (const [group, def] of Object.entries(groups)) {
      for (const topic of def.source) {
        for (const angle of def.angles) {
          total += 1;
          const seed = `${category}/${group}/${topic}/${angle}`;
          const rng = seedrand(seed);
          const form = ANGLE_FORMS[angle];
          if (!form) {
            console.warn(`! no form for angle=${angle}`);
            skipped += 1;
            continue;
          }
          const title = fixKoreanParticles(replaceTopic(pick(rng, form.titles), topic));
          const description = fixKoreanParticles(replaceTopic(pick(rng, form.descs), topic));
          // 태그는 URL 경로 + 파일 시스템 경로로 모두 사용되므로
          // Windows 예약 문자(<>:"/\|?*) 와 URL 메타 문자(%&#) 모두 제거.
          const sanitizeTag = (s) =>
            s.replace(/[%&?#<>:"/\\|*]/g, '').replace(/\s+/g, ' ').trim();
          const tags = Array.from(
            new Set(
              [
                ...form.tags,
                topic,
                ...(category === 'health' && group === 'diseases' ? ['건강관리'] : []),
                ...(category === 'living' && group === 'recipes' ? ['집밥', '요리'] : []),
                ...(category === 'finance' && group === 'benefits' ? ['정부지원'] : []),
                ...(category === 'travel' && group === 'domestic' ? ['국내여행'] : []),
                ...(category === 'travel' && group === 'abroad' ? ['해외여행'] : []),
              ].map(sanitizeTag).filter(Boolean)
            )
          ).slice(0, 6);

          const pubDate = pubDateFor(seed);
          let slug = `${slugify(topic)}-${angle}`;
          // 충돌 시 카운터 부여
          let i = 2;
          while (usedSlugs.has(`${category}/${slug}`)) {
            slug = `${slugify(topic)}-${angle}-${i++}`;
          }
          usedSlugs.add(`${category}/${slug}`);

          const filename = path.join(catDir, `${slug}.md`);
          // 손으로 다듬은 글(manual: true)은 항상 보존.
          if (hasManualFlag(filename)) {
            skipped += 1;
            continue;
          }
          if (!CLEAN && fs.existsSync(filename)) {
            skipped += 1;
            continue;
          }

          // GEO/SEO 보강 데이터 (frontmatter에 구조화 데이터로 저장)
          const seoRng = seedrand(seed + '/seo');
          const tldr = buildTLDR({ topic, category, angle }).map((s) =>
            replaceTopic(s, topic)
          );
          const faqsRaw = buildFAQs({ topic, category, rng: seoRng });
          const faqs = faqsRaw.slice(0, 6).map((f) => ({
            q: replaceTopic(f.q, topic),
            a: replaceTopic(f.a, topic),
          }));
          const isMedical = category === 'health';

          const fm = {
            title,
            description,
            category,
            subcategory: def.subname,
            tags,
            pubDate,
            author: '헬스픽 검증팀',
            heroEmoji: heroEmojiFor(category, angle),
            tldr,
            faqs,
            medical: isMedical,
          };
          const body = renderBody({ topic, category, sectionKey: angle, rng });
          const md = `${toFrontmatter(fm)}\n\n${body}\n`;

          fs.writeFileSync(filename, md, 'utf8');
          written += 1;
        }
      }
    }
  }

  console.log(`✅ done. total=${total} written=${written} skipped(existing)=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
