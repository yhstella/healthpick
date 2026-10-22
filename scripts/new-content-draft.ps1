#requires -Version 7.0
param(
  [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Topic,
  [string]$ClaudeExecutable = 'claude'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$RepoDir = Split-Path -Parent $PSScriptRoot
$DraftDir = Join-Path $RepoDir '.drafts'
$Existing = (Get-ChildItem -LiteralPath (Join-Path $RepoDir 'src/content/articles/health') -Filter '*.md' -File).BaseName -join "`n"
$Today = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'Korea Standard Time').ToString('yyyy-MM-dd')
$Prompt = @"
Write one Korean health information draft for Healthpick about: $Topic
Use web research and open authoritative primary sources. If evidence is insufficient, explain the gap instead of inventing facts.
Return only one complete Markdown article with YAML frontmatter, no code fence or work commentary.
Required metadata: title, description, category: health, pubDate: $Today, author: 헬스픽 편집부,
medical: true, draft: true, manual: false, tldr, sources (name and direct https document URL).
Do not set medicalReview or claim a physician reviewed the article. No invented clinical experiences or patient stories.
Use natural headings suited to the question, not a fixed word count or a repeated six-section template.
Link each important medical claim to the source that supports it. Do not give individualized doses or drug-stop schedules.
Do not create a new article that merely changes a number in an existing topic. Explain when professional or urgent care is needed.
There is no publishing step. You have web tools only and must not attempt to edit files, commit or push.
Existing health slugs, for duplicate avoidance:
$Existing
"@

New-Item -ItemType Directory -Path $DraftDir -Force | Out-Null
$ResultFile = Join-Path $DraftDir ("{0}-{1}.result.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'), [Guid]::NewGuid().ToString('N'))
$CliArgs = @(
  '-p', $Prompt,
  '--safe-mode', '--strict-mcp-config', '--no-session-persistence',
  '--tools', 'WebSearch,WebFetch', '--allowed-tools', 'WebSearch,WebFetch',
  '--max-budget-usd', '2', '--output-format', 'json'
)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$Raw = & $ClaudeExecutable @CliArgs 2>&1 | Out-String
$ClaudeExit = $LASTEXITCODE
[System.IO.File]::WriteAllText($ResultFile, $Raw, [System.Text.UTF8Encoding]::new($false))
if ($ClaudeExit -ne 0) {
  throw "Draft generation failed (exit $ClaudeExit). Diagnostic result: $ResultFile. Nothing was published."
}
& node (Join-Path $PSScriptRoot 'validate-draft.mjs') $ResultFile
if ($LASTEXITCODE -ne 0) {
  throw "Draft validation failed. Diagnostic result: $ResultFile. Nothing was published."
}
Write-Output 'Draft only. Check claims, sources, duplication and rendered output before any manual publication.'
