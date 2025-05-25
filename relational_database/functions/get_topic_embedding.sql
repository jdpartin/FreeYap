-- Purpose: Retrieves the embedding vector for a specific topic from the topic_embeddings table.

CREATE OR REPLACE FUNCTION get_topic_embedding(topicText TEXT)
RETURNS TABLE (
    topic TEXT,
    embedding double precision[]
) AS $$
BEGIN

    RETURN QUERY
    SELECT 
        topic_embeddings.topic,
        topic_embeddings.embedding
    FROM topic_embeddings
    WHERE topic_embeddings.topic = topicText;
    
END;
$$ LANGUAGE plpgsql;
