if ($args -notcontains '--safe-mode' -or $args -notcontains '--strict-mcp-config') { exit 91 }
$ToolsIndex = [Array]::IndexOf($args, '--tools')
if ($ToolsIndex -lt 0 -or $args[$ToolsIndex + 1] -ne 'WebSearch,WebFetch') { exit 92 }
if (-not $env:HEALTHPICK_DRAFT_TEST_RUN_ID) { exit 93 }
if ($env:HEALTHPICK_DRAFT_TEST_MODE -eq 'exit') { Write-Output $env:HEALTHPICK_DRAFT_TEST_RUN_ID; exit 23 }
if ($env:HEALTHPICK_DRAFT_TEST_MODE -eq 'invalid-json') { Write-Output "not json: $env:HEALTHPICK_DRAFT_TEST_RUN_ID"; exit 0 }
$Article = @'
---
title: A specific health question
description: A complete description of this health information draft.
category: health
pubDate: 2026-10-23
medical: true
draft: true
manual: false
sources:
  - name: Official guide
    url: https://example.org/guide
---
## Answer

Read the [official guide](https://example.org/guide).
'@
if ($env:HEALTHPICK_DRAFT_TEST_MODE -eq 'publishable') { $Article = $Article.Replace('draft: true', 'draft: false') }
$Result = @{ type = 'result'; subtype = 'success'; is_error = $false; result = $Article; testRunId = $env:HEALTHPICK_DRAFT_TEST_RUN_ID }
if ($env:HEALTHPICK_DRAFT_TEST_MODE -eq 'provider-error') { $Result.is_error = $true; $Result.subtype = 'error_max_budget_usd' }
$Result | ConvertTo-Json -Compress
exit 0
