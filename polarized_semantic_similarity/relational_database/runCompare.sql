// PostgreSQL
CREATE OR REPLACE FUNCTION runSelect(topic_1 TEXT, topic_2 TEXT)
RETURNS TABLE (
    semantic_score NUMERIC,
    polarity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY

    SELECT 
        topic_1,
        topic_2
        semantic_score,
        polarity_score
    FROM topics
    WHERE
        topic_1 IN (topic_1, topic_2)
        AND topic_2 IN (topic_1, topic_2);
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;