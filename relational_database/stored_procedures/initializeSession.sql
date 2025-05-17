--PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'initializeSession') THEN
        DROP FUNCTION initializeSession;
    END IF;
END $$;
CREATE OR REPLACE FUNCTION initializeSession(
    webrtcId VARCHAR(255),
    topics TEXT[] -- Replace dbo.topicList with a PostgreSQL array type
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN

    -- Insert a new session into the sessions table
    session_id = gen_random_uuid();

    INSERT INTO sessionDetails
    (
        sessionId,
        webrtcId
    )
    VALUES
    (
        session_id,
        webrtcId
    );

    -- Insert each topic into the session_topics table
    INSERT INTO session_topics 
    (
        session_topic_id,
        sessionId, 
        topic
    )
    SELECT
        gen_random_uuid(),
        session_id,
        topic
    FROM UNNEST(topics) AS topic;

    -- Return the session ID
    RETURN session_id;

END;
$$ LANGUAGE plpgsql;