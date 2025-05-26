class VideoChat
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;
        this.eventTarget = new EventTarget(); // For emitting custom events
        this.messageType = 'video-chat'; // Identifier for this specific module's messages
        
        this.localStream = null;
        this.remoteStream = null;
        this.mediaConstraints = {
            video: true,
            audio: true
        };
        
        // Listen for the connectionReady event
        this.webRTCConnectionManager.on('connectionReady', () => {
            this.setupVideoChannel(this.webRTCConnectionManager.getPeer());
            console.log('Video chat module connected to peer');
        });
    }

    setupVideoChannel(peer)
    {
        console.log('Setting up video handlers for video chat module');
        
        // Store the peer for sending control messages later
        this.peer = peer;
        
        // Handle incoming messages (for video control signals)
        peer.on('data', (data) => {
            try {
                // Try to parse as JSON to check if it's meant for this module
                const parsedData = JSON.parse(data.toString());
                
                // Only process messages meant for this module
                if (parsedData.type === this.messageType) {
                    console.log('Received video chat control message:', parsedData.action);
                    
                    // Handle different video control actions
                    this.handleVideoControlMessage(parsedData);
                }
            } catch (error) {
                // If parsing fails, it might be a raw message not following our protocol
                console.log('Received non-JSON data, ignoring in video chat module');
            }
        });        // Handle incoming media streams
        peer.on('stream', (stream) => {
            console.log('VideoChat: Received remote video stream', stream);
            console.log('VideoChat: Remote video tracks:', stream.getVideoTracks());
            console.log('VideoChat: Remote audio tracks:', stream.getAudioTracks());
            
            this.remoteStream = stream;
            
            // Emit an event with the received stream
            const event = new CustomEvent('remoteStream', { 
                detail: { stream }
            });
            this.eventTarget.dispatchEvent(event);
            
            // Log when remote tracks end
            stream.getTracks().forEach(track => {
                track.onended = () => {
                    console.log(`VideoChat: Remote ${track.kind} track ended`);
                };
            });
        });
    }

    handleVideoControlMessage(message)
    {
        switch (message.action) {
            case 'mute-video':
                this.emitControlEvent('videoMuted', message.value);
                break;
            case 'mute-audio':
                this.emitControlEvent('audioMuted', message.value);
                break;
            case 'video-request':
                // Peer is requesting to start video
                this.emitControlEvent('videoRequest', message.value);
                break;
            default:
                console.log('Unknown video control action:', message.action);
        }
    }

    emitControlEvent(eventName, value)
    {
        const event = new CustomEvent(eventName, {
            detail: { value }
        });
        this.eventTarget.dispatchEvent(event);
    }    // Start local video stream and send it to peer
    async startVideo()
    {
        try {
            console.log('VideoChat: Starting local video with constraints:', this.mediaConstraints);
            
            // Get user media with detailed constraints for better browser compatibility
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: true
            });
            
            console.log('VideoChat: Got local media stream:', this.localStream);
            console.log('VideoChat: Video tracks:', this.localStream.getVideoTracks());
            console.log('VideoChat: Audio tracks:', this.localStream.getAudioTracks());
            
            // Add the stream to the peer connection if peer is ready
            if (this.peer && !this.peer.destroyed) {
                console.log('VideoChat: Adding stream to peer connection');
                try {
                    this.peer.addStream(this.localStream);
                    
                    // Notify the other peer that we're starting video
                    this.sendControlMessage('video-request', true);
                    
                    // Emit local stream event
                    const event = new CustomEvent('localStream', { 
                        detail: { stream: this.localStream }
                    });
                    this.eventTarget.dispatchEvent(event);
                    
                    return true;
                } catch (peerError) {
                    console.error('VideoChat: Error adding stream to peer:', peerError);
                    return false;
                }
            } else {
                console.error('VideoChat: Peer connection is not ready. Cannot start video.');
                if (!this.peer) {
                    console.error('VideoChat: Peer object is null or undefined');
                } else if (this.peer.destroyed) {
                    console.error('VideoChat: Peer connection has been destroyed');
                }
                return false;
            }
        } catch (error) {
            console.error('VideoChat: Failed to get user media:', error);
            if (error.name === 'NotAllowedError') {
                console.error('VideoChat: User denied camera/mic permission');
            } else if (error.name === 'NotFoundError') {
                console.error('VideoChat: No camera/mic found');
            } else if (error.name === 'NotReadableError') {
                console.error('VideoChat: Camera/mic is already in use');
            }
            return false;
        }
    }

    // Stop video streaming
    stopVideo()
    {
        if (this.localStream) {
            // Stop all tracks in the stream
            this.localStream.getTracks().forEach(track => track.stop());
            
            // Remove the stream from the peer connection
            if (this.peer && !this.peer.destroyed) {
                this.peer.removeStream(this.localStream);
                
                // Notify the other peer that we're stopping video
                this.sendControlMessage('video-request', false);
            }
            
            this.localStream = null;
            return true;
        }
        return false;
    }

    // Toggle video mute state
    toggleVideo(mute)
    {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks.forEach(track => {
                    track.enabled = !mute;
                });
                
                // Notify the other peer about the mute state
                this.sendControlMessage('mute-video', mute);
                return true;
            }
        }
        return false;
    }

    // Toggle audio mute state
    toggleAudio(mute)
    {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks.forEach(track => {
                    track.enabled = !mute;
                });
                
                // Notify the other peer about the mute state
                this.sendControlMessage('mute-audio', mute);
                return true;
            }
        }
        return false;
    }

    // Send control message to peer
    sendControlMessage(action, value)
    {
        if (!this.peer || this.peer.destroyed) {
            console.error('Peer connection is not ready. Cannot send control message.');
            return false;
        }
        
        try {
            // Format the control message with our module identifier
            const controlMessage = {
                type: this.messageType,
                action: action,
                value: value,
                timestamp: new Date().toISOString()
            };
            
            // Send as JSON string
            console.log(`Sending video control message: ${action} = ${value}`);
            this.peer.send(JSON.stringify(controlMessage));
            return true;
        } catch (error) {
            console.error('Failed to send control message:', error);
            return false;
        }
    }
    
    // Set custom media constraints
    setMediaConstraints(constraints)
    {
        this.mediaConstraints = constraints;
        return this;
    }
    
    // Add event listeners for receiving messages/streams
    on(eventName, callback)
    {
        this.eventTarget.addEventListener(eventName, callback);
        return this;
    }
    
    // Remove event listeners
    off(eventName, callback)
    {
        this.eventTarget.removeEventListener(eventName, callback);
        return this;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoChat;
}