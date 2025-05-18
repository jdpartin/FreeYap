// PostgreSQL
CREATE OR REPLACE FUNCTION runSelect(topic TEXT, semantic_threshold NUMERIC NULL, polarity_threshold NUMERIC NULL)
RETURNS TABLE (
    topic TEXT,
    semantic_score NUMERIC,
    polarity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY

    SELECT 
        CASE WHEN topic = topic1 THEN topic2 ELSE topic1 END AS topic,
        semantic_score,
        polarity_score
    FROM topics
    WHERE
        topic IN (topic1, topic2)
        AND (semantic_threshold IS NULL OR semantic_score > semantic_threshold)
        AND (polarity_threshold IS NULL OR polarity_score > polarity_threshold)
    ORDER BY
        semantic_score, 
        polarity_score 
        DESC

END;
$$ LANGUAGE plpgsql;