@echo off
setlocal disabledelayedexpansion
title BVIIT Analytics Dashboard

echo ========================================
echo   BVIIT Analytics Dashboard - Start
echo ========================================
echo.

set PROJECT_DIR=%~dp0
set BACKEND_PORT=18080
set FRONTEND_PORT=15173
set SERVER_PORT=%BACKEND_PORT%
set VITE_BACKEND_URL=http://localhost:%BACKEND_PORT%
set VITE_FRONTEND_PORT=%FRONTEND_PORT%
set APP_CORS_ALLOWED_ORIGINS=http://localhost:%FRONTEND_PORT%

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)

set BOOT_PROFILE=
if exist %PROJECT_DIR%backend\.env (
    for /f "usebackq tokens=1* delims==" %%a in (%PROJECT_DIR%backend\.env) do (
        set "%%a=%%b"
    )
    echo [ENV] .env loaded
    set BOOT_PROFILE=mssql
)

echo [Backend]  http://localhost:%BACKEND_PORT%
echo [Frontend] http://localhost:%FRONTEND_PORT%
echo [Login]    admin / 1234
echo.
echo ========================================

if defined BOOT_PROFILE (
    start "Backend" cmd /k "cd /d %PROJECT_DIR%backend && gradlew.bat bootRun --args=--spring.profiles.active=mssql"
) else (
    start "Backend" cmd /k "cd /d %PROJECT_DIR%backend && gradlew.bat bootRun"
)

cd /d %PROJECT_DIR%frontend
npm run dev
