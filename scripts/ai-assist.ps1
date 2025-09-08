# AI-Assisted Development Helper Script for Windows
# Usage: .\scripts\ai-assist.ps1 [command]

param(
    [string]$Command = "help"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Project directories
$API_DIR = "apps\api"
$WEB_DIR = "apps\web"
$SCRIPTS_DIR = "scripts"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Header {
    param([string]$Message)
    Write-Host "=== $Message ===" -ForegroundColor $Blue
}

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to start backend
function Start-Backend {
    Write-Header "Starting Backend"
    
    if (Test-Port 8000) {
        Write-Warning "Port 8000 is already in use"
        return $false
    }
    
    Set-Location $API_DIR
    Write-Status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    Write-Status "Starting FastAPI server..."
    Start-Process -FilePath "uvicorn" -ArgumentList "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -WindowStyle Hidden
    
    Set-Location ..
    Write-Status "Backend started on http://localhost:8000"
    Write-Status "API docs available at http://localhost:8000/docs"
    return $true
}

# Function to start frontend
function Start-Frontend {
    Write-Header "Starting Frontend"
    
    if (Test-Port 3000) {
        Write-Warning "Port 3000 is already in use"
        return $false
    }
    
    Set-Location $WEB_DIR
    Write-Status "Installing Node.js dependencies..."
    npm install
    
    Write-Status "Starting Next.js development server..."
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
    
    Set-Location ..
    Write-Status "Frontend started on http://localhost:3000"
    return $true
}

# Function to stop services
function Stop-Services {
    Write-Header "Stopping Services"
    
    # Stop processes on ports 8000 and 3000
    $processes = Get-Process | Where-Object { $_.ProcessName -eq "uvicorn" -or $_.ProcessName -eq "node" }
    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.Id -Force
            Write-Status "Stopped process: $($process.ProcessName) (PID: $($process.Id))"
        } catch {
            Write-Warning "Could not stop process: $($process.ProcessName)"
        }
    }
    
    Write-Status "All services stopped"
}

# Function to run database migrations
function Invoke-Migrations {
    Write-Header "Running Database Migrations"
    
    Set-Location $API_DIR
    Write-Status "Running Alembic migrations..."
    alembic upgrade head
    
    Set-Location ..
    Write-Status "Migrations completed"
}

# Function to test API endpoints
function Test-API {
    Write-Header "Testing API Endpoints"
    
    if (Test-Path "$SCRIPTS_DIR\test-endpoints.ps1") {
        Write-Status "Running PowerShell API tests..."
        & "$SCRIPTS_DIR\test-endpoints.ps1"
    } else {
        Write-Error "test-endpoints.ps1 not found"
        return $false
    }
}

# Function to check system requirements
function Test-Requirements {
    Write-Header "Checking System Requirements"
    
    # Check Python
    try {
        $pythonVersion = python --version 2>&1
        Write-Status "Python: $pythonVersion ✓"
    } catch {
        Write-Error "Python not found. Please install Python 3.8+"
        return $false
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Status "Node.js: $nodeVersion ✓"
    } catch {
        Write-Error "Node.js not found. Please install Node.js 16+"
        return $false
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Status "npm: $npmVersion ✓"
    } catch {
        Write-Error "npm not found. Please install npm"
        return $false
    }
    
    # Check ports
    if (Test-Port 8000) {
        Write-Warning "Port 8000 is in use"
    } else {
        Write-Status "Port 8000: Available ✓"
    }
    
    if (Test-Port 3000) {
        Write-Warning "Port 3000 is in use"
    } else {
        Write-Status "Port 3000: Available ✓"
    }
    
    return $true
}

# Function to show help
function Show-Help {
    Write-Host "AI-Assisted Development Helper Script for Windows"
    Write-Host ""
    Write-Host "Usage: .\scripts\ai-assist.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start-backend     Start the FastAPI backend server"
    Write-Host "  start-frontend    Start the Next.js frontend server"
    Write-Host "  start-all         Start both backend and frontend"
    Write-Host "  stop              Stop all running services"
    Write-Host "  restart           Restart all services"
    Write-Host "  migrate           Run database migrations"
    Write-Host "  test-api          Test API endpoints"
    Write-Host "  check             Check system requirements"
    Write-Host "  status            Show status of running services"
    Write-Host "  help              Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\ai-assist.ps1 start-all      # Start both services"
    Write-Host "  .\scripts\ai-assist.ps1 test-api       # Test API endpoints"
    Write-Host "  .\scripts\ai-assist.ps1 migrate        # Run database migrations"
}

# Function to show status
function Show-Status {
    Write-Header "Service Status"
    
    # Check backend
    if (Test-Port 8000) {
        Write-Status "Backend: Running on port 8000"
    } else {
        Write-Warning "Backend: Not running"
    }
    
    # Check frontend
    if (Test-Port 3000) {
        Write-Status "Frontend: Running on port 3000"
    } else {
        Write-Warning "Frontend: Not running"
    }
    
    # Check ports
    if (Test-Port 8000) {
        Write-Status "Port 8000: In use"
    } else {
        Write-Warning "Port 8000: Available"
    }
    
    if (Test-Port 3000) {
        Write-Status "Port 3000: In use"
    } else {
        Write-Warning "Port 3000: Available"
    }
}

# Function to start all services
function Start-All {
    Write-Header "Starting All Services"
    
    $backendStarted = Start-Backend
    Start-Sleep -Seconds 2
    
    $frontendStarted = Start-Frontend
    Start-Sleep -Seconds 2
    
    if ($backendStarted -and $frontendStarted) {
        Write-Status "All services started!"
        Write-Status "Backend: http://localhost:8000"
        Write-Status "Frontend: http://localhost:3000"
        Write-Status "API Docs: http://localhost:8000/docs"
    } else {
        Write-Error "Some services failed to start"
    }
}

# Function to restart services
function Restart-Services {
    Write-Header "Restarting Services"
    
    Stop-Services
    Start-Sleep -Seconds 2
    Start-All
}

# Main script logic
switch ($Command.ToLower()) {
    "start-backend" {
        Start-Backend
    }
    "start-frontend" {
        Start-Frontend
    }
    "start-all" {
        Start-All
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Restart-Services
    }
    "migrate" {
        Invoke-Migrations
    }
    "test-api" {
        Test-API
    }
    "check" {
        Test-Requirements
    }
    "status" {
        Show-Status
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}
