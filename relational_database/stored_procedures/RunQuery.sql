CREATE OR REPLACE FUNCTION run_query(query_text TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    EXECUTE query_text INTO result;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error executing query: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
