@echo off
setlocal enabledelayedexpansion
title BVIIT Analytics Dashboard

echo ========================================
echo   BVIIT Analytics Dashboard - Start
echo ========================================
echo.

set PROJECT_DIR=%~dp0

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)

set BOOT_PROFILE=
if exist %PROJECT_DIR%backend\.env (
    for /f "usebackq tokens=1* delims==" %%a in (%PROJECT_DIR%backend\.env) do (
        set %%a=%%b
    )
    echo [ENV] .env loaded
    set BOOT_PROFILE=mssql
)

echo [Backend]  http://localhost:8080
echo [Frontend] http://localhost:5173
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
