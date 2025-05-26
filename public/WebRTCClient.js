// Use the global SimplePeer object provided by the CDN
// Removed the require statement for SimplePeer

const socket = io('http://localhost:3000');

// Make socket available globally for other scripts
window.socket = socket;

var mySocketId = null;
var partnerSocketId = null;

var peer = null;
var isInitiator = false;
var hasReceivedPartnerTopics = false;
var hasSentSmartHello = false;

var streamElement = null;
let localStream = null;
let partnerName = null; // Will store the random name for the partner

// Function to get topics from URL parameters
function getTopicsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const topicsParam = urlParams.get('topics');
    
    if (topicsParam) {
        try {
            return JSON.parse(topicsParam);
        } catch (error) {
            console.error('Error parsing topics from URL:', error);
            return [];
        }
    }
    return [];
}

// Gender-neutral names from diverse backgrounds
const genderNeutralNames = [
    // English/Western
    'Alex', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Sage', 'Quinn', 'River', 'Sky',
    'Cameron', 'Drew', 'Emery', 'Finley', 'Hayden', 'Jamie', 'Kendall', 'Lane', 'Peyton', 'Rowan',
    'Blake', 'Charlie', 'Dallas', 'Eden', 'Gray', 'Harper', 'Indigo', 'Jesse', 'Kai', 'Logan',
    'Nova', 'Oakley', 'Parker', 'Reese', 'Shay', 'Tate', 'Val', 'Winter', 'Ziggy',
    
    // Asian backgrounds
    'Ari', 'Hana', 'Yuki', 'Ren', 'Jun', 'Aki', 'Sora', 'Mika', 'Kyo', 'Nori',
    'Jae', 'Min', 'Sol', 'Lin', 'Wei', 'An', 'Bay', 'Chi', 'Kit', 'Sam',
    
    // Arabic/Middle Eastern
    'Nour', 'Rami', 'Sami', 'Dana', 'Farah', 'Iman', 'Nada', 'Rana', 'Tala', 'Zara',
    'Amari', 'Leila', 'Marwan', 'Nabil', 'Rania', 'Samir',
    
    // African backgrounds
    'Amara', 'Kesi', 'Nia', 'Zuri', 'Jengo', 'Kito', 'Omari', 'Penda', 'Sekai', 'Taraji',
    'Amani', 'Bahati', 'Dalila', 'Imara', 'Jenni', 'Kaia', 'Lulu', 'Mosi', 'Nuru', 'Oni',
    
    // Latin/Hispanic backgrounds
    'Gael', 'Isa', 'Luz', 'Paz', 'Remi', 'Sol', 'Cruz', 'Dani', 'Emilio', 'Fran',
    'Mar', 'Neo', 'Rio', 'Vale', 'Ari', 'Carmen', 'Davi', 'Eli', 'Nico', 'Santi',
    
    // Indigenous/Native backgrounds
    'Aiyana', 'Dakota', 'Phoenix', 'Sage', 'Storm', 'Rain', 'Bear', 'Moon', 'Star', 'Wolf'
];

// Function to get a random gender-neutral name
function getRandomPartnerName() {
    const randomIndex = Math.floor(Math.random() * genderNeutralNames.length);
    return genderNeutralNames[randomIndex];
}

// Global function to get current partner name (accessible to other scripts)
window.getPartnerName = function() {
    return partnerName || 'Partner';
};

// Get user's topics from URL
const userTopics = getTopicsFromURL();

socket.on('connect', () =>
{
    console.log('Connected to socket.io');
});

socket.on('youAre', ({ socketId }) =>
{
    mySocketId = socketId;
});

socket.on('signal', ({ fromSocketId, data }) =>
{
    console.log('Received signal from', fromSocketId);

    // Only accept signals from our matched partner
    if (partnerSocketId && fromSocketId !== partnerSocketId)
    {
        console.warn('Received signal from unexpected socket:', fromSocketId);
        return;
    }

    // If we don't have a partner yet, set it (for cases where signal comes before match-found)
    if (!partnerSocketId)
    {
        partnerSocketId = fromSocketId;
    }

    // Check if peer exists and is not destroyed
    if (!peer)
    {
        // If we receive a signal but don't have a peer, we must be the non-initiator
        console.log('Creating new peer as non-initiator to handle incoming signal');
        peer = new SimplePeer({ 
            initiator: false, 
            trickle: true
            // Don't add stream immediately to avoid potential SDP conflicts
        });
        
        setupPeer(peer, fromSocketId);
        
        // Add the stream after a short delay
        setTimeout(() => {
            if (localStream && peer && !peer.destroyed) {
                console.log('Adding media stream to new non-initiator peer');
                try {
                    peer.addStream(localStream);
                } catch (streamErr) {
                    console.error('Error adding stream to non-initiator peer:', streamErr);
                }
            }
        }, 100);
    }
    else if (peer.destroyed) {
        console.log('Peer was destroyed, creating new peer to handle signal');
        
        // Change the initiator role if we've seen this error before
        const shouldSwitchInitiator = window._hadSdpOrderIssue === true;
        
        peer = new SimplePeer({ 
            initiator: shouldSwitchInitiator ? !isInitiator : false, 
            trickle: true,
            // Don't add stream immediately to avoid SDP conflicts
            // stream: localStream,
            
            // Add SDP transform to handle potential m-line order issues
            sdpTransform: (sdp) => {
                // Just log and return unchanged for now
                if (window._hadSdpOrderIssue) {
                    console.log('Applying SDP transform due to previous m-line issues');
                }
                return sdp;
            }
        });
        setupPeer(peer, fromSocketId);
        
        // Add stream after a short delay
        setTimeout(() => {
            if (localStream && peer && !peer.destroyed) {
                console.log('Adding media stream to reconstructed peer');
                try {
                    peer.addStream(localStream);
                } catch (streamErr) {
                    console.error('Error adding stream to reconstructed peer:', streamErr);
                }
            }
        }, 100);
    }

    // Ensure this is a safe signal we can process
    if (data && data._textchatOnly && peer && !peer._textChatConfigured) {
        console.warn('Received text-chat-only signal but main connection not configured for it. Skipping.');
        return;
    }

    // Only signal if peer exists and is not destroyed
    if (peer && !peer.destroyed) {
        try {
            // Check if this is SDP data that might have ordering issues
            if (data && data.type && (data.type === 'offer' || data.type === 'answer')) {
                console.log(`Received ${data.type} from partner`);
                
                // If we've had m-line issues before, apply special handling
                if (window._hadSdpOrderIssue) {
                    console.log('Using careful signaling due to previous m-line issues');
                    
                    // Add a delay before signaling to ensure proper processing
                    setTimeout(() => {
                        try {
                            peer.signal(data);
                        } catch (delayedErr) {
                            console.error('Error in delayed signaling:', delayedErr);
                            // Critical failure - destroy and recreate with opposite role
                            handleSignalError(delayedErr, fromSocketId, data);
                        }
                    }, 100); // Increased delay for more reliability
                } else {
                    // Standard signaling with minimal safety delay
                    setTimeout(() => {
                        try {
                            peer.signal(data);
                        } catch (err) {
                            console.error('Error in standard signaling:', err);
                            handleSignalError(err, fromSocketId, data);
                        }
                    }, 10); // Small delay to avoid race conditions
                }
            } else {
                // For ICE candidates and other non-SDP signals
                peer.signal(data);
            }
        } catch (err) {
            console.error('Error while signaling:', err);
            handleSignalError(err, fromSocketId, data);
        }
    } else {
        console.warn('Cannot signal: peer is null or destroyed');
    }
});

// Helper function to handle signal errors
function handleSignalError(err, fromSocketId, data) {
    // Log detailed error information
    console.error('WebRTC signaling error details:', {
        message: err.message,
        stack: err.stack,
        dataType: data?.type || 'unknown'
    });
    
    // If there was an error with the SDP format, try to recreate the connection
    if (err.message && (
        err.message.includes('order of m-lines') || 
        err.message.includes('Failed to set remote') ||
        err.message.includes('setRemoteDescription')
    )) {
        // Mark that we've had this specific issue
        window._hadSdpOrderIssue = true;
        console.warn('SDP format issue detected, recreating peer connection with role reversal');
        
        // Clean up first
        if (peer) {
            // Save the text chat configured flag if it exists
            const wasTextChatConfigured = peer._textChatConfigured || false;
            
            peer.destroy();
            peer = null;
        }
        
        // Wait a bit before recreating the connection
        setTimeout(() => {
            // Create new peer with opposite initiator value and no stream initially
            console.log('Creating recovery peer with initiator value:', !isInitiator);
            peer = new SimplePeer({ 
                initiator: !isInitiator, 
                trickle: true,
                // Add SDP transform to try to fix the m-line issue
                sdpTransform: (sdp) => {
                    // Log the original SDP for debugging
                    console.log('Applying SDP transform due to previous m-line issues');
                    
                    // No actual modification yet, just return as-is
                    return sdp;
                }
            });
            
            // Flag this as a recovery peer
            peer._isRecoveryPeer = true;
            
            setupPeer(peer, fromSocketId);
            
            // Add stream after setup with a small delay to avoid race conditions
            setTimeout(() => {
                if (localStream && peer && !peer.destroyed) {
                    console.log('Adding media stream to recovery peer');
                    try {
                        peer.addStream(localStream);
                    } catch (streamErr) {
                        console.error('Error adding stream to recovery peer:', streamErr);
                    }
                }
            }, 200);
            
            // Update UI to show recovery attempt
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.className = 'alert alert-warning text-center';
                statusMessage.textContent = 'Connection issue detected. Attempting to reconnect...';
            }
            
            // If multiple retries fail, suggest refreshing the page
            if (window._recoveryAttempts) {
                window._recoveryAttempts++;
                if (window._recoveryAttempts > 3) {
                    console.warn('Multiple recovery attempts failed');
                    if (statusMessage) {
                        statusMessage.textContent = 'Connection issues persist. You may need to refresh the page.';
                    }
                }
            } else {
                window._recoveryAttempts = 1;
            }
        }, 500); // Increased delay for more reliability
    }
}

// Add match-found event to establish WebRTC connection
socket.on('match-found', ({ socketId, matchedSocketId, isInitiator: serverIsInitiator }) =>
{
    console.log('Match found with socket ID:', matchedSocketId, 'I am initiator:', serverIsInitiator);

    // Set the partner socket ID and initiator status
    partnerSocketId = matchedSocketId;
    isInitiator = serverIsInitiator;
    
    // Generate a random name for the partner
    partnerName = getRandomPartnerName();
    console.log('Partner will be called:', partnerName);
    
    // Update the UI with the partner name
    updatePartnerSectionHeader();
    updateChatSessionTitle();
    
    // Initialize modular text chat widgets is handled by the specific page
    // Implementation of setupConnection is managed by each page's specific setup
    // to prevent event listener duplication and race conditions
    
    // Reset any previous recovery attempt tracking
    window._recoveryAttempts = 0;
    window._hadSdpOrderIssue = false;
    
    // Initialize WebRTC connection
    if (!peer || peer.destroyed)
    {
        console.log('Creating new SimplePeer connection as initiator:', isInitiator);
        
        // For recovering from SDP issues, we may need to delay adding the stream
        const shouldDelayAddingStream = window._hadSdpOrderIssue === true;
        
        peer = new SimplePeer({ 
            initiator: isInitiator, 
            trickle: true,
            stream: shouldDelayAddingStream ? null : localStream // Only add stream immediately if no previous issues
        });
        
        setupPeer(peer, matchedSocketId);
        
        // If we delayed adding the stream, add it after a short delay
        if (shouldDelayAddingStream && localStream) {
            setTimeout(() => {
                if (peer && !peer.destroyed) {
                    console.log('Adding media stream after delay');
                    try {
                        peer.addStream(localStream);
                    } catch (err) {
                        console.error('Error adding delayed stream:', err);
                    }
                }
            }, 200);
        }
        // If we don't have local stream yet, add it when we get it
        else if (!localStream)
        {
            console.log('No local stream yet, initializing media stream...');
            initializeMediaStream().catch(err =>
            {
                console.error('Error initializing media stream in match-found:', err);
            });
        }
    }
    else
    {
        console.warn('Peer already exists, checking if it needs to be reset.');
        
        // Check if the peer is in a good state before reusing
        if (!peer.connected && peer.channelReady === false) {
            console.log('Existing peer is in an inconsistent state, recreating it');
            
            // Clean up and create new peer
            peer.destroy();
            
            peer = new SimplePeer({ 
                initiator: isInitiator, 
                trickle: true,
                stream: localStream
            });
            setupPeer(peer, matchedSocketId);
        } else {
            // Peer exists and seems to be in a good state
            console.log('Reusing existing peer connection');
            
            // Check if we need to refresh the signal path
            if (peer._lastSignalPartner !== matchedSocketId) {
                peer._lastSignalPartner = matchedSocketId;
                console.log('Updating peer signaling partner');
            }
        }
    }
});

function setupPeer(peer, toSocketId = null)
{
    peer.on('signal', data =>
    {
        if (toSocketId)
        {
            socket.emit('signal', { toSocketId, data });
        }
        else
        {
            // Use the first sender as the partner
            console.log("Waiting to receive partner's socket ID...");
        }
    });
    
    peer.on('connect', () =>
    {
        console.log('Peer connection established!');
        
        // Display user's own topics
        displayUserTopics(userTopics);
        
        // Send topics immediately when connection is established
        if (userTopics && userTopics.length > 0) {
            try {
                const topicsMessage = {
                    type: 'topics',
                    topics: userTopics
                };
                peer.send(JSON.stringify(topicsMessage));
                console.log('Sent topics to partner:', userTopics);
            } catch (err) {
                console.error('Error sending topics:', err);
                // If we can't send, the connection might not be fully established
                setTimeout(() => {
                    try {
                        if (peer && !peer.destroyed) {
                            const topicsMessage = {
                                type: 'topics',
                                topics: userTopics
                            };
                            peer.send(JSON.stringify(topicsMessage));
                            console.log('Retry: Sent topics to partner:', userTopics);
                        }
                    } catch (retryErr) {
                        console.error('Failed to send topics after retry:', retryErr);
                    }
                }, 1000);
            }
        }
        
        // Configure text chat widget after WebRTC connection is established
        if (!peer._textChatConfigured) {
            peer._textChatConfigured = true;
            
            const currentPath = window.location.pathname;
            let textChatWidgetId = null;
            
            if (currentPath.includes('voiceChat')) {
                textChatWidgetId = 'voice-text-chat';
            } else if (currentPath.includes('videoChat')) {
                textChatWidgetId = 'video-text-chat';
            }
            
            if (textChatWidgetId && window.textChatWidgets && window.textChatWidgets[textChatWidgetId]) {
                console.log(`Configuring ${textChatWidgetId} widget with established WebRTC connection`);
                try {
                    // Add small delay to ensure connection is fully established first
                    setTimeout(() => {
                        if (peer && !peer.destroyed && peer.connected) {
                            window.textChatWidgets[textChatWidgetId].setupConnection({
                                partnerSocketId: partnerSocketId,
                                isInitiator: isInitiator,
                                useExistingPeer: true,
                                sharedPeer: peer, // Pass the actual peer object
                                isRecoveryConnection: peer._isRecoveryPeer || false
                            });
                            console.log(`Successfully configured ${textChatWidgetId} widget with main WebRTC connection`);
                        } else {
                            console.warn(`Cannot configure text chat: peer is ${peer ? (peer.destroyed ? 'destroyed' : 'disconnected') : 'null'}`);
                        }
                    }, 100);
                } catch (err) {
                    console.error(`Error configuring ${textChatWidgetId} widget:`, err);
                }
            } else {
                console.log('Text chat widget not found or not ready yet');
            }
        } else {
            console.log('Text chat widget already configured, skipping setup');
        }
        
        // Don't send hello message immediately - wait for similarity calculation
        // But set a fallback timeout in case topic exchange fails
        setTimeout(() => {
            if (!hasSentSmartHello && peer && !peer.destroyed && peer.connected) {
                console.log('Fallback: sending hello message after timeout');
                const fallbackMessage = {
                    type: 'message',
                    content: "Hey there! Great to connect with someone new. How's it going? 😊"
                };
                try {
                    peer.send(JSON.stringify(fallbackMessage));
                    hasSentSmartHello = true;
                } catch (err) {
                    console.error('Error sending fallback hello message:', err);
                }
            }
        }, 5000); // 5 second fallback
    });peer.on('data', data =>
    {
        try {
            const message = JSON.parse(data.toString());
              if (message.type === 'topics') {
                console.log('Received partner topics:', message.topics);                hasReceivedPartnerTopics = true;
                
                // Use similarity-enabled display function and send smart hello
                displayTopicsWithSimilarity(userTopics, message.topics);
                
                // Send smart hello message after similarity calculation
                checkAndSendSmartHello(message.topics);
            } else if (message.type === 'message') {
                console.log('Received message:', message.content);
                appendMessage(partnerName || 'Partner', message.content);
            } else {
                // Handle plain text messages (backward compatibility)
                console.log('Received message:', data.toString());
                appendMessage(partnerName || 'Partner', data.toString());
            }
        } catch (error) {
            // If it's not JSON, treat as plain text message
            console.log('Received message:', data.toString());
            appendMessage(partnerName || 'Partner', data.toString());
        }
    });    peer.on('error', err =>
    {
        console.error('Peer error:', err);
        
        // Check if the error is recoverable
        if (err.message && (
            err.message.includes('ICE connection failed') || 
            err.message.includes('signaling state') || 
            err.message.includes('connection closed') ||
            err.message.includes('cannot signal after peer is destroyed')
        )) {
            console.warn('Attempting to recover from WebRTC error...');
            
            // Notify user of the connection issue
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.className = 'alert alert-warning text-center';
                statusMessage.textContent = 'Connection issue detected. Attempting to reconnect...';
            }
            
            // Wait briefly then attempt reconnection
            setTimeout(() => {
                if (peer.destroyed) {
                    console.log('Creating new peer connection after error');
                    // If we have partner socket ID, create new connection
                    if (partnerSocketId) {
                        peer = new SimplePeer({ 
                            initiator: true, 
                            trickle: true,
                            stream: localStream
                        });
                        setupPeer(peer, partnerSocketId);
                    }
                }
            }, 2000);
        }
    });

    peer.on('close', () =>
    {
        console.log('Peer connection closed');
        
        // Check if this was an expected or unexpected close
        if (partnerSocketId) {
            console.log('Connection closed while partner was connected');
            
            // Update UI to reflect disconnection
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.className = 'alert alert-info text-center';
                statusMessage.textContent = 'Connection closed. Your partner disconnected.';
            }
            
            // Enable start button if it exists
            const startButton = document.getElementById('startButton');
            if (startButton) {
                startButton.disabled = false;
            }
        }
    });    // Handle remote stream
    peer.on('stream', remoteStream =>
    {
        console.log('Received remote stream');

        try {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = remoteStream;
                
                // Handle audio-only streams (voice chat) that use the video element
                const currentPath = window.location.pathname;
                if (currentPath.includes('voiceChat')) {
                    // For voice chat, hide video element if there's no video track
                    const hasVideoTrack = remoteStream.getVideoTracks().length > 0;
                    remoteVideo.style.display = hasVideoTrack ? 'block' : 'none';
                }
                
                // Handle autoplay issues
                remoteVideo.play().catch(err => {
                    console.warn('Autoplay prevented. User interaction required:', err);
                    
                    // Show message to user that they need to interact with page
                    const statusMessage = document.getElementById('statusMessage');
                    if (statusMessage) {
                        statusMessage.className = 'alert alert-warning text-center';
                        statusMessage.textContent = 'Please click anywhere on the page to start audio/video.';
                        
                        // Add one-time click handler to play media
                        document.body.addEventListener('click', function playMediaOnce() {
                            remoteVideo.play();
                            document.body.removeEventListener('click', playMediaOnce);
                            
                            // Update status message
                            if (statusMessage) {
                                statusMessage.className = 'alert alert-success text-center';
                                statusMessage.textContent = 'Connection successful! You can now communicate with your partner.';
                            }
                        }, { once: true });
                    }
                });
            } else {
                // For audio-only on pages without video element
                console.log('Remote video element not found, creating audio element');
                
                // Create audio element for voice-only chat if needed
                const remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remoteAudio';
                remoteAudio.autoplay = true;
                remoteAudio.srcObject = remoteStream;
                document.body.appendChild(remoteAudio);
            }
        } catch (err) {
            console.error('Error handling remote stream:', err);
        }
    });
}

// Clean up peer connection and reset state
function cleanupPeerConnection()
{
    if (peer)
    {
        peer.destroy();
        peer = null;
    }
    partnerSocketId = null;
    partnerName = null;
    isInitiator = false;
    hasReceivedPartnerTopics = false;
    hasSentSmartHello = false;
    
    // Reset UI elements
    resetChatSessionTitle();
    
    console.log('Peer connection cleaned up');
}

// Function to reset chat session title to default
function resetChatSessionTitle() {
    const chatTitle = document.getElementById('chat-session-title');
    
    if (chatTitle) {
        // Check which page we're on to set appropriate default title
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('textChat')) {
            chatTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat Session
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: none;"></i>
            `;
        } else {
            chatTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill"></i> Chat
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: none;"></i>
            `;
        }
    }
}

// Add text chat support and media controls

// HTML elements for text chat and media controls
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');
const toggleCameraButton = document.getElementById('toggle-camera');
const toggleMicButton = document.getElementById('toggle-mic');

// Flag to track if elements are available
const hasTextChatElements = chatInput && chatSendButton && chatMessages;

let isCameraOn = true;
let isMicOn = true;

// Initialize media stream with configurable constraints
async function initializeMediaStream(constraints = null)
{
    try
    {
        // Use provided constraints or determine based on page context
        let mediaConstraints;
        
        if (constraints) {
            mediaConstraints = constraints;
        } else {
            // Auto-detect based on page URL or elements present
            const currentPath = window.location.pathname;
            const isTextChat = currentPath.includes('textChat') || document.getElementById('chatBox');
            const isVoiceChat = currentPath.includes('voiceChat') || 
                              (document.querySelector('.voice-container') && !document.getElementById('remoteVideo'));
            
            if (isTextChat) {
                // Text chat - no audio or video needed initially
                console.log('Text chat detected - no media permissions requested initially');
                return null;
            } else if (isVoiceChat) {
                // Voice chat - audio only
                mediaConstraints = { video: false, audio: true };
                console.log('Voice chat detected - requesting audio only');
            } else {
                // Default to video chat - both video and audio
                mediaConstraints = { video: true, audio: true };
                console.log('Video chat detected - requesting video and audio');
            }
        }
        
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        // Display the local stream in the localVideo element
        const localVideo = document.getElementById('localVideo');
        if (localVideo)
        {
            localVideo.srcObject = localStream;
        }

        // Add the local stream to the peer connection if it exists
        if (peer && !peer.destroyed)
        {
            peer.addStream(localStream);
        }

        return localStream;
    }
    catch (err)
    {
        console.error('Error accessing media devices:', err);
        throw err;
    }
}

// Don't automatically initialize media stream on page load
// Let each page control when to request permissions
// initializeMediaStream();

// Initialize user topics display on page load
document.addEventListener('DOMContentLoaded', function() {
    displayUserTopics(userTopics);
});

// Handle text chat send - only attach listener if element exists
if (chatSendButton && chatInput && chatMessages) {
    chatSendButton.addEventListener('click', () =>
    {
        const message = chatInput.value.trim();
        if (message && peer)
        {
            const messageData = {
                type: 'message',
                content: message
            };
            peer.send(JSON.stringify(messageData));
            appendMessage('You', message);
            chatInput.value = '';
        }    });
}

// Append message to chat
function appendMessage(sender, message)
{
    // Check if chatMessages element exists
    if (!chatMessages) {
        console.warn('Chat messages container not found, cannot append message');
        return;
    }
    
    try {
        const messageElement = document.createElement('div');
        messageElement.className = sender === 'You' ? 'message-outgoing' : 'message-incoming';
        
        // Add timestamp
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-content">${message}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error('Error appending message:', err);
    }
}

// Toggle camera
if (toggleCameraButton) {
    toggleCameraButton.addEventListener('click', () =>
    {
        if (localStream)
        {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack)
            {
                isCameraOn = !isCameraOn;
                videoTrack.enabled = isCameraOn;
                toggleCameraButton.textContent = isCameraOn ? 'Turn Camera Off' : 'Turn Camera On';
            }
        }
    });
}

// Toggle microphone
if (toggleMicButton) {
    toggleMicButton.addEventListener('click', () =>
    {
        if (localStream)
        {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack)
            {
                isMicOn = !isMicOn;
                audioTrack.enabled = isMicOn;
                toggleMicButton.textContent = isMicOn ? 'Turn Mic Off' : 'Turn Mic On';
            }
        }
    });
}

// Function to display user's topics
function displayUserTopics(topics) {
    const userTopicsList = document.getElementById('user-topics-list');
    if (!userTopicsList) return;
    
    if (topics && topics.length > 0) {
        userTopicsList.innerHTML = '';
        topics.forEach((topic, index) => {
            const topicBubble = document.createElement('span');
            topicBubble.className = 'topic-bubble';
            topicBubble.textContent = topic;
            topicBubble.style.animationDelay = `${index * 0.1}s`;
            topicBubble.classList.add('new-topic');
            userTopicsList.appendChild(topicBubble);
        });
    } else {
        userTopicsList.innerHTML = '<div class="topics-empty">No topics selected</div>';
    }
}

// Function to display partner's topics
function displayPartnerTopics(partnerTopics) {
    const partnerTopicsList = document.getElementById('partner-topics-list');
    if (!partnerTopicsList) return;
    
    // Update the partner section header with the random name
    updatePartnerSectionHeader();
    
    if (partnerTopics && partnerTopics.length > 0) {
        partnerTopicsList.innerHTML = '';
        partnerTopics.forEach((topic, index) => {
            const topicBubble = document.createElement('span');
            topicBubble.className = 'topic-bubble';
            topicBubble.textContent = topic;
            topicBubble.style.animationDelay = `${index * 0.1}s`;
            topicBubble.classList.add('new-topic');
            partnerTopicsList.appendChild(topicBubble);
        });
    } else {
        partnerTopicsList.innerHTML = '<div class="topics-empty">No topics shared</div>';
    }
}

// Function to update partner section header with random name
function updatePartnerSectionHeader() {
    // Update partner topics header using the new ID
    const partnerHeader = document.getElementById('partner-topics-header');
    if (partnerHeader && partnerName) {
        partnerHeader.textContent = `${partnerName}'s Topics`;
    }
    
    // Update waiting message if present
    const waitingMessage = document.querySelector('#partner-topics-list .topics-empty');
    if (waitingMessage && waitingMessage.textContent.includes('Waiting for partner')) {
        waitingMessage.textContent = `Waiting for ${partnerName || 'partner'}...`;
    }
}

// Function to update chat session title with partner name
function updateChatSessionTitle() {
    const chatTitle = document.getElementById('chat-session-title');
    
    if (chatTitle && partnerName) {
        // Update the title text
        const iconElement = chatTitle.querySelector('.bi-chat-dots-fill');
        if (iconElement) {
            chatTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat with ${partnerName}
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help;"></i>
            `;
            
            // Initialize Bootstrap tooltip for the info icon if Bootstrap is available
            const infoIcon = chatTitle.querySelector('.chat-info-icon');
            if (infoIcon && typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                new bootstrap.Tooltip(infoIcon, {
                    placement: 'bottom',
                    trigger: 'hover focus'
                });
            }
        }
    }
}

//#region Topic Similarity Functions

// Calculate cosine similarity between two vectors
function calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

// Get bulk embeddings for topics
async function getBulkTopicEmbeddings(topics) {
    if (!topics || topics.length === 0) {
        return [];
    }    try {
        const response = await fetch('/api/semantic-similarity/bulk-embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topics })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            return data.embeddings;
        } else {
            console.error('Failed to get bulk embeddings:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error fetching bulk embeddings:', error);
        return [];
    }
}

// Calculate similarity matrix between two sets of topics
async function calculateTopicSimilarities(userTopics, partnerTopics) {
    if (!userTopics || !partnerTopics || userTopics.length === 0 || partnerTopics.length === 0) {
        return [];
    }

    try {
        // Get all unique topics
        const allTopics = [...new Set([...userTopics, ...partnerTopics])];
        
        // Get embeddings for all topics
        const embeddings = await getBulkTopicEmbeddings(allTopics);
        
        // Create embedding lookup map
        const embeddingMap = {};
        embeddings.forEach(item => {
            embeddingMap[item.topic] = item.embedding;
        });

        // Calculate similarities
        const similarities = [];
        
        userTopics.forEach(userTopic => {
            const userEmbedding = embeddingMap[userTopic];
            if (!userEmbedding) return;
            
            partnerTopics.forEach(partnerTopic => {
                const partnerEmbedding = embeddingMap[partnerTopic];
                if (!partnerEmbedding) return;
                
                const similarity = calculateCosineSimilarity(userEmbedding, partnerEmbedding);
                similarities.push({
                    userTopic,
                    partnerTopic,
                    similarity,
                    similarityPercentage: Math.round(similarity * 10000) / 100
                });
            });
        });

        // Sort by similarity score (highest first)
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        return similarities;
    } catch (error) {
        console.error('Error calculating topic similarities:', error);
        return [];
    }
}

// Get similarity color based on score
function getSimilarityColor(similarity) {
    // Convert similarity (0-1) to color
    if (similarity >= 0.8) return '#28a745'; // High similarity - green
    if (similarity >= 0.6) return '#ffc107'; // Medium similarity - yellow/orange
    if (similarity >= 0.4) return '#fd7e14'; // Low-medium similarity - orange
    if (similarity >= 0.2) return '#dc3545'; // Low similarity - red
    return '#6c757d'; // Very low similarity - gray
}

// Display topics with similarity analysis
async function displayTopicsWithSimilarity(userTopics, partnerTopics) {
    // Display basic topics first
    displayUserTopics(userTopics);
    displayPartnerTopics(partnerTopics);
    
    // If both users have topics, calculate and display similarities
    if (userTopics && userTopics.length > 0 && partnerTopics && partnerTopics.length > 0) {
        const similarities = await calculateTopicSimilarities(userTopics, partnerTopics);
        
        if (similarities.length > 0) {
            // Update topic display with similarity information
            updateTopicsWithSimilarityScores(similarities);
        }
    }
}

// Update topic bubbles with similarity scores and colors
function updateTopicsWithSimilarityScores(similarities) {
    const userTopicsList = document.getElementById('user-topics-list');
    const partnerTopicsList = document.getElementById('partner-topics-list');
    
    if (!userTopicsList || !partnerTopicsList) return;

    // Create maps for best similarities
    const userTopicSimilarities = {};
    const partnerTopicSimilarities = {};
    
    // Find best similarity for each topic
    similarities.forEach(sim => {
        if (!userTopicSimilarities[sim.userTopic] || userTopicSimilarities[sim.userTopic].similarity < sim.similarity) {
            userTopicSimilarities[sim.userTopic] = sim;
        }
        if (!partnerTopicSimilarities[sim.partnerTopic] || partnerTopicSimilarities[sim.partnerTopic].similarity < sim.similarity) {
            partnerTopicSimilarities[sim.partnerTopic] = sim;
        }
    });
      // Update user topic bubbles
    const userBubbles = userTopicsList.querySelectorAll('.topic-bubble');
    userBubbles.forEach(bubble => {
        const topic = bubble.textContent;
        const similarity = userTopicSimilarities[topic];
        
        if (similarity) {
            const color = getSimilarityColor(similarity.similarity);
            bubble.style.borderLeft = `4px solid ${color}`;
            bubble.title = `Best match with ${partnerName || 'partner'}: "${similarity.partnerTopic}" (${similarity.similarityPercentage}% similar)`;
            bubble.style.cursor = 'help';
        }
    });
    
    // Update partner topic bubbles
    const partnerBubbles = partnerTopicsList.querySelectorAll('.topic-bubble');
    partnerBubbles.forEach(bubble => {
        const topic = bubble.textContent;
        const similarity = partnerTopicSimilarities[topic];
        
        if (similarity) {
            const color = getSimilarityColor(similarity.similarity);
            bubble.style.borderLeft = `4px solid ${color}`;
            bubble.title = `Best match with your topic: "${similarity.userTopic}" (${similarity.similarityPercentage}% similar)`;
            bubble.style.cursor = 'help';
        }
    });
    
    // Add similarity legend if it doesn't exist
    addSimilarityLegend();
}

// Add similarity legend to help users understand colors
function addSimilarityLegend() {
    const existingLegend = document.getElementById('similarity-legend');
    if (existingLegend) return;
    
    const topicsContainer = document.querySelector('.topics-container');
    if (!topicsContainer) return;
    
    const legend = document.createElement('div');
    legend.id = 'similarity-legend';
    legend.className = 'similarity-legend';
    legend.innerHTML = `
        <div class="legend-title">Similarity Guide:</div>
        <div class="legend-items">
            <span class="legend-item">
                <span class="legend-color" style="background-color: #28a745;"></span>
                High (80%+)
            </span>
            <span class="legend-item">
                <span class="legend-color" style="background-color: #ffc107;"></span>
                Medium (60%+)
            </span>
            <span class="legend-item">
                <span class="legend-color" style="background-color: #fd7e14;"></span>
                Low-Med (40%+)
            </span>
            <span class="legend-item">
                <span class="legend-color" style="background-color: #dc3545;"></span>
                Low (20%+)
            </span>
            <span class="legend-item">
                <span class="legend-color" style="background-color: #6c757d;"></span>
                Very Low
            </span>
        </div>
    `;
    
    topicsContainer.appendChild(legend);
}

// Function to send smart hello message based on topic similarities
async function sendSmartHelloMessage(userTopics, partnerTopics) {
    if (!peer || !userTopics || !partnerTopics || userTopics.length === 0 || partnerTopics.length === 0) {
        // Fallback to generic hello if no topics
        const fallbackMessage = {
            type: 'message',
            content: "Hey there! Great to meet someone new. What brings you here today? 😊"
        };
        peer.send(JSON.stringify(fallbackMessage));
        return;
    }

    try {
        // Calculate similarities between topics
        const similarities = await calculateTopicSimilarities(userTopics, partnerTopics);
        
        let helloContent = "";
          if (similarities.length > 0) {
            // Get the top similar topic pairs, ensuring we don't repeat topics
            const topSimilarities = similarities.slice(0, 3);
            const topMatch = topSimilarities[0];
            
            // Find a second match that uses different topics from the first match
            let secondMatch = null;
            for (let i = 1; i < topSimilarities.length; i++) {
                const candidate = topSimilarities[i];
                if (candidate.userTopic !== topMatch.userTopic && candidate.partnerTopic !== topMatch.partnerTopic) {
                    secondMatch = candidate;
                    break;
                }
            }
            
            if (topMatch.similarity > 0.6) {
                // High similarity - exciting match
                if (secondMatch) {
                    helloContent = `Hey! I noticed some really cool connections between our interests! I've been exploring ${topMatch.userTopic} and saw you're into ${topMatch.partnerTopic} - they seem quite related! Plus I see you're also interested in ${secondMatch.partnerTopic} while I've been thinking about ${secondMatch.userTopic}. What got you interested in ${topMatch.partnerTopic}? 🌟`;
                } else {
                    helloContent = `Hi there! What are the odds - I was just thinking about ${topMatch.userTopic} and I see you're into ${topMatch.partnerTopic}! We definitely have some common ground here. What's your take on ${topMatch.partnerTopic}? 😄`;
                }
            } else if (topMatch.similarity > 0.3) {
                // Moderate similarity - curious connection
                helloContent = `Hey! Interesting combination of interests we have here. I'm curious about ${topMatch.partnerTopic} - I've been exploring ${topMatch.userTopic} lately. Do you see any connections between these topics? Would love to hear your perspective! 🤔`;
            } else {
                // Low similarity - embrace the difference
                if (secondMatch) {
                    helloContent = `Hi! I love how different our interests are - you're into ${topMatch.partnerTopic} and ${secondMatch.partnerTopic}, while I've been diving deep into ${topMatch.userTopic} and ${secondMatch.userTopic}. I'm really curious to learn from your perspective! What drew you to ${topMatch.partnerTopic}? 🌈`;
                } else {
                    helloContent = `Hey there! This is fascinating - you're exploring ${topMatch.partnerTopic} while I've been deep into ${topMatch.userTopic}. I think we could learn a lot from each other! What's the most interesting thing about ${topMatch.partnerTopic} that you've discovered? ✨`;
                }
            }
        } else {
            // No similarities calculated - generic but warm
            const randomUserTopic = userTopics[Math.floor(Math.random() * userTopics.length)];
            const randomPartnerTopic = partnerTopics[Math.floor(Math.random() * partnerTopics.length)];
            helloContent = `Hi! I see we have some interesting topics to explore together. I've been thinking a lot about ${randomUserTopic} lately, and I'm really curious about your interest in ${randomPartnerTopic}. What's your story with that? 😊`;
        }
        
        const smartHelloMessage = {
            type: 'message',
            content: helloContent
        };
        
        // Add a small delay to make it feel more natural
        setTimeout(() => {
            peer.send(JSON.stringify(smartHelloMessage));
            console.log('Sent smart hello message:', helloContent);
        }, 1500);
        
    } catch (error) {
        console.error('Error creating smart hello message:', error);
        
        // Fallback message if something goes wrong
        const fallbackMessage = {
            type: 'message',
            content: "Hey! Great to connect with someone new. Looking forward to our conversation! 😊"
        };
        peer.send(JSON.stringify(fallbackMessage));
    }
}

// Function to check if we should send smart hello and do it
function checkAndSendSmartHello(partnerTopics) {
    // Only send if we have both user topics and partner topics, and haven't sent it yet
    if (!hasSentSmartHello && userTopics && userTopics.length > 0 && partnerTopics && partnerTopics.length > 0) {
        sendSmartHelloMessage(userTopics, partnerTopics);
        hasSentSmartHello = true;
    }
}

//#endregion