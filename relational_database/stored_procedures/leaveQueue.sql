--PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'leavequeue') THEN
        DROP FUNCTION leavequeue;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION leaveQueue(
    sessionId UUID
)
RETURNS VOID AS $$
BEGIN

    -- Delete from the queue table
    DELETE FROM queue
    WHERE sessionId = sessionId;

END;
$$ LANGUAGE plpgsql;
