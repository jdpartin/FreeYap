// This is CLIENT-SIDE code for managing WebRTC connections
// It should never be referenced in the server-side code.
// Server-side code should never reference this file.
class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.dataChannel = null;
    this.room = null;
    this.apiBaseUrl = '/api/webrtc';
    this.socket = io();
    this.webrtcId = this.getOrGenerateWebRTCId();
    console.log(`Generated or retrieved WebRTC ID: ${this.webrtcId}`);

    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    // Set up Socket.IO event listeners
    this.socket.on('chat-ready', async ({ room, isCaller }) => {
      console.log('Chat ready, room:', room, 'isCaller:', isCaller);
      this.room = room;
      await this.joinRoom(room);
      await this.startCall(isCaller);
    });

    this.socket.on('waiting', () => {
      console.log('Waiting for a peer...');
    });

    this.socket.on('peer-disconnected', () => {
      console.log('Peer disconnected');
      this.endCall();
    });

    this.socket.on('offer', async ({ sdp }) => {
      console.log('Received offer');
      await this.handleOffer(sdp);
    });

    this.socket.on('answer', async ({ sdp }) => {
      console.log('Received answer');
      await this.handleAnswer(sdp);
    });

    this.socket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE candidate');
      await this.handleIceCandidate(candidate);
    });

    // Consolidate connection initiation logic
    this.socket.on('match-found', async ({ roomId }) => {
      console.log('Match found, joining room:', roomId);
      await this.initiateConnection(roomId);
    });

    this.socket.on('join-room', async (roomId) => {
      console.log('Joining room via event:', roomId);
      await this.initiateConnection(roomId);
    });

    this.socket.on('signal', async ({ roomId, signalData }) => {
      try {
        const response = await fetch(`${this.apiBaseUrl}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ socketId: this.socket.id, roomId, signalData })
        });
        const result = await response.json();
        console.log('Signal sent via API:', result);
      } catch (error) {
        console.error('Error sending signal via API:', error);
      }
    });
  }

  getOrGenerateWebRTCId() {
    const cookieName = 'webrtcId';
    const existingId = this.getCookie(cookieName);
    if (existingId) {
      return existingId;
    }
    const newId = crypto.randomUUID();
    this.setCookie(cookieName, newId, 365); // Save for 1 year
    return newId;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/`;
  }

  async joinRoom(roomId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socketId: this.socket.id, roomId })
      });
      const result = await response.json();
      console.log('Joined room:', result);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }

  async sendSignal(roomId, signalData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socketId: this.socket.id, roomId, signalData })
      });
      const result = await response.json();
      console.log('Signal sent:', result);
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  async disconnect() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socketId: this.socket.id })
      });
      const result = await response.json();
      console.log('Disconnected:', result);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  async startCall(isCaller) {
    console.log('Starting call, isCaller:', isCaller);
    this.peerConnection = new RTCPeerConnection(this.iceConfig);

    // Set up Data Channel for text chat if caller
    if (isCaller) {
      this.dataChannel = this.peerConnection.createDataChannel('text-chat');
      this.setupDataChannel(this.dataChannel);
    } else {
       // Set up handler for receiving data channel if receiver
       this.peerConnection.ondatachannel = (evt) => {
         this.dataChannel = evt.channel;
         this.setupDataChannel(this.dataChannel);
       };
    }

    this.peerConnection.onicecandidate = (evt) => {
      if (evt.candidate) {
        console.log('Sending ICE candidate');
        this.socket.emit('ice-candidate', {
          room: this.room,
          candidate: evt.candidate
        });
      }
    };

    this.peerConnection.ontrack = (evt) => {
      console.log('Received remote stream');
      this.remoteStream = evt.streams[0];
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo) remoteVideo.srcObject = this.remoteStream;
       // For voice/text chat, you might not need to attach the stream to a video element
       // but the track is still added to the peer connection.
    };

    try {
      // Request both video and audio, even if only audio/text is used initially
      // This simplifies the getUserMedia call.
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Got local stream');
      const localVideo = document.getElementById('localVideo');
      // Only attach video stream if it's a video chat page
      if (localVideo) localVideo.srcObject = this.localStream;

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Handle cases where user denies media access
      this.endCall(); // End call if media access is denied
      return;
    }

    if (isCaller) {
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        console.log('Sending offer');
        this.socket.emit('offer', {
          room: this.room,
          sdp: offer.sdp
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  }

  setupDataChannel(channel) {
    this.dataChannel = channel;
    console.log('Data Channel created/received', this.dataChannel);

    this.dataChannel.onopen = (evt) => {
      console.log('Data Channel is open');
      // You might want to emit an event here to notify the UI
      const event = new CustomEvent('datachannelopen');
      document.dispatchEvent(event);
    };

    this.dataChannel.onmessage = (evt) => {
      console.log('Data Channel message received:', evt.data);
      // You might want to emit an event here to pass the message to the UI
      const messageEvent = new CustomEvent('textmessage', { detail: evt.data });
      document.dispatchEvent(messageEvent);
    };

    this.dataChannel.onclose = (evt) => {
      console.log('Data Channel is closed');
      // You might want to emit an event here to notify the UI
      const event = new CustomEvent('datachannelclose');
      document.dispatchEvent(event);
    };

    this.dataChannel.onerror = (evt) => {
      console.error('Data Channel error:', evt);
      // You might want to emit an event here to notify the UI
      const errorEvent = new CustomEvent('datachannelerror', { detail: evt });
      document.dispatchEvent(errorEvent);
    };
  }

  sendTextMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      console.log('Sending text message:', message);
      this.dataChannel.send(message);
    } else {
      console.warn('Data channel is not open or available.');
      // You might want to notify the user that the message couldn't be sent
    }
  }

  async handleOffer(sdp) {
    console.log('Handling offer:', sdp);
    if (!this.peerConnection) {
      // If peer connection doesn't exist, create it and set up data channel handler
      await this.startCall(false); // This will set up the ondatachannel handler
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      console.log('Creating answer');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit('answer', {
        room: this.room,
        sdp: answer.sdp
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(sdp) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  endCall() {
    console.log('Ending call');
    if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      const localVideo = document.getElementById('localVideo');
      if (localVideo) localVideo.srcObject = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo) remoteVideo.srcObject = null;
    }
     // Notify server of disconnection
    if (this.socket && this.socket.connected) {
        this.socket.emit('end-call', { room: this.room });
    }
    this.room = null;
  }

  registerSession(sessionId, webrtcId)
  {
      console.log(`Registering session: ${sessionId} with WebRTC ID: ${webrtcId}`);
      this.socket.emit('register-session', { sessionId, webrtcId });
  }

  unregisterSession(sessionId)
  {
      console.log(`Unregistering session: ${sessionId}`);
      this.socket.emit('unregister-session', { sessionId });
  }

  addLocalStream(stream) {
    console.log('Adding local stream');
    this.localStream = stream;
    if (this.peerConnection) {
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });
    }
  }

  async joinQueue() {
    console.log('Joining queue via API');
    try {
        if (!this.webrtcId) {
            console.error('Error: WebRTC ID is not defined.');
            return;
        }

        const response = await fetch(`/api/matchmaking/join-queue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: this.webrtcId }) // Pass webrtcId as sessionId
        });
        const result = await response.json();

        if (result.success) {
            console.log('Queue joined successfully:', result);
        } else {
            console.error('Error joining queue:', result.error);
            // Optionally, you can emit an event or notify the user here
        }
    } catch (error) {
        console.error('Error joining queue via API:', error);
    }
}

  // New method to handle connection initiation
  async initiateConnection(roomId) {
    try {
        const response = await fetch(`${this.apiBaseUrl}/join-room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ socketId: this.socket.id, roomId })
        });
        const result = await response.json();
        console.log('Joined room via API:', result);
        this.room = roomId;
      } catch (error) {
        console.error('Error initiating connection:', error);
      }
  }
}

// You would instantiate this class and set up the signaling channel elsewhere in your client-side code.
// Example:
// const webrtcManager = new WebRTCManager();
// const signalingChannel = new WebSocket('ws://your-signaling-server-url'); // Replace with your actual signaling server URL
// webrtcManager.setSignalingChannel(signalingChannel);

// To start a call as the caller:
// webrtcManager.startCall(true);

// To start a call as the receiver (after receiving an offer via signaling):
// webrtcManager.startCall(false); // You might need to adjust the logic here to handle receiving the offer first
// webrtcManager.handleOffer(receivedOffer);
