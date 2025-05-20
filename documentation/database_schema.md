# Database Schema Documentation

This document outlines the database schema for the FreeYap project, including tables, columns, and stored procedures.

## Tables

### `matchmaking_queue`
- `session_id` (UUID): Primary key.
- `inserted_at` (TIMESTAMP): Timestamp when the user was added to the queue.
- `last_heartbeat` (TIMESTAMP): Timestamp of the last heartbeat.
- `has_topics` (BOOLEAN): Indicates if the user has associated topics.

### `queue_topics`
- `session_id` (UUID): Foreign key referencing `matchmaking_queue.session_id`.
- `topic` (TEXT): A single topic associated with the session.

### `embeddings`
- `topic` (TEXT): The topic for which the embedding is stored.
- `embedding` (FLOAT8[]): The vector representation of the topic.

## Naming Conventions

- **Tables and Columns**: Use `snake_case` for all table and column names in the database.
- **Parameters**: Use `camelCase` for all parameters in stored procedures.

## Updated Stored Procedures

### `add_back_to_queue`
- **Parameters**:
  - `sessionId` (TEXT): The session ID of the user.
  - `topics` (JSONB): A JSONB array of topics associated with the session.
  - `insertedAt` (TIMESTAMP): The timestamp when the user was added to the queue.

### `add_to_queue`
- **Parameters**:
  - `sessionId` (UUID): The session ID of the user.
  - `topics` (JSONB): A JSONB array of topics associated with the session.

### `get_and_delete_queue_entry`
- **Parameters**: None.
- **Returns**: A table with the following columns:
  - `session_id` (UUID): The session ID of the user.
  - `inserted_at` (TIMESTAMP): The timestamp when the user was added to the queue.
  - `last_heartbeat` (TIMESTAMP): The last heartbeat timestamp.
  - `has_topics` (BOOLEAN): Indicates if the user has associated topics.
  - `topics` (TEXT[]): Array of topics associated with the user.

### `get_oldest_delayed_term_user`
- **Parameters**: None.
- **Returns**: The session ID (UUID) of the oldest delayed user with topics.

### `get_oldest_user`
- **Parameters**: None.

### `get_queued_user_with_most_matches`
- **Parameters**:
  - `topicList` (TEXT[]): Array of matched topics.

### `run_query`
- **Parameters**:
  - `queryText` (TEXT): The query to execute.

## Stored Procedures

The stored procedures used in this project are located in the `relational_database/stored_procedures` folder. Each file contains comments at the top describing the purpose and parameters of the procedure.

## Notes

- All stored procedure calls must explicitly cast arguments to the correct PostgreSQL types to avoid runtime errors.
- Ensure that column names match exactly with the schema definitions to prevent mismatches.
- **Important:** When calling database functions, note that results are returned as objects with the function name as the key. Ensure the application code accounts for this structure.
- **Important:** Avoid ambiguous column references by explicitly qualifying column names with table aliases or table names in SQL queries.
