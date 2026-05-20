# healthpick.kr 일일 컨텐츠 생성 — Windows 작업 스케줄러용 진입 스크립트.
#
# 매일 아침 정해진 시간에 Claude Code 를 headless 모드(-p)로 실행해
# 최신 뉴스 기반 10개 글을 생성하고 git push 까지 한다.
#
# 등록: scripts/register-daily-task.ps1 한 번 실행.
# 수동 테스트: pwsh -File scripts/daily-content.ps1

$ErrorActionPreference = 'Stop'
$RepoDir = 'C:\Users\R\Dropbox\healthpick'
$LogDir  = Join-Path $RepoDir 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

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

**작업 (총 10개 글 생성)**:

1. WebSearch 4~5회로 최신 한국 뉴스 트렌딩 토픽 조사
   ("오늘의 건강 뉴스 한국", "경제 정책 뉴스 한국", "IT 테크 뉴스 한국", "생활 트렌드 한국", "여행 트렌드 한국")

2. 10개 토픽 선정 (카테고리 분포: health 3, finance 2, tech 2, living 1, travel 1, study 또는 auto 1).
   기존 src/content/articles/{category}/ 의 slug 와 중복되지 않게.
   검색 유입형 키워드 우선.

3. 각 글을 Write 도구로 작성 (generate-content.mjs 사용 X):
   - 프론트매터: title(40~70자), description(80~150자), category, tags 3~5개, pubDate(오늘 ISO),
     author '헬스픽 검증팀', tldr 3~4개, faqs 4~5개, sources 2~3개, manual:true, medical:true(health 만)
   - 본문: 인트로 → H2 5~7개 (각 H3 2~3개) → 자주 묻는 질문 → 정리
   - 한글 4000~5000자
   - 통계·연구 인용 시 출처 명시
   - '오류', '잘못' 등 자사 신뢰도 깎는 표현 금지

   **YAML frontmatter 안전 규칙 — Astro 빌드 실패 방지 (반드시 준수)**:
   a. `tags`, `tldr` 항목 중 숫자만 있는 값(예: 2026)은 반드시 큰따옴표:
      - 잘못: `- 2026`  → YAML이 숫자로 파싱 → schema 거절
      - 맞음: `- "2026"`
   b. 항목 안에 콜론(`:`) + 공백이 들어가면 YAML 매핑으로 오해 → 큰따옴표로 감싼다:
      - 잘못: `- 6단계 흐름: 분석 → 본인 자료...`  → 객체로 파싱
      - 맞음: `- "6단계 흐름: 분석 → 본인 자료..."`
   c. title 에 큰따옴표(`"`)나 콜론이 들어가면 외부 큰따옴표로 감싸고 안쪽은 작은따옴표 사용:
      - 잘못: `title: "고혈압 "사일런트 킬러" 의 정체"`
      - 맞음: `title: "고혈압 '사일런트 킬러'의 정체"`
   d. tldr·faqs 각 항목은 한 줄로 작성 (YAML 들여쓰기 오류 방지)
   e. sources 의 url 은 반드시 `https://` 로 시작하는 유효한 URL (z.string().url() 검사)
   f. category 는 반드시 health/living/finance/tech/auto/travel/study 중 하나 (오타 금지)
   g. 작업 마지막에 `npx --no-install astro check` 또는 `astro build` 실행해 frontmatter
      에러 없는지 검증한 뒤에만 commit/push. 에러 있으면 해당 글 수정 후 재검증.

4. 배포: 다음 명령으로 commit + push (Vercel 자동 배포)
   git add src/content/articles/
   git commit -m "$(Get-Date -Format yyyy-MM-dd) 일일 자동 컨텐츠 10개 추가"
   git push

5. 마지막에 생성한 10개 글의 title 목록을 출력해 주세요.
'@

# Claude CLI 호출 — 허용 도구 화이트리스트 방식.
# bypassPermissions 안 씀: 위험 도구는 자동으로 막힌다.
# 자동 실행이 정상적으로 해야 하는 작업에 필요한 것만 명시적으로 허용.
#
# Windows PowerShell 5.1 의 native command argument escaping 이 손상돼
# `claude -p $longPrompt` 호출 시 prompt 안 공백·하이픈이 별도 인자로 분리된다.
# 해결책: prompt 를 stdin 으로 파이프.
Set-Location $RepoDir

$AllowedTools = 'Write Edit Read Glob Grep WebSearch WebFetch "Bash(git add:*)" "Bash(git commit:*)" "Bash(git push)" "Bash(git status:*)" "Bash(git diff:*)" "Bash(npx --no-install astro:*)" "Bash(npx astro:*)"'

# prompt 는 stdin 으로 — argument escaping 우회
$Prompt | & claude `
  -p `
  --allowed-tools $AllowedTools `
  --max-budget-usd 5 `
  --output-format text `
  --model opus `
  *>&1 | Tee-Object -FilePath $LogFile

$ExitCode = $LASTEXITCODE
Add-Content -Path $LogFile -Value "`n--- exit code: $ExitCode ---"

# 오래된 로그 정리 (30일 이상)
Get-ChildItem $LogDir -Filter "daily-*.log" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force
