--PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'joinqueue') THEN
        DROP FUNCTION joinqueue;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION joinQueue(
    sessionId UUID,
    webrtcId VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN

    -- Insert into the queue table
    INSERT INTO queue (
        queueId,
        sessionId, 
        webrtcId, 
        insertedAt, 
        lastHeartbeat
    )
    VALUES (
        gen_random_uuid(),
        sessionId,
        webrtcId,
        NOW(),
        NOW()
    );

END;
$$ LANGUAGE plpgsql;