# Performance Index Deployment Script for FreeYap Database (PowerShell)
# This script runs each CREATE INDEX CONCURRENTLY command separately to avoid transaction block issues

# Usage: .\deploy_indexes.ps1

Write-Host "Deploying FreeYap Performance Indexes..." -ForegroundColor Green
Write-Host "This may take several minutes depending on table sizes." -ForegroundColor Yellow
Write-Host ""

# Function to run SQL command with error handling
function Invoke-IndexCreation {
    param(
        [string]$IndexName,
        [string]$SqlCommand
    )
    
    Write-Host "Creating index: $IndexName" -ForegroundColor Cyan
    
    try {
        # Use environment variable or prompt for connection string
        if (-not $env:DATABASE_URL) {
            Write-Host "DATABASE_URL environment variable not set." -ForegroundColor Red
            Write-Host "Please set it or provide connection details manually." -ForegroundColor Red
            return $false
        }
        
        # Execute the SQL command
        $result = psql -d $env:DATABASE_URL -c $SqlCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully created: $IndexName" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Failed to create: $IndexName" -ForegroundColor Red
            Write-Host "   This might be because the index already exists or there's a connection issue." -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ Error creating $IndexName`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Write-Host ""
    }
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "Please set DATABASE_URL environment variable" -ForegroundColor Red
    Write-Host "Example: `$env:DATABASE_URL='postgresql://user:password@host:port/database'" -ForegroundColor Yellow
    Write-Host "Or use your Render database URL from the dashboard" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using database: $($env:DATABASE_URL -replace '://.*:.*@', '://***:***@')" -ForegroundColor Blue
Write-Host ""

# Critical Indexes (Deploy First)
Write-Host "=== DEPLOYING CRITICAL INDEXES ===" -ForegroundColor Magenta

Invoke-IndexCreation "idx_matchmaking_queue_mode_topics_time" @"
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_mode_topics_time 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);
"@

Invoke-IndexCreation "idx_matchmaking_queue_socket_id" @"
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_socket_id 
ON matchmaking_queue (socket_id);
"@

Invoke-IndexCreation "idx_queue_topics_socket_id" @"
CREATE INDEX CONCURRENTLY idx_queue_topics_socket_id 
ON queue_topics (socket_id);
"@

# High Priority Indexes
Write-Host "=== DEPLOYING HIGH PRIORITY INDEXES ===" -ForegroundColor Magenta

Invoke-IndexCreation "idx_topic_history_time_topic" @"
CREATE INDEX CONCURRENTLY idx_topic_history_time_topic 
ON topic_history (used_at DESC, topic);
"@

Invoke-IndexCreation "idx_queue_topics_topic" @"
CREATE INDEX CONCURRENTLY idx_queue_topics_topic 
ON queue_topics (topic);
"@

# Medium Priority Indexes
Write-Host "=== DEPLOYING MEDIUM PRIORITY INDEXES ===" -ForegroundColor Magenta

Invoke-IndexCreation "idx_matchmaking_queue_delayed_covering" @"
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_covering 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) 
INCLUDE (socket_id);
"@

Invoke-IndexCreation "idx_queue_topics_socket_topic" @"
CREATE INDEX CONCURRENTLY idx_queue_topics_socket_topic 
ON queue_topics (socket_id, topic);
"@

Invoke-IndexCreation "idx_topic_history_popularity_covering" @"
CREATE INDEX CONCURRENTLY idx_topic_history_popularity_covering 
ON topic_history (used_at DESC) 
INCLUDE (topic);
"@

Invoke-IndexCreation "idx_topic_history_topic_time" @"
CREATE INDEX CONCURRENTLY idx_topic_history_topic_time 
ON topic_history (topic, used_at DESC);
"@

# Optimization Indexes (Partial)
Write-Host "=== DEPLOYING OPTIMIZATION INDEXES ===" -ForegroundColor Magenta

Invoke-IndexCreation "idx_matchmaking_queue_delayed_with_topics" @"
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_with_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = TRUE AND inserted_at <= (NOW() - INTERVAL '10 seconds');
"@

Invoke-IndexCreation "idx_matchmaking_queue_delayed_without_topics" @"
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_without_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = FALSE AND inserted_at <= (NOW() - INTERVAL '10 seconds');
"@

Invoke-IndexCreation "idx_topic_history_recent" @"
CREATE INDEX CONCURRENTLY idx_topic_history_recent 
ON topic_history (topic, used_at DESC) 
WHERE used_at >= (NOW() - INTERVAL '5 minutes');
"@

Write-Host "=== INDEX DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Monitor query performance with: SELECT * FROM pg_stat_user_indexes;" -ForegroundColor White
Write-Host "2. Check for unused indexes after 1 week of monitoring" -ForegroundColor White
Write-Host "3. Run ANALYZE on tables to update statistics:" -ForegroundColor White
Write-Host "   ANALYZE matchmaking_queue, queue_topics, topic_history;" -ForegroundColor Gray
Write-Host ""
Write-Host "For index usage monitoring:" -ForegroundColor Yellow
Write-Host @"
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
"@ -ForegroundColor Gray
