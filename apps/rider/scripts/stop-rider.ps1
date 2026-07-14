$ErrorActionPreference = "SilentlyContinue"
$SharedHub = if ($env:DA_SHARED_HUB_ROOT) { $env:DA_SHARED_HUB_ROOT } else { "C:\DA\deliver-assets-hub" }
$PidFile = Join-Path $SharedHub "sync-hub.pid"

if (Test-Path $PidFile) {
  $HubPid = Get-Content $PidFile | Select-Object -First 1
  if ($HubPid) { Stop-Process -Id $HubPid -Force -ErrorAction SilentlyContinue }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
} else {
  try {
    $Connection = Get-NetTCPConnection -LocalPort 9090 -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($Connection.OwningProcess) { Stop-Process -Id $Connection.OwningProcess -Force -ErrorAction SilentlyContinue }
  } catch {}
}

Write-Host "Coordination Hub detenido." -ForegroundColor Yellow
