# FreeYap

FreeYap is a Node.js-based anonymous chat platform where users can connect with others based on shared interests while maintaining anonymity. It supports text, voice, and video chat using WebRTC.

## Technologies Used

- **PostgreSQL**: Relational database
- **Node.js**: Backend runtime
- **Express**: Web framework
- **EJS**: Template engine
- **Bootstrap**: Frontend styling
- **WebRTC**: Real-time video/audio/text communication
- **TypeScript**: Type safety
- **Qdrant**: Vector database for interest-based matching

## WebRTC Implementation

FreeYap uses a modular WebRTC implementation with three main components:

1. **RTCConnection.js**: Client-side class that handles all WebRTC functionality with a simple, unified API for text, voice, and video chats.
2. **RTCConnectionSignaling.js**: Server-side module that manages WebRTC signaling, user matchmaking, and message relay.
3. **View Integration**: Each chat type (text, voice, video) uses the same RTCConnection class with different configuration options.

## Running the App

To run the FreeYap app, use:

```
node index.js
```

The app will be available at http://localhost:3000
