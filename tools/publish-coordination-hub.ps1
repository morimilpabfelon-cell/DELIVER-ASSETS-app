param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$Name'. Instala Git para Windows antes de continuar."
    }
}

Assert-Command "git"
Assert-Command "robocopy"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$TargetPath = Join-Path $RepoRoot "services\coordination-hub"

if (-not (Test-Path -LiteralPath $SourcePath -PathType Container)) {
    throw "No existe la carpeta del Coordination Hub: $SourcePath"
}

$SourcePath = (Resolve-Path -LiteralPath $SourcePath).Path

$RequiredFiles = @(
    "server.mjs",
    "core.mjs",
    "README.md"
)

foreach ($RequiredFile in $RequiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $SourcePath $RequiredFile) -PathType Leaf)) {
        throw "La carpeta no parece ser el Coordination Hub completo. Falta: $RequiredFile"
    }
}

$PackagePath = Join-Path $SourcePath "package.json"
if (Test-Path -LiteralPath $PackagePath -PathType Leaf) {
    $Package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
    $PackageName = [string]$Package.name

    if ($PackageName -in @(
        "deliver-assets-customer",
        "deliver-assets-business",
        "deliver-assets-rider",
        "deliver-assets-control"
    )) {
        throw "La carpeta indicada corresponde a una aplicación, no al Coordination Hub: $PackageName"
    }
}

$HubVersion = $Version.Trim()
if ([string]::IsNullOrWhiteSpace($HubVersion)) {
    $FolderName = Split-Path -Leaf $SourcePath
    if ($FolderName -match '(?i)v(?<HubVersion>\d+(?:\.\d+){1,2})') {
        $HubVersion = $Matches.HubVersion
    }
    else {
        throw "No se pudo determinar la versión desde la carpeta '$FolderName'. Ejecuta el script con -Version, por ejemplo -Version '2.3.0'."
    }
}

if ($HubVersion -match '^\d+\.\d+$') {
    $HubVersion = "$HubVersion.0"
}

if ($HubVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw "La versión '$HubVersion' no es válida. Usa el formato 2.3.0."
}

Push-Location $RepoRoot
try {
    $InsideRepo = git rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -ne 0 -or $InsideRepo.Trim() -ne "true") {
        throw "Ejecuta este script dentro del repositorio DELIVER-ASSETS-app clonado."
    }

    $Remote = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0 -or $Remote -notmatch "morimilpabfelon-cell/DELIVER-ASSETS-app") {
        throw "El repositorio actual no corresponde a morimilpabfelon-cell/DELIVER-ASSETS-app."
    }

    git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo actualizar la rama main."
    }

    if (Test-Path -LiteralPath $TargetPath) {
        Remove-Item -Recurse -Force -LiteralPath $TargetPath
    }
    New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null

    $ExcludedDirectories = @(
        "node_modules",
        ".git",
        ".runtime",
        "uploads",
        "coverage",
        "dist",
        "tmp",
        "temp",
        "logs"
    )

    $ExcludedFiles = @(
        ".env",
        ".env.*",
        "hub-state.json",
        "hub-state.json.tmp",
        "*.log",
        ".DS_Store"
    )

    $RoboArgs = @(
        $SourcePath,
        $TargetPath,
        "/E",
        "/COPY:DAT",
        "/DCOPY:DAT",
        "/R:2",
        "/W:1",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP",
        "/XD"
    ) + $ExcludedDirectories + @("/XF") + $ExcludedFiles

    & robocopy @RoboArgs
    $RoboCode = $LASTEXITCODE
    if ($RoboCode -ge 8) {
        throw "Robocopy falló con código $RoboCode."
    }

    $Manifest = [ordered]@{
        name = "deliver-assets-coordination-hub"
        version = $HubVersion
        runtime = "node"
        entry = "server.mjs"
        schemaVersion = 2
    }
    $Manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $TargetPath "hub-manifest.json") -Encoding utf8

    git add --all -- "services/coordination-hub"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron preparar los archivos del Coordination Hub."
    }

    $Pending = git status --porcelain -- "services/coordination-hub"
    if ([string]::IsNullOrWhiteSpace(($Pending -join ""))) {
        Write-Host "Coordination Hub ya está actualizado; no hay cambios para publicar."
        exit 0
    }

    git commit -m "feat(hub): publish Coordination Hub v$HubVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear el commit."
    }

    git push origin main
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo enviar el commit a GitHub."
    }

    $Commit = git rev-parse HEAD
    Write-Host "Coordination Hub publicado correctamente."
    Write-Host "Servicio: deliver-assets-coordination-hub"
    Write-Host "Versión: $HubVersion"
    Write-Host "Destino: services/coordination-hub"
    Write-Host "Commit: $Commit"
}
finally {
    Pop-Location
}
