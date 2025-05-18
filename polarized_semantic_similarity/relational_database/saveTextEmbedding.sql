// PostgreSQL
CREATE OR REPLACE FUNCTION saveTextEmbedding(topic TEXT, embedding TEXT)
RETURNS VOID AS $$
BEGIN

    INSERT INTO topicEmbeddings 
    (
        topic, 
        embedding
    )
    VALUES 
    (
        topic, 
        embedding
    );

END;
$$ LANGUAGE plpgsql;