CREATE OR REPLACE PROCEDURE run_query(query_text TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE query_text;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error executing query: %', SQLERRM;
END;
$$;
