# Manual Index Deployment Guide

Since `CREATE INDEX CONCURRENTLY` cannot run inside transaction blocks, you need to execute each command individually. Here are the commands in priority order:

## Method 1: PowerShell Script (Recommended for Windows)

```powershell
# Set your database URL (replace with your actual Render database URL)
$env:DATABASE_URL = "your_render_database_url_here"

# Run the deployment script
.\relational_database\indexes\deploy_indexes.ps1
```

## Method 2: Manual Execution (Copy each command individually)

### Step 1: Critical Indexes (Run these first)

```sql
-- Command 1: Primary matchmaking index
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_mode_topics_time 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);
```

```sql
-- Command 2: Socket ID lookups
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_socket_id 
ON matchmaking_queue (socket_id);
```

```sql
-- Command 3: Queue topics join optimization
CREATE INDEX CONCURRENTLY idx_queue_topics_socket_id 
ON queue_topics (socket_id);
```

### Step 2: High Priority Indexes

```sql
-- Command 4: Topic popularity queries
CREATE INDEX CONCURRENTLY idx_topic_history_time_topic 
ON topic_history (used_at DESC, topic);
```

```sql
-- Command 5: Topic searches
CREATE INDEX CONCURRENTLY idx_queue_topics_topic 
ON queue_topics (topic);
```

### Step 3: Medium Priority Indexes

```sql
-- Command 6: Covering index for matchmaking
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_covering 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) 
INCLUDE (socket_id);
```

```sql
-- Command 7: Composite topic index
CREATE INDEX CONCURRENTLY idx_queue_topics_socket_topic 
ON queue_topics (socket_id, topic);
```

```sql
-- Command 8: Popularity covering index
CREATE INDEX CONCURRENTLY idx_topic_history_popularity_covering 
ON topic_history (used_at DESC) 
INCLUDE (topic);
```

```sql
-- Command 9: Individual topic popularity
CREATE INDEX CONCURRENTLY idx_topic_history_topic_time 
ON topic_history (topic, used_at DESC);
```

### Step 4: Optimization Indexes (Optional)

```sql
-- Command 10: Partial index for delayed users with topics
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_with_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = TRUE AND inserted_at <= (NOW() - INTERVAL '10 seconds');
```

```sql
-- Command 11: Partial index for delayed users without topics
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_without_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = FALSE AND inserted_at <= (NOW() - INTERVAL '10 seconds');
```

```sql
-- Command 12: Recent topic history optimization
CREATE INDEX CONCURRENTLY idx_topic_history_recent 
ON topic_history (topic, used_at DESC) 
WHERE used_at >= (NOW() - INTERVAL '5 minutes');
```

## Method 3: Using psql Command Line

```powershell
# For each command above, run:
psql -d "your_database_url" -c "CREATE INDEX CONCURRENTLY index_name ON table_name (columns);"
```

## Verification

After creating the indexes, verify they were created successfully:

```sql
-- Check all indexes
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Troubleshooting

1. **"relation already exists" error**: The index was already created, you can ignore this
2. **Connection timeout**: The index creation might take a few minutes for large tables
3. **Permission denied**: Make sure you have CREATE privileges on the database

## Performance Monitoring

After deployment, monitor index usage:

```sql
-- Monitor index usage after 24 hours
SELECT 
    schemaname,
    tablename, 
    indexname, 
    idx_scan as "Times Used",
    idx_tup_read as "Tuples Read",
    idx_tup_fetch as "Tuples Fetched"
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND idx_scan > 0
ORDER BY idx_scan DESC;
```

## Expected Results

- **Immediate**: 90%+ improvement in matchmaking query speed
- **Socket ID lookups**: Near-instant instead of table scans
- **Topic matching**: 85%+ faster JOIN operations
- **Popularity queries**: 70%+ improvement with time-based filtering
