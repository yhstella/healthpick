# healthpick.kr 콘텐츠 생성 — 1회 1편.
#
# 발행 속도 변천:
#   - 초기: 06:00 매일 40편 (daily-content.ps1)
#   - 2026-06-01: 일 3편 (06:00/14:00/22:00) 감속 — AdSense 통과 직후 scaled 신호 회피
#   - 2026-06-14: 일 1편 (06:00) 으로 추가 감속 — GSC impression 0 사고 후 도메인 신뢰 회복용
#   - 2026-06-29: 일 2편 (06:00/22:00)
#   - 2026-06-30: 일 4편 (06:00/12:00/18:00/22:00) 증량 + prompt 전면 강화
#     (제목 AI 틀 "vs 결정 기준" 제거 → 자연 질문, 본문 클리셰·기계적 나열 제거, 자가점검 단계)
#
# Task scheduler trigger: 06:00 / 12:00 / 18:00 / 22:00 매일 (각 1편 = 일 4편).
# 수동 테스트: powershell -File scripts/daily-content-3per-day.ps1

$ErrorActionPreference = 'Continue'
$RepoDir = 'E:\healthpick'
$LogDir  = 'E:\healthpick-logs'  # Dropbox 외부 (sync lock 회피)
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# UTF-8 강제 (PowerShell 5.1 default $OutputEncoding=ASCII 로 한글 깨짐 방지)
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new()

$Stamp   = Get-Date -Format 'yyyyMMdd-HHmm'
$LogFile = Join-Path $LogDir "triblock-$Stamp.log"

$Prompt = @'
healthpick.kr 콘텐츠 1편 생성 작업입니다. 다음을 자율적으로 수행하세요.

**프로젝트 컨텍스트**:
- 경로: E:\healthpick (현재 working directory)
- Astro 4.16 + Tailwind, GitHub yhstella/healthpick, Vercel 자동 배포
- 카테고리 7개: health, living, finance, tech, auto, travel, study
- 글 위치: src/content/articles/{category}/{slug}.md
- 스키마는 src/content/config.ts 참고

**사이트 정체성 (반드시 준수)**:
"한 줄 검색이 안 되는 실제 상황에 답하는 생활 가이드". 대형 사이트와 흔한 키워드로 경쟁하지 않는다.
실제 사용자가 검색창에 치는 구체적 문장 (long-tail 질문) 들에서 3~10등을 노린다.

**🚫 최근 14일 발행 글 — 절대 회피 (글감 선정 시 1순위)**:
아래 목록의 주제·제도·제품·키워드와 겹치는 글감을 만들지 마라. 표현만 살짝 바꾼 사실상 같은 주제도 금지.
같은 제도·정책(예: 양도세 중과, 디딤돌, 청년월세, 5세대 실손, 종합소득세, EV 보조금)이 이미 다뤄졌다면
명백히 다른 angle (다른 수치·대상·시점·의사결정 분기) 이거나 다른 글감으로 교체.

```
{{RECENT_TITLES}}
```

**작업 (총 1편)**:
실제 사람이 검색창·지식인에 치는, 입에서 나오는 그대로의 질문 1개를 토픽으로. 다음 스타일:
- "건강검진에서 ALT 80 나왔는데 바로 병원 가야 하나요"
- "공복혈당 113인데 가족력 있으면 약 먼저 먹어야 하나요"
- "전세 만기인데 집주인이 8천 올려달래요, 갱신청구권 쓰면 얼마까지 막나요"
- "위층 발소리 3개월째인데 직접 올라가서 항의해도 될까요"

**카테고리 자동 결정**:
1. 최근 14일 발행 카테고리 분포를 점검 (위 {{RECENT_TITLES}} 참고)
2. 비중이 가장 적은 카테고리 1~2개 중 선택 (long-term 균형 유지)
3. 또는 그날 시의적절한 뉴스가 있는 카테고리 선택 (정책 발표·신제품 출시)
4. 한 라운드 안에서 직전 회와 같은 카테고리 회피 (가능하면)

**🚨🚨 제목 규칙 — AI 티 1순위 (가장 중요, 위반 시 글 폐기)**:
지금 사이트 제목 90%가 "A vs B 결정 기준" 틀이라 한눈에 AI 양산 티가 난다. 반드시 고친다.

✅ 좋은 제목 = 사람이 실제로 검색창에 치는 한 문장 질문:
- "위층 발소리 3개월째인데 직접 항의해도 될까요"
- "TSH 7인데 증상 없으면 약 안 먹고 지켜봐도 되나요"
- "5년 탄 차 브레이크 패드 3mm인데 디스크도 같이 갈아야 하나요"
- "에어컨 첫 가동했더니 곰팡이 냄새, 셀프 청소로 될까요"

🚫 절대 금지 패턴 (지금 양산되는 AI 틀):
- "결정 기준" / "결정기준" 으로 끝내기 — **완전 금지** (지금 85%가 이럼)
- " vs " 2개 이상 — 최대 1개, 가능하면 0개
- "—"(대시)로 절·키워드 이어붙이기 — 금지
- 수치 3개 이상 욱여넣기 — 수치는 1~2개 핵심만
- 잘못된 예: "전세 만기 60일 + 보증금 4억 임대인 8천 인상 통보 — 갱신청구권 5% 상한 vs 묵시적 갱신 vs 이사 결정 기준"
  → 고치면: "전세 만기인데 집주인이 8천 올려달래요, 갱신청구권 쓰면 얼마까지 막나요"

✅ 길이: **공백 포함 35자 이내** (40자 절대 초과 금지). description 에 디테일을 담고 title 은 짧고 자연스럽게.
✅ 시나리오 변수(수치·상황)는 최대 1개만 질문에 자연스럽게 녹인다. 나열·욱여넣기 X.

본문은 일반론 1~2 문장만, 나머지는 시나리오별 분기로:
- "가족력 있으면 → 6개월 안에 OGTT 권장"
- "BMI 25 이상이면 → 체중 7% 감량이 약 시작을 늦추는 가장 큰 변수"

**절대 피할 글감 (scaled content abuse 의심)**:
- "OOO 효능 10가지", "OOO 추천 순위", "OOO란 무엇인가" 류
- "건강에 좋은 음식", "부자 되는 습관" 같은 일반론
- 단순 정의·요약형 — 구체 상황·수치·맥락 있는 질문만

**글 작성 — Write 도구로**:

1. **slug — 반드시 한글로** (영어 일반 단어 금지):
   - 허용: ALT, AST, BMI, EV, ISA, AI, iPhone, USB-C 같은 약어·제품명·단위
   - 금지: fatty, liver, engine, oil, tax, exemption, medical 등 영어 일반 단어
   - 좋은 예: `src/content/articles/health/공복혈당-122-가족력-약-시작-시점.md`
   - **🚫 tags 항목에 슬래시(`/`) 절대 금지** — 라우트 깨짐 ("구글 I/O" 같이 X, "구글 IO" O)

2. **frontmatter**:
   - title (**35자 이내**, 40자 절대 초과 X): 사람이 치는 자연스러운 질문 한 문장. 위 제목 규칙 준수
   - description (80~150자): 결론 짧게. 제목에 안 담은 수치·시나리오 디테일은 여기에
   - category: 위에서 결정한 1개
   - tags: 2~6개 random (정형화 X)
   - pubDate: 오늘 ISO
   - **author 카테고리별 (단일 author = AdSense AI-farm 시그널)**:
     - health → "헬스픽 건강팀"
     - living → "헬스픽 생활팀"
     - finance → "헬스픽 재테크팀"
     - tech → "헬스픽 IT팀"
     - auto → "헬스픽 자동차팀"
     - travel → "헬스픽 여행팀"
     - study → "헬스픽 학습팀"
   - tldr: 2~5개 random, faqs: 3~7개 random, sources: 1~4개 random
   - manual: true
   - medical: true (health 카테고리만), false (그 외)

3. **본문 구조 — 정확히 이 6개 H2 만, 이 순서·이 제목**:
   ## 결론부터
   (1~2 문장으로 답, 150~250자)
   ## 언제 해당되나
   (적용 조건, 700~1000자, 4~6개 항목 각 100자+)
   ## 예외 상황
   (예외 케이스 3~5개, 700~1000자)
   ## 비용·위험·주의점
   (구체 수치 4개+ 포함, 1000~1500자)
   ## 자주 묻는 질문
   🚨 본문에 Q&A를 반드시 직접 써라. "위 FAQ 참고", "위 FAQ 항목을 참고하세요" 같은
   참조 문구 절대 금지 (frontmatter faqs 에 넣었어도 본문에 또 써야 함 — 독자는 frontmatter
   를 못 봄). 형식:
   ### Q. (질문 문장)
   (답변 300~450자, 구체 수치·기준 포함)
   ### Q. (질문 문장)
   (답변 300~450자)
   → frontmatter faqs 개수만큼 (4~5개) ### Q. 블록을 본문에 전부 작성.
   ## 참고 자료
   (1차 출처 2~3개)

   **🚫 사용 금지 H2**:
   - "한눈에 보기", "왜 이 질문이 생길까", "핵심 답변", "단계별 체크리스트", "마지막 한마디"
   - 위 6개 외 모든 H2 금지

4. **🚫 AI 시그널 표현 금지**:
   - 메타 자기참조: "본 글", "본 문서", "본 페이지", "이 글에서는" 절대 X
   - AI 정형: "결론적으로", "종합하면", "이상으로 살펴본 바와 같이" X
   - formal 어미 한 글에서 5회 초과 금지: ~할 수 있습니다 / ~권장됩니다 / ~필요합니다 / ~있을 수 있습니다
   - transitional 한 글 8회 초과 금지: 따라서·또한·한편·그러나
   - 친근 톤 (~어요·~죠·~네요) 도입 X — 사이트 표준 ~합니다 체

5. **출처**: sources 는 정부 기관 (질병관리청·국세청·고용노동부·금융감독원 등),
   전문 학회 (대한○○학회), 공식 가이드라인 (WHO·KDCA·KASL 등) 우선.
   일반 매체·블로그·개인 자료 인용 금지.

6. **본문 톤 (AI 글투 제거 — 퀄리티 핵심)**:
   - 차분한 정보 톤 (응급의학·임상 가이드라인 권위). 행동 가이드 중심 — 교과서적 정의는 1~2문장만
   - 2인칭 X ("당신·여러분" 자제). 3인칭 ("독자·환자·운전자")
   - 출처 inline 명시: "질병관리청 2024 집계 기준 ..."
   - 🚫 **클리셰 은유·과장 금지**: "가장 강력한 카드", "~로 작동하는 안전장치", "마지막 기회",
     "골든타임", "~구조입니다", "핵심입니다" 남발 — 사실을 담백하게. 비유로 포장 X
   - 🚫 **기계적 나열 금지**: "첫째, 둘째, 셋째, 넷째" 로 매 섹션 똑같이 번호 매기지 마라.
     조건이 2~3개면 그냥 문장으로 풀고, 많을 때만 불릿. 모든 섹션이 같은 리듬이면 AI 티
   - 🚫 같은 문장 구조 반복 금지: 문단마다 "~하면 ~됩니다 / ~하면 ~됩니다" 거울 구조 X.
     문장 길이·시작을 의식적으로 변주 (짧은 문장 ↔ 긴 문장 섞기)
   - 광고형 부풀림 X ("수많은·정말·매우·굉장히")

7. **bold (**...**) 사용법** — 글 전체 5~10개만:
   - 결정적 수치·임계치, 금액·기간 기준, 핵심 조건 1~2단어
   - 일반 명사·동사·문단 도입 전체 굵게 X

8. **YAML frontmatter 안전 (Astro 빌드 실패 방지)**:
   - tags / tldr 중 숫자만 있는 값 (예: 2026) 반드시 큰따옴표 `"2026"`
   - tags 슬래시 절대 X
   - 항목 안 콜론 + 공백 들어가면 큰따옴표로 감싸기
   - title 안 큰따옴표는 안쪽을 작은따옴표로
   - sources url 은 https:// 시작
   - category 7개 중 하나 (오타 X)

9. **🔍 Write 직전 자가 점검 (필수 — 통과 못 하면 고쳐 쓴다)**:
   - [ ] 제목에 "결정 기준"/"결정기준" 없나? (있으면 자연 질문으로 다시)
   - [ ] 제목 35자 이내인가? "vs" 1개 이하인가? "—" 없나? 수치 2개 이하인가?
   - [ ] 제목이 사람이 실제로 검색창에 칠 법한 한 문장 질문인가?
   - [ ] 본문에 "가장 강력한 카드"·"골든타임"·"~구조입니다" 류 클리셰 없나?
   - [ ] "첫째 둘째 셋째 넷째"가 여러 섹션에 반복되지 않나?
   - [ ] FAQ 섹션이 본문에 ### Q. 로 실제 채워졌나? ("위 FAQ 참고" 금지)

10. **배포** (bash 명령, $() 치환):
   git add src/content/articles/
   git commit -m "$(date +%Y-%m-%d_%H%M) 콘텐츠 1편 추가 (자동 발행)"
   git pull --rebase origin main
   git push

11. 마지막에 생성한 글의 title + URL 한 줄로 출력.
'@

# 최근 14일 발행 글 목록 추출 (token 치환)
$since = (Get-Date).AddDays(-14).ToString('yyyy-MM-dd')
$recentFiles = & git -C $RepoDir -c core.quotepath=false log --since=$since --diff-filter=A --name-only --pretty=format: -- 'src/content/articles/' 2>&1 |
  Where-Object { $_ -and $_ -like 'src/content/articles/*' } |
  Select-Object -Unique |
  ForEach-Object { $_ -replace '^src/content/articles/', '' -replace '\.md$', '' } |
  Sort-Object
if ($recentFiles.Count -gt 0) {
  $recentTitlesBlock = ($recentFiles -join "`n")
} else {
  $recentTitlesBlock = "(최근 14일 신규 글 없음)"
}
$Prompt = $Prompt -replace '\{\{RECENT_TITLES\}\}', $recentTitlesBlock

Set-Location $RepoDir

"=== triblock run @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" |
  Out-File -FilePath $LogFile -Encoding UTF8
Add-Content -Path $LogFile -Value "--- recent-titles inject: $($recentFiles.Count) entries (since $since) ---" -Encoding UTF8

$AllowedTools = 'Write Edit Read Glob Grep WebSearch WebFetch "Bash(git add:*)" "Bash(git commit:*)" "Bash(git push)" "Bash(git status:*)" "Bash(git diff:*)" "Bash(git pull:*)" "Bash(npx astro:*)" "Bash(node scripts/migrate-slugs.mjs:*)"'

$claudeExe = 'C:\Users\R\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\claude.exe'
if (-not (Test-Path $claudeExe)) { $claudeExe = 'claude' }

$claudeExit = 0
try {
  # PowerShell native pipe ($Prompt | & exe) 가 claude CLI 신버전에서
  # "no stdin data received in 3s" 로 fail (2026-06-03 22:00 부터 발견).
  # 우회: prompt 를 임시 file 에 UTF-8 로 저장 후 cmd 로 type | claude 파이프.
  $promptFile = Join-Path $env:TEMP "claude-prompt-$Stamp.txt"
  [System.IO.File]::WriteAllText($promptFile, $Prompt, [System.Text.UTF8Encoding]::new($false))

  # cmd /c 안에서 type ... | claude ... — bash 와 동일 신뢰 pipe
  $cmdLine = '"' + $claudeExe + '" -p --allowed-tools "' + $AllowedTools + '" --max-budget-usd 2 --output-format text --model opus 2>&1'
  $fullCmd = 'type "' + $promptFile + '" | ' + $cmdLine
  cmd /c $fullCmd | ForEach-Object {
    Add-Content -Path $LogFile -Value $_ -Encoding UTF8 -ErrorAction SilentlyContinue
  }
  $claudeExit = $LASTEXITCODE

  Remove-Item -Path $promptFile -Force -ErrorAction SilentlyContinue
} catch {
  Add-Content -Path $LogFile -Value "`n--- PS exception: $_ ---" -Encoding UTF8
  $claudeExit = 99
}

Add-Content -Path $LogFile -Value "`n--- claude exit: $claudeExit ---" -Encoding UTF8
Add-Content -Path $LogFile -Value "--- claude finished @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" -Encoding UTF8

# Safety net — claude 가 commit/push 못 한 untracked 글 자동 처리
try {
  Push-Location $RepoDir
  $untracked = & git ls-files --others --exclude-standard -- 'src/content/articles/'
  $modified  = & git diff --name-only --diff-filter=M -- 'src/content/articles/'
  $newOrChanged = @($untracked) + @($modified) | Where-Object { $_ }
  if ($newOrChanged.Count -gt 0) {
    Add-Content -Path $LogFile -Value "--- safety-net: $($newOrChanged.Count) article(s) — committing ---" -Encoding UTF8
    & git add 'src/content/articles/' 2>&1 | Out-Null
    $msg = "$(Get-Date -Format 'yyyy-MM-dd_HHmm') 콘텐츠 1편 (safety-net, claude exit=$claudeExit)"
    & git commit -m $msg 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    & git pull --rebase origin main 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    & git push 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    Add-Content -Path $LogFile -Value "--- safety-net push done ---" -Encoding UTF8
  } else {
    Add-Content -Path $LogFile -Value "--- safety-net: no uncommitted articles ---" -Encoding UTF8
  }

  # 2차 안전망: migrate-slugs (영문 slug 자동 한글화 + redirect)
  Add-Content -Path $LogFile -Value "--- safety-net: migrate-slugs.mjs ---" -Encoding UTF8
  $migrateOut = & node scripts/migrate-slugs.mjs 2>&1
  Add-Content -Path $LogFile -Value $migrateOut -Encoding UTF8
  $slugChanges = & git status --porcelain -- 'src/content/articles/' 'vercel.json' 2>&1
  if ($slugChanges) {
    & git add 'src/content/articles/' 'vercel.json' 2>&1 | Out-Null
    & git commit -m "$(Get-Date -Format 'yyyy-MM-dd_HHmm') chore(slug): auto-migrate" 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    & git pull --rebase origin main 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    & git push 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
  }
} catch {
  Add-Content -Path $LogFile -Value "--- safety-net error: $_ ---" -Encoding UTF8
} finally {
  Pop-Location
}

# X 자동 post 비활성 (2026-06-06) — Free tier credit 0 정책 변경.
# 사이트 통합 (twitter:site/creator meta + sameAs + Footer link) 은 그대로 유지.
# 사용자가 직접 X 에 URL 포스팅. tweet 초안 필요 시: node scripts/x-post.mjs --dry-run --file <path>

Add-Content -Path $LogFile -Value "--- script finished @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" -Encoding UTF8

# 30일 이상 된 log 정리
Get-ChildItem $LogDir -Filter "triblock-*.log" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

exit $claudeExit
