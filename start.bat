@echo off
powershell -ExecutionPolicy Bypass -Command "& {
    Set-Location $HOME
    
    Write-Host '>>> Windows detected.'
    
    $needsRestart = $false
    
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host '>>> Installing Git...'
        winget install --id Git.Git -e --source winget
        $needsRestart = $true
    }
    
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Host '>>> Installing Python 3.12...'
        winget install --id Python.Python.3.12 -e --source winget
        $needsRestart = $true
    }
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host '>>> Installing Node.js...'
        winget install --id OpenJS.NodeJS -e --source winget
        $needsRestart = $true
    }
    
    if ($needsRestart) {
        Write-Host '>>> Dependencies installed. Please close and re-run this script.'
        Read-Host 'Press Enter to exit'
        exit 0
    }
    
    if (-not (Test-Path 'Deco3801_Ship_Fouling')) {
        Write-Host '>>> Cloning repository.'
        git clone https://github.com/MoeBacon/Deco3801_Ship_Fouling
    } else {
        Write-Host '>>> Repo already exists, skipping clone.'
    }
    
    Set-Location 'Deco3801_Ship_Fouling\Backend'
    
    if (-not (Test-Path 'venv')) {
        Write-Host '>>> Creating virtual environment.'
        python -m venv venv
    }
    
    if (-not (Test-Path '.env')) {
        @'
ROBOFLOW_API_KEY=6atWA2cbQchB3BYxyeTs
ROBOFLOW_MODEL_ID=hull-updated/2
'@ | Out-File -FilePath '.env' -Encoding utf8
    }
    
    & venv\Scripts\Activate.ps1
    
    if (-not (Test-Path 'venv\.pip_installed')) {
        Write-Host '>>> Installing pip packages.'
        pip install -r requirements.txt
        New-Item -Path 'venv\.pip_installed' -ItemType File | Out-Null
    }
    
    Write-Host '>>> Starting backend.'
    $backend = Start-Process python -ArgumentList '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' -PassThru -WindowStyle Hidden
    
    Write-Host '>>> Waiting for backend to start.'
    for ($i = 0; $i -lt 20; $i++) {
        try {
            Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/v1/ping' -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Host '>>> Backend is ready!'
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    
    Set-Location '..'
    
    if (-not (Test-Path 'node_modules\.npm_installed')) {
        Write-Host '>>> Installing npm packages.'
        npm install
        New-Item -Path 'node_modules\.npm_installed' -ItemType File | Out-Null
    }
    
    Write-Host '>>> Starting frontend.'
    $frontend = Start-Process npm -ArgumentList 'run dev' -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 5
    Start-Process 'http://localhost:5173'
    
    Write-Host '>>> Press Enter to stop the server.'
    Read-Host
    
    $backend.Kill()
    $frontend.Kill()
    Write-Host '>>> Done.'
}"
