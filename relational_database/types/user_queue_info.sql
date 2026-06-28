-- Purpose: Defines the UserQueueInfo composite type for use in database functions.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'userqueueinfo'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE UserQueueInfo AS (
            socket_id TEXT,
            topics TEXT[],
            inserted_at TIMESTAMP
        );
    END IF;
END $$;
