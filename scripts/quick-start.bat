@echo off
REM Quick Start Script for LXPlayer Development
REM This script sets up the development environment quickly

echo ========================================
echo   LXPlayer Development Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "apps\api" (
    echo [ERROR] Please run this script from the project root directory
    echo [ERROR] Expected to find: apps\api
    pause
    exit /b 1
)

echo [INFO] Starting development environment setup...
echo.

REM Step 1: Check requirements
echo === Step 1: Checking Requirements ===
call scripts\ai-assist.bat check
if %errorlevel% neq 0 (
    echo [ERROR] Requirements check failed
    pause
    exit /b 1
)
echo.

REM Step 2: Run database migrations
echo === Step 2: Running Database Migrations ===
call scripts\ai-assist.bat migrate
if %errorlevel% neq 0 (
    echo [WARNING] Migration failed, but continuing...
)
echo.

REM Step 3: Start services
echo === Step 3: Starting Services ===
call scripts\ai-assist.bat start-all
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)
echo.

REM Step 4: Wait a moment for services to start
echo === Step 4: Waiting for Services to Start ===
echo [INFO] Waiting 10 seconds for services to fully start...
timeout /t 10 /nobreak >nul
echo.

REM Step 5: Test API
echo === Step 5: Testing API ===
call scripts\ai-assist.bat test-api
if %errorlevel% neq 0 (
    echo [WARNING] API test failed, but services may still be working
)
echo.

REM Step 6: Show status
echo === Step 6: Service Status ===
call scripts\ai-assist.bat status
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo [INFO] Backend: http://localhost:8000
echo [INFO] Frontend: http://localhost:3000
echo [INFO] API Docs: http://localhost:8000/docs
echo.
echo [INFO] To stop services: scripts\ai-assist.bat stop
echo [INFO] To restart services: scripts\ai-assist.bat restart
echo [INFO] To test API: scripts\ai-assist.bat test-api
echo.
echo [INFO] Press any key to continue...
pause >nul
