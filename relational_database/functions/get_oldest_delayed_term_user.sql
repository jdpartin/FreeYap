
CREATE OR REPLACE FUNCTION public.get_oldest_delayed_term_user(
    mode TEXT,
    gore BOOLEAN DEFAULT NULL,
    nudity BOOLEAN DEFAULT NULL,
    ipHash TEXT DEFAULT NULL
)
RETURNS TABLE (
    get_oldest_delayed_term_user TEXT
) AS $$
BEGIN

    RETURN QUERY
    SELECT q.socket_id
    FROM matchmaking_queue q
    WHERE 
        q.chat_mode = mode
        AND q.has_topics = TRUE 
        AND q.inserted_at <= NOW() - INTERVAL '11 seconds' -- Matchmaking stagger to prevent race conditions        -- Gore matching: true can match with true/null, false can match with false/null, null can match with any
        AND (
            (get_oldest_delayed_term_user.gore IS NULL) OR 
            (q.gore IS NULL) OR 
            (get_oldest_delayed_term_user.gore = q.gore)
        )
        -- Nudity matching: true can match with true/null, false can match with false/null, null can match with any
        AND (
            (get_oldest_delayed_term_user.nudity IS NULL) OR 
            (q.nudity IS NULL) OR 
            (get_oldest_delayed_term_user.nudity = q.nudity)
        )
        -- Exclude blocked users
        AND NOT EXISTS (
            SELECT 1 
            FROM matchmaking_blocking mb
            WHERE (mb.source_ip = ipHash AND mb.blocked_ip = q.ip_hash)
               OR (mb.source_ip = q.ip_hash AND mb.blocked_ip = ipHash)
            AND mb.expires > NOW()
        )
    ORDER BY q.inserted_at ASC
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;
