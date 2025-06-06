-- Create All Performance Indexes for FreeYap Database
-- This file can be run directly in your database console (Render, pgAdmin, etc.)
-- Since no indexes exist, we can create them without CONCURRENTLY for faster execution

-- ==================================================
-- MATCHMAKING_QUEUE TABLE INDEXES
-- ==================================================

-- Primary composite index for the most common query pattern
-- Used by: get_oldest_topic_user, get_oldest_delayed_term_user, get_oldest_random_topic_user
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode_topics_time 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);

-- Single column indexes for high-frequency lookups
-- Used by: get_and_delete_queue_entry, remove_from_queue, add_to_queue (DELETE operations)
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_socket_id 
ON matchmaking_queue (socket_id);

-- Covering index for delayed matchmaking queries (includes all needed columns)
-- Used by: All get_oldest_* functions
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_delayed_covering 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) 
INCLUDE (socket_id);

-- ==================================================
-- QUEUE_TOPICS TABLE INDEXES
-- ==================================================

-- Primary index for join operations
-- Used by: get_queued_user_with_most_matches
CREATE INDEX IF NOT EXISTS idx_queue_topics_socket_id 
ON queue_topics (socket_id);

-- Index for topic-based searches
-- Used by: get_queued_user_with_most_matches (ANY operator)
CREATE INDEX IF NOT EXISTS idx_queue_topics_topic 
ON queue_topics (topic);

-- Composite index for the most complex query
-- Used by: get_queued_user_with_most_matches
CREATE INDEX IF NOT EXISTS idx_queue_topics_socket_topic 
ON queue_topics (socket_id, topic);

-- ==================================================
-- TOPIC_HISTORY TABLE INDEXES
-- ==================================================

-- Composite index for popularity queries
-- Used by: get_popular_topics, get_topic_popularity
CREATE INDEX IF NOT EXISTS idx_topic_history_time_topic 
ON topic_history (used_at DESC, topic);

-- Covering index for popularity with count optimization
-- Used by: get_popular_topics
CREATE INDEX IF NOT EXISTS idx_topic_history_popularity_covering 
ON topic_history (used_at DESC) 
INCLUDE (topic);

-- Single topic index for individual popularity checks
-- Used by: get_topic_popularity
CREATE INDEX IF NOT EXISTS idx_topic_history_topic_time 
ON topic_history (topic, used_at DESC);

-- ==================================================
-- PARTIAL INDEXES FOR OPTIMIZED QUERIES
-- ==================================================

-- Partial index for users with topics who are delayed (10+ seconds old)
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_delayed_with_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = TRUE;

-- Partial index for users without topics who are delayed (10+ seconds old)
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_delayed_without_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = FALSE;

-- ==================================================
-- MATCHMAKING_BLOCKING TABLE INDEXES
-- ==================================================

-- Composite index for bidirectional blocking lookups
-- Used by: All get_oldest_* functions for blocking exclusion checks
CREATE INDEX IF NOT EXISTS idx_matchmaking_blocking_bidirectional 
ON matchmaking_blocking (source_ip, blocked_ip, expires);

-- Reverse composite index for bidirectional blocking lookups
-- Used by: All get_oldest_* functions for reverse blocking exclusion checks
CREATE INDEX IF NOT EXISTS idx_matchmaking_blocking_reverse 
ON matchmaking_blocking (blocked_ip, source_ip, expires);

-- Covering index for blocking existence checks
-- Used by: insert_matchmaking_blocking_entry procedure
CREATE INDEX IF NOT EXISTS idx_matchmaking_blocking_existence 
ON matchmaking_blocking (source_ip, blocked_ip) 
INCLUDE (expires);

-- Index for expired blocking cleanup (maintenance)
-- Note: Removed WHERE clause with NOW() as it's not immutable
CREATE INDEX IF NOT EXISTS idx_matchmaking_blocking_expires 
ON matchmaking_blocking (expires);

-- ==================================================
-- VIBE_CHECKS TABLE INDEXES
-- ==================================================

-- Primary lookup index (already created as unique constraint, but including for completeness)
-- Used by: insert_vibe_check (ON CONFLICT), is_user_vibe_checked, get_vibe_checks
-- Note: This should already exist as the unique constraint uq_vibe_checks_hashed_ip
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_vibe_checks_hashed_ip ON vibe_checks(hashed_ip);

-- Composite index for time-based vibe analysis
-- Used by: is_user_vibe_checked for 7-day verification checks
CREATE INDEX IF NOT EXISTS idx_vibe_checks_time_analysis 
ON vibe_checks (hashed_ip, verified, inserted_at DESC, nudity, gore);

-- Index for source IP tracking (unverified report counting)
-- Used by: is_user_vibe_checked for counting distinct source IPs
CREATE INDEX IF NOT EXISTS idx_vibe_checks_source_tracking 
ON vibe_checks (hashed_ip, verified, source_ip) 
WHERE verified = FALSE;

-- Partial index for recent verified checks (7 days)
-- Used by: is_user_vibe_checked for verified checks within 7 days
-- Note: Removed NOW() predicate as it's not immutable; filter will be done in query
CREATE INDEX IF NOT EXISTS idx_vibe_checks_verified_recent 
ON vibe_checks (hashed_ip, nudity, gore, inserted_at DESC) 
WHERE verified = TRUE;

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Run these after creating indexes to verify they were created successfully:

-- Check all new indexes
SELECT 
    schemaname,
    tablename, 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check all table indexes
SELECT 
    schemaname,
    tablename, 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('matchmaking_queue', 'queue_topics', 'topic_history', 'topic_embeddings', 'matchmaking_blocking', 'vibe_checks')
ORDER BY tablename, indexname;

-- Success message
SELECT 'All FreeYap performance indexes have been created successfully!' as status,
       'Tables indexed: matchmaking_queue, queue_topics, topic_history, matchmaking_blocking, vibe_checks' as details;
