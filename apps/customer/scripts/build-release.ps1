$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

& "$PSScriptRoot\clean-customer.ps1"

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  npm ci
}

npx expo prebuild --platform android --clean
Set-Location (Join-Path $Root "android")
.\gradlew.bat assembleRelease bundleRelease

$Apk = Join-Path $Root "android\app\build\outputs\apk\release\app-release.apk"
$Aab = Join-Path $Root "android\app\build\outputs\bundle\release\app-release.aab"

Write-Host ""
Write-Host "Release artifacts:"
foreach ($File in @($Apk, $Aab)) {
  if (Test-Path $File) {
    $Item = Get-Item $File
    Write-Host ("{0} - {1:N2} MB" -f $Item.FullName, ($Item.Length / 1MB))
  }
}
