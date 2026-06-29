# LLM 자연어 검수 — 글의 어색한 표현·합쳐진 단어·톤 mix 를 claude 가 직접 검토·수정.
#
# 사용:
#   pwsh -File scripts/llm-naturalize.ps1 -Limit 1 -Random           (랜덤 1편, sample test)
#   pwsh -File scripts/llm-naturalize.ps1 -Limit 5 -Random           (랜덤 5편)
#   pwsh -File scripts/llm-naturalize.ps1 -Files "path1,path2"       (지정 파일들)
#   pwsh -File scripts/llm-naturalize.ps1 -Limit 300 -Random         (랜덤 300편 batch)
#
# 처리:
#   1. 대상 글 read
#   2. claude headless 에 prompt: "어색한 표현 / 합쳐진 단어 / 톤 mix / 부자연 어미 자연화"
#   3. claude 가 Write 도구로 같은 파일에 수정 본 저장
#   4. 검증: title·frontmatter 보존 확인
#
# 로그: E:\healthpick-logs\llm-naturalize-YYYYMMDD-HHmm.log

[CmdletBinding()]
param(
  [int]$Limit = 1,
  [switch]$Random,
  [string]$Files = ""
)

$ErrorActionPreference = 'Continue'

# UTF-8 강제 — PowerShell 5.1 의 $OutputEncoding 기본값(ASCII) 로 인해
# claude.exe 로 prompt 를 pipe 할 때 한글이 '?' 로 깨지는 문제 방지.
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new()

$RepoDir = 'E:\healthpick'
$LogDir  = 'E:\healthpick-logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Stamp   = Get-Date -Format 'yyyyMMdd-HHmm'
$LogFile = Join-Path $LogDir "llm-naturalize-$Stamp.log"

"=== llm-naturalize run @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (Limit=$Limit, Random=$Random) ===" |
  Out-File -FilePath $LogFile -Encoding UTF8

Set-Location $RepoDir

$articlesDir = Join-Path $RepoDir 'src\content\articles'

# 대상 파일 선정
$targets = @()
if ($Files) {
  $targets = $Files -split ',' | ForEach-Object { $_.Trim() }
} else {
  $allFiles = Get-ChildItem -Path $articlesDir -Recurse -Filter '*.md' |
    Select-Object -ExpandProperty FullName
  if ($Random) {
    $targets = $allFiles | Get-Random -Count ([math]::Min($Limit, $allFiles.Count))
  } else {
    $targets = $allFiles | Select-Object -First $Limit
  }
}

Add-Content -Path $LogFile -Value "--- selected $($targets.Count) target(s) ---" -Encoding UTF8

# Claude CLI
$claudeExe = 'C:\Users\R\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\claude.exe'
if (-not (Test-Path $claudeExe)) { $claudeExe = 'claude' }

$AllowedTools = 'Read Write Edit'

# Prompt template (single-quote here-string; {{REL_PATH}} 토큰 치환)
$promptTemplate = @'
healthpick.kr 글 1편 자연 한국어 검수 작업입니다.

**대상 파일**: {{REL_PATH}}

**작업 순서**:
1. Read 도구로 위 파일 전체를 읽는다.
2. 본문(frontmatter --- 사이 X)에서 다음 패턴을 자연 한국어로 수정한다:
   (A) **합쳐진 단어** (한국어 띄어쓰기 규칙 위반):
       - "활용가능하다", "활용쓸 수 있다", "발생가능하다" 같은 patterns
       - 정상: "활용할 수 있습니다", "발생할 수 있습니다"
   (B) **어색한 어미·톤 mix** (같은 글에 ~합니다·~한다 섞이면 부자연):
       - 본문 전체 톤을 ~합니다 체로 일관
       - "필요하다." "권장된다." 같이 갑자기 ~한다 체 끝나는 경우 → ~합니다 로
   (C) **메타 자기참조**:
       - "본 글", "본 안내", "이번 정리에서" 같은 표현이 부자연하면 제거 또는 다른 표현
   (D) **AI 정형 마무리**:
       - "결론적으로", "종합하면", "이상으로 살펴본 바와 같이" 등 → 제거 또는 자연 마무리
   (E) **반복·과도한 hedge**:
       - "있을 수 있다는 점이 가능합니다" 같은 이중 hedge → 단정 또는 단일 hedge
   (F) **부자연한 한국어**:
       - 어색한 조사·맞춤법·합성어 띄어쓰기

3. **절대 변경 금지**:
   - frontmatter 어떤 필드도 (title·description·tags·sources·faqs·tldr·pubDate 등 그대로)
   - 본문 정보·수치·인용·구조 (H2/H3) — 단순 자연화만, 정보 추가/삭제 X
   - 글의 의미·결론 변경 X
   - **`**bold**` 강조 표시 (markdown 굵게) 그대로 보존**. 임의 추가·삭제 X
   - 표(table), 리스트(- 또는 1.), 인용(>) 같은 markdown 구조 보존
   - 문장 분리·결합 자제 — 어색 표현만 부분 수정. 글 전체 재작성 X

4. **톤 일관성 (필수)**:
   - 사이트 표준 톤 = **~합니다 체** (권위 정보)
   - **금지**: `~어요`, `~죠`, `~네요`, `~거든요` (친근 톤). 도입하지 마라.
   - **금지**: `~한다`, `~된다`, `~이다` (한 글 안 mix 어색). 본문이 ~합니다 체면 그대로 유지
   - 다만 본문이 이미 ~한다 체로 일관 작성된 글은 ~한다 체 유지 가능 (변경 X)

4. Write 도구로 같은 파일에 자연화된 본문 저장.

5. 작업 완료 후 "DONE: {{REL_PATH}}" 한 줄만 출력.
'@

$succeeded = 0
$failed = 0
$idx = 0
foreach ($file in $targets) {
  $idx++
  $relPath = Resolve-Path -Relative $file
  Add-Content -Path $LogFile -Value "`n=== [$idx/$($targets.Count)] $relPath ===" -Encoding UTF8

  $prompt = $promptTemplate -replace '\{\{REL_PATH\}\}', $relPath

  try {
    # title 보존 검증 위해 사전 title 저장
    $beforeTitle = (Get-Content -Path $file -TotalCount 30 | Select-String '^title:' | Select-Object -First 1).Line

    $claudeArgs = @('-p', '--allowed-tools', $AllowedTools, '--max-budget-usd', '1', '--output-format', 'text', '--model', 'opus')
    $claudeOut = $prompt | & $claudeExe @claudeArgs 2>&1
    $exit = $LASTEXITCODE
    Add-Content -Path $LogFile -Value ($claudeOut -join "`n") -Encoding UTF8

    if ($exit -eq 0) {
      # title 보존 검증
      $afterTitle = (Get-Content -Path $file -TotalCount 30 | Select-String '^title:' | Select-Object -First 1).Line
      if ($beforeTitle -eq $afterTitle) {
        $succeeded++
        Add-Content -Path $LogFile -Value "  [OK] title preserved" -Encoding UTF8
      } else {
        $failed++
        Add-Content -Path $LogFile -Value "  [WARN] title 변경됨! before='$beforeTitle' after='$afterTitle'" -Encoding UTF8
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
Write-Host "Complete: success=$succeeded, fail=$failed. Log: $LogFile"
exit ([int]($failed -gt 0))
