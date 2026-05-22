@echo off
cd /d "%~dp0"
title Deco3801 Ship Fouling

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if errorlevel 1 (
    echo.
    echo start.bat finished with errors.
    pause
)
