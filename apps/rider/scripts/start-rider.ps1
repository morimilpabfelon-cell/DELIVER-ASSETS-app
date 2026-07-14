$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$SharedHub = if ($env:DA_SHARED_HUB_ROOT) { $env:DA_SHARED_HUB_ROOT } else { "C:\DA\deliver-assets-hub" }
$PidFile = Join-Path $SharedHub "sync-hub.pid"

New-Item -ItemType Directory -Force -Path $SharedHub | Out-Null
$env:DA_HUB_STATE_PATH = Join-Path $SharedHub "hub-state.json"
$env:DA_HUB_MEDIA_PATH = Join-Path $SharedHub "media"

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Set-Location $Root

if (-not (Test-Path (Join-Path $Root "node_modules\expo\package.json"))) {
  Write-Host "Instalando dependencias de Rider..." -ForegroundColor Yellow
  npm ci
}

adb devices -l
adb reverse tcp:8083 tcp:8083
adb reverse tcp:9090 tcp:9090

$HubAlive = $false
$OldHub = $false
try {
  $Health = Invoke-RestMethod "http://127.0.0.1:9090/health" -TimeoutSec 2
  $HubAlive = $Health.ok -eq $true `
    -and $Health.capabilities -contains "coordination-v2" `
    -and $Health.capabilities -contains "chat-media-v1" `
    -and $Health.capabilities -contains "receipt-v1" `
    -and $Health.capabilities -contains "rider-chat-v1" `
    -and $Health.capabilities -contains "control-intervention-v1"
  $OldHub = $Health.ok -eq $true -and -not $HubAlive
} catch {}

if ($OldHub) {
  Write-Host "Reemplazando una versión antigua del Coordination Hub..." -ForegroundColor Yellow
  try {
    $Connection = Get-NetTCPConnection -LocalPort 9090 -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($Connection.OwningProcess) {
      Stop-Process -Id $Connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 600
  } catch {}
}

if (-not $HubAlive) {
  Write-Host "Iniciando Coordination Hub Fase 3..." -ForegroundColor Yellow
  $Node = (Get-Command node).Source
  $Hub = Start-Process -FilePath $Node `
    -ArgumentList ".\dev\sync-hub\server.mjs" `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -PassThru
  Set-Content -Path $PidFile -Value $Hub.Id
  Start-Sleep -Seconds 1
}

Write-Host "Rider activo en 8083; Coordination Hub activo en 9090." -ForegroundColor Green
Write-Host "Datos compartidos: $SharedHub" -ForegroundColor DarkGray
Write-Host "Mantén esta ventana abierta y pulsa a cuando Metro esté listo." -ForegroundColor Cyan
npm run start:device
