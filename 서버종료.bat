@echo off
title BVIIT Server Shutdown
echo ========================================
echo   BVIIT Analytics Dashboard - Shutdown
echo ========================================
echo.

set FOUND=0

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8080 ^| findstr LISTENING') do (
    echo [Backend  :8080] PID %%a kill
    taskkill /PID %%a /T /F >nul 2>&1
    set FOUND=1
)

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :5173 ^| findstr LISTENING') do (
    echo [Frontend :5173] PID %%a kill
    taskkill /PID %%a /T /F >nul 2>&1
    set FOUND=1
)

taskkill /FI "WINDOWTITLE eq Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BVIIT Analytics Dashboard" /T /F >nul 2>&1

if %FOUND%==0 (
    echo No running server found.
) else (
    echo.
    echo All servers and terminals stopped.
)

echo ========================================
pause
