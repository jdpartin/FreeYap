# FreeYap WebRTC Modules

This directory contains modular WebRTC components for the FreeYap anonymous chat platform. The architecture is designed to allow flexible integration of different communication features (text, voice, video) while maintaining a clean separation of concerns.

## Core Modules

### WebRTCCore.js

The foundation of the WebRTC system that manages peer connections and provides an event-based communication system for all widgets.

- Handles socket.io connection and signaling
- Manages peer connection lifecycle
- Provides an event system for inter-widget communication
- Handles media stream acquisition and management

### WebRTCChatWidget.js

Manages text chat functionality.

- Sends and receives text messages
- Updates chat UI with messages
- Manages chat session title/header with partner's random name

### WebRTCMediaWidget.js

Handles audio and video streams for voice and video chat.

- Manages local and remote media streams
- Controls for toggling camera and microphone
- Attaches streams to video elements

### WebRTCTopicsWidget.js

Manages user and partner topics, including similarity analysis. This is now a completely independent widget that can be used with or without other widgets.

- Displays topics for both users
- Calculates semantic similarity between topics
- Provides visual indication of topic similarity
- Optionally generates "smart hello" messages based on topic relationships
- Configurable callbacks for topic similarity events

### WebRTCIntegration.js

Example integration script showing how to use these modules on different page types.

- Auto-detects page type (text, voice, or video chat)
- Initializes appropriate modules for each page type
- Configures media constraints based on page requirements

## Integration Guide

### Basic Setup

Include the necessary scripts in your HTML file:

```html
<!-- Load dependencies first -->
<script src="/socket.io/socket.io.js"></script>
<script src="https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js"></script>

<!-- Load WebRTC modules -->
<script src="/js/WebRTCCore.js"></script>
<script src="/js/WebRTCChatWidget.js"></script>
<script src="/js/WebRTCMediaWidget.js"></script>
<script src="/js/WebRTCTopicsWidget.js"></script>
<script src="/js/WebRTCIntegration.js"></script>
```

### Required HTML Elements

#### For Chat Widget

```html
<div id="chat-session-title">
    <i class="bi bi-chat-dots-fill me-2"></i>Chat Session
</div>
<div id="chat-messages"></div>
<div class="chat-input-container">
    <input type="text" id="chat-input" placeholder="Type a message...">
    <button id="chat-send">Send</button>
</div>
```

#### For Media Widget

```html
<!-- For video chat -->
<div class="video-container">
    <video id="remoteVideo" autoplay playsinline></video>
    <video id="localVideo" autoplay playsinline muted></video>
    <div class="media-controls">
        <button id="toggle-camera" class="btn btn-success">
            <i class="bi bi-camera-video-fill"></i> Camera On
        </button>
        <button id="toggle-mic" class="btn btn-success">
            <i class="bi bi-mic-fill"></i> Mic On
        </button>
    </div>
</div>

<!-- For voice chat -->
<div class="voice-container">
    <div class="media-controls">
        <button id="toggle-mic" class="btn btn-success">
            <i class="bi bi-mic-fill"></i> Mic On
        </button>
    </div>
</div>
```

#### For Topics Widget

```html
<div id="topics-container" class="topics-container">
    <div class="user-topics">
        <h3>Your Topics</h3>
        <div id="user-topics-list"></div>
    </div>
    <div class="partner-topics">
        <h3 id="partner-topics-header">Partner's Topics</h3>
        <div id="partner-topics-list">
            <div class="topics-empty">Waiting for partner...</div>
        </div>
    </div>
</div>
```

### Custom Configuration

You can customize widget behavior by passing options when creating instances:

```javascript
// Example: Manually create widgets with custom options
document.addEventListener('DOMContentLoaded', () => {
    // Wait for core to initialize
    setTimeout(() => {
        if (window.webrtcCore) {
            // Create chat widget with custom elements
            const chatWidget = new WebRTCChatWidget({
                chatInputId: 'custom-chat-input',
                chatMessagesId: 'custom-chat-messages',
                chatSendButtonId: 'custom-send-button'
            });
            
            // Create media widget with custom settings
            const mediaWidget = new WebRTCMediaWidget({
                localVideoId: 'my-video',
                remoteVideoId: 'partner-video',
                autoInitialize: false
            });
            
            // Create topics widget with custom settings - now fully independent
            const topicsWidget = new WebRTCTopicsWidget({
                userTopicsListId: 'custom-user-topics',
                partnerTopicsListId: 'custom-partner-topics',
                enableSmartHello: true,
                smartHelloChannel: 'chat',  // Channel to send hello messages through
                onTopicSimilarityCalculated: (data) => {
                    // Custom handler for when topics are analyzed
                    console.log('Similarity data:', data);
                    
                    // Example: Use similarity data to enhance UI
                    if (data.topMatch && data.topMatch.similarity > 0.7) {
                        showNotification('You have a strong topic match!');
                    }
                }
            });
        }
    }, 500);
});
```

## Advanced Usage

### Direct Access to Core

You can access the core functionality directly through the global `webrtcCore` object:

```javascript
// Send custom data through a channel
webrtcCore.sendData('custom-channel', { 
    type: 'customEvent',
    data: { foo: 'bar' }
});

// Listen for events from the core
webrtcCore.addEventListener('peerConnected', () => {
    console.log('Peer connection established!');
});

// Initialize media with specific constraints
webrtcCore.initializeMediaStream({ 
    video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 }
    },
    audio: true
});
```

### Creating Custom Widgets

You can create your own widgets that integrate with the WebRTC core:

```javascript
class MyCustomWidget {
    constructor() {
        this.core = window.webrtcCore;
        this.channelName = 'my-widget';
        
        // Register with core
        if (this.core) {
            this.core.registerWidget(this.channelName, this);
            
            // Listen for custom data
            this.core.addEventListener(`data:${this.channelName}`, (data) => {
                console.log('Received data for my widget:', data);
            });
        }
    }
    
    sendCustomData(data) {
        this.core.sendData(this.channelName, {
            type: 'custom',
            ...data
        });
    }
}
```

## Common Patterns

### Handling Connection Status

```javascript
webrtcCore.addEventListener('peerConnected', () => {
    // Show connected UI
    document.getElementById('connection-status').textContent = 'Connected';
    document.getElementById('connection-status').classList.add('connected');
});

webrtcCore.addEventListener('peerClosed', () => {
    // Show disconnected UI
    document.getElementById('connection-status').textContent = 'Disconnected';
    document.getElementById('connection-status').classList.remove('connected');
});
```

### Implementing Custom Chat Commands

```javascript
chatWidget.processMessage = function(message) {
    // Check for commands
    if (message.startsWith('/')) {
        const parts = message.substring(1).split(' ');
        const command = parts[0].toLowerCase();
        
        if (command === 'help') {
            this.appendMessage('System', 'Available commands: /help, /clear');
            return false; // Don't send to partner
        } else if (command === 'clear') {
            this.chatMessages.innerHTML = '';
            return false; // Don't send to partner
        }
    }
    
    return true; // Allow sending to partner
}
```

## Best Practices

1. **Load Order**: Always load dependencies before WebRTC modules, and load WebRTCCore.js before any widget scripts.

2. **Error Handling**: Add error listeners to handle connection failures gracefully:
   ```javascript
   webrtcCore.addEventListener('peerError', (err) => {
       console.error('WebRTC error:', err);
       showErrorMessage('Connection error. Please try refreshing the page.');
   });
   ```

3. **Mobile Optimization**: Consider device capabilities when requesting media:
   ```javascript
   // For mobile devices, use lower quality video
   const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
   const videoConstraints = isMobile ? 
       { width: { ideal: 640 }, height: { ideal: 480 } } : 
       { width: { ideal: 1280 }, height: { ideal: 720 } };
   
   webrtcCore.initializeMediaStream({ video: videoConstraints, audio: true });
   ```

4. **Cleanup**: Always clean up resources when they're no longer needed:
   ```javascript
   window.addEventListener('beforeunload', () => {
       if (window.mediaWidget) {
           window.mediaWidget.cleanup();
       }
       if (window.webrtcCore) {
           window.webrtcCore.cleanupConnection();
       }
   });
   ```
   
5. **Security**: Never expose sensitive information in WebRTC communication:
   ```javascript
   // DON'T do this:
   webrtcCore.sendData('profile', { userId: 12345, email: 'user@example.com' });
   
   // DO this instead:
   webrtcCore.sendData('profile', { displayName: 'Anonymous User', interests: ['hiking', 'reading'] });
   ```

## Troubleshooting

- **Module not found errors**: Check script loading order and paths
- **Connection issues**: Verify socket.io server is running and accessible
- **Media access denied**: Ensure proper permissions are requested
- **"Failed to execute 'addStream'"**: Make sure you're adding streams after peer is created but before connection is established
