# Performance index deployment script for FreeYap.
# Runs each CREATE INDEX CONCURRENTLY command separately.

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = ""
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
    if ($env:RENDER_DATABASE_URL) {
        $DatabaseUrl = $env:RENDER_DATABASE_URL
    } elseif ($env:DATABASE_URL) {
        $DatabaseUrl = $env:DATABASE_URL
    }
}

function Get-MaskedUrl {
    param([string]$Url)
    return ($Url -replace '://.*:.*@', '://***:***@')
}

function Invoke-IndexCreation {
    param(
        [string]$IndexName,
        [string]$SqlCommand
    )

    Write-Host "Creating index: $IndexName" -ForegroundColor Cyan
    $output = & psql -d $DatabaseUrl -v ON_ERROR_STOP=1 -c $SqlCommand 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Success" -ForegroundColor Green
        Write-Host ""
        return $true
    }

    Write-Host "  Failed" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    Write-Host ""
    return $false
}

if (-not $DatabaseUrl) {
    Write-Host "No database URL found. Set RENDER_DATABASE_URL, DATABASE_URL, or pass -DatabaseUrl." -ForegroundColor Red
    exit 1
}

Write-Host "Deploying FreeYap performance indexes..." -ForegroundColor Green
Write-Host "Database: $(Get-MaskedUrl $DatabaseUrl)" -ForegroundColor Cyan
Write-Host ""

$indexes = @(
    @{
        Name = "idx_matchmaking_queue_mode_topics_time"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_mode_topics_time ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);"
    },
    @{
        Name = "idx_matchmaking_queue_socket_id"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_socket_id ON matchmaking_queue (socket_id);"
    },
    @{
        Name = "idx_matchmaking_queue_delayed_covering"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_delayed_covering ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) INCLUDE (socket_id);"
    },
    @{
        Name = "idx_queue_topics_socket_id"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_topics_socket_id ON queue_topics (socket_id);"
    },
    @{
        Name = "idx_queue_topics_topic"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_topics_topic ON queue_topics (topic);"
    },
    @{
        Name = "idx_queue_topics_socket_topic"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_topics_socket_topic ON queue_topics (socket_id, topic);"
    },
    @{
        Name = "idx_topic_history_time_topic"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_history_time_topic ON topic_history (used_at DESC, topic);"
    },
    @{
        Name = "idx_topic_history_popularity_covering"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_history_popularity_covering ON topic_history (used_at DESC) INCLUDE (topic);"
    },
    @{
        Name = "idx_topic_history_topic_time"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_history_topic_time ON topic_history (topic, used_at DESC);"
    },
    @{
        Name = "idx_matchmaking_queue_delayed_with_topics"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_delayed_with_topics ON matchmaking_queue (chat_mode, inserted_at ASC) WHERE has_topics = TRUE;"
    },
    @{
        Name = "idx_matchmaking_queue_delayed_without_topics"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_delayed_without_topics ON matchmaking_queue (chat_mode, inserted_at ASC) WHERE has_topics = FALSE;"
    },
    @{
        Name = "idx_matchmaking_blocking_bidirectional"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_bidirectional ON matchmaking_blocking (source_ip, blocked_ip, expires);"
    },
    @{
        Name = "idx_matchmaking_blocking_reverse"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_reverse ON matchmaking_blocking (blocked_ip, source_ip, expires);"
    },
    @{
        Name = "idx_matchmaking_blocking_existence"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_existence ON matchmaking_blocking (source_ip, blocked_ip) INCLUDE (expires);"
    },
    @{
        Name = "idx_matchmaking_blocking_expires"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_blocking_expires ON matchmaking_blocking (expires);"
    },
    @{
        Name = "idx_vibe_checks_time_analysis"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_time_analysis ON vibe_checks (hashed_ip, verified, inserted_at DESC, nudity, gore);"
    },
    @{
        Name = "idx_vibe_checks_source_tracking"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_source_tracking ON vibe_checks (hashed_ip, verified, source_ip) WHERE verified = FALSE;"
    },
    @{
        Name = "idx_vibe_checks_verified_recent"
        Sql = "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_verified_recent ON vibe_checks (hashed_ip, nudity, gore, inserted_at DESC) WHERE verified = TRUE;"
    }
)

$allSucceeded = $true
foreach ($index in $indexes) {
    if (-not (Invoke-IndexCreation $index.Name $index.Sql)) {
        $allSucceeded = $false
    }
}

if ($allSucceeded) {
    Write-Host "Index deployment complete." -ForegroundColor Green
    exit 0
}

Write-Host "Index deployment finished with errors." -ForegroundColor Red
exit 1
