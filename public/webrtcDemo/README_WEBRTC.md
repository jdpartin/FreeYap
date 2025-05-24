# FreeYap WebRTC Demo - Modular Architecture

This folder contains the client-side WebRTC implementation for the FreeYap anonymous chat platform.
The code is organized in a modular architecture for better maintainability and separation of concerns.

## Module Overview

The WebRTC demo consists of the following modules:

### 1. `webrtcUI.js`
- Handles all user interface elements and interactions
- Manages status displays, logs, and UI controls
- Provides functions for updating the UI based on connection status

### 2. `webrtcSignaling.js`
- Handles WebSocket connection to the signaling server
- Sends and receives signaling messages (offers, answers, ICE candidates)
- Provides abstraction over the WebSocket connection

### 3. `webrtcMedia.js`
- Manages media streams (audio/video)
- Handles camera/microphone access
- Provides functions for controlling media (mute, disable video, etc.)
- Implements media quality controls (resolution, frame rate)
- Handles media recording and screenshots

### 4. `webrtcDataChannel.js`
- Manages WebRTC data channels for text chat and file transfers
- Implements the chat UI functionality
- Handles file sharing capabilities

### 5. `webrtcConnection.js`
- Core RTCPeerConnection handling
- Manages connection states and ICE candidates
- Monitors connection quality
- Provides an API for managing the WebRTC connection

### 6. `webrtcDemo.js`
- Main integration file
- Exports functions to make them accessible to other modules
- Minimal code that focuses on integration

### 7. `webrtcLoader.js`
- Initializes all modules
- Checks for proper loading
- Sets up event listeners
- Coordinates the signaling process

## Usage

The modules are designed to be included in HTML in the following order:

```html
<script src="/webrtcUI.js"></script>
<script src="/webrtcSignaling.js"></script>
<script src="/webrtcMedia.js"></script>
<script src="/webrtcDataChannel.js"></script>
<script src="/webrtcConnection.js"></script>
<script src="/webrtcDemo.js"></script>
<script src="/webrtcLoader.js"></script>
```

## Features

The WebRTC demo implements the following features:

1. **Video/Audio Communication**
   - Two-way real-time video and audio streaming
   - Camera switching support
   - Mute/unmute and video enable/disable controls

2. **Text Chat**
   - Real-time text messaging via data channel
   - Message history display

3. **File Sharing**
   - Share files of various types
   - Download shared files

4. **Media Controls**
   - Resolution selection
   - Frame rate adjustment
   - Video bitrate control
   - Audio quality settings

5. **Recording & Screenshots**
   - Record remote video
   - Take screenshots of the remote video

6. **Connection Monitoring**
   - Display connection quality metrics
   - Monitor latency, packet loss, and bitrate
   - Visual quality indicator

## Development

To add new features:
1. Identify the appropriate module
2. Add the necessary functionality
3. Export functions if they need to be accessible to other modules
4. Update `webrtcLoader.js` if initialization is required

## Server Integration

This client-side code works with the signaling server implemented in:
- `/src/index.ts` (WebSocket server)
- `/src/WebRTCDemo/webrtcController.ts` (Socket.IO integration)

## Browser Compatibility

The demo has been tested with:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14.1+ (with limitations)
