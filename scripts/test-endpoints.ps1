# PowerShell script for testing API endpoints
# Usage: .\scripts\test-endpoints.ps1

param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Username = "superadmin@example.com",
    [string]$Password = "admin123"
)

Write-Host "=== LXPlayer API Endpoint Tester ===" -ForegroundColor Green

# Function to make authenticated requests
function Invoke-AuthenticatedRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    $requestHeaders = $Headers.Clone()
    $requestHeaders["Authorization"] = "Bearer $global:AuthToken"
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $requestHeaders -Body $Body -ContentType "application/json"
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $requestHeaders
        }
        return $response
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Step 1: Test authentication
Write-Host "`n1. Testing Authentication..." -ForegroundColor Yellow
$loginData = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $global:AuthToken = $loginResponse.access_token
    Write-Host "✓ Authentication successful" -ForegroundColor Green
    Write-Host "Token: $($global:AuthToken.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test user info
Write-Host "`n2. Testing User Info..." -ForegroundColor Yellow
$userInfo = Invoke-AuthenticatedRequest -Url "$BaseUrl/auth/me"
if ($userInfo) {
    Write-Host "✓ User info retrieved" -ForegroundColor Green
    Write-Host "User: $($userInfo.username) ($($userInfo.role))" -ForegroundColor Gray
} else {
    Write-Host "✗ Failed to get user info" -ForegroundColor Red
}

# Step 3: Test users endpoint
Write-Host "`n3. Testing Users Endpoint..." -ForegroundColor Yellow
$users = Invoke-AuthenticatedRequest -Url "$BaseUrl/users/"
if ($users) {
    Write-Host "✓ Users endpoint working" -ForegroundColor Green
    Write-Host "Found $($users.Count) users" -ForegroundColor Gray
} else {
    Write-Host "✗ Users endpoint failed" -ForegroundColor Red
}

# Step 4: Test companies endpoint
Write-Host "`n4. Testing Companies Endpoint..." -ForegroundColor Yellow
$companies = Invoke-AuthenticatedRequest -Url "$BaseUrl/companies/"
if ($companies) {
    Write-Host "✓ Companies endpoint working" -ForegroundColor Green
    Write-Host "Found $($companies.Count) companies" -ForegroundColor Gray
} else {
    Write-Host "✗ Companies endpoint failed" -ForegroundColor Red
}

# Step 5: Test styles endpoint
Write-Host "`n5. Testing Styles Endpoint..." -ForegroundColor Yellow
$styles = Invoke-AuthenticatedRequest -Url "$BaseUrl/styles/"
if ($styles) {
    Write-Host "✓ Styles endpoint working" -ForegroundColor Green
    Write-Host "Found $($styles.Count) styles" -ForegroundColor Gray
} else {
    Write-Host "✗ Styles endpoint failed" -ForegroundColor Red
}

# Step 6: Test trainings endpoint
Write-Host "`n6. Testing Trainings Endpoint..." -ForegroundColor Yellow
$trainings = Invoke-AuthenticatedRequest -Url "$BaseUrl/trainings/"
if ($trainings) {
    Write-Host "✓ Trainings endpoint working" -ForegroundColor Green
    Write-Host "Found $($trainings.Count) trainings" -ForegroundColor Gray
} else {
    Write-Host "✗ Trainings endpoint failed" -ForegroundColor Red
}

# Step 7: Test assets endpoint
Write-Host "`n7. Testing Assets Endpoint..." -ForegroundColor Yellow
$assets = Invoke-AuthenticatedRequest -Url "$BaseUrl/assets/"
if ($assets) {
    Write-Host "✓ Assets endpoint working" -ForegroundColor Green
    Write-Host "Found $($assets.Count) assets" -ForegroundColor Gray
} else {
    Write-Host "✗ Assets endpoint failed" -ForegroundColor Red
}

# Step 8: Test frame configs endpoint
Write-Host "`n8. Testing Frame Configs Endpoint..." -ForegroundColor Yellow
$frameConfigs = Invoke-AuthenticatedRequest -Url "$BaseUrl/frame-configs/"
if ($frameConfigs) {
    Write-Host "✓ Frame configs endpoint working" -ForegroundColor Green
    Write-Host "Found $($frameConfigs.Count) frame configs" -ForegroundColor Gray
} else {
    Write-Host "✗ Frame configs endpoint failed" -ForegroundColor Red
}

# Step 9: Test creating a new style (if styles endpoint works)
if ($styles -ne $null) {
    Write-Host "`n9. Testing Style Creation..." -ForegroundColor Yellow
    $newStyle = @{
        name = "Test Style $(Get-Date -Format 'yyyyMMddHHmmss')"
        description = "Test style created by PowerShell script"
        style_json = '{"color": "#000000", "fontSize": "14px"}'
    } | ConvertTo-Json
    
    $createdStyle = Invoke-AuthenticatedRequest -Url "$BaseUrl/styles/" -Method POST -Body $newStyle
    if ($createdStyle) {
        Write-Host "✓ Style creation successful" -ForegroundColor Green
        Write-Host "Created style: $($createdStyle.name)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Style creation failed" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Green
Write-Host "Authentication: $($global:AuthToken -ne $null)" -ForegroundColor $(if ($global:AuthToken) { "Green" } else { "Red" })
Write-Host "API Endpoints tested successfully!" -ForegroundColor Green

Write-Host "`n=== Quick Commands ===" -ForegroundColor Cyan
Write-Host "Test specific endpoint:"
Write-Host "  Invoke-AuthenticatedRequest -Url '$BaseUrl/endpoint'"
Write-Host "`nTest with different user:"
Write-Host "  .\scripts\test-endpoints.ps1 -Username 'admin@example.com' -Password 'password'"
Write-Host "`nTest different server:"
Write-Host "  .\scripts\test-endpoints.ps1 -BaseUrl 'http://production-server:8000'"
