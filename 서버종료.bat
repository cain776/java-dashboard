@echo off
title BVIIT Server Shutdown
echo ========================================
echo   BVIIT Analytics Dashboard - Shutdown
echo ========================================
echo.

set FOUND=0
REM 포트 19080/19173 — 서버시작.bat 과 반드시 같은 값이어야 한다(다르면 종료가 안 된다).
set BACKEND_PORT=19080
set FRONTEND_PORT=19173

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    echo [Backend  :%BACKEND_PORT%] PID %%a kill
    taskkill /PID %%a /T /F >nul 2>&1
    set FOUND=1
)

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    echo [Frontend :%FRONTEND_PORT%] PID %%a kill
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
