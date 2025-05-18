// PostgreSQL
CREATE OR REPLACE FUNCTION getTextEmbedding(topic TEXT)
RETURNS TEXT AS $$
DECLARE
    embedding TEXT;
BEGIN

    SELECT embedding INTO embedding
    FROM topicEmbeddings
    WHERE topic = topic
    LIMIT 1;

    RETURN embedding;

END;
$$ LANGUAGE plpgsql;