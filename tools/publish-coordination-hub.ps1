param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath
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

if (-not (Test-Path $SourcePath)) {
    throw "No existe la carpeta del Coordination Hub: $SourcePath"
}

$PackagePath = Join-Path $SourcePath "package.json"
if (-not (Test-Path $PackagePath)) {
    throw "La carpeta indicada no contiene package.json. Usa la raíz real del Coordination Hub."
}

$Package = Get-Content $PackagePath -Raw | ConvertFrom-Json
$PackageName = [string]$Package.name
$PackageVersion = [string]$Package.version

if ($PackageName -in @(
    "deliver-assets-customer",
    "deliver-assets-business",
    "deliver-assets-rider",
    "deliver-assets-control"
)) {
    throw "La carpeta indicada corresponde a una aplicación, no al Coordination Hub: $PackageName"
}

$HasServer =
    (Test-Path (Join-Path $SourcePath "server.mjs")) -or
    (Test-Path (Join-Path $SourcePath "core.mjs")) -or
    (Test-Path (Join-Path $SourcePath "src")) -or
    (Test-Path (Join-Path $SourcePath "server"))

if (-not $HasServer) {
    throw "No se encontró server.mjs, core.mjs, src o server. La carpeta no parece ser el Hub completo."
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

    if (Test-Path $TargetPath) {
        Remove-Item -Recurse -Force $TargetPath
    }
    New-Item -ItemType Directory -Force $TargetPath | Out-Null

    $ExcludedDirectories = @(
        "node_modules",
        ".git",
        ".runtime",
        "data",
        "uploads",
        "coverage",
        "dist",
        "tmp",
        "temp",
        "logs"
    )

    $ExcludedFiles = @(
        ".env",
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

    git add --all -- "services/coordination-hub"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron preparar los archivos del Coordination Hub."
    }

    $Pending = git status --porcelain -- "services/coordination-hub"
    if ([string]::IsNullOrWhiteSpace(($Pending -join ""))) {
        Write-Host "Coordination Hub ya está actualizado; no hay cambios para publicar."
        exit 0
    }

    git commit -m "feat(hub): publish Coordination Hub v$PackageVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear el commit."
    }

    git push origin main
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo enviar el commit a GitHub."
    }

    $Commit = git rev-parse HEAD
    Write-Host "Coordination Hub publicado correctamente."
    Write-Host "Paquete: $PackageName"
    Write-Host "Versión: $PackageVersion"
    Write-Host "Commit: $Commit"
}
finally {
    Pop-Location
}
