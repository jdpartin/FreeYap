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

## ⚠️ Critical Development Notes

### Express.js Response Pattern
**Important:** When using Express.js response methods, avoid chaining `res.status().json()` if you need to return after sending the response.

**Wrong Pattern:**
```typescript
res.status(400).json({ error: 'Bad request' });
return; // This return statement is unreachable and causes issues
```

**Correct Pattern:**
```typescript
res.status(400);
res.json({ error: 'Bad request' });
return; // Now the return works correctly
```

**Reason:** When chaining `res.status().json()`, the return statement becomes unreachable or doesn't execute properly, which can lead to the function continuing to execute and potentially sending multiple responses, causing "Cannot set headers after they are sent" errors.

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

### May 20, 2025

**Issue:** MIME type error when serving JavaScript files.
- **Details:** The browser refused to execute the script due to an incorrect MIME type (`text/html`) being served for JavaScript files.
- **Cause:** The script tag in the EJS file pointed to an incorrect path (`/public/webrtcDemo.js`), causing the server to serve an HTML error page instead of the JavaScript file.
- **Resolution:** Updated the script tag to point to the correct path (`/webrtcDemo.js`), ensuring the file is served with the correct MIME type.
- **Date:** May 20, 2025

**Issue:** Duplicate WebSocket variable declaration causing SyntaxError.
- **Details:** Error "Uncaught SyntaxError: Identifier 'signalingSocket' has already been declared" occurred when loading the WebRTC demo.
- **Cause:** The `signalingSocket` variable was being declared both in the external JavaScript file (`webrtcDemo.js`) and in an inline script in the EJS template.
- **Resolution:** Removed the redundant WebSocket initialization from the EJS file and consolidated all WebSocket handling in the external JavaScript file.
- **Date:** May 20, 2025

**Issue:** WebRTC signaling server connection failures.
- **Details:** WebSocket connection to the signaling server would fail without clear error messages, causing WebRTC demo to appear broken.
- **Cause:** The signaling server was not running when attempting to use the WebRTC demo, and the UI did not provide clear instructions or error feedback.
- **Resolution:** Updated the WebRTC demo UI to provide clear instructions for starting the signaling server and added better error handling with informative status messages.
- **Date:** May 20, 2025

**Issue:** External WebRTC signaling server requirement made demo difficult to use.
- **Details:** Users needed to run a separate signaling server process (`node signalingServer.js`) to use the WebRTC demo, which wasn't possible when the main application was already running.
- **Cause:** The WebSocket signaling server was implemented as a separate process instead of being integrated with the main application.
- **Resolution:** Integrated the WebSocket signaling server directly into the main Express application, allowing both to run simultaneously on the same HTTP server. Updated the client code to connect to the WebSocket server on the same host.
- **Date:** May 20, 2025

**Issue:** WebSocket binary data handling error in WebRTC demo.
- **Details:** Error occurred when receiving WebSocket messages: "SyntaxError: Unexpected token 'o', "[object Blob]" is not valid JSON", preventing proper WebRTC signaling.
- **Cause:** The WebSocket was receiving binary data (Blob objects) but the code was attempting to parse it directly as JSON without properly converting it.
- **Resolution:** Updated the client-side code to properly handle different message formats (Blob vs text) and use a FileReader to convert binary data to text before parsing. Also ensured the server preserves the original message format when relaying messages between peers.
- **Date:** May 20, 2025

**Issue:** Confusion about multiple WebRTC signaling messages.
- **Details:** The WebRTC connection process generates many signaling messages when establishing a connection, which can appear as a potential issue in the logs.
- **Cause:** WebRTC uses a process called "ICE candidate trickle" where multiple connection options are generated and sent individually to find the optimal path between peers.
- **Resolution:** Enhanced logging to provide clearer information about the signaling process and added UI explanations to clarify that this behavior is normal and expected.
- **Date:** May 20, 2025

**Issue:** SimplePeer stream setup failure in WebRTC connections.
- **Details:** Attempting to add local media streams to SimplePeer instances using `addStream()` or `emit('stream')` after peer creation was not working, preventing proper video and voice chat functionality.
- **Cause:** SimplePeer requires the local stream to be provided in the constructor options at the time of peer creation. Adding streams after instantiation is not supported.
- **Resolution:** Refactored the WebRTC connection flow by:
  1. Moving the `match found` event in `webrtcConnectionManager` to fire when a peer is found but before the SimplePeer object is created
  2. Adding a `stream` variable in the connection manager that is initially null
  3. Allowing video and voice chat widgets to detect the `match found` event and add their stream to the connection manager
  4. Using the stream in the SimplePeer constructor when creating the peer object
  5. Repurposing the existing `peer created` event for functionality that previously used the `match found` event
- **Date:** June 1, 2025



