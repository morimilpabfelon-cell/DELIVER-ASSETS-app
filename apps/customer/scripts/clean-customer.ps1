$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$Targets = @(
  (Join-Path $Root ".expo"),
  (Join-Path $Root "dist"),
  (Join-Path $Root "dist-test"),
  (Join-Path $Root "web-build"),
  (Join-Path $Root "android\build"),
  (Join-Path $Root "android\app\build"),
  (Join-Path $Root "android\app\.cxx")
)

foreach ($Target in $Targets) {
  if (Test-Path $Target) {
    Remove-Item -Recurse -Force $Target
    Write-Host "Removed $Target"
  }
}

Get-ChildItem $Root -Filter "*.log" -File -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "Customer build caches cleaned. Source code and node_modules were preserved."
