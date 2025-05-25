#!/bin/bash
# Performance Index Deployment Script for FreeYap Database
# This script runs each CREATE INDEX CONCURRENTLY command separately to avoid transaction block issues

# Usage:
# 1. Make executable: chmod +x deploy_indexes.sh
# 2. Run: ./deploy_indexes.sh
# 
# For Windows PowerShell, use: deploy_indexes.ps1

echo "Deploying FreeYap Performance Indexes..."
echo "This may take several minutes depending on table sizes."
echo ""

# Function to run SQL command with error handling
run_index() {
    local index_name=$1
    local sql_command=$2
    
    echo "Creating index: $index_name"
    
    if psql -d "$DATABASE_URL" -c "$sql_command"; then
        echo "✅ Successfully created: $index_name"
    else
        echo "❌ Failed to create: $index_name"
        echo "   This might be because the index already exists or there's a connection issue."
    fi
    echo ""
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Please set DATABASE_URL environment variable"
    echo "Example: export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "Using database: $DATABASE_URL"
echo ""

# Critical Indexes (Deploy First)
echo "=== DEPLOYING CRITICAL INDEXES ==="

run_index "idx_matchmaking_queue_mode_topics_time" \
"CREATE INDEX CONCURRENTLY idx_matchmaking_queue_mode_topics_time 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);"

run_index "idx_matchmaking_queue_socket_id" \
"CREATE INDEX CONCURRENTLY idx_matchmaking_queue_socket_id 
ON matchmaking_queue (socket_id);"

run_index "idx_queue_topics_socket_id" \
"CREATE INDEX CONCURRENTLY idx_queue_topics_socket_id 
ON queue_topics (socket_id);"

# High Priority Indexes
echo "=== DEPLOYING HIGH PRIORITY INDEXES ==="

run_index "idx_topic_history_time_topic" \
"CREATE INDEX CONCURRENTLY idx_topic_history_time_topic 
ON topic_history (used_at DESC, topic);"

run_index "idx_queue_topics_topic" \
"CREATE INDEX CONCURRENTLY idx_queue_topics_topic 
ON queue_topics (topic);"

# Medium Priority Indexes
echo "=== DEPLOYING MEDIUM PRIORITY INDEXES ==="

run_index "idx_matchmaking_queue_delayed_covering" \
"CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_covering 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) 
INCLUDE (socket_id);"

run_index "idx_queue_topics_socket_topic" \
"CREATE INDEX CONCURRENTLY idx_queue_topics_socket_topic 
ON queue_topics (socket_id, topic);"

run_index "idx_topic_history_popularity_covering" \
"CREATE INDEX CONCURRENTLY idx_topic_history_popularity_covering 
ON topic_history (used_at DESC) 
INCLUDE (topic);"

run_index "idx_topic_history_topic_time" \
"CREATE INDEX CONCURRENTLY idx_topic_history_topic_time 
ON topic_history (topic, used_at DESC);"

# Optimization Indexes (Partial)
echo "=== DEPLOYING OPTIMIZATION INDEXES ==="

run_index "idx_matchmaking_queue_delayed_with_topics" \
"CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_with_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = TRUE AND inserted_at <= (NOW() - INTERVAL '10 seconds');"

run_index "idx_matchmaking_queue_delayed_without_topics" \
"CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_without_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = FALSE AND inserted_at <= (NOW() - INTERVAL '10 seconds');"

run_index "idx_topic_history_recent" \
"CREATE INDEX CONCURRENTLY idx_topic_history_recent 
ON topic_history (topic, used_at DESC) 
WHERE used_at >= (NOW() - INTERVAL '5 minutes');"

echo "=== INDEX DEPLOYMENT COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Monitor query performance with: SELECT * FROM pg_stat_user_indexes;"
echo "2. Check for unused indexes after 1 week of monitoring"
echo "3. Run ANALYZE on tables to update statistics: ANALYZE matchmaking_queue, queue_topics, topic_history;"
echo ""
echo "For index usage monitoring:"
echo "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read"
echo "FROM pg_stat_user_indexes WHERE schemaname = 'public'"
echo "ORDER BY idx_scan DESC;"
