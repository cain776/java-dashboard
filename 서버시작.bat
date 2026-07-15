@echo off
setlocal disabledelayedexpansion
title BVIIT Dashboard

set "PROJECT_DIR=%~dp0"
REM 포트 19080/19173 — 사내 bnviit-dashboard-spring 스택이 18080/15173 을 쓰므로 겹치지 않게 띄운다.
set "BACKEND_PORT=19080"
set "FRONTEND_PORT=19173"
set "SERVER_PORT=%BACKEND_PORT%"
set "VITE_BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "VITE_FRONTEND_PORT=%FRONTEND_PORT%"
set "APP_CORS_ALLOWED_ORIGINS=http://localhost:%FRONTEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"

echo Starting BVIIT Dashboard...
echo.

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)

set "BOOT_PROFILE="
set "BOOT_PROFILE_LABEL=local"
if exist "%PROJECT_DIR%backend\.env" (
    for /f "usebackq tokens=1* delims==" %%a in ("%PROJECT_DIR%backend\.env") do (
        set "%%a=%%b"
    )
    set "BOOT_PROFILE=mssql"
    set "BOOT_PROFILE_LABEL=mssql (.env)"
)

if not defined APP_JWT_SECRET set "APP_JWT_SECRET=bviit-analytics-local-launch-secret-key-%RANDOM%-%RANDOM%"
if not defined APP_SEED_ENABLED set "APP_SEED_ENABLED=true"
if not defined APP_SEED_ADMIN_LOGIN_ID set "APP_SEED_ADMIN_LOGIN_ID=admin"
if not defined APP_SEED_ADMIN_PASSWORD set "APP_SEED_ADMIN_PASSWORD=Local-%RANDOM%-%RANDOM%"

echo Backend : http://localhost:%BACKEND_PORT%
powershell -NoProfile -Command "Write-Host 'Frontend: ' -NoNewline; Write-Host $env:FRONTEND_URL -ForegroundColor Blue"
echo Profile : %BOOT_PROFILE_LABEL%
if /I "%APP_SEED_ENABLED%"=="true" echo Login   : %APP_SEED_ADMIN_LOGIN_ID% / %APP_SEED_ADMIN_PASSWORD%
echo.
echo Backend logs open in a separate window.
echo Frontend runs here. Only errors will be shown.
echo.

if defined BOOT_PROFILE (
    start "Backend" /D "%PROJECT_DIR%backend" cmd /k "gradlew.bat bootRun --args=--spring.profiles.active=mssql"
) else (
    start "Backend" /D "%PROJECT_DIR%backend" cmd /k "gradlew.bat bootRun"
)

cd /d "%PROJECT_DIR%frontend"
if exist "%PROJECT_DIR%frontend\node_modules\vite\bin\vite.js" (
    node "%PROJECT_DIR%frontend\node_modules\vite\bin\vite.js" --logLevel error
) else (
    npm run dev -- --logLevel error
)
