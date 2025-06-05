# Matchmaking System Documentation

## Overview
The matchmaking system is designed to pair users based on the semantic similarity of their topics. The system leverages a vector database for similarity searches and a relational database for queue management.

## Workflow

### 1. User Enters the Queue
- A user is only entered into the **queue table** if no match is found during the initial matchmaking process.
- The topics provided by the user are inserted into a **queue topics table** only if they are added to the queue.

### 2. Initial Matchmaking
- When a user starts matchmaking, the system queries the vector database with all the topics the user has entered.
- The vector database returns ranked results based on semantic similarity.
- The system filters out any results with a semantic similarity score below **0.9**.
- **Content preference filtering** is applied based on nudity and gore preferences.
- **Blocking filtering** is applied to exclude any users with active blocking entries.
- The system identifies the queued user with the most matches from the filtered results.
- If a match is found, the matched user is removed from the queue, and the connection is triggered.
- If no match is found, the user is added to the queue.

### 3. Delayed Matchmaking
- After 10 seconds, the user sends a delayed match request to the API.
- The user is temporarily removed from the queue and delayed matchmaking is performed:
  - **All matches are subject to content preference filtering and blocking checks.**
  - If the user has topics:
    - The system attempts to match them with the oldest user who did not enter any topics.
    - If no such user is available, it matches them with another delayed user.
    - If no match is found, the user is re-entered into the queue with their original timestamp.
  - If the user has no topics:
    - The system attempts to match them with the oldest delayed user who has topics.
    - If no such user is available, it matches them with the oldest random chat user.
    - If no match is found, the user is re-entered into the queue with their original timestamp.

### 4. Matching Without Topics
- Users who start matchmaking without topics follow a similar approach:
  - **All matches are subject to content preference filtering and blocking checks.**
  - Their first choice is a delayed user with topics.
  - After 10 seconds, they call the delayed matchmaking function.
  - The system attempts to match them with the oldest random chat user.
  - If no match is found, they are re-entered into the queue with their original timestamp.

## Key Components

### Relational Database
- **Queue Table**: Stores information about users currently in the queue.
- **Queue Topics Table**: Stores the topics associated with each user in the queue.

### Vector Database
- Used to perform semantic similarity searches on user topics.
- **Note**: The vector database only enforces topic similarity, nudity, and gore preferences. Blocking enforcement is handled exclusively by the relational database during the matching process.

## Matching Criteria
- Only results with a semantic similarity score of **0.9 or higher** are considered for matching.
- The user with the highest number of matching topics is selected as the best match.

### Content Preference Filtering
- **Nudity Preference**: Users are matched based on their nudity preference settings:
  - `true` matches with `true` or `null`
  - `false` matches with `false` or `null`
  - `null` matches with any value (`true`, `false`, or `null`)
  - **Never matches**: `true` with `false`

- **Gore Preference**: Users are matched based on their gore content preference settings:
  - `true` matches with `true` or `null`
  - `false` matches with `false` or `null`
  - `null` matches with any value (`true`, `false`, or `null`)
  - **Never matches**: `true` with `false`

### Blocking System
- Users are **never matched** if there is a blocking entry in the `matchmaking_blocking` table between them
- Blocking works **bidirectionally**: if User A blocks User B, or User B blocks User A, they will not be matched
- The system checks for blocking entries in **both directions**:
  - `source_ip = currentUser AND blocked_ip = potentialMatch`
  - `source_ip = potentialMatch AND blocked_ip = currentUser`
- Only active blocking entries (where `expires > NOW()`) are considered

## Timestamp Preservation
- Any time a user is removed from the queue by a delayed matching function and then re-entered, their original timestamp is maintained.

## Future Enhancements
- Implement additional filters based on user preferences.
- Optimize vector database queries for large-scale searches.
- Add retry mechanisms for database operations to improve fault tolerance.

## Technologies:
- **Render (PostgreSQL)**: For relational database management.
- **Node.js**: Backend runtime environment.
- **Express**: Web application framework.
- **EJS**: Template engine for rendering views.
- **Bootstrap**: Frontend styling framework.
- **WebRTC**: Enables video/audio chat functionality.
- **TypeScript**: Ensures type safety in the codebase.
- **JavaScript**: Used for client-side scripting (being phased out on the server side).
- **Qdrant**: Vector database provider for advanced matching and search capabilities.

## Matchmaking API Updates

#### `/match-found` Endpoint
- **Description**: Notifies the WebRTC API about a successful match.
- **Method**: POST
- **Request Body**:
  - `roomId` (string): The ID of the room where the match will occur.
  - `socketId` (string): The socket ID of the user being matched.
- **Response**:
  - `200 OK`: Match notification sent successfully.
  - `400 Bad Request`: Missing or invalid `roomId` or `socketId`.
  - `500 Internal Server Error`: Failed to notify the WebRTC API.

#### Integration with WebRTC API
- The `/match-found` endpoint makes an HTTP POST request to the WebRTC API's `/join-room` endpoint to notify it about the match.
- This ensures separation of concerns between matchmaking and WebRTC signaling.

## Note on Documentation Updates

Whenever changes are made to the matchmaking logic, stored procedures, or related API endpoints, ensure that this documentation is updated to reflect the changes. This includes:

1. **Stored Procedures**: Document any modifications to existing stored procedures or the addition of new ones.
2. **API Endpoints**: Add details about new endpoints or changes to existing ones.
3. **Matchmaking Logic**: Update the flow and logic descriptions to match the current implementation.

For example, the `/perform-delayed-matchmaking` endpoint was recently added to trigger delayed matchmaking logic 10 seconds after a user joins the queue.
