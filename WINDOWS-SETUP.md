# Windows Setup Guide for LXPlayer

## 🎯 Quick Start (Recommended)

### Option 1: One-Click Setup
```cmd
# Run this from the project root directory
scripts\quick-start.bat
```

This script will:
- Check system requirements
- Run database migrations
- Start backend and frontend services
- Test API endpoints
- Show service status

### Option 2: Manual Setup
```cmd
# Check requirements
scripts\ai-assist.bat check

# Start services
scripts\ai-assist.bat start-all

# Test API
scripts\ai-assist.bat test-api
```

## 🛠️ Available Scripts

### Batch Scripts (Recommended for Windows)
- `scripts\ai-assist.bat` - Main development helper
- `scripts\quick-start.bat` - Complete setup automation

### PowerShell Scripts
- `scripts\ai-assist.ps1` - PowerShell development helper
- `scripts\test-endpoints.ps1` - API endpoint testing

### Python Scripts
- `scripts\debug-backend.py` - Backend debugging utility

## 📋 Commands Reference

### Basic Commands
```cmd
# Start all services
scripts\ai-assist.bat start-all

# Start backend only
scripts\ai-assist.bat start-backend

# Start frontend only
scripts\ai-assist.bat start-frontend

# Stop all services
scripts\ai-assist.bat stop

# Restart all services
scripts\ai-assist.bat restart
```

### Development Commands
```cmd
# Run database migrations
scripts\ai-assist.bat migrate

# Test API endpoints
scripts\ai-assist.bat test-api

# Check system requirements
scripts\ai-assist.bat check

# Show service status
scripts\ai-assist.bat status

# Show help
scripts\ai-assist.bat help
```

## 🔧 System Requirements

### Required Software
- **Python 3.8+** - For backend development
- **Node.js 16+** - For frontend development
- **npm** - Node package manager
- **PostgreSQL** - Database (optional for development)

### Check Requirements
```cmd
scripts\ai-assist.bat check
```

## 🚀 Development Workflow

### 1. Start Development Environment
```cmd
# Quick start (recommended)
scripts\quick-start.bat

# Or manual start
scripts\ai-assist.bat start-all
```

### 2. Access Services
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

### 3. Test API
```cmd
scripts\ai-assist.bat test-api
```

### 4. Stop Services
```cmd
scripts\ai-assist.bat stop
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```cmd
# Check what's using the ports
netstat -an | findstr ":8000"
netstat -an | findstr ":3000"

# Stop services
scripts\ai-assist.bat stop
```

#### Python Not Found
```cmd
# Check Python installation
python --version

# If not found, install Python 3.8+ from python.org
```

#### Node.js Not Found
```cmd
# Check Node.js installation
node --version
npm --version

# If not found, install Node.js 16+ from nodejs.org
```

#### Database Connection Issues
```cmd
# Run migrations
scripts\ai-assist.bat migrate

# Check database service
services.msc
```

### Error Messages

#### "Python not found"
- Install Python 3.8+ from python.org
- Make sure Python is added to PATH

#### "Node.js not found"
- Install Node.js 16+ from nodejs.org
- Make sure Node.js is added to PATH

#### "Port 8000 is already in use"
- Stop existing services: `scripts\ai-assist.bat stop`
- Or kill processes manually: `taskkill /f /im uvicorn.exe`

#### "Port 3000 is already in use"
- Stop existing services: `scripts\ai-assist.bat stop`
- Or kill processes manually: `taskkill /f /im node.exe`

## 📁 Project Structure

```
lxplayer/
├── scripts/
│   ├── ai-assist.bat          # Main development helper
│   ├── ai-assist.ps1          # PowerShell helper
│   ├── quick-start.bat        # Quick setup script
│   ├── test-endpoints.ps1     # API testing
│   └── debug-backend.py       # Backend debugging
├── apps/
│   ├── api/                   # FastAPI backend
│   └── web/                   # Next.js frontend
├── docs/                      # Documentation
├── .ai-context/               # AI context files
└── .cursorrules               # AI assistant rules
```

## 🔍 Debugging

### Backend Debugging
```cmd
# Test API endpoints
scripts\ai-assist.bat test-api

# Check backend logs
# Look for error messages in the console where backend is running
```

### Frontend Debugging
```cmd
# Check frontend in browser
# Open http://localhost:3000
# Check browser console for errors
```

### Database Debugging
```cmd
# Run migrations
scripts\ai-assist.bat migrate

# Check database connection
# Verify PostgreSQL is running
```

## 📚 Additional Resources

### Documentation
- `docs/ai-workflows.md` - Detailed workflow documentation
- `docs/debugging-guide.md` - Comprehensive debugging guide
- `README-AI-WORKFLOW.md` - AI-assisted development guide

### AI Context
- `.cursorrules` - AI assistant rules
- `.ai-context/project-context.md` - Project context
- `.ai-context/common-patterns.md` - Common patterns

## 🎉 Success!

Once everything is running:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

You can now start developing with the AI-assisted workflow!

## 💡 Tips

1. **Use Quick Start**: `scripts\quick-start.bat` for fastest setup
2. **Check Status**: `scripts\ai-assist.bat status` to see what's running
3. **Test API**: `scripts\ai-assist.bat test-api` to verify everything works
4. **Stop Services**: `scripts\ai-assist.bat stop` when done
5. **Restart**: `scripts\ai-assist.bat restart` if something goes wrong
