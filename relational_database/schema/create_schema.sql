-- FreeYap Database Schema Creation Script
-- This script creates all tables, types, and constraints for the FreeYap application
-- 
-- Usage:
-- 1. Connect to your PostgreSQL database
-- 2. Run: psql -d your_database -f schema/create_schema.sql
-- 3. Or copy and paste sections as needed
--
-- Prerequisites:
-- - PostgreSQL 12+ (for UUID and array support)
-- - uuid-ossp extension for UUID generation

-- ==================================================
-- EXTENSIONS
-- ==================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional security functions (optional)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================================================
-- CUSTOM TYPES
-- ==================================================

-- Create composite type for user queue information
-- Used by database functions for returning queue data
CREATE TYPE UserQueueInfo AS (
    session_id UUID,
    topics TEXT[],
    inserted_at TIMESTAMP
);

-- ==================================================
-- TABLES
-- ==================================================

-- Session sockets table (referenced by foreign keys)
-- Note: This table is implied by the foreign key constraints in documentation
CREATE TABLE IF NOT EXISTS session_sockets (
    socket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Matchmaking queue table
-- Stores users currently waiting for matches
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    socket_id UUID PRIMARY KEY,
    inserted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    has_topics BOOLEAN NOT NULL DEFAULT FALSE,
    chat_mode TEXT NOT NULL CHECK (chat_mode IN ('video', 'voice', 'text')),
    
    -- Foreign key constraint to session_sockets with cascade
    CONSTRAINT fk_matchmaking_queue_socket_id 
        FOREIGN KEY (socket_id) 
        REFERENCES session_sockets(socket_id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE
);

-- Queue topics table
-- Stores individual topics associated with users in the queue
CREATE TABLE IF NOT EXISTS queue_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    socket_id UUID NOT NULL,
    topic TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint to matchmaking_queue with cascade
    CONSTRAINT fk_queue_topics_socket_id 
        FOREIGN KEY (socket_id) 
        REFERENCES matchmaking_queue(socket_id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE
);

-- Topic embeddings table
-- Stores pre-computed embeddings for topics
CREATE TABLE IF NOT EXISTS topic_embeddings (
    topic TEXT PRIMARY KEY,
    embedding double precision[] NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure embedding array is not empty
    CONSTRAINT chk_embedding_not_empty 
        CHECK (array_length(embedding, 1) > 0)
);

-- Topic history table
-- Tracks usage of topics for popularity and analytics
CREATE TABLE IF NOT EXISTS topic_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Index for efficient time-based queries
    -- (Will be created separately in performance_indexes.sql)
    
    -- Optional: Add user tracking (if needed for analytics)
    -- socket_id UUID REFERENCES session_sockets(socket_id) ON DELETE SET NULL
);

-- ==================================================
-- INDEXES (Basic - Performance indexes in separate file)
-- ==================================================

-- Basic indexes for primary lookup patterns
-- Note: Advanced performance indexes are in ../indexes/performance_indexes.sql

-- Ensure efficient lookups on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_chat_mode ON matchmaking_queue(chat_mode);
CREATE INDEX IF NOT EXISTS idx_queue_topics_topic_basic ON queue_topics(topic);
CREATE INDEX IF NOT EXISTS idx_topic_history_used_at_basic ON topic_history(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sockets_active ON session_sockets(is_active) WHERE is_active = TRUE;

-- ==================================================
-- CONSTRAINTS AND VALIDATIONS
-- ==================================================

-- Additional constraints for data integrity

-- Ensure topic names are not empty or just whitespace
ALTER TABLE queue_topics 
ADD CONSTRAINT chk_topic_not_empty 
CHECK (LENGTH(TRIM(topic)) > 0);

ALTER TABLE topic_embeddings 
ADD CONSTRAINT chk_topic_embedding_not_empty 
CHECK (LENGTH(TRIM(topic)) > 0);

ALTER TABLE topic_history 
ADD CONSTRAINT chk_topic_history_not_empty 
CHECK (LENGTH(TRIM(topic)) > 0);

-- Ensure socket_id is a valid UUID format
-- (This is automatically enforced by the UUID type, but documenting for clarity)

-- ==================================================
-- TRIGGERS (Optional - for automatic timestamp updates)
-- ==================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for topic_embeddings updated_at
CREATE TRIGGER update_topic_embeddings_updated_at 
    BEFORE UPDATE ON topic_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session_sockets last_active
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_sockets_last_active 
    BEFORE UPDATE ON session_sockets 
    FOR EACH ROW EXECUTE FUNCTION update_last_active();

-- ==================================================
-- DEFAULT DATA (Optional)
-- ==================================================

-- Insert some default data if needed
-- Uncomment if you want to populate with sample data

/*
-- Sample session sockets
INSERT INTO session_sockets (socket_id, created_at, is_active) VALUES
    (uuid_generate_v4(), NOW() - INTERVAL '1 hour', TRUE),
    (uuid_generate_v4(), NOW() - INTERVAL '30 minutes', TRUE);

-- Sample topics for testing
INSERT INTO topic_embeddings (topic, embedding) VALUES
    ('technology', ARRAY[0.1, 0.2, 0.3, 0.4, 0.5]),
    ('sports', ARRAY[0.5, 0.4, 0.3, 0.2, 0.1]),
    ('music', ARRAY[0.3, 0.5, 0.1, 0.4, 0.2]);
*/

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Run these queries to verify the schema was created correctly

/*
-- Check all tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('session_sockets', 'matchmaking_queue', 'queue_topics', 'topic_embeddings', 'topic_history')
ORDER BY table_name;

-- Check all foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check custom types
SELECT typname, typtype 
FROM pg_type 
WHERE typname = 'userqueueinfo';

-- Check extensions
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto');
*/

-- ==================================================
-- COMPLETION MESSAGE
-- ==================================================

DO $$
BEGIN
    RAISE NOTICE 'FreeYap database schema creation completed successfully!';
    RAISE NOTICE 'Tables created: session_sockets, matchmaking_queue, queue_topics, topic_embeddings, topic_history';
    RAISE NOTICE 'Types created: UserQueueInfo';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run the stored procedures from ../stored_procedures/';
    RAISE NOTICE '2. Run the functions from ../functions/';
    RAISE NOTICE '3. Deploy performance indexes from ../indexes/';
    RAISE NOTICE '4. Verify with the queries commented at the end of this file';
END $$;
