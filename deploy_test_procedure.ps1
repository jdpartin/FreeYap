# Deploy the clear_matchmaking_queue stored procedure for testing
# Usage: .\deploy_test_procedure.ps1

param(
    [string]$ConnectionString = $env:RENDER_DATABASE_URL
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Magenta = "Magenta"

function Invoke-SqlCommand {
    param(
        [string]$SqlCommand,
        [string]$Description
    )
    
    try {
        Write-Host "⚙️  $Description..." -ForegroundColor $Cyan
        
        # Use psql to execute the command
        $result = psql $ConnectionString -c $SqlCommand 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description completed successfully" -ForegroundColor $Green
            return $true
        } else {
            Write-Host "❌ $Description failed: $result" -ForegroundColor $Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
}

function Invoke-SqlFile {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    try {
        Write-Host "⚙️  $Description..." -ForegroundColor $Cyan
        
        if (-not (Test-Path $FilePath)) {
            Write-Host "❌ File not found: $FilePath" -ForegroundColor $Red
            return $false
        }
        
        # Use psql to execute the file
        $result = psql $ConnectionString -f $FilePath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description completed successfully" -ForegroundColor $Green
            return $true
        } else {
            Write-Host "❌ $Description failed: $result" -ForegroundColor $Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
}

Write-Host "🚀 DEPLOYING TEST STORED PROCEDURE" -ForegroundColor $Magenta
Write-Host "===================================" -ForegroundColor $Magenta

if (-not $ConnectionString) {
    Write-Host "❌ No connection string provided. Set RENDER_DATABASE_URL environment variable or pass -ConnectionString parameter." -ForegroundColor $Red
    exit 1
}

# Deploy the clear_matchmaking_queue procedure
$success = Invoke-SqlFile "relational_database\stored_procedures\clear_matchmaking_queue.sql" "Creating clear_matchmaking_queue procedure"

if ($success) {
    Write-Host "🎉 Test procedure deployed successfully!" -ForegroundColor $Green
} else {
    Write-Host "❌ Failed to deploy test procedure" -ForegroundColor $Red
    exit 1
}
