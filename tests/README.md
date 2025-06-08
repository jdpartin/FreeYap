# FreeYap Test Scripts

This directory contains test scripts for critical FreeYap functions, addressing the requirement outlined in `issues.txt`.

## Setup

The test environment is already configured with:
- **Jest** for test running
- **TypeScript** support via ts-jest
- **Socket.io-client** for testing socket connections
- **Tests exclude** from TypeScript compilation

## Available Tests

### Matchmaking Test (`matchmaking.test.ts`)

Tests the core matchmaking functionality:

1. **Two Socket Connection Test**: Creates two socket connections to the server
2. **Join Queue Test**: Both sockets call the `/join-queue` endpoint with the same topic
3. **Match Verification**: Verifies both sockets receive `match-found` events with correct socket IDs

**What it validates:**
- Socket connections work correctly
- Matchmaking API endpoints respond properly  
- Two users with the same topic get matched
- Match notifications are sent to both users
- Connection cleanup works properly

## Running Tests

### Prerequisites
1. Build the project: `npm run build`
2. Start the server: `npm start` (in background/separate terminal)
3. Run tests: `npm test`

### Alternative (Build + Test)
```powershell
npm run test:build
```

### Test Output
When successful, you'll see:
```
✓ two users with same topic should match (1430 ms)

Test Suites: 1 passed, 1 total
Tests: 1 passed, 1 total
```

Server logs will show:
```
Client connected: [socketId1]
Client connected: [socketId2]  
Connection triggered between [socketId2] and [socketId1]
Client disconnected: [socketId1]
Client disconnected: [socketId2]
```

## Configuration

- **Jest Config**: `jest.config.js` - Configured for TypeScript support
- **TypeScript Config**: `tsconfig.json` - Tests excluded from build
- **Test Pattern**: `**/tests/**/*.test.ts`

## Future Test Scripts

Additional test scripts can be added for other critical functions mentioned in `issues.txt`:
- Vibe check constraints testing
- User blocking functionality
- WebRTC connection reliability
- Vector database cleanup verification

## Notes

- Tests run against a live server instance
- Each test properly cleans up socket connections
- Server must be running on `http://localhost:3000` for tests to pass
- Tests use real API endpoints and socket connections
