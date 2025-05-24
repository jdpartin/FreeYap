// Use the global SimplePeer object provided by the CDN
// Removed the require statement for SimplePeer

const socket = io('http://localhost:3000');

var mySocketId = null;
var partnerSocketId = null;

var peer = null;
var isInitiator = false;

var streamElement = null;
let localStream = null;

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

    if (!peer)
    {
        // If we receive a signal but don't have a peer, we must be the non-initiator
        peer = new SimplePeer({ 
            initiator: false, 
            trickle: true,
            stream: localStream
        });
        setupPeer(peer, fromSocketId);
    }

    peer.signal(data);
});

// Add match-found event to establish WebRTC connection
socket.on('match-found', ({ socketId, matchedSocketId, isInitiator: serverIsInitiator }) =>
{
    console.log('Match found with socket ID:', matchedSocketId, 'I am initiator:', serverIsInitiator);

    // Set the partner socket ID and initiator status
    partnerSocketId = matchedSocketId;
    isInitiator = serverIsInitiator;

    // Initialize WebRTC connection
    if (!peer)
    {
        peer = new SimplePeer({ 
            initiator: isInitiator, 
            trickle: true,
            stream: localStream // Add local stream if available
        });
        setupPeer(peer, matchedSocketId);        // If we don't have local stream yet, add it when we get it
        if (!localStream)
        {
            initializeMediaStream().catch(err =>
            {
                console.error('Error initializing media stream in match-found:', err);
            });
        }
    }
    else
    {
        console.warn('Peer already exists, skipping initialization.');
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
        peer.send('Hello from ' + socket.id);
    });

    peer.on('data', data =>
    {
        console.log('Received message:', data.toString());
        appendMessage('Partner', data.toString());
    });

    peer.on('error', err =>
    {
        console.error('Peer error:', err);
    });

    peer.on('close', () =>
    {
        console.log('Peer connection closed');
    });

    // Handle remote stream
    peer.on('stream', remoteStream =>
    {
        console.log('Received remote stream');

        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo)
        {
            remoteVideo.srcObject = remoteStream;
        }
        else
        {
            console.error('Remote video element not found');
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
    isInitiator = false;
    console.log('Peer connection cleaned up');
}

// Add text chat support and media controls

// HTML elements for text chat and media controls
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');
const toggleCameraButton = document.getElementById('toggle-camera');
const toggleMicButton = document.getElementById('toggle-mic');

let isCameraOn = true;
let isMicOn = true;

// Initialize media stream
async function initializeMediaStream()
{
    try
    {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
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

// Initialize media stream on page load
initializeMediaStream();

// Handle text chat send
chatSendButton.addEventListener('click', () =>
{
    const message = chatInput.value.trim();
    if (message && peer)
    {
        peer.send(message);
        appendMessage('You', message);
        chatInput.value = '';
    }
});

// Append message to chat
function appendMessage(sender, message)
{
    const messageElement = document.createElement('div');
    messageElement.textContent = `${sender}: ${message}`;
    chatMessages.appendChild(messageElement);
}

// Toggle camera
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

// Toggle microphone
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