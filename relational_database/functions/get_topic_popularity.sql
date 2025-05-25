-- Purpose: Returns how many times a topic appears in the last 5 minutes (up to 50 occurrences)

CREATE OR REPLACE FUNCTION get_topic_popularity(topicText TEXT)
RETURNS TABLE (
    topic TEXT,
    popularity_score BIGINT
) AS $$
DECLARE
    max_records INTEGER := 50;
BEGIN    RETURN QUERY
    SELECT 
        topic_history.topic,
        LEAST(COUNT(*), max_records::BIGINT) AS popularity_score
    FROM topic_history
    WHERE topic_history.topic = topicText
    AND topic_history.used_at >= (NOW() - INTERVAL '5 minutes')
    GROUP BY topic_history.topic;
      -- If no results are found, return zero
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            topicText::TEXT AS topic,
            0::BIGINT AS popularity_score;
    END IF;
    
END;
$$ LANGUAGE plpgsql;
