# Complete FreeYap Database Deployment Script
# This script creates tables, functions, stored procedures, and indexes

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = $env:DATABASE_URL,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipIndexes = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Magenta = "Magenta"

Write-Host "🚀 FreeYap Database Deployment Script" -ForegroundColor $Green
Write-Host "=====================================" -ForegroundColor $Green
Write-Host ""

# Check if DATABASE_URL is provided
if (-not $DatabaseUrl) {
    Write-Host "❌ DATABASE_URL not provided!" -ForegroundColor $Red
    Write-Host "Please set the DATABASE_URL environment variable or pass it as a parameter:" -ForegroundColor $Yellow
    Write-Host "  Example: .\deploy_database.ps1 -DatabaseUrl 'postgresql://user:password@host:port/database'" -ForegroundColor $Yellow
    Write-Host "  Or: `$env:DATABASE_URL='your_url'; .\deploy_database.ps1" -ForegroundColor $Yellow
    exit 1
}

# Mask the password in the URL for display
$MaskedUrl = $DatabaseUrl -replace '://.*:.*@', '://***:***@'
Write-Host "🔗 Database: $MaskedUrl" -ForegroundColor $Cyan
Write-Host ""

# Function to execute SQL file with error handling
function Invoke-SqlFile {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host "📄 $Description" -ForegroundColor $Cyan
    Write-Host "   File: $FilePath" -ForegroundColor $Yellow
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor $Red
        return $false
    }
    
    try {
        $output = psql -d $DatabaseUrl -f $FilePath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Success: $Description" -ForegroundColor $Green
            if ($Verbose) {
                Write-Host "   Output: $output" -ForegroundColor $Yellow
            }
            return $true
        } else {
            Write-Host "❌ Failed: $Description" -ForegroundColor $Red
            Write-Host "   Error: $output" -ForegroundColor $Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Exception: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
    finally {
        Write-Host ""
    }
}

# Function to execute individual SQL command
function Invoke-SqlCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "🔧 $Description" -ForegroundColor $Cyan
    
    try {
        $output = psql -d $DatabaseUrl -c $Command 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Success: $Description" -ForegroundColor $Green
            if ($Verbose) {
                Write-Host "   Output: $output" -ForegroundColor $Yellow
            }
            return $true
        } else {
            Write-Host "❌ Failed: $Description" -ForegroundColor $Red
            Write-Host "   Error: $output" -ForegroundColor $Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Exception: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
    finally {
        Write-Host ""
    }
}

# Test database connection
Write-Host "🔍 Testing database connection..." -ForegroundColor $Magenta
$connectionTest = Invoke-SqlCommand "SELECT 1 as test;" "Connection Test"
if (-not $connectionTest) {
    Write-Host "❌ Cannot connect to database. Please check your DATABASE_URL." -ForegroundColor $Red
    exit 1
}

# Step 1: Create Schema (Tables, Types, Basic Indexes)
Write-Host "📊 STEP 1: Creating Database Schema" -ForegroundColor $Magenta
Write-Host "=================================" -ForegroundColor $Magenta
$schemaResult = Invoke-SqlFile "relational_database\schema\create_schema.sql" "Creating tables, types, and basic indexes"

if (-not $schemaResult) {
    Write-Host "❌ Schema creation failed. Stopping deployment." -ForegroundColor $Red
    exit 1
}

# Step 2: Create Custom Types
Write-Host "🏗️  STEP 2: Creating Custom Types" -ForegroundColor $Magenta
Write-Host "===============================" -ForegroundColor $Magenta
$typesResult = Invoke-SqlFile "relational_database\types\user_queue_info.sql" "Creating UserQueueInfo type"

# Step 3: Create Functions
Write-Host "⚙️  STEP 3: Creating Database Functions" -ForegroundColor $Magenta
Write-Host "====================================" -ForegroundColor $Magenta

$functions = @(
    @{File = "relational_database\functions\get_and_delete_queue_entry.sql"; Desc = "get_and_delete_queue_entry function"},
    @{File = "relational_database\functions\get_oldest_delayed_term_user.sql"; Desc = "get_oldest_delayed_term_user function"},
    @{File = "relational_database\functions\get_oldest_random_topic_user.sql"; Desc = "get_oldest_random_topic_user function"},
    @{File = "relational_database\functions\get_oldest_topic_user.sql"; Desc = "get_oldest_topic_user function"},
    @{File = "relational_database\functions\get_popular_topics.sql"; Desc = "get_popular_topics function"},
    @{File = "relational_database\functions\get_queued_user_with_most_matches.sql"; Desc = "get_queued_user_with_most_matches function"},
    @{File = "relational_database\functions\get_topic_embedding.sql"; Desc = "get_topic_embedding function"},
    @{File = "relational_database\functions\get_topic_popularity.sql"; Desc = "get_topic_popularity function"}
)

$functionsSuccess = $true
foreach ($func in $functions) {
    $result = Invoke-SqlFile $func.File $func.Desc
    if (-not $result) {
        $functionsSuccess = $false
    }
}

# Step 4: Create Stored Procedures
Write-Host "📋 STEP 4: Creating Stored Procedures" -ForegroundColor $Magenta
Write-Host "===================================" -ForegroundColor $Magenta

$procedures = @(
    @{File = "relational_database\stored_procedures\add_back_to_queue.sql"; Desc = "add_back_to_queue procedure"},
    @{File = "relational_database\stored_procedures\add_to_queue.sql"; Desc = "add_to_queue procedure"},
    @{File = "relational_database\stored_procedures\bulk_insert_topic_history.sql"; Desc = "bulk_insert_topic_history procedure"},
    @{File = "relational_database\stored_procedures\remove_from_queue.sql"; Desc = "remove_from_queue procedure"},
    @{File = "relational_database\stored_procedures\save_topic_embedding.sql"; Desc = "save_topic_embedding procedure"}
)

$proceduresSuccess = $true
foreach ($proc in $procedures) {
    $result = Invoke-SqlFile $proc.File $proc.Desc
    if (-not $result) {
        $proceduresSuccess = $false
    }
}

# Step 5: Create Performance Indexes (if not skipped)
if (-not $SkipIndexes) {
    Write-Host "🚀 STEP 5: Creating Performance Indexes" -ForegroundColor $Magenta
    Write-Host "====================================" -ForegroundColor $Magenta
    Write-Host "⚠️  Note: This may take several minutes for large tables" -ForegroundColor $Yellow
    Write-Host ""
    
    # Run the PowerShell index deployment script
    $indexScriptPath = "relational_database\indexes\deploy_indexes.ps1"
    if (Test-Path $indexScriptPath) {
        try {
            & $indexScriptPath
        } catch {
            Write-Host "❌ Index deployment failed: $($_.Exception.Message)" -ForegroundColor $Red
        }
    } else {
        Write-Host "❌ Index deployment script not found: $indexScriptPath" -ForegroundColor $Red
    }
} else {
    Write-Host "⏭️  STEP 5: Skipping Performance Indexes (use -SkipIndexes:$false to include)" -ForegroundColor $Yellow
    Write-Host ""
}

# Step 6: Verification
Write-Host "✅ STEP 6: Verification" -ForegroundColor $Magenta
Write-Host "=====================" -ForegroundColor $Magenta

# Verify tables
Write-Host "🔍 Checking tables..." -ForegroundColor $Cyan
$tableCheck = Invoke-SqlCommand @"
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('session_sockets', 'matchmaking_queue', 'queue_topics', 'topic_embeddings', 'topic_history')
ORDER BY table_name;
"@ "Verifying tables exist"

# Verify functions
Write-Host "🔍 Checking functions..." -ForegroundColor $Cyan
$functionCheck = Invoke-SqlCommand @"
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
  AND routine_name LIKE 'get_%'
ORDER BY routine_name;
"@ "Verifying functions exist"

# Verify procedures
Write-Host "🔍 Checking stored procedures..." -ForegroundColor $Cyan
$procedureCheck = Invoke-SqlCommand @"
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'PROCEDURE'
ORDER BY routine_name;
"@ "Verifying procedures exist"

# Final Summary
Write-Host "🎉 DEPLOYMENT SUMMARY" -ForegroundColor $Green
Write-Host "====================" -ForegroundColor $Green

if ($schemaResult) {
    Write-Host "✅ Schema: Success" -ForegroundColor $Green
} else {
    Write-Host "❌ Schema: Failed" -ForegroundColor $Red
}

if ($functionsSuccess) {
    Write-Host "✅ Functions: Success" -ForegroundColor $Green
} else {
    Write-Host "❌ Functions: Some failed" -ForegroundColor $Red
}

if ($proceduresSuccess) {
    Write-Host "✅ Procedures: Success" -ForegroundColor $Green
} else {
    Write-Host "❌ Procedures: Some failed" -ForegroundColor $Red
}

if (-not $SkipIndexes) {
    Write-Host "✅ Indexes: Attempted (check output above)" -ForegroundColor $Green
} else {
    Write-Host "⏭️  Indexes: Skipped" -ForegroundColor $Yellow
}

Write-Host ""
Write-Host "🚀 Your FreeYap database is ready!" -ForegroundColor $Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Yellow
Write-Host "1. Test your application with the new database" -ForegroundColor $White
Write-Host "2. Monitor performance and query execution" -ForegroundColor $White
Write-Host "3. Run ANALYZE on tables to update statistics" -ForegroundColor $White
Write-Host ""
Write-Host "To monitor index usage:" -ForegroundColor $Yellow
Write-Host "psql -d `"$DatabaseUrl`" -c `"SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;`"" -ForegroundColor $Gray
