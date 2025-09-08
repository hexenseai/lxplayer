# Debugging Guide for LXPlayer

## Quick Reference

### Backend Issues
```bash
# Check backend logs
tail -f backend.log

# Test API endpoints
curl -X GET http://localhost:8000/endpoint -H "Authorization: Bearer TOKEN"

# Check database
psql -d lxplayer_db -c "SELECT * FROM table_name;"
```

### Frontend Issues
```javascript
// Check network requests
console.log('API Response:', response);

// Check authentication
console.log('Token:', localStorage.getItem('lx_token'));

// Check user data
console.log('User:', user);
```

## Common Debugging Scenarios

### 1. API Endpoint Not Working

#### Symptoms
- 500 Internal Server Error
- CORS errors
- Authentication failures

#### Debug Steps
1. **Check Backend Logs**
   ```bash
   # Look for error messages in backend console
   # Check for import errors, database issues
   ```

2. **Test Endpoint Directly**
   ```powershell
   # Get authentication token
   $loginData = @{
       username = "superadmin@example.com"
       password = "admin123"
   } | ConvertTo-Json
   
   $response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
   $token = $response.access_token
   
   # Test the endpoint
   $headers = @{
       "Authorization" = "Bearer $token"
   }
   Invoke-RestMethod -Uri "http://localhost:8000/endpoint" -Method GET -Headers $headers
   ```

3. **Add Debug Prints**
   ```python
   @router.get("/endpoint")
   async def endpoint():
       print("DEBUG: Endpoint called")
       try:
           # Your code here
           print("DEBUG: Success")
           return result
       except Exception as e:
           print(f"DEBUG: Error: {e}")
           raise
   ```

### 2. Database Schema Issues

#### Symptoms
- `column does not exist` errors
- Foreign key constraint violations
- Migration failures

#### Debug Steps
1. **Check Model vs Database**
   ```python
   # Compare model definition with actual database schema
   # Look for missing columns or incorrect types
   ```

2. **Run Migrations**
   ```bash
   cd apps/api
   alembic current
   alembic upgrade head
   ```

3. **Check Foreign Keys**
   ```sql
   -- Check foreign key constraints
   SELECT * FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY';
   ```

### 3. Authentication Issues

#### Symptoms
- 401 Unauthorized errors
- Token validation failures
- Permission denied errors

#### Debug Steps
1. **Check Token Validity**
   ```javascript
   // In browser console
   console.log('Token:', localStorage.getItem('lx_token'));
   console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));
   ```

2. **Test Authentication Flow**
   ```powershell
   # Test login
   $loginData = @{
       username = "superadmin@example.com"
       password = "admin123"
   } | ConvertTo-Json
   
   $response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
   $token = $response.access_token
   
   # Test protected endpoint
   $headers = @{
       "Authorization" = "Bearer $token"
   }
   Invoke-RestMethod -Uri "http://localhost:8000/auth/me" -Method GET -Headers $headers
   ```

3. **Check User Roles**
   ```python
   # In backend
   print(f"DEBUG: User role: {current_user.role}")
   print(f"DEBUG: Is super admin: {is_super_admin(current_user)}")
   ```

### 4. Frontend Integration Issues

#### Symptoms
- API calls failing
- Data not loading
- UI not updating

#### Debug Steps
1. **Check Network Requests**
   ```javascript
   // In browser dev tools Network tab
   // Look for failed requests, check status codes
   // Verify request headers and payload
   ```

2. **Check API Client**
   ```typescript
   // In api.ts
   const request = async (url: string, schema: any, options: RequestInit = {}) => {
     console.log('DEBUG: Making request to:', url);
     console.log('DEBUG: Options:', options);
     
     try {
       const res = await fetch(url, options);
       console.log('DEBUG: Response status:', res.status);
       const text = await res.text();
       console.log('DEBUG: Response text:', text);
       // ... rest of the function
     } catch (error) {
       console.error('DEBUG: Request failed:', error);
       throw error;
     }
   };
   ```

3. **Check Component State**
   ```typescript
   // In React components
   useEffect(() => {
     console.log('DEBUG: Component mounted, loading data...');
     loadData();
   }, []);
   
   const loadData = async () => {
     try {
       console.log('DEBUG: Loading data...');
       const data = await api.getData();
       console.log('DEBUG: Data loaded:', data);
       setData(data);
     } catch (error) {
       console.error('DEBUG: Failed to load data:', error);
     }
   };
   ```

## Debugging Tools

### Backend Tools
- **Python Debugger**: `import pdb; pdb.set_trace()`
- **Logging**: `import logging; logging.basicConfig(level=logging.DEBUG)`
- **Database**: `psql` command line tool
- **API Testing**: `curl` or PowerShell `Invoke-RestMethod`

### Frontend Tools
- **Browser Dev Tools**: Network, Console, Application tabs
- **React DevTools**: Component state and props inspection
- **Console Logging**: Strategic `console.log` statements
- **Network Inspection**: Request/response analysis

### Database Tools
- **psql**: Command line PostgreSQL client
- **pgAdmin**: GUI database management
- **Alembic**: Database migration tool

## Error Patterns and Solutions

### Pattern 1: Model-Database Mismatch
```python
# Problem: Model has field but database doesn't
class Style(SQLModel, table=True):
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")

# Solution: Add migration or remove field temporarily
# company_id: Optional[str] = Field(default=None, foreign_key="company.id")  # Comment out
```

### Pattern 2: Authentication Token Issues
```typescript
// Problem: Token expired or invalid
// Solution: Re-login or refresh token
const token = localStorage.getItem('lx_token');
if (!token) {
  // Redirect to login
  window.location.href = '/login';
}
```

### Pattern 3: CORS Issues
```python
# Problem: Frontend can't access backend
# Solution: Check CORS settings in main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Pattern 4: Foreign Key Constraints
```sql
-- Problem: Cannot drop table due to foreign key constraints
-- Solution: Drop constraints first, then table
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
DROP TABLE table_name;
```

## Prevention Strategies

### 1. Consistent Testing
- Test API endpoints after every change
- Verify authentication flows
- Check database migrations

### 2. Error Handling
- Add comprehensive error handling
- Provide user-friendly error messages
- Log detailed errors for debugging

### 3. Documentation
- Document API endpoints
- Keep debugging guides updated
- Record common issues and solutions

### 4. Code Review
- Review changes before deployment
- Check for potential issues
- Verify error handling

## Emergency Procedures

### Backend Down
1. Check backend logs
2. Restart backend service
3. Check database connection
4. Verify environment variables

### Database Issues
1. Check database service
2. Verify connection string
3. Run database migrations
4. Check disk space

### Frontend Issues
1. Clear browser cache
2. Check network connectivity
3. Verify API endpoints
4. Check authentication tokens

## Contact Information

### Development Team
- **Backend**: Check `apps/api/` directory
- **Frontend**: Check `apps/web/` directory
- **Database**: Check `alembic/` migrations

### Resources
- **API Docs**: `http://localhost:8000/docs`
- **Database**: PostgreSQL on localhost:5432
- **Frontend**: Next.js on localhost:3000
- **Backend**: FastAPI on localhost:8000
