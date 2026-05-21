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

**사이트 정체성 (반드시 준수)**:
"한 줄 검색이 안 되는 실제 상황에 답하는 생활 가이드". 대형 사이트(병원·언론·공공기관)와 흔한 키워드로 경쟁하지 않는다.
실제 사용자가 검색창에 치는 구체적 문장 (long-tail 질문) 들에서 3~10등을 노린다.

**작업 (총 20편 — Part A 10편 + Part B 10편)**:

**Part A — 실제 검색 문장형 long-tail 10편**:
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

**카테고리 분포 (Part A)**: health 3, finance 2, tech 2, living 1, travel 1, study 또는 auto 1.
기존 src/content/articles/{category}/ slug 와 중복 없게 (Glob 으로 확인 필수).

**Part B — 오늘 뉴스 기반 long-tail 10편**:
1. WebSearch 5~6회로 오늘자 한국 트렌딩 이슈·정책·발표 조사
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
   - **파일명(slug) — 한글로**. 검색 결과 페이지에서 URL 에 한글 키워드 노출 → 클릭률 ↑.
     예: `src/content/articles/health/건강검진-alt-80.md` (로마자 X)
     - 질문에서 핵심 키워드 3~5 단어 추출, 하이픈으로 연결
     - Windows·git 호환 문자만: 한글·영문·숫자·하이픈. `:` `/` `\` `?` `*` `"` `<` `>` `|` 금지
   - 프론트매터:
     - title(40~70자) — 진짜 질문 문장 또는 그것의 답을 줄 형태
     - description(80~150자) — 결론 짧게
     - category, tags 3~5개, pubDate(오늘 ISO),
     - author '헬스픽 검증팀', tldr 3~4개 (결론 핵심), faqs 4~5개, sources 2~3개,
     - manual:true, medical:true(health 만)
   - 본문 구조 (모든 글 통일):
     ## 결론부터
     (1~2 문장으로 답)
     ## 언제 해당되나
     ## 예외 상황
     ## 비용·위험·주의점
     ## 자주 묻는 질문
     ## 참고 자료
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
   g. 작업 마지막에 `npx astro build` 실행해 frontmatter 에러 없는지 검증한 뒤에만
      commit/push. 에러 있으면 해당 글 수정 후 재검증.

4. 배포: 다음 명령으로 commit + push (Vercel 자동 배포). 명령은 모두 bash 안에서 실행되므로
   bash 의 명령 치환 문법 `$(...)` 을 사용하세요 (PowerShell 의 `$(Get-Date)` 가 아닙니다):
     git add src/content/articles/
     git commit -m "$(date +%Y-%m-%d) 일일 자동 컨텐츠 20편 추가 (랜덤 10 + 뉴스 10)"
     git push

5. 마지막에 생성한 20편 글의 title 목록을 [랜덤 10] / [뉴스 10] 으로 구분해 출력해 주세요.
'@

# Claude CLI 호출 — 허용 도구 화이트리스트 방식.
# bypassPermissions 안 씀: 위험 도구는 자동으로 막힌다.
Set-Location $RepoDir

# 주의: PS 5.1 의 native command argument escaping 버그로, allowed-tools 값 안에
# `--no-install` 같이 하이픈으로 시작하는 토큰이 들어가면 claude.exe 가 자기 옵션으로
# 오인해 exit 1. 따라서 패턴에서 dash-flag 는 빼고, prompt 쪽에서 사용 명령 형태만 안내.
$AllowedTools = 'Write Edit Read Glob Grep WebSearch WebFetch "Bash(git add:*)" "Bash(git commit:*)" "Bash(git push)" "Bash(git status:*)" "Bash(git diff:*)" "Bash(npx astro:*)" "Bash(node scripts/migrate-slugs.mjs:*)"'

# 시작 헤더를 먼저 로그에 적어 둠
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
    --max-budget-usd 10 `
    --output-format text `
    --model opus 2>&1 |
    ForEach-Object {
      Add-Content -Path $LogFile -Value $_ -Encoding UTF8
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
    $pushOut = & git push 2>&1
    Add-Content -Path $LogFile -Value $pushOut -Encoding UTF8
    Add-Content -Path $LogFile -Value "--- safety-net push done ---" -Encoding UTF8
  } else {
    Add-Content -Path $LogFile -Value "--- safety-net: no uncommitted articles (claude already pushed) ---" -Encoding UTF8
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
