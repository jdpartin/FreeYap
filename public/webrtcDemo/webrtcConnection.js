/**
 * WebRTC Connection Module
 * Handles the RTCPeerConnection setup and monitoring
 */

// Global peer connection variable
let peerConnection = null;

// WebRTC configuration with public STUN servers
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Flag to track connection creation process
let isCreatingConnection = false;

// Initialize a new WebRTC peer connection
async function createPeerConnection(onDataChannel, onTrack, onConnectionStateChange) {
    // Check if connection already exists
    if (peerConnection) {
        addLogEntry('Peer connection already exists, reusing existing connection', 'warning');
        return peerConnection;
    }
    
    // Prevent concurrent connection creation
    if (isCreatingConnection) {
        addLogEntry('Connection creation already in progress', 'warning');
        return null;
    }
    
    isCreatingConnection = true;
    try {
        // Create the RTCPeerConnection with the config
        peerConnection = new RTCPeerConnection(rtcConfig);
        
        addLogEntry('Created peer connection with configuration', 'info');
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                addLogEntry('Generated ICE candidate', 'info');
                
                // Send the candidate to the signaling server
                if (window.sendSignalingMessage) {
                    window.sendSignalingMessage({
                        type: 'candidate',
                        candidate: event.candidate
                    });
                }
            } else {
                addLogEntry('ICE candidate gathering complete', 'info');
            }
        };
        
        // Handle data channels
        peerConnection.ondatachannel = (event) => {
            addLogEntry('Received data channel from peer', 'info');
            if (onDataChannel) {
                onDataChannel(event);
            }
        };
        
        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            addLogEntry(`Received remote ${event.track.kind} track`, 'info');
            if (onTrack) {
                onTrack(event);
            }
        };
        
        // Log ICE gathering state changes
        peerConnection.onicegatheringstatechange = () => {
            addLogEntry('ICE gathering state: ' + peerConnection.iceGatheringState, 'info');
        };
        
        // Log signaling state changes
        peerConnection.onsignalingstatechange = () => {
            addLogEntry('Signaling state: ' + peerConnection.signalingState, 'info');
        };
        
        // Log connection state changes
        peerConnection.onconnectionstatechange = () => {
            addLogEntry('Connection state: ' + peerConnection.connectionState, 'info');
            
            if (peerConnection.connectionState === 'connected') {
                updateStatus('Peer connection established successfully');
                startConnectionQualityMonitoring();
            }            else if (peerConnection.connectionState === 'disconnected' || 
                     peerConnection.connectionState === 'failed' ||
                     peerConnection.connectionState === 'closed') {
                updateStatus('Peer connection ' + peerConnection.connectionState, true);
                
                // Stop remote canvas rendering if available
                if (window.stopRemoteCanvasRendering) {
                    window.stopRemoteCanvasRendering();
                }
            }
            
            if (onConnectionStateChange) {
                onConnectionStateChange(peerConnection.connectionState);
            }
        };
        
        // Log ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
            addLogEntry('ICE connection state: ' + peerConnection.iceConnectionState, 'info');
            
            if (peerConnection.iceConnectionState === 'connected' || 
                peerConnection.iceConnectionState === 'completed') {
                updateStatus('ICE connection established');
            } 
            else if (peerConnection.iceConnectionState === 'failed' || 
                     peerConnection.iceConnectionState === 'disconnected' ||
                     peerConnection.iceConnectionState === 'closed') {
                updateStatus('ICE connection ' + peerConnection.iceConnectionState, true);
            }
        };
          return peerConnection;
    } catch (error) {
        console.error('[Connection] Error creating peer connection:', error);
        addLogEntry('Failed to create peer connection: ' + error.message, 'error');
        peerConnection = null;
        return null;
    } finally {
        isCreatingConnection = false;
    }
}

// Add local media stream to the peer connection
function addLocalStream(stream) {
    if (!peerConnection) {
        addLogEntry('Cannot add stream - no active peer connection', 'error');
        return false;
    }
    
    if (!stream) {
        addLogEntry('No stream to add', 'error');
        return false;
    }
    
    try {
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
            addLogEntry(`Added ${track.kind} track to peer connection`, 'info');
        });
        return true;
    } catch (error) {
        console.error('[Connection] Error adding stream:', error);
        addLogEntry('Failed to add stream: ' + error.message, 'error');
        return false;
    }
}

// Flag to prevent simultaneous offer creation
let isCreatingOffer = false;

// Create an offer to start a WebRTC session
async function createOffer() {
    if (!peerConnection) {
        addLogEntry('Cannot create offer - no active peer connection', 'error');
        return null;
    }
    
    // Prevent concurrent offer creation
    if (isCreatingOffer) {
        addLogEntry('Offer creation already in progress', 'warning');
        return null;
    }
    
    try {
        isCreatingOffer = true;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        addLogEntry('Created and set local offer', 'info');
        return offer;
    } catch (error) {
        console.error('[Connection] Error creating offer:', error);
        addLogEntry('Failed to create offer: ' + error.message, 'error');
        return null;
    } finally {
        isCreatingOffer = false;
    }
}

// Create an answer to an offer
async function createAnswer() {
    if (!peerConnection) {
        addLogEntry('Cannot create answer - no active peer connection', 'error');
        return null;
    }
    
    try {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        addLogEntry('Created and set local answer', 'info');
        return answer;
    } catch (error) {
        console.error('[Connection] Error creating answer:', error);
        addLogEntry('Failed to create answer: ' + error.message, 'error');
        return null;
    }
}

// Process remote description (offer or answer)
async function processRemoteDescription(description) {
    if (!peerConnection) {
        addLogEntry('Cannot process remote description - no active peer connection', 'error');
        return false;
    }
    
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
        addLogEntry(`Processed remote ${description.type}`, 'info');
        return true;
    } catch (error) {
        console.error(`[Connection] Error setting remote ${description.type}:`, error);
        addLogEntry(`Failed to process remote ${description.type}: ${error.message}`, 'error');
        return false;
    }
}

// Process a remote ICE candidate
async function addIceCandidate(candidate) {
    if (!peerConnection) {
        addLogEntry('Cannot add ICE candidate - no active peer connection', 'error');
        return false;
    }
    
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        addLogEntry('Added remote ICE candidate', 'info');
        return true;
    } catch (error) {
        console.error('[Connection] Error adding ICE candidate:', error);
        addLogEntry('Failed to add ICE candidate: ' + error.message, 'error');
        return false;
    }
}

// Close the peer connection
function closePeerConnection() {
    if (!peerConnection) return;
    
    peerConnection.close();
    peerConnection = null;
    addLogEntry('Closed peer connection', 'info');
}

// Monitor the connection quality
function startConnectionQualityMonitoring() {
    if (!peerConnection) return;
    
    const monitoringInterval = setInterval(async () => {
        // Check if connection is still active
        if (!peerConnection || peerConnection.connectionState !== 'connected') {
            clearInterval(monitoringInterval);
            return;
        }
        
        try {
            const stats = await peerConnection.getStats();
            let videoPacketsLost = 0;
            let videoPacketsSent = 0;
            let latency = 0;
            let videoBitrate = 0;
            
            stats.forEach(report => {
                if (report.type === 'outbound-rtp' && report.kind === 'video') {
                    videoPacketsLost = report.packetsLost || 0;
                    videoPacketsSent = report.packetsSent || 0;
                    videoBitrate = report.bytesSent ? (report.bytesSent * 8 / 1000) : 0;
                }
                
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    latency = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 0;
                }
            });
            
            // Calculate packet loss percentage
            const packetLoss = videoPacketsSent ? (videoPacketsLost / videoPacketsSent) * 100 : 0;
            
            // Update connection quality indicator if the function exists
            if (window.updateConnectionQualityIndicator) {
                window.updateConnectionQualityIndicator(packetLoss, latency, videoBitrate);
            }
        } catch (error) {
            console.error('[Connection] Error getting connection stats:', error);
        }
    }, 1000);
}

// Update connection quality parameters
function updateConnectionQuality(videoBitrate) {
    if (!peerConnection) return false;
    
    try {
        const videoSender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
        );
        
        if (!videoSender) {
            addLogEntry('No video sender found', 'error');
            return false;
        }
        
        // Get current parameters
        const parameters = videoSender.getParameters();
        
        // Check if we can modify the parameters
        if (!parameters.encodings || parameters.encodings.length === 0) {
            parameters.encodings = [{}];
        }
        
        // Update bitrate
        parameters.encodings[0].maxBitrate = videoBitrate * 1000;
        
        // Apply changes
        videoSender.setParameters(parameters)
            .then(() => addLogEntry(`Changed video bitrate to ${videoBitrate} kbps`, 'success'))
            .catch(e => addLogEntry(`Error setting video bitrate: ${e.message}`, 'error'));
            
        return true;
    } catch (error) {
        console.error('[Connection] Error updating connection quality:', error);
        addLogEntry('Failed to update connection quality: ' + error.message, 'error');
        return false;
    }
}

// Get the peer connection object
function getPeerConnection() {
    return peerConnection;
}

// Export all functions to window for other modules
window.getPeerConnection = getPeerConnection;
window.createPeerConnection = createPeerConnection;
window.closePeerConnection = closePeerConnection;
