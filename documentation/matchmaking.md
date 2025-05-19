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
- The system identifies the queued user with the most matches from the filtered results.
- If a match is found, the matched user is removed from the queue, and the connection is triggered.
- If no match is found, the user is added to the queue.

### 3. Delayed Matchmaking
- After 10 seconds, the user sends a delayed match request to the API.
- The user is temporarily removed from the queue and delayed matchmaking is performed:
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

## Matching Criteria
- Only results with a semantic similarity score of **0.9 or higher** are considered for matching.
- The user with the highest number of matching topics is selected as the best match.

## Timestamp Preservation
- Any time a user is removed from the queue by a delayed matching function and then re-entered, their original timestamp is maintained.

## Future Enhancements
- Implement additional filters based on user preferences.
- Optimize vector database queries for large-scale searches.
- Add retry mechanisms for database operations to improve fault tolerance.
