$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot
Set-Location $Root

Write-Host '>>> Windows detected.'
Write-Host ">>> Project folder: $Root"

function Wait-ForKey {
    param([string]$Message = 'Press Enter to exit')
    Read-Host $Message
}

function Ensure-Command {
    param(
        [string]$Name,
        [string]$WingetId,
        [string]$InstallMessage
    )
    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        return $false
    }
    Write-Host $InstallMessage
    winget install --id $WingetId -e --source winget --accept-package-agreements --accept-source-agreements
    return $true
}

try {
    $needsRestart = $false
    $needsRestart = (Ensure-Command git 'Git.Git' '>>> Installing Git...') -or $needsRestart
    $needsRestart = (Ensure-Command python 'Python.Python.3.12' '>>> Installing Python 3.12...') -or $needsRestart
    $needsRestart = (Ensure-Command node 'OpenJS.NodeJS' '>>> Installing Node.js...') -or $needsRestart

    if ($needsRestart) {
        Write-Host '>>> Dependencies installed. Close this window, open a new one, then run start.bat again.'
        Wait-ForKey
        exit 0
    }

    $backendDir = Join-Path $Root 'Backend'
    if (-not (Test-Path $backendDir)) {
        throw "Backend folder not found at: $backendDir"
    }

    Set-Location $backendDir

    if (-not (Test-Path 'venv')) {
        Write-Host '>>> Creating virtual environment.'
        python -m venv venv
    }

    if (-not (Test-Path '.env')) {
        Write-Host '>>> Creating .env file.'
        @'
ROBOFLOW_API_KEY=6atWA2cbQchB3BYxyeTs
ROBOFLOW_MODEL_ID=hull-updated/2
'@ | Out-File -FilePath '.env' -Encoding utf8
    }

    & (Join-Path $backendDir 'venv\Scripts\Activate.ps1')

    if (-not (Test-Path 'venv\.pip_installed')) {
        Write-Host '>>> Installing pip packages (first run may take several minutes).'
        pip install -r requirements.txt
        New-Item -Path 'venv\.pip_installed' -ItemType File -Force | Out-Null
    }

    Write-Host '>>> Starting backend.'
    $backend = Start-Process python -ArgumentList @(
        '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'
    ) -WorkingDirectory $backendDir -PassThru -WindowStyle Normal

    Write-Host '>>> Waiting for backend to start.'
    $backendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/v1/ping' -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Host '>>> Backend is ready!'
            $backendReady = $true
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $backendReady) {
        throw 'Backend did not respond on http://127.0.0.1:8000/api/v1/ping within 30 seconds.'
    }

    Set-Location $Root

    if (-not (Test-Path 'node_modules\.npm_installed')) {
        Write-Host '>>> Installing npm packages (first run may take several minutes).'
        npm install
        New-Item -Path 'node_modules\.npm_installed' -ItemType File -Force | Out-Null
    }

    Write-Host '>>> Starting frontend.'
    $frontend = Start-Process 'cmd.exe' -ArgumentList @(
        '/c', 'npm run dev'
    ) -WorkingDirectory $Root -PassThru -WindowStyle Normal

    Start-Sleep -Seconds 5
    Start-Process 'http://localhost:5173'

    Write-Host '>>> App running at http://localhost:5173'
    Write-Host '>>> Press Enter here to stop backend and frontend.'
    Wait-ForKey 'Press Enter to stop'

    if ($backend -and -not $backend.HasExited) { $backend.Kill() }
    if ($frontend -and -not $frontend.HasExited) { $frontend.Kill() }
    Write-Host '>>> Done.'
}
catch {
    Write-Host ''
    Write-Host '>>> ERROR:' $_.Exception.Message -ForegroundColor Red
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace
    }
    Wait-ForKey
    exit 1
}
