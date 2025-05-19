# Database Schema Documentation

This document outlines the database schema for the FreeYap project, including tables, columns, and stored procedures.

## Tables

### `users`
- `id` (UUID): Primary key.
- `username` (TEXT): Unique username for the user.
- `created_at` (TIMESTAMP): Timestamp of user creation.
- `has_topics` (BOOLEAN): Indicates if the user has associated topics.

### `queue`
- `session_id` (UUID): Primary key.
- `terms` (TEXT[]): Array of terms associated with the user.
- `inserted_at` (TIMESTAMP): Timestamp when the user was added to the queue.

### `embeddings`
- `term` (TEXT): The term for which the embedding is stored.
- `embedding` (FLOAT8[]): The vector representation of the term.

## Stored Procedures

The stored procedures used in this project are located in the `relational_database/stored_procedures` folder. Each file contains comments at the top describing the purpose and parameters of the procedure.

## Notes
- All stored procedure calls must explicitly cast arguments to the correct PostgreSQL types to avoid runtime errors.
- Ensure that column names match exactly with the schema definitions to prevent mismatches.
