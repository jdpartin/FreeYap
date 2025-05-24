/**
 * WebRTC Demo Main Application
 * Integrates all WebRTC modules for a complete peer-to-peer communication solution
 */

// Global variables for the main application
// Note: localStream is defined in webrtcMedia.js
// Note: connectionId is defined in webrtcUI.js
let remoteStream = null;

// Initialize the application when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    initializeUI();
    
    // Connect to signaling server
    initializeSignaling(handleSignalingMessage);
    
    // Note: The start call button event handler is set in webrtcLoader.js
    // to avoid duplicate event handlers
});

// Signaling message handler
async function handleSignalingMessage(message) {
    const peerConnection = getPeerConnection();
    
    if (!peerConnection) {
        console.warn('[Main] Received signaling message but peer connection is not established');
        return;
    }

    if (message.type === 'offer') {
        // Handle incoming call offer
        addLogEntry('Received call offer', 'info');
        await processRemoteDescription(message);
        
        // Create an answer
        const answer = await createAnswer();
        
        if (answer) {
            sendSignalingMessage(answer);
            updateStatus('Call in progress');
        }
    } 
    else if (message.type === 'answer') {
        // Handle answer to our offer
        addLogEntry('Received call answer', 'info');
        await processRemoteDescription(message);
        updateStatus('Call connected');
    } 
    else if (message.type === 'candidate' && message.candidate) {
        // Handle ICE candidate
        await addIceCandidate(message.candidate);
    }
}

// Start a call
async function startCall() {
    try {
        updateStatus('Initializing call...');
        
        // Get user media for local video display
        const stream = await getLocalMedia();
        
        if (!stream) {
            throw new Error('Failed to get local media stream');
        }
        
        updateStatus('Local stream active, establishing connection...');
        
        // Initialize peer connection
        await createPeerConnection(
            // Data channel handler
            handleIncomingDataChannel,
            
            // Remote track handler
            (event) => {
                remoteStream = event.streams[0];
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                    updateStatus('Receiving remote media stream');
                }
            },
              // Connection state change handler
            (state) => {
                if (state === 'connected') {
                    // Optional: Start any connection-dependent features here
                }
            }
        );
        
        // Add local stream to the peer connection
        addLocalStream(stream);
        
        // Create data channel for chat and file transfer
        initializeDataChannel(getPeerConnection());
        
        // Create and send offer
        const offer = await createOffer();
        
        if (offer) {
            sendSignalingMessage(offer);
            updateStatus('Offer sent, waiting for answer...');
        } else {
            throw new Error('Failed to create offer');
        }
    } catch (error) {
        console.error('[Main] Error starting call:', error);
        updateStatus('Error: ' + error.message, true);
    }
}

// Expose key functions to the window to make them accessible from UI module
window.addLogEntry = addLogEntry;
window.updateStatus = updateStatus;
window.sendTextMessage = sendTextMessage;
window.sendFile = sendFile;
window.addChatMessage = addChatMessage;
window.toggleAudio = toggleAudio;
window.toggleVideo = toggleVideo;
window.takeScreenshot = takeScreenshot;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.switchCamera = switchCamera;
window.changeResolution = changeResolution;
window.changeFrameRate = changeFrameRate;
window.updateConnectionQuality = updateConnectionQuality;
window.updateConnectionQualityIndicator = updateConnectionQualityIndicator;
