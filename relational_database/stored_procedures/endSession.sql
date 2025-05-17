--PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'endSession') THEN
        DROP FUNCTION endSession;
    END IF;
END $$;
CREATE OR REPLACE FUNCTION endSession(
    sessionId UUID
)
RETURNS VOID AS $$
BEGIN

    -- Delete associated topics from the session_topics table
    DELETE FROM session_topics
    WHERE sessionId = sessionId;

    -- Delete the session from the sessionDetails table
    DELETE FROM sessionDetails
    WHERE sessionId = sessionId;

END;
$$ LANGUAGE plpgsql;
