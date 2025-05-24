/**
 * WebRTC Demo Module Loader
 * This file loads all the necessary WebRTC modules and handles their initialization
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('WebRTC Demo Module Loader: Loading modules...');
      // Define module dependencies
    const modules = [
        { name: 'UI', loaded: typeof initializeUI !== 'undefined' },
        { name: 'Signaling', loaded: typeof initializeSignaling !== 'undefined' },
        { name: 'Media', loaded: typeof getLocalMedia !== 'undefined' },
        { name: 'DataChannel', loaded: typeof initializeDataChannel !== 'undefined' },
        { name: 'Connection', loaded: typeof createPeerConnection !== 'undefined' },
        { name: 'Demo', loaded: typeof window.addLogEntry !== 'undefined' },
        { name: 'AI', loaded: typeof window.initializeAgeEstimator !== 'undefined' }
    ];
    
    // Check if all modules are loaded
    const missing = modules.filter(m => !m.loaded).map(m => m.name);
    
    if (missing.length > 0) {
        console.error(`WebRTC Demo Module Loader: Missing modules: ${missing.join(', ')}`);
        if (typeof addLogEntry === 'function') {
            addLogEntry(`Error: Missing modules: ${missing.join(', ')}`, 'error');
        } else {
            alert(`Error: WebRTC modules failed to load: ${missing.join(', ')}`);
        }
        return;
    }
    
    console.log('WebRTC Demo Module Loader: All modules loaded successfully!');
    
    // Initialize the signaling connection
    if (typeof initializeSignaling === 'function') {
        // Setup the signaling message handler
        initializeSignaling(async (message) => {
            const peerConnection = getPeerConnection();
            
            if (!peerConnection) {
                console.warn('[Loader] Received signaling message but peer connection is not established');
                addLogEntry('Received message but no active connection', 'warning');
                return;
            }

            try {
                if (message.type === 'offer') {
                    addLogEntry('Received call offer', 'info');
                    await processRemoteDescription(message);
                    
                    const answer = await createAnswer();
                    
                    if (answer) {
                        sendSignalingMessage(answer);
                        updateStatus('Call in progress');
                    }
                } 
                else if (message.type === 'answer') {
                    addLogEntry('Received call answer', 'info');
                    await processRemoteDescription(message);
                    updateStatus('Call connected');
                } 
                else if (message.type === 'candidate' && message.candidate) {
                    await addIceCandidate(message.candidate);
                }
            } catch (error) {
                console.error('[Loader] Error handling signaling message:', error);
                addLogEntry('Error processing message: ' + error.message, 'error');
            }
        });
          // Initialize the UI components
        initializeUI();
        
        // Initialize AI UI components if available
        if (typeof window.initializeAIUI === 'function') {
            window.initializeAIUI();
        }
        
        // Add event listener for the start call button
        const startCallButton = document.getElementById('startCall');
        if (startCallButton) {
            startCallButton.addEventListener('click', async () => {
                try {
                    updateStatus('Initializing call...');
                    
                    // Get user media for local video display
                    const localStream = await getLocalMedia();
                    
                    if (!localStream) {
                        throw new Error('Failed to get local media stream');
                    }
                    
                    updateStatus('Local stream active, establishing connection...');
                    
                    // Initialize peer connection
                    await createPeerConnection(
                        // Data channel handler
                        handleIncomingDataChannel,
                          // Remote track handler
                        (event) => {
                            const remoteStream = event.streams[0];
                            // Use the new canvas rendering function
                            if (window.setupRemoteStream) {
                                window.setupRemoteStream(remoteStream);
                                updateStatus('Receiving remote media stream');
                            } else {
                                // Fallback to direct video element if function not available
                                const remoteVideo = document.getElementById('remoteVideo');
                                if (remoteVideo) {
                                    remoteVideo.srcObject = remoteStream;
                                    updateStatus('Receiving remote media stream');
                                }
                            }
                        },
                        
                        // Connection state change handler
                        (state) => {
                            if (state === 'connected') {
                                addLogEntry('Peer connection fully established', 'success');
                            }
                        }
                    );
                    
                    // Add local stream to the peer connection
                    addLocalStream(localStream);
                    
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
                    console.error('[Loader] Error starting call:', error);
                    updateStatus('Error: ' + error.message, true);
                }
            });
        }
        
        // Add initial log entry
        addLogEntry('WebRTC demo modules loaded and initialized successfully');
    } else {
        console.error('WebRTC Demo Module Loader: initializeSignaling function not found!');
    }
});
