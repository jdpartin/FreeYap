# Past Errors Documentation

This file serves as a record of errors encountered during the development and maintenance of the FreeYap project. Each entry should include the following details:

1. **Error Description**: A clear and concise description of the error.
2. **Cause**: The root cause of the error, if identified.
3. **Resolution**: Steps taken to resolve the error.
4. **Date**: The date the error was encountered and resolved.

## Example Entry

### Error: Database connection timeout
- **Cause**: Incorrect database credentials in the environment configuration.
- **Resolution**: Updated the `.env` file with the correct credentials and restarted the server.
- **Date**: May 19, 2025

### Error: Stored procedure call fails due to missing explicit cast
- **Cause**: The stored procedure was called without explicitly casting parameters, resulting in an error like `get_and_delete_queue_entry(unknown)`.
- **Resolution**: Ensure all stored procedure calls include explicit casts for parameters to match the expected types.
- **Date**: May 19, 2025

---

Add new entries below this line.

### May 19, 2025

**Issue:** Ambiguity in column references when calling database functions and stored procedures.
- **Details:** Functions like `get_and_delete_queue_entry` and others had ambiguous column references due to overlapping names between PL/pgSQL variables and table columns.
- **Resolution:** Explicitly qualified column references with table names or aliases to avoid ambiguity.

**Issue:** Incorrect handling of function results in `matchmakingManager.ts`.
- **Details:** Results returned by database functions were not properly handled, as they include the function name as the key in the returned object.
- **Resolution:** Updated all relevant methods to correctly process the structure of the returned results.

**Issue:** Inconsistent naming of `topics` in the codebase.
- **Details:** Some parts of the code referred to `topics` as `terms`, causing confusion and mismatches with the database schema.
- **Resolution:** Standardized naming across the codebase to use `topics` consistently.
