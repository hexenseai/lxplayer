#!/bin/bash
# AI-Assisted Development Helper Script
# Usage: ./scripts/ai-assist.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
API_DIR="apps/api"
WEB_DIR="apps/web"
SCRIPTS_DIR="scripts"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start backend
start_backend() {
    print_header "Starting Backend"
    
    if check_port 8000; then
        print_warning "Port 8000 is already in use"
        return 1
    fi
    
    cd $API_DIR
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    print_status "Starting FastAPI server..."
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
    print_status "Backend started on http://localhost:8000"
    print_status "API docs available at http://localhost:8000/docs"
}

# Function to start frontend
start_frontend() {
    print_header "Starting Frontend"
    
    if check_port 3000; then
        print_warning "Port 3000 is already in use"
        return 1
    fi
    
    cd $WEB_DIR
    print_status "Installing Node.js dependencies..."
    npm install
    
    print_status "Starting Next.js development server..."
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
    print_status "Frontend started on http://localhost:3000"
}

# Function to stop services
stop_services() {
    print_header "Stopping Services"
    
    if [ -f backend.pid ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_status "Stopping backend (PID: $BACKEND_PID)..."
            kill $BACKEND_PID
            rm backend.pid
        fi
    fi
    
    if [ -f frontend.pid ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_status "Stopping frontend (PID: $FRONTEND_PID)..."
            kill $FRONTEND_PID
            rm frontend.pid
        fi
    fi
    
    print_status "All services stopped"
}

# Function to run database migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    cd $API_DIR
    print_status "Running Alembic migrations..."
    alembic upgrade head
    
    cd ..
    print_status "Migrations completed"
}

# Function to test API endpoints
test_api() {
    print_header "Testing API Endpoints"
    
    if command_exists python3; then
        print_status "Running Python API tests..."
        python3 $SCRIPTS_DIR/debug-backend.py
    elif command_exists python; then
        print_status "Running Python API tests..."
        python $SCRIPTS_DIR/debug-backend.py
    else
        print_error "Python not found. Please install Python to run API tests."
        return 1
    fi
}

# Function to test API with PowerShell (Windows)
test_api_powershell() {
    print_header "Testing API Endpoints (PowerShell)"
    
    if command_exists pwsh; then
        print_status "Running PowerShell API tests..."
        pwsh $SCRIPTS_DIR/test-endpoints.ps1
    elif command_exists powershell; then
        print_status "Running PowerShell API tests..."
        powershell $SCRIPTS_DIR/test-endpoints.ps1
    else
        print_error "PowerShell not found. Please install PowerShell to run API tests."
        return 1
    fi
}

# Function to check system requirements
check_requirements() {
    print_header "Checking System Requirements"
    
    # Check Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        print_status "Python 3: $PYTHON_VERSION ✓"
    elif command_exists python; then
        PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
        print_status "Python: $PYTHON_VERSION ✓"
    else
        print_error "Python not found. Please install Python 3.8+"
        return 1
    fi
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_status "Node.js: $NODE_VERSION ✓"
    else
        print_error "Node.js not found. Please install Node.js 16+"
        return 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_status "npm: $NPM_VERSION ✓"
    else
        print_error "npm not found. Please install npm"
        return 1
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        print_status "PostgreSQL: Available ✓"
    else
        print_warning "PostgreSQL not found. Please install PostgreSQL"
    fi
    
    # Check ports
    if check_port 8000; then
        print_warning "Port 8000 is in use"
    else
        print_status "Port 8000: Available ✓"
    fi
    
    if check_port 3000; then
        print_warning "Port 3000 is in use"
    else
        print_status "Port 3000: Available ✓"
    fi
}

# Function to show help
show_help() {
    echo "AI-Assisted Development Helper Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start-backend     Start the FastAPI backend server"
    echo "  start-frontend    Start the Next.js frontend server"
    echo "  start-all         Start both backend and frontend"
    echo "  stop              Stop all running services"
    echo "  restart           Restart all services"
    echo "  migrate           Run database migrations"
    echo "  test-api          Test API endpoints (Python)"
    echo "  test-api-ps       Test API endpoints (PowerShell)"
    echo "  check             Check system requirements"
    echo "  status            Show status of running services"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start-all      # Start both services"
    echo "  $0 test-api       # Test API endpoints"
    echo "  $0 migrate        # Run database migrations"
}

# Function to show status
show_status() {
    print_header "Service Status"
    
    if [ -f backend.pid ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_status "Backend: Running (PID: $BACKEND_PID)"
        else
            print_warning "Backend: Not running (stale PID file)"
            rm backend.pid
        fi
    else
        print_warning "Backend: Not running"
    fi
    
    if [ -f frontend.pid ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_status "Frontend: Running (PID: $FRONTEND_PID)"
        else
            print_warning "Frontend: Not running (stale PID file)"
            rm frontend.pid
        fi
    else
        print_warning "Frontend: Not running"
    fi
    
    # Check ports
    if check_port 8000; then
        print_status "Port 8000: In use"
    else
        print_warning "Port 8000: Available"
    fi
    
    if check_port 3000; then
        print_status "Port 3000: In use"
    else
        print_warning "Port 3000: Available"
    fi
}

# Function to start all services
start_all() {
    print_header "Starting All Services"
    
    start_backend
    sleep 2
    
    start_frontend
    sleep 2
    
    print_status "All services started!"
    print_status "Backend: http://localhost:8000"
    print_status "Frontend: http://localhost:3000"
    print_status "API Docs: http://localhost:8000/docs"
}

# Function to restart services
restart_services() {
    print_header "Restarting Services"
    
    stop_services
    sleep 2
    start_all
}

# Main script logic
case "${1:-help}" in
    "start-backend")
        start_backend
        ;;
    "start-frontend")
        start_frontend
        ;;
    "start-all")
        start_all
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "migrate")
        run_migrations
        ;;
    "test-api")
        test_api
        ;;
    "test-api-ps")
        test_api_powershell
        ;;
    "check")
        check_requirements
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac
