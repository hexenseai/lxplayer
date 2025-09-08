# AI-Assisted Development Workflow

## 🎯 Overview
This document describes the human-in-the-loop development approach used in the LXPlayer project, combining AI assistance with human expertise for efficient problem-solving.

## 🚀 Quick Start

### Windows (Recommended)
```cmd
# Quick setup - runs everything automatically
scripts\quick-start.bat

# Or use individual commands
scripts\ai-assist.bat check
scripts\ai-assist.bat start-all
scripts\ai-assist.bat test-api
```

### PowerShell (Windows)
```powershell
# Check if all requirements are met
.\scripts\ai-assist.ps1 check

# Start both backend and frontend
.\scripts\ai-assist.ps1 start-all

# Test API endpoints
.\scripts\ai-assist.ps1 test-api

# Run database migrations
.\scripts\ai-assist.ps1 migrate
```

### Linux/Mac (if needed)
```bash
# Check if all requirements are met
./scripts/ai-assist.sh check

# Start both backend and frontend
./scripts/ai-assist.sh start-all

# Test API endpoints
./scripts/ai-assist.sh test-api

# Run database migrations
./scripts/ai-assist.sh migrate
```

## 🔧 Development Workflow

### Step 1: Identify the Problem
- Check browser console for errors
- Look for CORS, 500, or authentication errors
- Use network tab to inspect API calls

### Step 2: Debug Backend
- Add debug prints to identify the issue
- Check database schema vs model definitions
- Test endpoints directly with authentication

### Step 3: Fix and Test
- Implement the fix
- Test the endpoint directly
- Verify frontend integration

## 🛠️ Available Tools

### Scripts
- `scripts\ai-assist.bat` - Main development helper (Windows)
- `scripts\ai-assist.ps1` - PowerShell development helper (Windows)
- `scripts\quick-start.bat` - Quick setup script (Windows)
- `scripts\debug-backend.py` - Python API testing
- `scripts\test-endpoints.ps1` - PowerShell API testing

### Documentation
- `docs/ai-workflows.md` - Detailed workflow documentation
- `docs/debugging-guide.md` - Comprehensive debugging guide
- `.ai-context/project-context.md` - Project context for AI
- `.ai-context/common-patterns.md` - Common code patterns

### Configuration
- `.cursorrules` - AI assistant rules and context

## 🐛 Common Issues and Solutions

### CORS Errors
```bash
# Check backend CORS settings
grep -r "CORSMiddleware" apps/api/app/main.py
```

### 500 Internal Server Error
```bash
# Check backend logs
tail -f apps/api/backend.log

# Test endpoint directly
./scripts/ai-assist.sh test-api
```

### Authentication Issues
```bash
# Test login endpoint
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin@example.com","password":"admin123"}'
```

### Database Schema Issues
```bash
# Run migrations
./scripts/ai-assist.sh migrate

# Check current migration status
cd apps/api && alembic current
```

## 📊 Testing Strategy

### 1. API Testing
- Test all endpoints with authentication
- Verify error handling
- Check response formats

### 2. Integration Testing
- Test complete user flows
- Verify frontend-backend communication
- Check role-based access control

### 3. Error Testing
- Test with invalid data
- Verify error messages are user-friendly
- Check loading states

## 🔍 Debugging Process

### Backend Debugging
1. Add debug prints to identify issues
2. Check database schema vs models
3. Test endpoints directly
4. Verify authentication and permissions

### Frontend Debugging
1. Check network requests in browser dev tools
2. Verify error handling
3. Test with different user roles
4. Check component state

### Database Debugging
1. Check database connection
2. Verify migrations
3. Check foreign key constraints
4. Test queries directly

## 📝 Best Practices

### Code Quality
- Use TypeScript for frontend, Python for backend
- Follow existing naming conventions
- Add error handling with user-friendly messages
- Include debug logging for troubleshooting

### Testing
- Test API endpoints after every change
- Verify authentication flows
- Check database migrations
- Test error scenarios

### Documentation
- Document API endpoints
- Keep debugging guides updated
- Record common issues and solutions
- Update project context regularly

## 🎯 Success Metrics

### Development Efficiency
- Reduced debugging time
- Faster issue resolution
- Better code quality
- Improved user experience

### Code Quality
- Consistent error handling
- Proper authentication flows
- Clean API design
- Comprehensive testing

## 🔮 Future Improvements

### 1. Automated Testing
- API endpoint testing
- Frontend integration tests
- Authentication flow tests

### 2. AI Learning
- Custom AI models for the codebase
- Automated code suggestions
- Pattern recognition

### 3. Documentation
- Auto-generated API docs
- Interactive debugging guides
- Video tutorials for common issues

## 📞 Support

### Development Team
- **Backend**: Check `apps/api/` directory
- **Frontend**: Check `apps/web/` directory
- **Database**: Check `alembic/` migrations

### Resources
- **API Docs**: `http://localhost:8000/docs`
- **Database**: PostgreSQL on localhost:5432
- **Frontend**: Next.js on localhost:3000
- **Backend**: FastAPI on localhost:8000

### Quick Commands
```cmd
# Check service status
scripts\ai-assist.bat status

# Restart all services
scripts\ai-assist.bat restart

# Stop all services
scripts\ai-assist.bat stop

# Show help
scripts\ai-assist.bat help
```

### PowerShell Commands
```powershell
# Check service status
.\scripts\ai-assist.ps1 status

# Restart all services
.\scripts\ai-assist.ps1 restart

# Stop all services
.\scripts\ai-assist.ps1 stop

# Show help
.\scripts\ai-assist.ps1 help
```

## 🎉 Getting Started

1. **Clone the repository**
2. **Quick setup**: `scripts\quick-start.bat` (Windows)
3. **Or manual setup**:
   - Check requirements: `scripts\ai-assist.bat check`
   - Start services: `scripts\ai-assist.bat start-all`
   - Test API: `scripts\ai-assist.bat test-api`
4. **Begin development**: Follow the debugging workflow

This AI-assisted development approach has proven to be highly effective for rapid problem-solving and maintaining code quality. The combination of human expertise and AI assistance creates a powerful development environment that accelerates the development process while ensuring robust, well-tested code.
