# AI 스러운 표현, 비문, 오타 일괄 교정 스크립트.
#
# 사용법:
#   pwsh -File scripts/sanitize-grammar-style.ps1                       # 기본: 10편 교정
#   pwsh -File scripts/sanitize-grammar-style.ps1 -Limit 5              # 5편만
#   pwsh -File scripts/sanitize-grammar-style.ps1 -Folder health        # 특정 카테고리만
#   pwsh -File scripts/sanitize-grammar-style.ps1 -DryRun               # 대상 글 목록만 출력
#
# 동작:
#   1. Select-String으로 AI 표현, 비문, 오타 패턴이 탐지되는 기사 검출
#   2. -Limit 만큼 무작위 선정
#   3. 각 글에 대해 claude headless 호출 — 한국어 교정 수칙에 맞게 본문 교정 (frontmatter 보호)
#   4. npx astro build 통과 확인
#   5. commit + pull --rebase + push
#
# 로그: C:\Users\R\healthpick-logs\sanitize-grammar-YYYYMMDD-HHmm.log

[CmdletBinding()]
param(
  [int]$Limit = 10,
  [string]$Folder = "",
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$RepoDir = 'C:\Users\R\Dropbox\healthpick'
$LogDir  = 'C:\Users\R\healthpick-logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Stamp   = Get-Date -Format 'yyyyMMdd-HHmm'
$LogFile = Join-Path $LogDir "sanitize-grammar-$Stamp.log"

"=== sanitize-grammar-style run @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (Limit=$Limit, Folder=$Folder, DryRun=$DryRun) ===" |
  Out-File -FilePath $LogFile -Encoding UTF8

Set-Location $RepoDir

# 1. 대상 검출을 위한 패턴 정의
#   - AI 흔적: 메타 자기참조, 정형적 마무리
#   - 비문/번역투: 이중 피동형, 영어 직역형
#   - 오타/맞춤법/띄어쓰기: 띄어쓰기 고질병, 대표적인 맞춤법 오류
$patterns = @(
  "본 글", "본 문서", "본 페이지", "본 정리", "이 글에서는", "필자는", "이번 장에서는",
  "종합하면", "요약하자면", "결론적으로", "도움이 되셨기를 바랍니다", "이상으로 살펴본",
  "되어집니다", "보여집니다", "사용되어집니다", "영향을 받게 됩니다",
  "필요로 합니다", "역할을 합니다", "것 중 하나",
  "할수있습니다", "점검해보세요", "받는게",
  "되서", "안되", "역활", "갯수"
)
$patternRegex = ($patterns | ForEach-Object { [regex]::Escape($_) }) -join '|'

# 2. 위반 글 검출 — Select-String 으로 패턴 매칭되는 글 검색
$articlesDir = Join-Path $RepoDir 'src\content\articles'
if ($Folder) {
  $articlesDir = Join-Path $articlesDir $Folder
}

if (-not (Test-Path $articlesDir)) {
  Add-Content -Path $LogFile -Value "--- articles directory not found: $articlesDir ---" -Encoding UTF8
  Write-Error "Directory not found: $articlesDir"
  exit 1
}

$violators = Get-ChildItem -Path $articlesDir -Recurse -Filter '*.md' |
  Where-Object {
    Select-String -Path $_.FullName -Pattern $patternRegex -Quiet -ErrorAction SilentlyContinue
  } |
  Select-Object -ExpandProperty FullName

$totalCount = $violators.Count
Add-Content -Path $LogFile -Value "--- detected $totalCount style/grammar target files ---" -Encoding UTF8

if ($totalCount -eq 0) {
  Add-Content -Path $LogFile -Value "--- no target files found, nothing to do ---" -Encoding UTF8
  Write-Host "No targets found matching the patterns."
  exit 0
}

# 무작위 선정
$targets = $violators | Get-Random -Count ([math]::Min($Limit, $totalCount))
Add-Content -Path $LogFile -Value "--- selected $($targets.Count) target(s) for correction ---" -Encoding UTF8
foreach ($t in $targets) { Add-Content -Path $LogFile -Value "  - $t" -Encoding UTF8 }

if ($DryRun) {
  Write-Host "DRY RUN — $totalCount targets total, $($targets.Count) would be sanitized. See $LogFile."
  exit 0
}

# 3. claude headless 로 각 글 교정 진행
$claudeExe = 'C:\Users\R\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\claude.exe'
if (-not (Test-Path $claudeExe)) { $claudeExe = 'claude' }

$AllowedTools = 'Write Edit Read "Bash(npx astro:*)"'

$succeeded = 0
$failed = 0

foreach ($file in $targets) {
  $relPath = Resolve-Path -Relative $file
  Add-Content -Path $LogFile -Value "`n=== sanitize: $relPath ===" -Encoding UTF8
  Write-Host "Processing $relPath..."

  $oldContent = Get-Content -Raw -Path $file -ErrorAction SilentlyContinue

  $promptTemplate = @'
healthpick.kr 글 1편의 AI 스러운 표현, 비문, 오타를 정밀 교정하는 작업입니다.

**대상 파일**: {{REL_PATH}}

**작업 지침 (반드시 준수)**:
1. Read 도구로 위 파일을 읽는다.
2. 본문의 의학적/재테크/생활정보 등 핵심 내용은 훼손하거나 요약·생략하지 않고, 아래 **한국어 교정 규칙**에 따라 문장 표현만 자연스럽게 수정한다.
3. 수정본을 Write 도구로 같은 파일 (같은 경로) 에 저장한다.

**한국어 교정 규칙**:
- **AI 스러운 표현 배제 (AI signals)**:
  - 자기참조를 절대 하지 않는다. '본 글', '본 문서', '본 페이지', '본 정리', '이 글에서는', '필자' 등의 언급은 문맥상 생략하거나 자연스러운 지시대명사('이 정리', '이번 글') 등으로 대체하거나 문장을 다듬는다.
  - 도식적인 결론부 마무리 표현('결론적으로', '종합하면', '요약하자면', '도움이 되셨기를 바랍니다', '건강한 하루 보내세요' 등)을 제거한다.
  - 단조로운 어미를 다양화한다. 한 글에서 `~할 수 있습니다.`, `~권장됩니다.`, `~필요합니다.`, `~있을 수 있습니다.` 등의 어미를 너무 자주 반복하지 않는다. 평서형('~한다', '~된다', '~안전하다', '~가능하다')이나 권유형 어투를 의식적으로 적절히 섞어 쓴다.
- **비문 및 번역투(수동태, 명사화) 교정**:
  - 불필요한 이중 피동형/수동태를 능동형이나 자연스러운 자동사로 고친다.
    (예: '생각되어집니다' -> '생각됩니다' / '판단됩니다', '보여집니다' -> '보입니다', '영향을 받게 됩니다' -> '영향을 받습니다')
  - 영어 직역 스타일의 어색한 어휘를 고친다.
    (예: '~를 필요로 합니다' -> '~가 필요합니다', '~에 중요한 역할을 합니다' -> '중요합니다', '~중 하나' -> '~가 대표적이다' 또는 생략, '~를 통해' -> '~로/해서', '~에 대한' -> '~의' 또는 생략)
  - 주어와 서술어의 호응을 맞춘다. 특히 문장이 길어져 주어와 어긋나는 서술어가 오지 않도록 문장을 짧고 직관적으로 끊어 쓴다.
- **오타 및 맞춤법, 띄어쓰기 교정**:
  - 띄어쓰기: '할수있습니다' -> '할 수 있습니다', '점검해보세요' -> '점검해 보세요', '받는게' -> '받는 게' 등 의존명사나 보조용언의 띄어쓰기를 철저히 지킨다.
  - 맞춤법: '되서' -> '돼서', '안되다' -> '안 된다', '역활' -> '역할', '갯수' -> '개수', '회복율' -> '회복률' 등 표준 맞춤법에 어긋난 표현을 교정한다.
- **프론트매터 보존**:
  - YAML 프론트매터(---와 --- 사이의 title, description, tags, pubDate, author, tldr, faqs, sources, medical, manual 등)는 **구조와 값을 절대 변경하거나 훼손하지 않는다**. 본문의 가독성만 개선해야 한다.
- **강조 및 이모티콘 규칙 유지**:
  - 기존에 작성된 `**굵은 글씨**` 강조 패턴과 이모티콘(⚠️, 💡 등)은 가이드라인 한도(글 전체에 5~10개의 강조, 3~6개의 이모티콘) 내에서 유지하거나, 과도하게 많이 남용된 경우에만 소량으로 축소한다.

작업 완료 후 "DONE: {{REL_PATH}}" 한 줄만 출력.
'@

  $prompt = $promptTemplate -replace '\{\{REL_PATH\}\}', $relPath

  try {
    # PowerShell 5.1에서 외부 프로세스로 파이프 전송 시 UTF-8 변환 강제
    $OutputEncoding = [System.Text.Encoding]::UTF8
    $claudeArgs = @('-p', '--allowed-tools', $AllowedTools, '--max-budget-usd', '1.5', '--output-format', 'text', '--model', 'sonnet')
    $claudeOut = $prompt | & $claudeExe @claudeArgs 2>&1
    $exit = $LASTEXITCODE
    Add-Content -Path $LogFile -Value ($claudeOut -join "`n") -Encoding UTF8
    
    if ($exit -eq 0) {
      $newContent = Get-Content -Raw -Path $file -ErrorAction SilentlyContinue
      if ($oldContent -ne $newContent) {
        $succeeded++
        Add-Content -Path $LogFile -Value "  [OK] Sanitization succeeded (file modified)" -Encoding UTF8
      } else {
        $failed++
        Add-Content -Path $LogFile -Value "  [FAIL] Sanitization finished but file was NOT modified" -Encoding UTF8
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
Write-Host "Processed $($targets.Count) files. Succeeded: $succeeded, Failed: $failed"

# 4. commit + push (succeeded > 0 인 경우만)
if ($succeeded -gt 0) {
  $modifiedFiles = & git -C $RepoDir diff --name-only -- 'src/content/articles/' 2>&1
  if ($modifiedFiles) {
    # Astro 빌드 검증을 1회 수행
    Write-Host "Running astro build check..."
    $buildOut = & npx astro build 2>&1
    $buildExit = $LASTEXITCODE
    Add-Content -Path $LogFile -Value "--- astro build validation (exit=$buildExit) ---" -Encoding UTF8
    Add-Content -Path $LogFile -Value ($buildOut -join "`n") -Encoding UTF8

    if ($buildExit -eq 0) {
      Write-Host "Astro build passed. Committing and pushing changes..."
      Add-Content -Path $LogFile -Value "--- committing $($modifiedFiles.Count) sanitized file(s) ---" -Encoding UTF8
      & git -C $RepoDir add 'src/content/articles/' 2>&1 | Out-Null
      $msg = "$(Get-Date -Format 'yyyy-MM-dd') chore(style): sanitize grammar/typos/AI patterns in $succeeded article(s)"
      & git -C $RepoDir commit -m $msg 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
      & git -C $RepoDir pull --rebase origin main 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
      & git -C $RepoDir push 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value $_ -Encoding UTF8 }
      Add-Content -Path $LogFile -Value "--- git push complete ---" -Encoding UTF8
    } else {
      Write-Error "Astro build failed. Changes are kept locally for inspection. Log: $LogFile"
      Add-Content -Path $LogFile -Value "--- FAIL: astro build failed, skipping git commit ---" -Encoding UTF8
    }
  }
}

Add-Content -Path $LogFile -Value "--- script finished @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" -Encoding UTF8
Write-Host "Log file: $LogFile"
exit ([int]($failed -gt 0))
