$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SharedHub = if ($env:DA_SHARED_HUB_ROOT) { $env:DA_SHARED_HUB_ROOT } else { "C:\DA\deliver-assets-hub" }

New-Item -ItemType Directory -Force -Path $SharedHub | Out-Null
$env:DA_HUB_STATE_PATH = Join-Path $SharedHub "hub-state.json"
$env:DA_HUB_MEDIA_PATH = Join-Path $SharedHub "media"

Set-Location $Root
node ".\server.mjs"
