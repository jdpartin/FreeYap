/**
 * WebRTC Signaling Module
 * Handles WebSocket signaling for WebRTC connection establishment
 */

// Global signaling socket
let signalingSocket = null;

// Initialize WebSocket connection to the signaling server
function initializeSignaling(onMessage) {
    if (signalingSocket === null || signalingSocket.readyState === WebSocket.CLOSED) {
        updateStatus('Connecting to signaling server...');
        
        // Create WebSocket connection to the same host
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = protocol + window.location.host;
        
        try {
            signalingSocket = new WebSocket(wsUrl);

            signalingSocket.onopen = () => {
                console.log('[Signaling] Connected to the signaling server');
                updateStatus('Connected to signaling server');
                document.getElementById('startCall').disabled = false;
                addLogEntry('Signaling server connected', 'success');
            };

            signalingSocket.onclose = () => {
                console.log('[Signaling] Disconnected from the signaling server');
                updateStatus('Disconnected from signaling server', true);
                document.getElementById('startCall').disabled = true;
                addLogEntry('Signaling server disconnected', 'error');
            };

            signalingSocket.onerror = (error) => {
                console.error('[Signaling] WebSocket error:', error);
                updateStatus('Error connecting to signaling server', true);
                document.getElementById('startCall').disabled = true;
                addLogEntry('Signaling server error', 'error');
            };

            signalingSocket.onmessage = async (event) => {
                try {
                    // Handle different message types
                    let message;
                    
                    if (event.data instanceof Blob) {
                        // Handle binary data
                        const reader = new FileReader();
                        
                        reader.onload = async function() {
                            try {
                                // Try to parse as JSON if possible
                                const text = reader.result;
                                message = JSON.parse(String(text));
                                console.log('[Signaling] Parsed blob message:', message);
                                await onMessage(message);
                            } catch (e) {
                                console.error('[Signaling] Error processing binary message:', e);
                                addLogEntry('Error processing binary message', 'error');
                            }
                        };
                        
                        reader.readAsText(event.data);
                        return; // Return early as the processing will happen in the onload callback
                    } else {
                        // Handle text data
                        try {
                            message = JSON.parse(event.data);
                            console.log('[Signaling] Received message:', message);
                            await onMessage(message);
                        } catch (e) {
                            console.error('[Signaling] Error parsing JSON message:', e);
                            console.log('[Signaling] Received raw message:', event.data);
                            addLogEntry('Received non-JSON message', 'info');
                        }
                    }
                } catch (error) {
                    console.error('[Signaling] Error handling message:', error);
                    addLogEntry('Error in signaling: ' + error.message, 'error');
                }
            };
        } catch (error) {
            console.error('[Signaling] Error creating WebSocket:', error);
            updateStatus('Failed to create WebSocket connection', true);
            addLogEntry('Failed to create signaling connection', 'error');
        }
    }
}

// Send a message through the signaling channel
function sendSignalingMessage(message) {
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify(message));
        addLogEntry(`Sent ${message.type || 'unknown'} message`, 'info');
    } else {
        console.error('[Signaling] Cannot send message, WebSocket is not open');
        updateStatus('Signaling server not connected', true);
        addLogEntry('Failed to send message - not connected', 'error');
    }
}
