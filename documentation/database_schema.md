# Database Schema Documentation

This document outlines the database schema for the FreeYap project, including tables, columns, and stored procedures.

## Tables

### `matchmaking_queue`
- `socket_id` (UUID): Primary key.
- `inserted_at` (TIMESTAMP): Timestamp when the user was added to the queue.
                disconnected users from queue via foreign key
- `has_topics` (BOOLEAN): Indicates if the user has associated topics.
Foreign key on session id being in session_sockets, cascade on update or delete

### `queue_topics`
- `socket_id` (UUID): Foreign key referencing `matchmaking_queue.session_id`.
- `topic` (TEXT): A single topic associated with the session.
Foreign Key on session_id being in matchmaking_queue cascade on update or delete

## Naming Conventions

- **Tables and Columns**: Use `snake_case` for all table and column names in the database.
- **Parameters**: Use `camelCase` for all parameters in stored procedures.

## Notes

- All stored procedure calls must explicitly cast arguments to the correct PostgreSQL types to avoid runtime errors.
- Ensure that column names match exactly with the schema definitions to prevent mismatches.
- **Important:** When calling database functions, note that results are returned as objects with the function name as the key. Ensure the application code accounts for this structure.
- **Important:** Avoid ambiguous column references by explicitly qualifying column names with table aliases or table names in SQL queries.
