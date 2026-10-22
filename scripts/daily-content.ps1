#requires -Version 7.0
param(
  [switch]$GenerateDraft,
  [string]$Topic,
  [string]$ClaudeExecutable = 'claude'
)

$ErrorActionPreference = 'Stop'
if (-not $GenerateDraft -or [string]::IsNullOrWhiteSpace($Topic)) {
  throw 'Automatic publishing is retired. To request one draft, pass -GenerateDraft -Topic <topic>. No commit or push is performed.'
}
& (Join-Path $PSScriptRoot 'new-content-draft.ps1') -Topic $Topic -ClaudeExecutable $ClaudeExecutable
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
