-- Purpose: Saves a new topic embedding to the topic_embeddings table (no update functionality)

CREATE OR REPLACE PROCEDURE public.save_topic_embedding(
    topicText TEXT,
    topicEmbedding double precision[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only insert if the topic doesn't already exist
    INSERT INTO topic_embeddings (topic, embedding)
    VALUES (topicText, topicEmbedding)
    ON CONFLICT (topic) DO NOTHING;
    
END;
$$;
