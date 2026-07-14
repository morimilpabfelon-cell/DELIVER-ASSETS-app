$ErrorActionPreference = "SilentlyContinue"
$SharedHub = if ($env:DA_SHARED_HUB_ROOT) { $env:DA_SHARED_HUB_ROOT } else { "C:\DA\deliver-assets-hub" }
$PidFile = Join-Path $SharedHub "sync-hub.pid"
if (Test-Path $PidFile) {
  $HubPid = Get-Content $PidFile | Select-Object -First 1
  if ($HubPid) { Stop-Process -Id ([int]$HubPid) -Force -ErrorAction SilentlyContinue }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}
Write-Host "Sync Hub compartido detenido." -ForegroundColor Yellow
