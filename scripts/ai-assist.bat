@echo off
REM AI-Assisted Development Helper Script for Windows
REM Usage: scripts\ai-assist.bat [command]

setlocal enabledelayedexpansion

REM Project directories
set API_DIR=apps\api
set WEB_DIR=apps\web
set SCRIPTS_DIR=scripts

REM Default command
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

REM Function to start backend
:start-backend
echo === Starting Backend ===
cd /d %API_DIR%
echo [INFO] Installing Python dependencies...
pip install -r requirements.txt
echo [INFO] Starting FastAPI server...
start /b uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
cd /d ..\..
echo [INFO] Backend started on http://localhost:8000
echo [INFO] API docs available at http://localhost:8000/docs
goto :eof

REM Function to start frontend
:start-frontend
echo === Starting Frontend ===
cd /d %WEB_DIR%
echo [INFO] Installing Node.js dependencies...
npm install
echo [INFO] Starting Next.js development server...
start /b npm run dev
cd /d ..\..
echo [INFO] Frontend started on http://localhost:3000
goto :eof

REM Function to start all services
:start-all
echo === Starting All Services ===
call :start-backend
timeout /t 2 /nobreak >nul
call :start-frontend
timeout /t 2 /nobreak >nul
echo [INFO] All services started!
echo [INFO] Backend: http://localhost:8000
echo [INFO] Frontend: http://localhost:3000
echo [INFO] API Docs: http://localhost:8000/docs
goto :eof

REM Function to stop services
:stop
echo === Stopping Services ===
echo [INFO] Stopping all services...
taskkill /f /im uvicorn.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo [INFO] All services stopped
goto :eof

REM Function to restart services
:restart
echo === Restarting Services ===
call :stop
timeout /t 2 /nobreak >nul
call :start-all
goto :eof

REM Function to run migrations
:migrate
echo === Running Database Migrations ===
cd /d %API_DIR%
echo [INFO] Running Alembic migrations...
alembic upgrade head
cd /d ..\..
echo [INFO] Migrations completed
goto :eof

REM Function to test API
:test-api
echo === Testing API Endpoints ===
if exist "%SCRIPTS_DIR%\test-endpoints.ps1" (
    echo [INFO] Running PowerShell API tests...
    powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%\test-endpoints.ps1"
) else (
    echo [ERROR] test-endpoints.ps1 not found
)
goto :eof

REM Function to check requirements
:check
echo === Checking System Requirements ===
echo [INFO] Checking Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do echo [INFO] Python: %%i ✓
) else (
    echo [ERROR] Python not found. Please install Python 3.8+
    goto :eof
)

echo [INFO] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo [INFO] Node.js: %%i ✓
) else (
    echo [ERROR] Node.js not found. Please install Node.js 16+
    goto :eof
)

echo [INFO] Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo [INFO] npm: %%i ✓
) else (
    echo [ERROR] npm not found. Please install npm
    goto :eof
)

echo [INFO] All requirements met!
goto :eof

REM Function to show status
:status
echo === Service Status ===
echo [INFO] Checking service status...
netstat -an | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo [INFO] Backend: Running on port 8000
) else (
    echo [WARNING] Backend: Not running
)

netstat -an | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo [INFO] Frontend: Running on port 3000
) else (
    echo [WARNING] Frontend: Not running
)
goto :eof

REM Function to show help
:help
echo AI-Assisted Development Helper Script for Windows
echo.
echo Usage: scripts\ai-assist.bat [command]
echo.
echo Commands:
echo   start-backend     Start the FastAPI backend server
echo   start-frontend    Start the Next.js frontend server
echo   start-all         Start both backend and frontend
echo   stop              Stop all running services
echo   restart           Restart all services
echo   migrate           Run database migrations
echo   test-api          Test API endpoints
echo   check             Check system requirements
echo   status            Show status of running services
echo   help              Show this help message
echo.
echo Examples:
echo   scripts\ai-assist.bat start-all      # Start both services
echo   scripts\ai-assist.bat test-api       # Test API endpoints
echo   scripts\ai-assist.bat migrate        # Run database migrations
goto :eof

REM Main script logic
if "%COMMAND%"=="start-backend" goto :start-backend
if "%COMMAND%"=="start-frontend" goto :start-frontend
if "%COMMAND%"=="start-all" goto :start-all
if "%COMMAND%"=="stop" goto :stop
if "%COMMAND%"=="restart" goto :restart
if "%COMMAND%"=="migrate" goto :migrate
if "%COMMAND%"=="test-api" goto :test-api
if "%COMMAND%"=="check" goto :check
if "%COMMAND%"=="status" goto :status
if "%COMMAND%"=="help" goto :help

REM Default to help if command not recognized
goto :help
