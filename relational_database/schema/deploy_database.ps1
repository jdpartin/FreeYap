# Complete FreeYap database deployment script.
# Creates tables, functions, stored procedures, optional indexes, and verifies the result.

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = "",

    [Parameter(Mandatory=$false)]
    [string]$EnvFile = "",

    [Parameter(Mandatory=$false)]
    [switch]$SkipIndexes = $false,

    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput = $false
)

$ErrorActionPreference = "Stop"

$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Magenta = "Magenta"
$Gray = "Gray"
$White = "White"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")

        if ($name) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Get-MaskedUrl {
    param([string]$Url)
    return ($Url -replace '://.*:.*@', '://***:***@')
}

function Invoke-SqlFile {
    param(
        [string]$RelativePath,
        [string]$Description
    )

    $filePath = Join-Path $RepoRoot $RelativePath
    Write-Host "File: $Description" -ForegroundColor $Cyan
    Write-Host "  $RelativePath" -ForegroundColor $Yellow

    if (-not (Test-Path $filePath)) {
        Write-Host "  Missing file" -ForegroundColor $Red
        Write-Host ""
        return $false
    }

    $output = & psql -d $DatabaseUrl -v ON_ERROR_STOP=1 -f $filePath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Success" -ForegroundColor $Green
        if ($VerboseOutput -and $output) {
            Write-Host $output -ForegroundColor $Gray
        }
        Write-Host ""
        return $true
    }

    Write-Host "  Failed" -ForegroundColor $Red
    Write-Host $output -ForegroundColor $Red
    Write-Host ""
    return $false
}

function Invoke-SqlCommand {
    param(
        [string]$Command,
        [string]$Description
    )

    Write-Host "SQL: $Description" -ForegroundColor $Cyan
    $output = & psql -d $DatabaseUrl -v ON_ERROR_STOP=1 -c $Command 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Success" -ForegroundColor $Green
        if ($VerboseOutput -and $output) {
            Write-Host $output -ForegroundColor $Gray
        }
        Write-Host ""
        return $true
    }

    Write-Host "  Failed" -ForegroundColor $Red
    Write-Host $output -ForegroundColor $Red
    Write-Host ""
    return $false
}

if (-not $EnvFile) {
    $EnvFile = Join-Path $RepoRoot ".env"
}
Import-DotEnv $EnvFile

if (-not $DatabaseUrl) {
    if ($env:RENDER_DATABASE_URL) {
        $DatabaseUrl = $env:RENDER_DATABASE_URL
    } elseif ($env:DATABASE_URL) {
        $DatabaseUrl = $env:DATABASE_URL
    }
}

Write-Host "FreeYap Database Deployment" -ForegroundColor $Green
Write-Host "===========================" -ForegroundColor $Green
Write-Host ""

if (-not $DatabaseUrl) {
    Write-Host "No database URL found." -ForegroundColor $Red
    Write-Host "Set RENDER_DATABASE_URL in .env, set DATABASE_URL, or pass -DatabaseUrl." -ForegroundColor $Yellow
    exit 1
}

Write-Host "Database: $(Get-MaskedUrl $DatabaseUrl)" -ForegroundColor $Cyan
Write-Host ""

Write-Host "Step 1: Testing connection" -ForegroundColor $Magenta
$connectionOk = Invoke-SqlCommand "SELECT 1 AS test;" "Connection test"
if (-not $connectionOk) {
    exit 1
}

Write-Host "Step 2: Creating schema" -ForegroundColor $Magenta
$schemaResult = Invoke-SqlFile "relational_database\schema\create_schema.sql" "Tables, types, constraints, and basic indexes"
if (-not $schemaResult) {
    Write-Host "Schema creation failed. Stopping deployment." -ForegroundColor $Red
    exit 1
}

Write-Host "Step 3: Ensuring custom types" -ForegroundColor $Magenta
$typesResult = Invoke-SqlFile "relational_database\types\user_queue_info.sql" "UserQueueInfo type"

Write-Host "Step 4: Creating functions" -ForegroundColor $Magenta
$functions = @(
    @{ File = "relational_database\functions\get_and_delete_queue_entry.sql"; Desc = "get_and_delete_queue_entry" },
    @{ File = "relational_database\functions\get_bulk_topic_embeddings.sql"; Desc = "get_bulk_topic_embeddings" },
    @{ File = "relational_database\functions\get_oldest_delayed_term_user.sql"; Desc = "get_oldest_delayed_term_user" },
    @{ File = "relational_database\functions\get_oldest_random_topic_user.sql"; Desc = "get_oldest_random_topic_user" },
    @{ File = "relational_database\functions\get_oldest_topic_user.sql"; Desc = "get_oldest_topic_user" },
    @{ File = "relational_database\functions\get_popular_topics.sql"; Desc = "get_popular_topics" },
    @{ File = "relational_database\functions\get_queued_user_with_most_matches.sql"; Desc = "get_queued_user_with_most_matches" },
    @{ File = "relational_database\functions\get_topic_embedding.sql"; Desc = "get_topic_embedding" },
    @{ File = "relational_database\functions\get_topic_popularity.sql"; Desc = "get_topic_popularity" },
    @{ File = "relational_database\functions\get_user_topics.sql"; Desc = "get_user_topics" },
    @{ File = "relational_database\functions\get_vibe_checks.sql"; Desc = "get_vibe_checks" },
    @{ File = "relational_database\functions\is_user_vibe_checked.sql"; Desc = "is_user_vibe_checked" }
)

$functionsSuccess = $true
foreach ($func in $functions) {
    if (-not (Invoke-SqlFile $func.File $func.Desc)) {
        $functionsSuccess = $false
    }
}

Write-Host "Step 5: Creating stored procedures" -ForegroundColor $Magenta
$procedures = @(
    @{ File = "relational_database\stored_procedures\add_back_to_queue.sql"; Desc = "add_back_to_queue" },
    @{ File = "relational_database\stored_procedures\add_to_queue.sql"; Desc = "add_to_queue" },
    @{ File = "relational_database\stored_procedures\bulk_insert_topic_history.sql"; Desc = "bulk_insert_topic_history" },
    @{ File = "relational_database\stored_procedures\insert_matchmaking_blocking_entry.sql"; Desc = "insert_matchmaking_blocking_entry" },
    @{ File = "relational_database\stored_procedures\insert_vibe_check.sql"; Desc = "insert_vibe_check" },
    @{ File = "relational_database\stored_procedures\remove_from_queue.sql"; Desc = "remove_from_queue" },
    @{ File = "relational_database\stored_procedures\save_topic_embedding.sql"; Desc = "save_topic_embedding" }
)

$proceduresSuccess = $true
foreach ($proc in $procedures) {
    if (-not (Invoke-SqlFile $proc.File $proc.Desc)) {
        $proceduresSuccess = $false
    }
}

$indexesSuccess = $true
if (-not $SkipIndexes) {
    Write-Host "Step 6: Creating performance indexes" -ForegroundColor $Magenta
    $indexScriptPath = Join-Path $RepoRoot "relational_database\indexes\deploy_indexes.ps1"
    if (Test-Path $indexScriptPath) {
        & $indexScriptPath -DatabaseUrl $DatabaseUrl
        $indexesSuccess = ($LASTEXITCODE -eq 0)
    } else {
        Write-Host "Index deployment script not found." -ForegroundColor $Red
        $indexesSuccess = $false
    }
} else {
    Write-Host "Step 6: Skipping performance indexes" -ForegroundColor $Yellow
    Write-Host ""
}

Write-Host "Step 7: Verification" -ForegroundColor $Magenta
$tableCheck = Invoke-SqlCommand @"
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'session_sockets',
    'matchmaking_queue',
    'queue_topics',
    'topic_embeddings',
    'topic_history',
    'matchmaking_blocking',
    'vibe_checks'
  )
ORDER BY table_name;
"@ "Verify tables"

$functionCheck = Invoke-SqlCommand @"
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
"@ "Verify functions"

$procedureCheck = Invoke-SqlCommand @"
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'PROCEDURE'
ORDER BY routine_name;
"@ "Verify procedures"

Write-Host "Deployment Summary" -ForegroundColor $Green
Write-Host "==================" -ForegroundColor $Green
Write-Host "Schema:      $(if ($schemaResult) { 'Success' } else { 'Failed' })" -ForegroundColor $(if ($schemaResult) { $Green } else { $Red })
Write-Host "Types:       $(if ($typesResult) { 'Success' } else { 'Failed' })" -ForegroundColor $(if ($typesResult) { $Green } else { $Red })
Write-Host "Functions:   $(if ($functionsSuccess) { 'Success' } else { 'Some failed' })" -ForegroundColor $(if ($functionsSuccess) { $Green } else { $Red })
Write-Host "Procedures:  $(if ($proceduresSuccess) { 'Success' } else { 'Some failed' })" -ForegroundColor $(if ($proceduresSuccess) { $Green } else { $Red })
Write-Host "Indexes:     $(if ($SkipIndexes) { 'Skipped' } elseif ($indexesSuccess) { 'Success' } else { 'Some failed' })" -ForegroundColor $(if ($SkipIndexes -or $indexesSuccess) { $Green } else { $Red })
Write-Host "Verification: $(if ($tableCheck -and $functionCheck -and $procedureCheck) { 'Success' } else { 'Some failed' })" -ForegroundColor $(if ($tableCheck -and $functionCheck -and $procedureCheck) { $Green } else { $Red })
Write-Host ""

if ($schemaResult -and $typesResult -and $functionsSuccess -and $proceduresSuccess -and ($SkipIndexes -or $indexesSuccess) -and $tableCheck -and $functionCheck -and $procedureCheck) {
    Write-Host "Your FreeYap database is ready." -ForegroundColor $Green
    exit 0
}

Write-Host "Database deployment finished with errors. Review the output above." -ForegroundColor $Red
exit 1
