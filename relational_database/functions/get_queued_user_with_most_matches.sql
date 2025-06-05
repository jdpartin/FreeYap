
CREATE OR REPLACE FUNCTION public.get_queued_user_with_most_matches(
    matchedTopics TEXT[],
    mode TEXT,
    gore BOOLEAN DEFAULT NULL,
    nudity BOOLEAN DEFAULT NULL,
    ipHash TEXT DEFAULT NULL
)
RETURNS TABLE (
    socket_id TEXT
) AS $$
BEGIN

    RETURN QUERY
    SELECT 
        q.socket_id
    FROM matchmaking_queue q
    JOIN queue_topics qt ON q.socket_id = qt.socket_id
    WHERE 
        q.chat_mode = mode
        AND qt.topic = ANY(matchedTopics)        -- Gore matching: true can match with true/null, false can match with false/null, null can match with any
        AND (
            (get_queued_user_with_most_matches.gore IS NULL) OR 
            (q.gore IS NULL) OR 
            (get_queued_user_with_most_matches.gore = q.gore)
        )
        -- Nudity matching: true can match with true/null, false can match with false/null, null can match with any
        AND (
            (get_queued_user_with_most_matches.nudity IS NULL) OR 
            (q.nudity IS NULL) OR 
            (get_queued_user_with_most_matches.nudity = q.nudity)
        )
        -- Exclude blocked users
        AND NOT EXISTS (
            SELECT 1 
            FROM matchmaking_blocking mb
            WHERE (mb.source_ip = ipHash AND mb.blocked_ip = q.ip_hash)
               OR (mb.source_ip = q.ip_hash AND mb.blocked_ip = ipHash)
            AND mb.expires > NOW()
        )
    GROUP BY q.socket_id, q.chat_mode
    ORDER BY COUNT(*) DESC
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;
