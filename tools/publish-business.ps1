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
$TargetPath = Join-Path $RepoRoot "apps\business"

if (-not (Test-Path $SourcePath)) {
    throw "No existe la carpeta de Business: $SourcePath"
}

$RequiredFiles = @(
    "package.json",
    "app.json",
    "tsconfig.json",
    "app",
    "components",
    "context",
    "data",
    "services"
)

foreach ($RequiredFile in $RequiredFiles) {
    $RequiredPath = Join-Path $SourcePath $RequiredFile
    if (-not (Test-Path $RequiredPath)) {
        throw "La carpeta indicada no parece ser Business completo. Falta: $RequiredFile"
    }
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
        ".expo",
        "android",
        "ios",
        "dist",
        "dist-test",
        "web-build",
        ".git",
        ".runtime"
    )

    $ExcludedFiles = @(
        "expo-env.d.ts",
        "hub-state.json",
        "hub-state.json.tmp",
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

    $Package = Get-Content (Join-Path $TargetPath "package.json") -Raw | ConvertFrom-Json
    if ($Package.name -ne "deliver-assets-business") {
        throw "El paquete copiado no es Business. Nombre encontrado: $($Package.name)"
    }

    $AppConfig = Get-Content (Join-Path $TargetPath "app.json") -Raw | ConvertFrom-Json
    $AndroidPackage = [string]$AppConfig.expo.android.package
    if ($AndroidPackage -ne "com.deliverassets.business") {
        throw "El identificador Android no corresponde a Business. Encontrado: $AndroidPackage"
    }

    $PackageVersion = [string]$Package.version

    git add --all -- "apps/business"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron preparar los archivos de Business."
    }

    $Pending = git status --porcelain -- "apps/business"
    if ([string]::IsNullOrWhiteSpace(($Pending -join ""))) {
        Write-Host "Business ya está actualizado; no hay cambios para publicar."
        exit 0
    }

    git commit -m "feat(business): publish Business v$PackageVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear el commit. Configura user.name y user.email si Git lo solicita."
    }

    git push origin main
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo enviar el commit a GitHub. Completa el inicio de sesión de GitHub si aparece la ventana."
    }

    $Commit = git rev-parse HEAD
    Write-Host "Business v$PackageVersion publicada correctamente."
    Write-Host "Commit: $Commit"
}
finally {
    Pop-Location
}
