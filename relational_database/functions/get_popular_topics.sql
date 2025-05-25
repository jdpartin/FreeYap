-- Purpose: Returns the top N most popular topics based on appearances in the last 5 minutes

CREATE OR REPLACE FUNCTION get_popular_topics(max_results INTEGER DEFAULT 10)
RETURNS TABLE (
    topic TEXT,
    popularity_score BIGINT
) AS $$
BEGIN    RETURN QUERY
    SELECT 
        topic_history.topic,
        COUNT(*) AS popularity_score
    FROM topic_history
    WHERE used_at >= (NOW() - INTERVAL '5 minutes')
    GROUP BY topic_history.topic
    ORDER BY popularity_score DESC
    LIMIT max_results;
    
END;
$$ LANGUAGE plpgsql;
