class VoiceChat
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;
        this.eventTarget = new EventTarget(); // For emitting custom events
        this.messageType = 'voice-chat'; // Identifier for this specific module's messages
        
        this.localStream = null;
        this.remoteStream = null;
        this.mediaConstraints = {
            video: false,
            audio: true
        };
        
        // Listen for the connectionReady event
        this.webRTCConnectionManager.on('connectionReady', () => {
            this.setupVoiceChannel(this.webRTCConnectionManager.getPeer());
            console.log('Voice chat module connected to peer');
        });
    }

    setupVoiceChannel(peer)
    {
        console.log('Setting up voice handlers for voice chat module');
        
        // Store the peer for sending control messages later
        this.peer = peer;
        
        // Handle incoming messages (for voice control signals)
        peer.on('data', (data) => {
            try {
                // Try to parse as JSON to check if it's meant for this module
                const parsedData = JSON.parse(data.toString());
                
                // Only process messages meant for this module
                if (parsedData.type === this.messageType) {
                    console.log('Received voice chat control message:', parsedData.action);
                    
                    // Handle different voice control actions
                    this.handleVoiceControlMessage(parsedData);
                }
            } catch (error) {
                // If parsing fails, it might be a raw message not following our protocol
                console.log('Received non-JSON data, ignoring in voice chat module');
            }
        });

        // Handle incoming media streams
        peer.on('stream', (stream) => {
            console.log('VoiceChat: Received remote audio stream', stream);
            console.log('VoiceChat: Remote audio tracks:', stream.getAudioTracks());
            console.log('VoiceChat: Remote video tracks (should be none):', stream.getVideoTracks());
            
            this.remoteStream = stream;
            
            // Emit an event with the received stream
            const event = new CustomEvent('remoteStream', { 
                detail: { stream }
            });
            this.eventTarget.dispatchEvent(event);
            
            // Log when remote tracks end
            stream.getTracks().forEach(track => {
                track.onended = () => {
                    console.log(`VoiceChat: Remote ${track.kind} track ended`);
                };
            });
        });
    }

    handleVoiceControlMessage(message)
    {
        switch (message.action) {
            case 'mute-audio':
                this.emitControlEvent('audioMuted', message.value);
                break;
            case 'voice-request':
                // Peer is requesting to start voice chat
                this.emitControlEvent('voiceRequest', message.value);
                break;
            case 'voice-effect':
                // Peer is applying a voice effect
                this.emitControlEvent('voiceEffect', message.value);
                break;
            default:
                console.log('Unknown voice control action:', message.action);
        }
    }

    emitControlEvent(eventName, value)
    {
        const event = new CustomEvent(eventName, {
            detail: { value }
        });
        this.eventTarget.dispatchEvent(event);
    }

    // Start local voice stream and send it to peer
    async startVoice()
    {
        try {
            console.log('VoiceChat: Starting local voice with constraints:', this.mediaConstraints);
            
            // Get user media with audio-only constraints for better performance
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });
            
            console.log('VoiceChat: Got local media stream:', this.localStream);
            console.log('VoiceChat: Audio tracks:', this.localStream.getAudioTracks());
            
            // Add the stream to the peer connection if peer is ready
            if (this.peer && !this.peer.destroyed) {
                console.log('VoiceChat: Adding stream to peer connection');
                try {
                    this.peer.addStream(this.localStream);
                    
                    // Notify the other peer that we're starting voice chat
                    this.sendControlMessage('voice-request', true);
                    
                    // Emit local stream event
                    const event = new CustomEvent('localStream', { 
                        detail: { stream: this.localStream }
                    });
                    this.eventTarget.dispatchEvent(event);
                    
                    return true;
                } catch (peerError) {
                    console.error('VoiceChat: Error adding stream to peer:', peerError);
                    return false;
                }
            } else {
                console.error('VoiceChat: Peer connection is not ready. Cannot start voice chat.');
                if (!this.peer) {
                    console.error('VoiceChat: Peer object is null or undefined');
                } else if (this.peer.destroyed) {
                    console.error('VoiceChat: Peer connection has been destroyed');
                }
                return false;
            }
        } catch (error) {
            console.error('VoiceChat: Failed to get user media:', error);
            if (error.name === 'NotAllowedError') {
                console.error('VoiceChat: User denied microphone permission');
            } else if (error.name === 'NotFoundError') {
                console.error('VoiceChat: No microphone found');
            } else if (error.name === 'NotReadableError') {
                console.error('VoiceChat: Microphone is already in use');
            }
            return false;
        }
    }

    // Stop voice streaming
    stopVoice()
    {
        if (this.localStream) {
            // Stop all tracks in the stream
            this.localStream.getTracks().forEach(track => track.stop());
            
            // Remove the stream from the peer connection
            if (this.peer && !this.peer.destroyed) {
                this.peer.removeStream(this.localStream);
                
                // Notify the other peer that we're stopping voice chat
                this.sendControlMessage('voice-request', false);
            }
            
            this.localStream = null;
            return true;
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

    // Set voice effect (for potential future enhancement)
    setVoiceEffect(effectType)
    {
        if (this.localStream) {
            // This would be implemented with Web Audio API for voice effects
            console.log(`VoiceChat: Setting voice effect: ${effectType}`);
            
            // Notify the other peer about the voice effect
            this.sendControlMessage('voice-effect', effectType);
            
            // Emit local event for UI updates
            this.emitControlEvent('voiceEffectChanged', effectType);
            return true;
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
            console.log(`Sending voice control message: ${action} = ${value}`);
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
        // Ensure video is always false for voice chat
        this.mediaConstraints = {
            ...constraints,
            video: false
        };
        return this;
    }
    
    // Get audio level for visualization (if available)
    getAudioLevel()
    {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                // This would require Web Audio API implementation for actual audio level detection
                // For now, return a simple enabled/disabled state
                return audioTracks[0].enabled;
            }
        }
        return false;
    }
    
    // Check if voice chat is active
    isVoiceActive()
    {
        return this.localStream !== null && this.peer && !this.peer.destroyed;
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
    module.exports = VoiceChat;
}
