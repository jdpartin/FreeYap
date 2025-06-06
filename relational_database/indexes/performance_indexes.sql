-- Performance Indexes for FreeYap Database
-- These indexes are designed to optimize the most frequently used query patterns
-- 
-- IMPORTANT: Run each CREATE INDEX CONCURRENTLY command separately!
-- Do NOT run this entire file at once due to CONCURRENTLY limitations.
--
-- Usage: Copy and paste each CREATE INDEX command individually into your PostgreSQL client

-- ==================================================
-- MATCHMAKING_QUEUE TABLE INDEXES
-- ==================================================

-- Primary composite index for the most common query pattern
-- Used by: get_oldest_topic_user, get_oldest_delayed_term_user, get_oldest_random_topic_user
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_mode_topics_time 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC);

-- Single column indexes for high-frequency lookups
-- Used by: get_and_delete_queue_entry, remove_from_queue, add_to_queue (DELETE operations)
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_socket_id 
ON matchmaking_queue (socket_id);

-- Covering index for delayed matchmaking queries (includes all needed columns)
-- Used by: All get_oldest_* functions
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_covering 
ON matchmaking_queue (chat_mode, has_topics, inserted_at ASC) 
INCLUDE (socket_id);

-- ==================================================
-- QUEUE_TOPICS TABLE INDEXES
-- ==================================================

-- Primary index for join operations
-- Used by: get_queued_user_with_most_matches
CREATE INDEX CONCURRENTLY idx_queue_topics_socket_id 
ON queue_topics (socket_id);

-- Index for topic-based searches
-- Used by: get_queued_user_with_most_matches (ANY operator)
CREATE INDEX CONCURRENTLY idx_queue_topics_topic 
ON queue_topics (topic);

-- Composite index for the most complex query
-- Used by: get_queued_user_with_most_matches
CREATE INDEX CONCURRENTLY idx_queue_topics_socket_topic 
ON queue_topics (socket_id, topic);

-- ==================================================
-- TOPIC_HISTORY TABLE INDEXES
-- ==================================================

-- Composite index for popularity queries
-- Used by: get_popular_topics, get_topic_popularity
CREATE INDEX CONCURRENTLY idx_topic_history_time_topic 
ON topic_history (used_at DESC, topic);

-- Covering index for popularity with count optimization
-- Used by: get_popular_topics
CREATE INDEX CONCURRENTLY idx_topic_history_popularity_covering 
ON topic_history (used_at DESC) 
INCLUDE (topic);

-- Single topic index for individual popularity checks
-- Used by: get_topic_popularity
CREATE INDEX CONCURRENTLY idx_topic_history_topic_time 
ON topic_history (topic, used_at DESC);

-- ==================================================
-- TOPIC_EMBEDDINGS TABLE INDEXES
-- ==================================================

-- Primary key index (already exists as PK, but confirming)
-- Used by: get_topic_embedding, save_topic_embedding
-- Note: This should already exist as the primary key, but including for completeness
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_embeddings_topic ON topic_embeddings (topic);

-- ==================================================
-- PARTIAL INDEXES FOR OPTIMIZED QUERIES
-- ==================================================

-- Partial index for users with topics who are delayed (10+ seconds old)
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_with_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = TRUE AND inserted_at <= (NOW() - INTERVAL '10 seconds');

-- Partial index for users without topics who are delayed (10+ seconds old)
CREATE INDEX CONCURRENTLY idx_matchmaking_queue_delayed_without_topics 
ON matchmaking_queue (chat_mode, inserted_at ASC) 
WHERE has_topics = FALSE AND inserted_at <= (NOW() - INTERVAL '10 seconds');

-- Partial index for recent topic history (last 5 minutes)
CREATE INDEX CONCURRENTLY idx_topic_history_recent 
ON topic_history (topic, used_at DESC) 
WHERE used_at >= (NOW() - INTERVAL '5 minutes');

-- ==================================================
-- MATCHMAKING_BLOCKING TABLE INDEXES
-- ==================================================

-- Composite index for bidirectional blocking lookups
-- Used by: All get_oldest_* functions for blocking exclusion checks
CREATE INDEX CONCURRENTLY idx_matchmaking_blocking_bidirectional 
ON matchmaking_blocking (source_ip, blocked_ip, expires);

-- Reverse composite index for bidirectional blocking lookups
-- Used by: All get_oldest_* functions for reverse blocking exclusion checks
CREATE INDEX CONCURRENTLY idx_matchmaking_blocking_reverse 
ON matchmaking_blocking (blocked_ip, source_ip, expires);

-- Covering index for blocking existence checks
-- Used by: insert_matchmaking_blocking_entry procedure
CREATE INDEX CONCURRENTLY idx_matchmaking_blocking_existence 
ON matchmaking_blocking (source_ip, blocked_ip) 
INCLUDE (expires);

-- Index for expired blocking cleanup (maintenance)
CREATE INDEX CONCURRENTLY idx_matchmaking_blocking_expires 
ON matchmaking_blocking (expires) 
WHERE expires <= NOW();

-- ==================================================
-- VIBE_CHECKS TABLE INDEXES
-- ==================================================

-- Primary lookup index (already created as unique constraint, but including for completeness)
-- Used by: insert_vibe_check (ON CONFLICT), is_user_vibe_checked, get_vibe_checks
-- Note: This should already exist as the unique constraint uq_vibe_checks_hashed_ip
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_vibe_checks_hashed_ip ON vibe_checks(hashed_ip);

-- Composite index for time-based vibe analysis
-- Used by: is_user_vibe_checked for 7-day verification checks
CREATE INDEX CONCURRENTLY idx_vibe_checks_time_analysis 
ON vibe_checks (hashed_ip, verified, inserted_at DESC, nudity, gore);

-- Index for source IP tracking (unverified report counting)
-- Used by: is_user_vibe_checked for counting distinct source IPs
CREATE INDEX CONCURRENTLY idx_vibe_checks_source_tracking 
ON vibe_checks (hashed_ip, verified, source_ip) 
WHERE verified = FALSE;

-- Partial index for recent verified checks (7 days)
-- Used by: is_user_vibe_checked for verified checks within 7 days
CREATE INDEX CONCURRENTLY idx_vibe_checks_verified_recent 
ON vibe_checks (hashed_ip, nudity, gore, inserted_at DESC) 
WHERE verified = TRUE AND inserted_at >= (NOW() - INTERVAL '7 days');

-- ==================================================
-- PERFORMANCE NOTES
-- ==================================================

/*
PRIORITY RANKING:
1. HIGH: idx_matchmaking_queue_mode_topics_time - Critical for all matchmaking queries
2. HIGH: idx_queue_topics_socket_id - Essential for joins in get_queued_user_with_most_matches
3. HIGH: idx_matchmaking_queue_socket_id - Critical for DELETE operations
4. HIGH: idx_matchmaking_blocking_bidirectional - Critical for blocking exclusion checks
5. HIGH: idx_matchmaking_blocking_reverse - Critical for reverse blocking exclusion checks
6. MEDIUM: idx_topic_history_time_topic - Important for popularity features
7. MEDIUM: idx_queue_topics_topic - Helps with ANY operator searches
8. MEDIUM: idx_vibe_checks_time_analysis - Important for vibe check enforcement
9. LOW: Partial indexes - Optimization for specific query patterns

MAINTENANCE:
- Use CONCURRENTLY to avoid blocking operations during creation
- Monitor index usage with pg_stat_user_indexes
- Consider dropping unused indexes after monitoring
- Reindex periodically if needed: REINDEX INDEX CONCURRENTLY index_name

QUERY PATTERNS OPTIMIZED:
- Socket ID lookups: O(1) instead of O(n)
- Time-based ordering: Efficient sorting for queue operations
- Topic matching: Fast array searches and joins
- Popularity queries: Optimized aggregations with time filtering
- Blocking exclusion: Fast bidirectional blocking checks
- Vibe check analysis: Optimized time-based and source IP queries
*/
