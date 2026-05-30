# dousuru.net 인계장 (healthpick.kr 일본판)

작성일: 2026-05-25 / 도메인 확정: 2026-05-25
기반 프로젝트: healthpick.kr (C:\Users\R\Dropbox\healthpick)
목적: 한국판 healthpick.kr 의 구조·자동화·SEO 노하우를 그대로 살린 **일본 시장용 자매 사이트** 런칭.

**확정 사항**
- 도메인: `dousuru.net` (Gabia 등록 완료, 2026-05-25)
- 사이트 컨셉: "どうする？" — 일본인이 생활 속 문제를 맞닥뜨렸을 때 치는 검색어 그대로
- 폴더: `C:\Users\R\Dropbox\dousuru`
- GitHub repo: `yhstella/dousuru`
- 로그 폴더: `C:\Users\R\dousuru-logs` (Dropbox 외부 필수)

---

## 0. 한 줄 요약

> 한국판과 **별도 repo · 별도 Vercel · 별도 도메인(dousuru.net)**으로 분리하고, 코드만 fork → 컨텐츠/UI/자동화는 모두 일본어로 재구축. 단순 번역 사이트가 아니라 "일본인이 실제로 구글에 치는 long-tail 질문(どうする系)"에 답하는 사이트로 설계.

---

## 1. 첫 세션에서 사용자 확인이 필요한 결정 (Phase 0)

작업 시작 전에 **반드시 사용자에게 물어볼 것**. 추측 금지.

| 항목 | 옵션 | 메모 |
|---|---|---|
| **사이트 이름** | ✅ `どうする？` 확정 추천 (도메인 컨셉 일치) / 편집부명: `どうする？編集部` | 도메인 dousuru.net 과 1:1 매핑. 카타카나 브랜드 불필요 |
| **도메인** | ✅ `dousuru.net` (Gabia 등록 완료) | — |
| **카테고리 7개 유지 여부** | 한국판 그대로 / 일본 시장 맞춰 재편 | `auto(車検)`, `finance(税・年金)`, `study(資格)` 등 일본판은 의미·세부 다름 |
| **저자/팀명** | `HealthPick 編集部` / `くらしピック編集部` / 익명 | 한국판은 '헬스픽 검증팀'. YMYL 신뢰도용 |
| **첫 컨텐츠 시작 시점** | 코드 인프라 완성 후 한 번에 / 인프라 + 수동 5편 → 자동화 | 사이트 톤 확정용 manual 글 추천 |
| **일본 시장 진출 동기** | 단순 확장 / 특정 키워드 시장 노림 / GLP-1·위마로그 일본 진출 연계 | 컨텐츠 우선순위에 영향 |
| **AdSense/GA4** | 한국판 계정 그대로 / 일본 신규 | 도메인 다르면 신규 등록 권장 |

→ 위 항목 답 받은 뒤 Phase 1 시작.

---

## 2. 권장 아키텍처

### 폴더/Repo 구조
```
C:\Users\R\Dropbox\healthpick           ← 한국판 (그대로)
C:\Users\R\Dropbox\dousuru             ← 일본판 (신규)

GitHub: yhstella/healthpick             ← 한국판
GitHub: yhstella/dousuru               ← 일본판 (신규)

Vercel: healthpick                      ← 한국판 (healthpick.kr)
Vercel: dousuru                         ← 일본판 (dousuru.net)

로그: C:\Users\R\dousuru-logs          ← Dropbox 외부 필수
```

**왜 monorepo 가 아닌가**: 컨텐츠가 완전히 다르고 (3,793편 한글 → 0편 일본어), 빌드 타임/배포 주기/자동화 스케줄 모두 분리하는 게 깔끔. monorepo 의 장점인 "공통 컴포넌트 재사용" 은 코드 양이 작아 큰 이득 없음. 분기 후 두 사이트가 독립적으로 진화하게 둠.

### 분리 vs 공유
| 영역 | 한국판과 공유? |
|---|---|
| Astro 컴포넌트 코드 | **fork 후 분리** (i18n 분기 X — 사이트 자체 분리) |
| 글 컨텐츠 | 완전 분리 |
| daily-content.ps1 자동화 | 별도 스크립트 (HealthpickJpDailyContent task) |
| GitHub repo | 별도 |
| Vercel 프로젝트 | 별도 |
| AdSense/GA4 | 별도 권장 |
| 도메인 | 별도 |

---

## 3. Phase 별 실행 계획

### Phase 1 — 코드 베이스 복제 (예상 1세션)
1. `C:\Users\R\Dropbox\healthpick` → `C:\Users\R\Dropbox\dousuru` 복사 (`node_modules`, `dist`, `logs`, `.git`, `src/content/articles/*` 제외)
2. `cd dousuru && git init && git add . && git commit`
3. GitHub 신규 repo `yhstella/dousuru` 생성 + remote 연결 + push
4. `npm install` → `npm run dev` 로 로컬 기동 확인

### Phase 2 — i18n / 일본어화 (예상 1~2세션)
**파일별 변경 체크리스트** (한국어 → 일본어):

- `src/lib/site.ts` — 전부 일본어로
  - `name: 'ヘルスピック'` (또는 결정 이름)
  - `tagline`, `description` 일본어
  - `locale: 'ja_JP'`
  - `author: 'HealthPick編集部'`
  - `contactEmail: 'info@dousuru.net'`
  - `editorialPrinciples` 4개 항목 일본어
  - `gsc`/`naverSearchAdvisor` 신규 발급 (Naver 는 일본 X → 제거)
  - `adsense.clientId`, `ga4` 일본 신규 (또는 임시 비활성화)
- `src/lib/site.ts` `CATEGORIES` 7개 — name/description 일본어, emoji 유지
  - 예시 매핑:
    - `health` → `健康` `健康・医療`
    - `living` → `くらし` `家事・育児・ペット`
    - `finance` → `お金` `投資・税金・年金・補助金`
    - `tech` → `IT・デジタル`
    - `auto` → `クルマ` `車検・整備・運転`
    - `travel` → `旅行` `国内・海外・キャンプ`
    - `study` → `学び` `資格・語学・自己啓発`
- `src/layouts/BaseLayout.astro`
  - `<html lang="ja">`
  - og image alt 일본어 fallback
  - GSC/Naver 인증 코드 교체 (Naver 메타 제거)
- `src/components/Header.astro`, `Footer.astro` — 네비/저작권/링크 텍스트 일본어
- `src/pages/about.astro`, `contact.astro`, `disclaimer.astro`, `privacy.astro` — 본문 일본어 + 일본 법령 기준 (개인정보보호법, 의료광고 가이드라인)
- `src/pages/index.astro` — 메인 카피 일본어
- `src/content/config.ts` — `author.default` 를 일본어 팀명으로
- `tailwind.config.cjs` — `@fontsource/noto-sans-kr` → `@fontsource/noto-sans-jp` 교체 (package.json 도 같이)
- `astro.config.mjs` — `SITE = 'https://dousuru.net'` (또는 확정 도메인)
- `package.json` — `"name": "dousuru"`
- `vercel.json` — 필요 시 region `icn1` → `hnd1` (도쿄)
- `public/favicon.svg`, `public/og-default.png` — 일본판 디자인 (당장은 그대로 두고 나중)
- 카테고리 폴더 `src/content/articles/{health,living,...}` — 폴더만 유지, 한국판 글 전부 제외하고 빈 상태로 시작

**조심할 함정** (한국판 경험):
- YAML frontmatter — 숫자만 있는 tag 는 따옴표 필수 (`"2026"`)
- title 안의 콜론/큰따옴표 — 외부는 큰따옴표, 안쪽은 작은따옴표
- `npx astro build` 가 통과해야만 commit

### Phase 3 — 수동 시드 글 5~10편 (예상 1~2세션)
일본 사이트 톤·구조를 확정할 manual 글. 자동화 시작 전에 반드시 사람이 검수.

**수동 글 작성 가이드**:
- 6섹션 구조 (한국판과 동일):
  - `## 結論から先に`
  - `## どんな場合に当てはまるか`
  - `## 例外的なケース`
  - `## 費用・リスク・注意点`
  - `## よくある質問`
  - `## 参考資料`
- 4,500~5,500 자 (일본어 글자 수 기준 — 한국어보다 같은 정보량에 글자 수 비슷)
- 분량 자체는 본문에 노출하지 않음 (scaled content abuse 회피 — healthpick.kr 콘텐츠 전략 메모 참조)
- `medical: true` 글은 의료광고 가이드라인 (厚労省) 준수
- slug: **일본어 (히라가나·한자)** 또는 영문 약어 + 숫자. **로마자 일반 단어 절대 금지** (한국판과 동일 정책)
  - 좋은 예: `src/content/articles/health/健康診断-alt-80.md`, `src/content/articles/auto/車検-費用-相場.md`
  - 나쁜 예: `src/content/articles/health/fatty-liver-grade2.md`

**시드 토픽 예시 (참고만)**:
- 健康診断でALT 80だったら病院に行くべき？
- 空腹時血糖105は糖尿病予備軍？
- 車検費用が10万円超えたら整備工場を変えるべき？
- ふるさと納税の限度額シミュレーションの数字が違う理由
- 賃貸の更新料は払わないといけない？
- マイナンバーカード健康保険証への切り替え期限と猶予
- iPhone のストレージを減らしたら写真が消えた
- 子ども医療費助成は引っ越したらどうなる？

### Phase 4 — 자동화 스크립트 일본판 (예상 1세션)
1. `dousuru/scripts/daily-content.ps1` 복사 + 일본어 prompt 로 전면 개정
   - 모든 가이드라인 일본어로
   - WebSearch 키워드 일본어
   - 1차 출처를 **일본 정부기관/학회**로 명시 (한국판과 다른 핵심):
     - 厚生労働省, 国税庁, 金融庁, 消費者庁, 国土交通省
     - 国民生活センター
     - 日本医師会, 各種学会 (例: 日本糖尿病学会, 日本高血圧学会)
     - 統計局 (e-Stat)
   - 의료광고 가이드라인 준수 문구 ("個人差があります" "受診の判断は医師にご相談ください" 등) 글마다 포함
   - 폴더 경로 `C:\Users\R\Dropbox\dousuru`
   - 로그 폴더 `C:\Users\R\dousuru-logs` ← **Dropbox 외부 필수** (한국판 동일 이유: Dropbox sync lock → IOException)
   - max-budget 첫 운영은 $15 부터 시작 (한국판은 40편 $25, 일본판은 20편 $15 추천)
   - 처음에는 **20편/일** (랜덤 10 + 뉴스 10) 부터 시작 → 톤 안정되면 40편 확장
2. Windows Task Scheduler 신규 task `HealthpickJpDailyContent` 등록
   - 한국판 (06:00 KST) 과 시간 분리 — **08:00 KST 추천** (한국판 끝난 뒤 시작 → 동시 git push 충돌 방지, claude 동시 실행 부담 X)
   - ExecutionTimeLimit: PT3H (20편 기준)
   - WakeToRun, RestartCount=2 동일
3. 안전망 commit 로직 (한국판과 동일 패턴) 유지

### Phase 5 — 도메인 / Vercel / SEO 설정 (예상 1세션)
1. 도메인 구입 (확정 도메인) + DNS Vercel 연결
2. Vercel 프로젝트 신규 생성 → GitHub repo 연결
3. 환경변수: `SITE_URL=https://dousuru.net`
4. **Google Search Console** 별도 property 등록 + 일본판 sitemap submit
5. **GA4** 일본판 신규 property (또는 한국판 GA4 에 새 stream)
6. AdSense 일본 도메인 추가 승인 (한국판 publisher 그대로 사용 가능하나 도메인별 승인 필요)
7. hreflang 양방향 등록 (선택)
   - 한국판 `<link rel="alternate" hreflang="ja" href="https://dousuru.net/" />`
   - 일본판 `<link rel="alternate" hreflang="ko" href="https://healthpick.kr/" />`
   - 단, 컨텐츠가 1:1 번역이 아니므로 글 단위 hreflang 은 X. 홈페이지만.

### Phase 6 — 자동화 가동 + 모니터링 (개시 후 2주)
- 매일 로그 확인 — `C:\Users\R\dousuru-logs\daily-*.log`
- 첫 1주는 사람이 글 톤·번역체 점검 (특히 의료·법률 표현이 어색하지 않은지)
- Search Console crawl/index 추이 — healthpick.kr 데이터 기반 4~6주 후 첫 인덱싱 예상
- 20편 → 40편 확장은 톤 안정 + 인덱싱 추이 확인 후

---

## 4. 한국판과 다르게 신경 써야 할 일본 특유 사항

### 의료광고 (가장 중요)
- **医療広告ガイドライン** (厚労省) — 단정적 효능 표현, 비교 우위, before/after 사진 등 엄격 규제
- 글마다 디스클레이머 권장: `※ 個人差があります。受診の判断は医師にご相談ください。`
- 약 이름·용량 단정 X. "○○が治る" 류 표현 절대 X. "改善が報告されている" 같은 출처 인용형으로

### 개인정보·privacy
- `個人情報保護法` 기준 privacy 페이지 — 한국판 그대로 번역 X
- AdSense/GA4 사용 시 쿠키 동의 배너 검토 (일본은 EU 만큼 엄격하진 않으나 추세상 명시 권장)

### 세무·돈 콘텐츠
- 일본은 `確定申告`, `年末調整`, `ふるさと納税`, `iDeCo`, `NISA` 등 한국과 제도 완전 다름 → 한국판 finance 글 번역 절대 금지, 새로 작성
- 1차 출처 = 国税庁, 金融庁

### 자동차
- `車検` (한국에 없음), 강제보험 `自賠責`, 임의보험 분리
- 한국판 auto 글 거의 재활용 불가

### 검색 행동
- 일본 사용자는 한국보다 더 긴 자연어 질문형 검색이 일반적 ("〜したらどうなる" "〜は何日くらいで" 등) — long-tail 전략과 잘 맞음
- 결정 키워드: Google.co.jp 우선 (Yahoo! JP 도 Google 인덱스 기반)
- 모바일 비중 한국과 비슷 (>70%) — 반응형/터치 영역 그대로 유효

### 폰트
- `Noto Sans JP` (이미 권장 위 명시) — 한자 가독성 위해 weight 400/700 모두 로드
- 한자/히라가나/카타카나 모두 fallback 안전

---

## 5. 한국판에서 가져올 가치 있는 자산

- **6섹션 구조** — 그대로 유효 (일본어로 헤더명만 교체)
- **slug 한글 강제 정책** → slug 일본어(한자/히라가나) 강제 정책으로 그대로 이식. claude prompt 의 차단 단어 리스트는 일본어 콘텐츠 기준으로 재작성.
- **scaled content abuse 회피 원칙** — "10選" "おすすめランキング" "とは" 류 일반론 금지
- **자동화 스크립트 구조** (claude headless + Task Scheduler + 안전망 commit)
- **OG 이미지 동적 생성** (`/og/[slug].png` SSR) — 그대로 사용 가능. 폰트만 Noto Sans JP 로 교체 (resvg 가 JP 폰트 임베딩 가능한지 확인 필요)
- **GFM singleTilde 끄기** (`60~80` 같은 범위 표기 보호) — 일본판도 동일하게 필요

---

## 6. 한국판에서 절대 가져오면 안 되는 것

- **글 컨텐츠 자체** (의료·금융·자동차·법률 전부 일본 제도와 안 맞음)
- **헬스픽 검증팀** 같은 한국어 브랜딩 잔재
- **Naver Search Advisor** 메타 태그 (일본 SEO 무관)
- **한국 정부기관 인용** (질병관리청, 국세청 등) — 일본 기관으로 전면 교체
- **AdSense 한국 publisher ID** 그대로 사용 (도메인별 승인 필요. 일단 일본 도메인은 비활성 시작 후 천천히 승인)

---

## 7. 다음 세션 첫 명령 (Phase 1 시작 시 복붙용)

```powershell
# 1. 폴더 복제 (node_modules, dist, logs, .git, 글 컨텐츠 제외)
robocopy 'C:\Users\R\Dropbox\healthpick' 'C:\Users\R\Dropbox\dousuru' /MIR `
  /XD node_modules dist logs .git `
  /XF '*.log'

# 2. 컨텐츠 폴더 비우기 (폴더 구조만 유지)
Get-ChildItem 'C:\Users\R\Dropbox\dousuru\src\content\articles' -Recurse -File | Remove-Item

# 3. git 새로 init
Set-Location 'C:\Users\R\Dropbox\dousuru'
git init
git add .
git commit -m "Initial fork from healthpick.kr"

# 4. GitHub repo 생성 (gh 필요)
gh repo create yhstella/dousuru --private --source=. --remote=origin --push

# 5. 의존성 설치 + 로컬 기동
npm install
npm run dev
```

---

## 8. 메모리/참고 자료 포인터

- 한국판 메모리: `project_info_hub.md` (healthpick 본체)
- 자동화 메모리: `reference_healthpick_daily_automation.md` (스케줄러·로그·안전망 — 일본판 그대로 차용 가능한 패턴)
- YAML 함정: `reference_healthpick_yaml_traps.md` (Astro 빌드 실패 6가지 패턴 — 일본판도 동일)
- 컨텐츠 전략: `project_healthpick_content_strategy.md` (long-tail, slug 정책, scaled content abuse 회피)
- 사이트 신뢰도/톤: `feedback_site_trust_voice.md`, `feedback_research_tool_voice.md`
- OG 이미지 시스템: `project_healthpick_og_image_system.md`

---

## 9. 작성자 노트

이 인계장은 **healthpick.kr 의 1.5년치 운영 노하우** (콘텐츠 전략·자동화 함정·YMYL 톤·SEO 패턴) 를 그대로 일본 사이트에 이식하는 것을 전제로 작성했음. **단순 번역 사이트가 아니라** 일본 시장에 처음부터 적합한 컨텐츠로 시작하는 게 핵심. 한국판 글을 자동 번역으로 채우는 건 SEO 패널티 위험 큼 (중복 콘텐츠 + 어색한 번역체 + 일본 제도와 안 맞는 정보).

Phase 1 시작 전에 **§1 의 7개 결정 항목**을 사용자에게 묻고 답을 기록한 뒤 진행할 것.

---

## 🚨 10. AdSense 「Low value content」 사전 예방 (2026-05-30 healthpick 사고 lessons learned)

**상황**: 2026-05-30 healthpick.kr 가 Google AdSense 로부터 **"Low value content / Webmaster quality guidelines for thin content"** 정책 위반 통보. 글 글자수(평균 15,254자), 출처(1차 출처 활용), YMYL 시그널은 충분했으나 **정책 페이지가 표준 미달 + 광고 노출 패턴 부정적** 으로 reject.

dousuru 도 healthpick 코드를 fork 했으므로 **동일한 위험**. fork 시점의 정책 페이지가 짧은 옛 버전이라면 즉시 보강 필요. **컨텐츠 본격 가동 + AdSense 신청 전에 반드시 처리**.

### 10-1. healthpick 가 받은 위반 + 우리가 한 6가지 fix
healthpick commit `34221d5` (2026-05-30). 동일 패턴으로 일본판에 적용.

| # | fix 항목 | healthpick 변경 | dousuru 일본판 적용 |
|---|---|---|---|
| 1 | Privacy Policy | 1.8KB → 7KB (수집 항목·쿠키·옵트아웃·KISA 신고센터) | **個人情報保護法** 기준 + Google AdSense 쿠키·옵트아웃 (adssettings·aboutads·NAI). 일본 신고센터 = **個人情報保護委員会** (ppc.go.jp) |
| 2 | Disclaimer | 1.8KB → 5KB (YMYL 카테고리별 + 응급 119) | **医療広告ガイドライン** (厚労省) 명시 + 응급 시 **119 (救急)** 안내 + 의료광고법 위반 표현 회피 명시 |
| 3 | About | 2.1KB → 5KB (5단계 제작·감수 절차) | 일본어로 동일 패턴. 콘텐츠 제작 과정·검증 절차 투명 공개 |
| 4 | Author 페이지 | 1차 출처 + 금지 패턴 명시 | 우선 1차 출처를 **厚生労働省·国税庁·金融庁·消費者庁·日本医師会·各種学会(日本糖尿病学会·日本高血圧学会 등)·統計局(e-Stat)** 으로 |
| 5 | 카테고리 페이지 AdSlot 제거 | category 페이지의 AdSlot 컴포넌트 삭제 | 동일 — listing 페이지에 광고 X (thin content + 광고 = AdSense 가 가장 싫어하는 패턴) |
| 6 | 본문 시작 직후 AdSlot 제거 | ArticleLayout header 뒤 AdSlot 제거 (본문 끝 + sidebar 광고 2개 유지) | 동일 — above-the-fold ad 가 부정적 시그널 |

### 10-2. 일본 특화 정책 페이지 작성 가이드

**Privacy Policy (個人情報保護方針)** — 일본 시장용 필수 항목:
- 個人情報保護法 (令和3年改正) 기준 작성
- 取得する個人情報, 利用目的, 第三者提供, 安全管理措置, 開示・訂正・利用停止の求め, 苦情・相談窓口
- Google AdSense / Analytics 명시 + 일본어 옵트아웃 안내 (adssettings.google.com — 일본어 페이지 자동 노출)
- EU/EEA 거주자 GDPR 동의 안내 (일본 사이트도 EU 방문자에게 GDPR 적용)
- 苦情・相談窓口: **個人情報保護委員会 (ppc.go.jp)** — 일본 정부 기관
- 14歳未満の子どもの個人情報保護 명시
- 위탁 처리자 (Vercel·Google) 명시

**Disclaimer (免責事項)** — 일본 시장용 필수 항목:
- **医療広告ガイドライン (厚労省)** 명시적 준수: 단정적 효능 표현·비교 우위·before/after 사진 금지
- 글마다 표시: `※ 個人差があります。受診の判断は医師にご相談ください。`
- 약물·시술 단정 표현 절대 X: "○○が治る" → "改善が報告されている"
- 응급 안내: 일본 응급번호 **119 (救急)** + 救命救急センター 안내
- 税務·法律: 国税庁·税理士·弁護士 상담 권유 명시
- 投資: 金融商品取引法 (金商法) 기준 — 투자 권유 아님 명시

**About (サイト紹介)** — E-E-A-T 시그널:
- 사이트 미션·정체성 일본어로
- 콘텐츠 제작 5단계 절차 명시 (한국판과 동일 패턴)
- 광고와 본문 분리, 후원 표기 정책
- 編集部 정체성 (どうする？編集部 또는 결정된 이름)

**Author / 編集部 紹介** — 1차 출처 + 금지 패턴:
- 우선 출처: 厚労省·国税庁·金融庁·消費者庁·国土交通省·国民生活センター·日本医師会·각종 学会 (日本糖尿病学会·日本高血圧学会·日本肝臓学会 등)·統計局(e-Stat)
- 금지 패턴: "○○の効果10選", "○○おすすめランキング", "○○とは", 비교 광고형 결론, 출처 없는 통계

### 10-3. 추가 일본 특유 항목 (한국판엔 없는 것)

- **特定商取引法に基づく表記** — 일본 상거래법. 일반 정보 사이트(non-EC)는 필수 X 지만, 광고 수익화 사이트는 일부 도구·재단이 요구할 수 있음. 운영자 정보(주소·연락처) 일부 공개 검토.
- **資金決済法・암호자산** 콘텐츠 작성 시 별도 가이드라인 (금감원).
- **健康保険 (国保·協会けんぽ·組合健保 차이)** — 한국 건강보험과 완전 다른 제도. healthpick 의 건강보험 글 번역 절대 금지.

### 10-4. dousuru 즉시 점검 체크리스트

이 인계장을 읽는 다음 세션이 즉시 확인:

```powershell
# dousuru 의 정책 페이지 크기 확인 (5KB 이상이면 OK, 미만이면 보강 필요)
cd C:\Users\R\Dropbox\dousuru
Get-Item src/pages/about.astro, src/pages/privacy.astro, src/pages/disclaimer.astro,
         src/pages/author/healthpick-team.astro |
  Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB, 1)}}

# 카테고리 페이지에 AdSlot 있는지
Select-String -Path 'src/pages/category/[category]/[...page].astro' -Pattern 'AdSlot'

# ArticleLayout 의 AdSlot 갯수 + 위치
Select-String -Path 'src/layouts/ArticleLayout.astro' -Pattern 'AdSlot' | Format-List LineNumber, Line
```

위 결과로:
- 정책 페이지 < 5KB → healthpick `34221d5` 의 fix 를 일본어로 번역·적용 (단순 번역 X — 일본 법령 기준 재작성)
- 카테고리 페이지 AdSlot 있음 → 즉시 제거
- ArticleLayout AdSlot 3개 → 본문 시작 직후 1개 제거 (총 2개로 줄임)

### 10-5. AdSense 신청·승인 전략

- **컨텐츠 양산 시그널 회피**: 매일 40편 같은 속도로 신청 시점 직전에 빠르게 양산하면 reject 위험 ↑
- **정책 페이지 먼저 완성** → **수동 시드 글 5~10편** → **자동화 가동 후 2~3주 누적** → **AdSense 신청** 순서
- 신청 시점에 일본어 글 100~200편 + 정책 페이지 완비 + 트래픽 약간 있으면 통과 확률 ↑
- 한국 publisher ID 그대로 사용 가능하나 도메인별 사이트 추가 + 별도 승인 필요

관련: healthpick 의 fix commit `34221d5` 의 변경 파일 6개를 일본어로 적용. 한국판 코드는 그대로 reference.
