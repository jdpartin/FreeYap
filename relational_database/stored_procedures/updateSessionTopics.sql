-- PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'updateSessionTopics') THEN
        DROP FUNCTION updateSessionTopics;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION updateSessionTopics
(
    sessionId UUID,
    newTopics TEXT[]
)
RETURNS VOID AS $$
BEGIN
    -- Delete existing topics for the session
    DELETE FROM session_topics
    WHERE
        sessionId = sessionId;

    -- Insert new topics for the session
    INSERT INTO session_topics
    (
        sessionId,
        topic
    )
    SELECT
        sessionId,
        unnest(newTopics);

END;
$$ LANGUAGE plpgsql;
