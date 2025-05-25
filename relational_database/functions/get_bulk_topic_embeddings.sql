-- Purpose: Retrieves embeddings for multiple topics and identifies which ones are missing from the database.

CREATE OR REPLACE FUNCTION get_bulk_topic_embeddings(topics_array TEXT[])
RETURNS TABLE (
    topic TEXT,
    embedding double precision[],
    found BOOLEAN
) AS $$
BEGIN
    -- Return results for all requested topics
    -- If found: topic, embedding, true
    -- If not found: topic, null, false
    RETURN QUERY
    WITH topic_list AS (
        SELECT unnest(topics_array) AS requested_topic
    )
    SELECT 
        tl.requested_topic AS topic,
        te.embedding,
        CASE 
            WHEN te.topic IS NOT NULL THEN true 
            ELSE false 
        END AS found
    FROM topic_list tl
    LEFT JOIN topic_embeddings te ON tl.requested_topic = te.topic
    ORDER BY tl.requested_topic;
    
END;
$$ LANGUAGE plpgsql;
