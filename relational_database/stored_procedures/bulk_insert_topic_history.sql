-- Purpose: Bulk inserts multiple topics into the topic_history table

CREATE OR REPLACE PROCEDURE public.bulk_insert_topic_history(
    topicArray TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert all topics at once using UNNEST for better performance
    INSERT INTO topic_history (topic)
    SELECT unnest(topicArray);
    
END;
$$;
