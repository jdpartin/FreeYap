# WebRTC Module Documentation

## Overview

The FreeYap WebRTC module provides a unified interface for real-time communication across different types of chats (text, voice, video). It consists of client-side and server-side components designed to work together to provide seamless WebRTC functionality.

## Architecture

### Client-Side: RTCConnection.js

`RTCConnection.js` is a comprehensive class that handles all aspects of WebRTC connections with a clean, simple API. It encapsulates the complexity of WebRTC while providing a consistent interface for all chat types.

#### Key Features:

- **Unified API**: A single class for text, voice, and video chat
- **Automatic Media Handling**: Configurable media constraints
- **Data Channel Management**: Built-in text messaging support
- **Signaling Integration**: Seamless connection with the server-side signaling
- **Error Handling**: Robust error management and status updates
- **Event-Based Architecture**: Simple callback system for status changes and events

#### Basic Usage:

```javascript
// Initialize with options
const connection = new RTCConnection({
  type: 'voice',  // 'text', 'voice', or 'video'
  enableDataChannel: true,
  autoAcceptCalls: true
});

// Set up event handlers
connection.onStatusChange = (status) => {
  console.log('Connection status:', status);
};

connection.onConnected = () => {
  console.log('Connection established!');
};

connection.onTextMessage = (message) => {
  console.log('Received message:', message);
};

// Start looking for a partner
connection.startCall();

// Send a message
connection.sendTextMessage('Hello!');

// End the call
connection.endCall();
```

### Server-Side: RTCConnectionSignaling.js

`RTCConnectionSignaling.js` is a Socket.IO-based signaling server that handles user matchmaking, WebRTC signaling message relay, and connection management.

#### Key Features:

- **Matchmaking**: Pairs users based on chat type (text, voice, video)
- **Signaling**: Relays offers, answers, and ICE candidates between peers
- **Connection Management**: Tracks connected users and waiting users
- **Logging**: Detailed logging for debugging and monitoring

## Integration with Views

Each chat view (text, voice, video) initializes `RTCConnection` with type-specific options:

### Text Chat

```javascript
const textChatRTC = new RTCConnection({
  type: 'text',
  enableDataChannel: true,
  autoAcceptCalls: true,
  mediaConstraints: {
    audio: false,
    video: false
  }
});
```

### Voice Chat

```javascript
const rtcConnection = new RTCConnection({
  type: 'voice',
  enableDataChannel: true,
  autoAcceptCalls: true,
  mediaConstraints: {
    audio: true,
    video: false
  }
});
```

### Video Chat

```javascript
const webrtcManager = new RTCConnection({
  type: 'video',
  enableDataChannel: true,
  autoAcceptCalls: true,
  mediaConstraints: {
    audio: true,
    video: true
  }
});
```

## API Reference

### RTCConnection Class

#### Constructor Options

- `type`: Chat type ('text', 'voice', 'video')
- `autoAcceptCalls`: Whether to automatically accept incoming calls
- `enableDataChannel`: Enable data channel for text messages
- `mediaConstraints`: Media constraints for getUserMedia
- `iceServers`: Custom ICE server configuration

#### Methods

- `startCall(options)`: Start looking for a connection partner
- `acceptCall()`: Accept an incoming call
- `rejectCall()`: Reject an incoming call
- `endCall()`: End the current call
- `sendTextMessage(message)`: Send a text message
- `toggleMute()`: Toggle audio mute status
- `toggleVideo()`: Toggle video status
- `getStats()`: Get connection statistics
- `replaceAudioTrack(track)`: Replace audio track
- `replaceVideoTrack(track)`: Replace video track

#### Event Callbacks

- `onStatusChange`: Called when connection status changes
- `onConnected`: Called when connection is established
- `onDisconnected`: Called when connection is terminated
- `onLocalStream`: Called when local media stream is created
- `onRemoteStream`: Called when remote media stream is received
- `onTextMessage`: Called when text message is received
- `onError`: Called when an error occurs

## Best Practices

1. Always initialize with the appropriate `type` for your chat
2. Set up all event handlers before calling `startCall()`
3. For text chat, check that data channel is ready before sending messages
4. For media chats, handle potential user denial of media permissions
5. Always call `endCall()` when the user leaves the chat page
