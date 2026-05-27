# healthpick.kr 일일 컨텐츠 생성 — Windows 작업 스케줄러용 진입 스크립트.
#
# 매일 아침 정해진 시간에 Claude Code 를 headless 모드(-p)로 실행해
# 최신 뉴스 기반 10개 글을 생성하고 git push 까지 한다.
#
# 등록: scripts/register-daily-task.ps1 한 번 실행.
# 수동 테스트: pwsh -File scripts/daily-content.ps1

# PS 5.1 에서 native 명령 stderr 를 ErrorRecord 로 wrapping 하는 동작이 있어
# `Stop` 로 두면 claude 가 정상이어도 stderr 한 줄에 스크립트가 중단된다.
# 작업이 끝까지 가도록 Continue 로 두고, 진짜 에러는 try/catch 로만 다룬다.
$ErrorActionPreference = 'Continue'
$RepoDir = 'C:\Users\R\Dropbox\healthpick'
# 로그 폴더는 Dropbox 외부 — repo 안 logs/ 는 Dropbox sync 가 새 파일 생성마다 lock 잡아서
# Out-File·Add-Content 가 IOException 으로 손실. ADS(com.dropbox.ignored) 박기는 timing 으로 실패.
# Dropbox 외부 폴더면 동기화 자체가 없어서 lock 충돌 0.
$LogDir  = 'C:\Users\R\healthpick-logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Stamp   = Get-Date -Format 'yyyyMMdd-HHmm'
$LogFile = Join-Path $LogDir "daily-$Stamp.log"

# Claude headless prompt — 컨텍스트가 0인 상태에서 실행되므로 자체 완결적이어야 한다.
$Prompt = @'
healthpick.kr 일일 컨텐츠 생성 작업입니다. 다음 단계를 자율적으로 수행하세요.

**프로젝트 컨텍스트**:
- 경로: C:\Users\R\Dropbox\healthpick (현재 working directory)
- Astro 4.16 + Tailwind, GitHub yhstella/healthpick, Vercel 자동 배포
- 카테고리 7개: health, living, finance, tech, auto, travel, study
- 글 형식: 한글 4,000~5,000자 Markdown
- 글 위치: src/content/articles/{category}/{slug}.md
- 스키마는 src/content/config.ts 참고 (title, description, category, tags, pubDate, author, tldr, faqs, sources, medical, manual 등)

**사이트 정체성 (반드시 준수)**:
"한 줄 검색이 안 되는 실제 상황에 답하는 생활 가이드". 대형 사이트(병원·언론·공공기관)와 흔한 키워드로 경쟁하지 않는다.
실제 사용자가 검색창에 치는 구체적 문장 (long-tail 질문) 들에서 3~10등을 노린다.

**작업 (총 40편 — Part A 20편 + Part B 20편)**:

**Part A — 실제 검색 문장형 long-tail 20편**:
실제 사람들이 검색창에 치는 구체적인 질문 문장을 토픽으로. 다음과 같은 스타일:
- "건강검진에서 ALT 80이면 바로 병원 가야 하나요?"
- "공복혈당 105인데 당뇨 전단계인가요?"
- "혈압 145/90 약 먹어야 하나요?"
- "자동차 배터리 방전됐는데 보험 부르면 보험료 오르나요?"
- "실비보험 청구했는데 보험료가 오르나요?"
- "쿠팡 와우 해지하면 이미 받은 무료배송은 어떻게 되나요?"
- "아이폰 저장공간 줄였는데 사진이 사라졌어요"
- "전세 만기 전 이사하면 중개수수료 누가 내나요?"
- "어린이집 대기 신청은 언제부터 해야 하나요?"
- "인천공항 새벽 비행기면 전날 가야 하나요?"

**절대 피할 글감 (scaled content abuse 의심)**:
- "OOO 효능 10가지", "OOO 추천 순위", "OOO란 무엇인가"
- "건강에 좋은 음식", "부자 되는 습관", "고혈압 예방 7가지" 같은 일반론
- 단순 정의·요약형 — 구체적 상황·수치·맥락 있는 질문만
- **같은 핵심 키워드(예: "갤럭시 S26", "공복혈당", "ISA", "ALT")가 같은 라운드에서 2편 초과 금지**
  (2026-05-27 사례: S26 글이 한 라운드에서 3편 양산됨 — 주제 다양성 ↓)

**🧭 글감 선정 전 self-check — 주제 중복 회피 (필수 절차)**:
Part A·Part B 어느 쪽이든 글감을 정하기 전에 다음 단계를 거친다. 글마다 따로가 아니라
**라운드 시작 시 한 번에** 40편 전체 글감 후보를 정리한 뒤 self-check.

1. **기존 글 키워드 인벤토리**: 각 카테고리 폴더에서 `Glob` 으로 모든 slug 를 가져와
   **핵심 키워드 빈도표**를 머릿속에 만든다. 예:
   - health/ 안에 "공복혈당-XXX" 슬러그 3편 → "공복혈당" 키워드 포화 → 이번 라운드 회피
   - tech/ 안에 "S26-XXX" 슬러그 1편 + 후보 풀에 S26 글이 3편 → 2편으로 줄이거나 다른 모델/주제로 분산
2. **이번 라운드 후보 40편 title 만 먼저 한 번에 나열**한다. 그 안에서 다음을 체크:
   - 같은 핵심 키워드가 **3편 이상** 등장 → 줄이거나 angle 변경
   - 같은 시나리오 (예: "약 시작 시점") 가 카테고리별 반복 → 다른 시나리오로 교체
3. **angle 다양화 (같은 키워드라도 다른 각도)**:
   - 진단 / 비교 / 비용 / 시점 / 후속관리 / 부작용 / 가족·직장 영향 / 보험 처리 / 절차·서류
   - 예: "공복혈당 113" 글이 이미 있다면 → "공복혈당 113 가족력 있을 때 약 시작 시점" 처럼
     **수치는 다르고 angle 도 명확히 분리**된 형태로만
4. 후보 정리 완료 후에만 글 본문 작성 단계로 진입.

**🔬 디테일 강도 — 시나리오 기반 글감 정의 (필수)**:
title 은 **단순 수치 1차원 X**, **수치 + 구체 시나리오 변수 2차원 이상**으로.

- ❌ 약한 title (수치만, 시나리오 변수 없음):
  - "공복혈당 113 어떻게 해야 하나요?"
  - "ALT 80이면 병원 가야 하나요?"
  - "ISA 만기 어떻게 처리하나요?"
- ✅ 좋은 title (수치 + 시나리오 변수):
  - "공복혈당 113 + **가족력 있고 BMI 26**, 약 시작 시점은?"
  - "ALT 80 + **무증상 + 음주 안 함**, 추가 검사 순서는?"
  - "ISA 만기 1억 + **연금 이전 vs 일시 인출**, 5년 후 세금 차이"

본문도 동일:
- 일반론 ("공복혈당 113은 당뇨 전단계입니다") **1~2문장**만 두고
- 나머지는 **구체 시나리오별 분기**:
  - "가족력 있는 경우 → 6개월 안에 OGTT 권장"
  - "BMI 25 이상 → 체중 7% 감량이 약물 시작 지연 가장 큰 변수"
  - "비만 없고 가족력 없음 → 1년 후 재검 + 식이만"
- "예외 상황", "비용·위험·주의점" 섹션을 **시나리오 분기 표** 또는 **번호 매긴 케이스**로 채움
  (단순 리스트 X → 케이스별 메커니즘·이유·결정 포인트 설명)

**카테고리 분포 (Part A)**: health 6, finance 4, tech 4, living 2, travel 2, study 1, auto 1.
기존 src/content/articles/{category}/ slug 와 중복 없게 (Glob 으로 확인 필수).

**Part B — 오늘 뉴스 기반 long-tail 20편**:
1. WebSearch 8~12회로 오늘자 한국 트렌딩 이슈·정책·발표 조사 (영역별로 분산: 건강·경제/금융·세금·복지·교통·IT·교육·여행/항공)
2. 뉴스가 일으킨 사용자 의문을 long-tail 질문 형태로 토픽화:
   - "건강보험료 인상 발표됐는데 내 자동이체 금액 언제 바뀌나요?"
   - "X 지원금 신청 마감 며칠 남았나요"
   - "정책 X 가 발표됐는데 우리 집은 해당되나요"
   (정책 보도 X — 사용자가 정말 검색할 만한 의문 형태로)
3. 카테고리 분포는 뉴스 흐름에 따라 자유.

**글 구조 — 모든 글 통일 (사이트 일관성)**:
1. **결론 먼저** — 1~2 문장으로 답을 줌
2. **언제 해당되는지** — 적용 조건
3. **예외 상황** — 안 해당되거나 다르게 적용되는 경우
4. **비용·위험·주의점** — 구체 수치, 발생 가능 문제
5. **자주 묻는 질문** — 4~5개 Q&A
6. **참고 자료** — 1차 출처 2~3개

3. 각 글을 Write 도구로 작성 (generate-content.mjs 사용 X):

   - **파일명(slug) — 반드시 한글로** (🚨 절대 로마자 단어 사용 금지, 위반 시 글 폐기 + 재작성):

     **🛑 Write 도구 호출 전 self-check (필수)**:
     각 글의 slug 를 정하기 전에 다음 절차를 거친다.
     (a) 질문에서 핵심 키워드 3~5 단어 추출 (한국어로)
     (b) 한글-숫자-하이픈으로 slug 조립
     (c) slug 를 다시 읽어보고, **영어 일반 단어**(아래 차단 리스트 참고)가 있으면 멈추고 (b) 부터 재작업
     (d) 통과하면 Write 호출

     **🚫 차단된 영어 일반 단어 (slug 에 들어가면 자동 폐기 — 절대 사용 금지)**:
     fatty, liver, engine, oil, comfort, fuel, pressure, oversupply, shortage,
     livelihood, benefit, multi, home, tax, exemption, isa, maturity, pension,
     transfer, strategy, relief, payment, minimum, wage, conversion, year,
     end, medical, parents, deduction, watch, switch, hospital, visit, schedule,
     mistakes, schedule, first, time, before, after, when, where, what, how,
     이외 일반 영어 단어 전부.

     **✅ 허용 영어 (slug 안에 그대로 둘 수 있는 약어/제품명/단위만)**:
     ALT, AST, BMI, ABS, EV, ETF, ETC, FAQ, GDP, IT, USB-C, USB, iPhone, MRI,
     NASH, CT, MRI, X-ray, AI, EV6, M1, M2, ChatGPT, GPT, 또는 명백한 차종명(BMW, Tesla 등).
     숫자·단위: 5000km, 145·90, 2단계, 2026, 30대, 1억 OK.

     **좋은 예 (한글 slug)**:
     - `src/content/articles/health/건강검진-alt-80.md`
     - `src/content/articles/auto/엔진오일-5천-vs-1만-신차보증.md`
     - `src/content/articles/finance/생계급여-2026-1인-82만원.md`
     - `src/content/articles/auto/타이어공기압-32-vs-35-승차감-연비.md`
     - `src/content/articles/finance/isa-만기-연금-이전-전략.md` (ISA 는 약어 OK)
     - `src/content/articles/health/공복혈당-113-첫-검진.md`

     **잘못된 예 (전부 로마자 — 절대 금지, 위반 시 글 폐기)**:
     - `fatty-liver-grade2-no-symptoms-watch.md` ← 'fatty', 'liver', 'watch' 영어 단어
     - `engine-oil-5000-vs-10000.md` ← 'engine', 'oil' 영어 단어
     - `ev-oversupply-ice-shortage-2026.md` ← 'oversupply', 'shortage' 영어 단어
     - `tire-pressure-32-vs-35-comfort-fuel.md` ← 'tire', 'pressure', 'comfort', 'fuel' 영어 단어
     - `livelihood-benefit-2026-1-person-821000.md` ← 'livelihood', 'benefit', 'person' 영어 단어
     - `isa-maturity-pension-transfer-strategy.md` ← 'maturity', 'pension', 'transfer', 'strategy' 영어 단어
     - `multi-home-tax-exemption-2026.md` ← 'multi', 'home', 'tax', 'exemption' 영어 단어
     - `year-end-tax-medical-parents-deduction.md` ← 모두 영어 단어
     이런 패턴 다시 만들어내면 **헬스픽 SEO 정책 위반** (한글 검색 결과 URL 가독성 ↓).

     - Windows·git 호환 문자만: 한글·영문약어·숫자·하이픈. `:` `/` `\` `?` `*` `"` `<` `>` `|` 금지

   - 프론트매터:
     - title(40~70자) — 진짜 질문 문장 또는 그것의 답을 줄 형태
     - description(80~150자) — 결론 짧게
     - category, tags 3~5개, pubDate(오늘 ISO),
     - author '헬스픽 검증팀', tldr 3~4개 (결론 핵심), faqs 4~5개, sources 2~3개,
     - manual:true, medical:true(health 만)

   - **본문 구조 — 정확히 이 6개 H2 만, 정확히 이 순서대로, 정확히 이 제목으로** (다른 제목·다른 순서·추가 H2 금지):
     ## 결론부터
     (1~2 문장으로 답)
     ## 언제 해당되나
     (적용 조건)
     ## 예외 상황
     (안 해당되거나 다르게 적용되는 경우)
     ## 비용·위험·주의점
     (구체 수치, 발생 가능 문제)
     ## 자주 묻는 질문
     (4~5개 Q&A)
     ## 참고 자료
     (1차 출처 2~3개)

     ※ "한눈에 보기", "왜 이 질문이 생길까", "핵심 답변" 같은 다른 제목 절대 금지.
     ※ H3(###)는 각 H2 섹션 안에서 자유롭게 사용.

   - **분량·깊이** (각 섹션별 최소 한글자 수 — 글 전체 4500자 이상 5500자 이하):
     - ## 결론부터: 150~250자 (1~2 문장)
     - ## 언제 해당되나: 700~1000자, 적용 조건 4~6개 항목 (각 항목 100자 이상)
     - ## 예외 상황: 700~1000자, 예외 케이스 3~5개 (각 케이스 메커니즘·이유 설명 포함)
     - ## 비용·위험·주의점: 1000~1500자, **반드시 구체 수치 4개 이상 포함** (금액·확률·기간·임계치). 단순 정의 X — 실제 발생 가능 결과·금액·기간을 적시
     - ## 자주 묻는 질문: 4~5개, 각 답변 300~450자 (단답·1줄 답변 금지)
     - ## 참고 자료: 1차 출처 2~3개 + 50자 안내

   - **출처 다양성·신뢰도**: sources 는 정부기관(질병관리청·국세청·고용노동부·금융감독원 등), 전문학회(대한○○학회), 공식 가이드라인(WHO·KDCA·KASL 등), 1차 통계(통계청·KOSIS) 우선. 일반 매체·블로그·개인 자료 인용 금지.

   - **본문 톤**:
     - 차분한 정보 톤 — 응급의학·임상가이드라인·세무가이드 같은 권위 톤
     - 행동 가이드 중심 — "지방간이란 ..."류 교과서적 정의는 1~2문장으로 끝내고, 나머지는 "이런 상황이면 → 이렇게" 형태
     - 메타 자기 언급 금지: "이 글은 ...을 정리합니다", "왜 이 질문이 생길까", "이런 분들이 검색합니다" 같은 자기참조형 문단 절대 금지
     - 1인칭·2인칭 톤 자제 ("당신", "여러분" 사용 자제, 대신 "독자", "환자", "운전자" 같은 3인칭)
     - 통계·수치 인용 시 본문에 출처 inline 명시: 예) "질병관리청 2024 집계 기준 5~9월 온열질환자의 53%가 야외 작업 중 발생"
     - '오류', '잘못' 등 자사 신뢰도 깎는 표현 금지
     - "수많은", "정말", "매우", "굉장히" 등 광고형 부풀림 표현 자제

   - **강조(`**bold**`) 사용법 — 글 전체에 5~10군데만**:
     사이트 CSS 가 `**bold**` 를 한 호흡 큰 글자 + 진한 색으로 렌더하므로, 본문 스캔 시 시각적으로
     눈에 띄게 만들 핵심 데이터만 골라서 굵게 표시한다.

     **강조해야 할 것 (✅ 굵게)**:
     - 결정적 수치·임계치: **ALT 80 IU/L**, **공복혈당 126 mg/dL**, **체중 7% 감량**
     - 금액·기간 기준: **월 5만원**, **14일 이내**, **2027년 말까지**
     - 핵심 조건 1~2단어: **무증상이라도**, **세대주 동의 없이**, **소득 6,000만원 이하**
     - 의사·기관 의뢰 시점: **즉시 전문의 진료**, **6개월 후 재검사**

     **강조하면 안 되는 것 (❌ 굵게 X)**:
     - 일반 명사·동사 ("진료", "검사", "신청")
     - 섹션 도입 문장 전체
     - 단순 부연 설명
     - 한 문단에 3개 이상

     **분포 가이드**: H2 섹션당 1~3개. 글 전체 5~10개. 너무 많으면 강조 효과 사라짐.

   - **이모티콘 사용법 — 글 전체에 3~6개만, 소량으로 가볍게**:
     YMYL(건강·돈·법률) 도메인이라 권위 톤을 유지하되, 가벼운 호흡을 위해 의미상 어울리는 자리
     에만 소량으로 사용. 너무 많으면 신뢰도 ↓.

     **사용 가능한 이모티콘 (의미별)**:
     - ⚠️ 경고·주의·위험 (한 글 1~2개) — 예: "건강검진 결과를 임의로 해석하지 마세요 ⚠️"
     - 💡 팁·인사이트·작은 깨달음 — 예: "공복 시간을 8시간 이상 유지하면 정확도 ↑ 💡"
     - ❗ 강한 환기·핵심 포인트 — 예: "14일이 지나면 과태료 부과 대상입니다 ❗"
     - 😊 안심·완화 — 예: "대부분은 추적관찰만으로 충분히 안정됩니다 😊"
     - 😮 놀라운 사실·반전 데이터 — 예: "ALT 80이라도 절반 이상은 1년 안에 정상화됩니다 😮"
     - ❤️ 가족·반려·정서 맥락 (육아·간병·정서 글에서만) — 예: "함께 사는 가족도 같이 검진받기 ❤️"
     - ✅ 권장 행동 / ❌ 비권장 — 비교 표나 체크리스트에서만
     - 💰 금액·비용 / ⏰ 기간·시점 — 핵심 수치 옆에 한 번씩

     **위치 가이드**:
     - 본문 평문 안 핵심 문장 끝에 한 호흡씩 (예: "... 안전합니다 ⚠️")
     - 강조 `**bold**` 뒤에 같이 — 예: "**즉시 119에 신고** ❗"
     - 리스트 아이템 첫머리 — 예: "- 💡 매일 같은 시간에 측정"
     - **H2/H3 헤더에는 절대 사용 X** (deterministic 6섹션 구조 유지)
     - frontmatter 의 title·tldr·faqs 에는 사용 X (검색 결과 page snippet 가독성)

     **분포 가이드**: 글 전체에 3~6개. 한 문단에 2개 이상 X. 같은 이모티콘 반복 X.
     의료 응급·법적 의무·경고 글에서는 😊·❤️ 같은 가벼운 톤 자제 — ⚠️·❗ 위주.

   **YAML frontmatter 안전 규칙 — Astro 빌드 실패 방지 (반드시 준수)**:
   a. `tags`, `tldr` 항목 중 숫자만 있는 값(예: 2026)은 반드시 큰따옴표:
      - 잘못: `- 2026`  → YAML이 숫자로 파싱 → schema 거절
      - 맞음: `- "2026"`
   a-2. **`tags` 항목에 슬래시(`/`) 절대 금지** — /tag/[tag] 라우트 파라미터가 슬래시를 path 구분자로 인식 → 빌드 시 "Missing parameter: tag" 에러로 production 배포 전체 fail:
      - 잘못: `- "구글 I/O"`, `- "5G/LTE"`, `- "AC/DC"`
      - 맞음: `- "구글 IO"`, `- "5G LTE"`, `- "AC DC"`
      - 슬래시 외 라우트 위험 문자도 회피: `?`, `#`, `&`, `\`
   b. 항목 안에 콜론(`:`) + 공백이 들어가면 YAML 매핑으로 오해 → 큰따옴표로 감싼다:
      - 잘못: `- 6단계 흐름: 분석 → 본인 자료...`  → 객체로 파싱
      - 맞음: `- "6단계 흐름: 분석 → 본인 자료..."`
   c. title 에 큰따옴표(`"`)나 콜론이 들어가면 외부 큰따옴표로 감싸고 안쪽은 작은따옴표 사용:
      - 잘못: `title: "고혈압 "사일런트 킬러" 의 정체"`
      - 맞음: `title: "고혈압 '사일런트 킬러'의 정체"`
   d. tldr·faqs 각 항목은 한 줄로 작성 (YAML 들여쓰기 오류 방지)
   e. sources 의 url 은 반드시 `https://` 로 시작하는 유효한 URL (z.string().url() 검사)
   f. category 는 반드시 health/living/finance/tech/auto/travel/study 중 하나 (오타 금지)
   g. 작업 마지막에 `npx astro build` 실행해 frontmatter 에러 없는지 검증한 뒤에만
      commit/push. 에러 있으면 해당 글 수정 후 재검증.

4. 배포: 다음 명령으로 commit + push (Vercel 자동 배포). 명령은 모두 bash 안에서 실행되므로
   bash 의 명령 치환 문법 `$(...)` 을 사용하세요 (PowerShell 의 `$(Get-Date)` 가 아닙니다):
     git add src/content/articles/
     git commit -m "$(date +%Y-%m-%d) 일일 자동 컨텐츠 40편 추가 (랜덤 20 + 뉴스 20)"
     git push

5. 마지막에 생성한 40편 글의 title 목록을 [랜덤 20] / [뉴스 20] 으로 구분해 출력해 주세요.
'@

# Claude CLI 호출 — 허용 도구 화이트리스트 방식.
# bypassPermissions 안 씀: 위험 도구는 자동으로 막힌다.
Set-Location $RepoDir

# 주의: PS 5.1 의 native command argument escaping 버그로, allowed-tools 값 안에
# `--no-install` 같이 하이픈으로 시작하는 토큰이 들어가면 claude.exe 가 자기 옵션으로
# 오인해 exit 1. 따라서 패턴에서 dash-flag 는 빼고, prompt 쪽에서 사용 명령 형태만 안내.
$AllowedTools = 'Write Edit Read Glob Grep WebSearch WebFetch "Bash(git add:*)" "Bash(git commit:*)" "Bash(git push)" "Bash(git status:*)" "Bash(git diff:*)" "Bash(npx astro:*)" "Bash(node scripts/migrate-slugs.mjs:*)"'

# 시작 헤더를 먼저 로그에 적어 둠. $LogDir 이 Dropbox 외부라 lock 충돌 없음.
"=== healthpick daily-content run @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" |
  Out-File -FilePath $LogFile -Encoding UTF8

# prompt 는 stdin 으로 — PS 5.1 native argument escaping 우회.
$claudeExe = 'C:\Users\R\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\claude.exe'
if (-not (Test-Path $claudeExe)) { $claudeExe = 'claude' }  # PATH fallback

# claude 호출 — 출력은 ForEach-Object 로 한 줄씩 파일에 흘려보냄(UTF-8 유지).
# 이렇게 하면 작업이 도중에 죽어도(예: TASK_TERMINATED_BY_USER) 진행 로그가 파일에 남는다.
# 기존 구조($claudeOut 변수에 일괄 캡쳐 → 마지막에 한번 Add-Content)는 도중 종료 시 전부 유실됨.
# Tee-Object 는 PS 5.1 에서 Unicode(UTF-16) 로 쓰므로 헤더의 UTF-8 과 인코딩이 충돌 → 사용 안 함.
$claudeExit = 0
try {
  $Prompt | & $claudeExe `
    -p `
    --allowed-tools $AllowedTools `
    --max-budget-usd 25 `
    --output-format text `
    --model opus 2>&1 |
    ForEach-Object {
      # SilentlyContinue 로 Dropbox lock 충돌 시 한 라인 손실해도 흐름 유지
      Add-Content -Path $LogFile -Value $_ -Encoding UTF8 -ErrorAction SilentlyContinue
    }
  $claudeExit = $LASTEXITCODE
} catch {
  Add-Content -Path $LogFile -Value "`n--- PS exception while running claude: $_ ---" -Encoding UTF8
  $claudeExit = 99
}

Add-Content -Path $LogFile -Value "`n--- claude exit code: $claudeExit ---" -Encoding UTF8
Add-Content -Path $LogFile -Value "--- claude finished @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" -Encoding UTF8

# 안전망: claude 가 commit/push 까지 못 갔어도, 새로 생성된 글이 있으면 여기서 보낸다.
# (실제 사례: 2026-05-21 07:02 trigger 가 28분 동안 글 20편 만들고 commit 직전 외부 종료됨
#  → 모든 작업이 untracked 로 남아 사용자가 직접 확인하기 전까진 사이트에 안 올라감)
try {
  Push-Location $RepoDir
  $untracked = & git ls-files --others --exclude-standard -- 'src/content/articles/'
  $modified  = & git diff --name-only --diff-filter=M -- 'src/content/articles/'
  $newOrChanged = @($untracked) + @($modified) | Where-Object { $_ }
  if ($newOrChanged.Count -gt 0) {
    Add-Content -Path $LogFile -Value "--- safety-net: $($newOrChanged.Count) article(s) not committed by claude — committing now ---" -Encoding UTF8
    & git add 'src/content/articles/' 2>&1 | Out-Null
    $msg = "$(Get-Date -Format 'yyyy-MM-dd') 일일 자동 컨텐츠 (safety-net commit, claude exit=$claudeExit)"
    $commitOut = & git commit -m $msg 2>&1
    Add-Content -Path $LogFile -Value $commitOut -Encoding UTF8
    # push 전 rebase — 다른 자동화(예: weekly SEO trends GitHub Actions)가 같은 ref 에 push
    # 했을 수 있으니 fast-forward fail 방지. 충돌 가능성은 0에 가까움 (자동화들이 건드는 파일
    # 영역 분리: 우리 = src/content/articles/, trends = docs/seo-trends-log.md).
    # 실제 사례: 2026-05-26 06:00 trigger 가 글 40편 commit 후 push 단계에서 rejected
    # ("Updates were rejected ... fetch first") → 글이 GitHub 까지 못 감.
    $pullOut = & git pull --rebase origin main 2>&1
    Add-Content -Path $LogFile -Value $pullOut -Encoding UTF8
    $pushOut = & git push 2>&1
    Add-Content -Path $LogFile -Value $pushOut -Encoding UTF8
    Add-Content -Path $LogFile -Value "--- safety-net push done ---" -Encoding UTF8
  } else {
    Add-Content -Path $LogFile -Value "--- safety-net: no uncommitted articles (claude already pushed) ---" -Encoding UTF8
  }

  # 2차 안전망: claude 가 prompt 의 "한글 slug 강제" 룰을 무시하는 알려진 함정 대비.
  # migrate-slugs.mjs 는 한글이 없는 slug 만 변환 대상으로 잡고, vercel.json 에 301 redirect
  # 를 append 한다(2026-05-27 fix 이후 기존 redirects 보존). 변환 0편이면 git status 변화 없어
  # commit 안 함. 2026-05-27 사례: 40편 전부 영문 slug 양산 → 수동 cleanup 60편 발생.
  Add-Content -Path $LogFile -Value "--- safety-net: running migrate-slugs.mjs ---" -Encoding UTF8
  $migrateOut = & node scripts/migrate-slugs.mjs 2>&1
  Add-Content -Path $LogFile -Value $migrateOut -Encoding UTF8
  $slugChanges = & git status --porcelain -- 'src/content/articles/' 'vercel.json' 2>&1
  if ($slugChanges) {
    Add-Content -Path $LogFile -Value "--- safety-net: slug migration produced changes — committing ---" -Encoding UTF8
    & git add 'src/content/articles/' 'vercel.json' 2>&1 | Out-Null
    $slugMsg = "$(Get-Date -Format 'yyyy-MM-dd') chore(slug): auto-migrate romanized slugs"
    $slugCommitOut = & git commit -m $slugMsg 2>&1
    Add-Content -Path $LogFile -Value $slugCommitOut -Encoding UTF8
    $slugPullOut = & git pull --rebase origin main 2>&1
    Add-Content -Path $LogFile -Value $slugPullOut -Encoding UTF8
    $slugPushOut = & git push 2>&1
    Add-Content -Path $LogFile -Value $slugPushOut -Encoding UTF8
    Add-Content -Path $LogFile -Value "--- safety-net: slug migration push done ---" -Encoding UTF8
  } else {
    Add-Content -Path $LogFile -Value "--- safety-net: no romanized slugs found, skip migration commit ---" -Encoding UTF8
  }
} catch {
  Add-Content -Path $LogFile -Value "--- safety-net error: $_ ---" -Encoding UTF8
} finally {
  Pop-Location
}

Add-Content -Path $LogFile -Value "--- script finished @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" -Encoding UTF8

# 오래된 로그 정리 (30일 이상)
Get-ChildItem $LogDir -Filter "daily-*.log" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

# Windows Task Scheduler 에 "성공/실패" 정확히 보고.
exit $claudeExit
