-- Purpose: Returns the top N most popular topics based on appearances in the last 5 minutes

CREATE OR REPLACE FUNCTION get_popular_topics(max_results INTEGER DEFAULT 10)
RETURNS TABLE (
    topic TEXT,
    popularity_score BIGINT
) AS $$
BEGIN    
    RETURN QUERY
    SELECT 
        topic_counts.topic,
        LEAST(topic_counts.popularity_score, 50) AS popularity_score
    FROM (
        SELECT 
            topic_history.topic,
            COUNT(*) AS popularity_score
        FROM topic_history
        WHERE used_at >= (NOW() - INTERVAL '5 minutes')
        GROUP BY topic_history.topic
    ) AS topic_counts
    ORDER BY topic_counts.popularity_score DESC
    LIMIT LEAST(max_results, 50);
    
END;
$$ LANGUAGE plpgsql;
