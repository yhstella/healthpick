# H2 구조 마이그레이션 — "한눈에 보기" 류 위반 글을 정확한 6섹션으로 재작성.
#
# 2026-05-29 검토에서 발견: claude 가 prompt 가 금지한 H2 제목들("한눈에 보기 / 왜 이 질문이 생길까 /
# 핵심 답변 / 단계별 체크리스트 / 마지막 한마디")을 약 200편 양산. 단순 제목 rename 으로는 불가
# (기존 "핵심 답변" 거대 섹션을 "언제 해당되나"+"예외 상황"+"비용·위험·주의점" 3개로 분할 + 메타
# 자기참조 "왜 이 질문이 생길까" 와 군더더기 "마지막 한마디" 제거 필요) → LLM 재작성.
#
# 사용법:
#   pwsh -File scripts/migrate-structure.ps1                       # 기본: 10편 마이그
#   pwsh -File scripts/migrate-structure.ps1 -Limit 5              # 5편만
#   pwsh -File scripts/migrate-structure.ps1 -DryRun               # 대상 글 목록만 출력
#
# 동작:
#   1. grep 으로 "## 한눈에 보기" 또는 다른 금지 H2 가 있는 글 검출
#   2. -Limit 만큼 무작위 선정
#   3. 각 글에 대해 claude headless 호출 — title/tldr/faqs/sources/tags 유지, 본문만 정확한
#      6섹션 (결론부터/언제 해당되나/예외 상황/비용·위험·주의점/자주 묻는 질문/참고 자료) 으로
#      재배치. manual:true 유지.
#   4. npx astro build 통과 확인 (Dropbox lock 회피용으로 type generation 까지만 또는 OUT_DIR 외부)
#   5. commit + pull --rebase + push
#
# 로그: C:\Users\R\healthpick-logs\migrate-structure-YYYYMMDD-HHmm.log

[CmdletBinding()]
param(
  [int]$Limit = 10,
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$RepoDir = 'C:\Users\R\Dropbox\healthpick'
$LogDir  = 'C:\Users\R\healthpick-logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Stamp   = Get-Date -Format 'yyyyMMdd-HHmm'
$LogFile = Join-Path $LogDir "migrate-structure-$Stamp.log"

"=== migrate-structure run @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (Limit=$Limit, DryRun=$DryRun) ===" |
  Out-File -FilePath $LogFile -Encoding UTF8

Set-Location $RepoDir

# 1. 위반 글 검출 — Select-String 으로 금지 H2 패턴 찾기.
$articlesDir = Join-Path $RepoDir 'src\content\articles'
$forbiddenH2 = '^## (한눈에 보기|왜 이 질문이 생길까|핵심 답변|단계별 체크리스트|마지막 한마디|핵심 정리|요약)$'
$violators = Get-ChildItem -Path $articlesDir -Recurse -Filter '*.md' |
  Where-Object {
    Select-String -Path $_.FullName -Pattern $forbiddenH2 -Quiet -ErrorAction SilentlyContinue
  } |
  Select-Object -ExpandProperty FullName

$totalCount = $violators.Count
Add-Content -Path $LogFile -Value "--- detected $totalCount H2 violators ---" -Encoding UTF8

if ($totalCount -eq 0) {
  Add-Content -Path $LogFile -Value "--- no violators, nothing to do ---" -Encoding UTF8
  exit 0
}

# 무작위 선정 — 매번 같은 글이 마이그 안 되도록 deterministic 아닌 random.
$targets = $violators | Get-Random -Count ([math]::Min($Limit, $totalCount))
Add-Content -Path $LogFile -Value "--- selected $($targets.Count) target(s) for migration ---" -Encoding UTF8
foreach ($t in $targets) { Add-Content -Path $LogFile -Value "  - $t" -Encoding UTF8 }

if ($DryRun) {
  Write-Host "DRY RUN — $totalCount violators total, $($targets.Count) would be migrated. See $LogFile."
  exit 0
}

# 2. claude headless 로 각 글 재작성.
$claudeExe = 'C:\Users\R\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\claude.exe'
if (-not (Test-Path $claudeExe)) { $claudeExe = 'claude' }

# 각 글마다 prompt 를 만들어 claude 에 전달.
# - 입력: 글 전체 (frontmatter + 본문)
# - 작업: title/description/tags/pubDate/author/tldr/faqs/sources/medical/manual frontmatter 전부 유지.
#         본문만 정확히 6섹션 (결론부터/언제 해당되나/예외 상황/비용·위험·주의점/자주 묻는 질문/참고 자료)
#         으로 재배치. 메타 자기참조 ("왜 이 질문이 생길까") 와 군더더기 ("마지막 한마디") 는 제거.
#         기존 표·수치·H3 는 적절한 섹션으로 재분류.
# - 출력: Write 도구로 같은 파일 덮어쓰기.
$AllowedTools = 'Write Edit Read "Bash(npx astro:*)"'

$succeeded = 0
$failed = 0
foreach ($file in $targets) {
  $relPath = Resolve-Path -Relative $file
  Add-Content -Path $LogFile -Value "`n=== migrate: $relPath ===" -Encoding UTF8

  # single-quote here-string + token replace — PS heredoc 의 $() subexpression 오해 회피
  $promptTemplate = @'
healthpick.kr 글 1편 H2 구조 마이그레이션 작업입니다.

**대상 파일**: {{REL_PATH}}

**작업 (반드시 순서대로)**:
1. Read 도구로 위 파일 전체를 읽는다.
2. 본문 H2 구조를 다음 정확히 6개 + 정확히 이 순서로 **재배치**한다:
   ## 결론부터
   ## 언제 해당되나
   ## 예외 상황
   ## 비용·위험·주의점
   ## 자주 묻는 질문
   ## 참고 자료
3. 기존 위반 H2("## 한눈에 보기", "## 왜 이 질문이 생길까", "## 핵심 답변",
   "## 단계별 체크리스트", "## 마지막 한마디" 등) 내용은:
   - "한눈에 보기" → "결론부터" 로 (제목 + 내용 1~2문장으로 압축)
   - "왜 이 질문이 생길까" → **삭제** (메타 자기참조 — 본문 톤 위반)
   - "핵심 답변" 거대 섹션 → "언제 해당되나" + "예외 상황" + "비용·위험·주의점" 3개로 분할
     (기존 H3·표·번호 리스트를 의미별로 재분류 — 적용 조건은 "언제", 예외 케이스는 "예외 상황",
     수치·금액·확률·기간은 "비용·위험·주의점")
   - "단계별 체크리스트" → "비용·위험·주의점" 안의 H3 또는 "예외 상황" 안의 H3 로 통합 (별도 H2 X)
   - "마지막 한마디" → **삭제** (군더더기)
4. frontmatter (title/description/category/tags/pubDate/author/tldr/faqs/sources/medical/manual)
   는 **전부 그대로 유지**. 한 글자도 바꾸지 마라.
5. 본문 내용 자체 (수치·인용·통계·기존 출처)는 **누락 없이 유지**. 단순히 H2 6섹션 안으로 재배치.
6. 분량 가이드 (각 섹션):
   - ## 결론부터: 150~250자
   - ## 언제 해당되나: 700~1000자, 적용 조건 4~6개
   - ## 예외 상황: 700~1000자, 예외 케이스 3~5개
   - ## 비용·위험·주의점: 1000~1500자, 구체 수치 4개 이상
   - ## 자주 묻는 질문: 본문에 별도로 두지 말고 frontmatter `faqs` 가 사이트에서 자동 렌더되므로,
     본문 H2 "## 자주 묻는 질문" 은 짧은 안내 한 줄로 충분 (예: "추가 질문은 아래 FAQ 섹션 참조")
   - ## 참고 자료: 1차 출처 2~3개 + 50자 안내 (frontmatter sources 와 일치)
7. Write 도구로 위 파일 (같은 경로) 에 새 내용 저장.
8. **저장 직전 self-check**: H2 6개가 정확히 위 순서·제목인지 대조. 다르면 재작성.

**금지**:
- frontmatter 어떤 필드도 변경 금지 (title 한 글자도 X)
- 본문 정보 임의 추가·삭제 금지 (단순 재배치)
- 위 6개 외 H2 추가 금지
- 메타 자기참조 ("이 글은...", "왜 이 질문이...") 절대 X
- "당신·여러분" 등 2인칭 추가 X

작업 완료 후 "DONE: {{REL_PATH}}" 한 줄만 출력.
'@
  $prompt = $promptTemplate -replace '\{\{REL_PATH\}\}', $relPath

  try {
    # backtick line-continuation 은 trailing whitespace 에 fragile — splatting 사용
    $claudeArgs = @('-p', '--allowed-tools', $AllowedTools, '--max-budget-usd', '1', '--output-format', 'text', '--model', 'opus')
    $claudeOut = $prompt | & $claudeExe @claudeArgs 2>&1
    $exit = $LASTEXITCODE
    Add-Content -Path $LogFile -Value ($claudeOut -join "`n") -Encoding UTF8
    if ($exit -eq 0) {
      # 검증: H2 6개가 정확한지
      $h2s = Select-String -Path $file -Pattern '^## ' -ErrorAction SilentlyContinue | ForEach-Object { $_.Line }
      $expected = @('## 결론부터','## 언제 해당되나','## 예외 상황','## 비용·위험·주의점','## 자주 묻는 질문','## 참고 자료')
      $h2Ok = (($h2s -join '|') -eq ($expected -join '|'))
      if ($h2Ok) {
        $succeeded++
        Add-Content -Path $LogFile -Value "  [OK] H2 structure verified" -Encoding UTF8
      } else {
        $failed++
        Add-Content -Path $LogFile -Value "  [FAIL] H2 structure still wrong after migration: $($h2s -join ' / ')" -Encoding UTF8
      }
    } else {
      $failed++
      Add-Content -Path $LogFile -Value "  [FAIL] claude exit=$exit" -Encoding UTF8
    }
  } catch {
    $failed++
    Add-Content -Path $LogFile -Value "  [EXCEPTION] $_" -Encoding UTF8
  }
}

Add-Content -Path $LogFile -Value "`n--- summary: success=$succeeded, fail=$failed, total=$($targets.Count) ---" -Encoding UTF8

# 3. commit + push (succeeded > 0 인 경우만)
if ($succeeded -gt 0) {
  $modifiedFiles = & git -C $RepoDir diff --name-only -- 'src/content/articles/' 2>&1
  if ($modifiedFiles) {
    Add-Content -Path $LogFile -Value "--- committing $($modifiedFiles.Count) migrated file(s) ---" -Encoding UTF8
    & git -C $RepoDir add 'src/content/articles/' 2>&1 | Out-Null
    $msg = "$(Get-Date -Format 'yyyy-MM-dd') chore(structure): migrate $succeeded article(s) to 6-section H2"
    & git -C $RepoDir commit -m $msg 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    & git -C $RepoDir pull --rebase origin main 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    & git -C $RepoDir push 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
    Add-Content -Path $LogFile -Value "--- migration push done ---" -Encoding UTF8
  }
}

Add-Content -Path $LogFile -Value "--- script finished @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" -Encoding UTF8
Write-Host "Migration complete: success=$succeeded, fail=$failed. Log: $LogFile"
exit ([int]($failed -gt 0))
