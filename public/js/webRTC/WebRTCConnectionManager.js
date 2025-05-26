class WebRTCConnectionManager
{
    constructor(socket)
    {
        this.socket = socket;
        this.peer = null;
        this.partnerSocketId = null;
        this.eventTarget = new EventTarget(); // Custom event system for client-side
        console.log('WebRTCConnectionManager initialized');
        
        // Set up the signal event listener here, so it's only registered once
        this.socket.on('signal', ({ fromSocketId, data }) => {
            console.log(`Received signal from ${fromSocketId}`, data.type || 'ICE candidate');
            
            if (this.peer && this.partnerSocketId && fromSocketId === this.partnerSocketId) {
                console.log('Processing incoming signal from matching peer');
                this.peer.signal(data);
            }
            else if (this.peer && fromSocketId !== this.partnerSocketId) {
                console.warn(`Ignoring signal from non-matching peer: ${fromSocketId}`);
            }
            else if (!this.peer) {
                console.log(`Received signal but no peer exists yet. Creating a non-initiator peer.`);
                // Create a non-initiator peer and remember the partner
                this.partnerSocketId = fromSocketId;
                this.createNonInitiatorPeer();
                
                // Now process the signal with the newly created peer
                this.peer.signal(data);
            }
        });
    }

    createNonInitiatorPeer() {
        console.log('Creating a non-initiator peer for incoming connection');
        
        // Create a new SimplePeer instance as non-initiator
        this.peer = new SimplePeer({
            initiator: false,
            trickle: true
        });
        
        console.log('SimplePeer instance created with initiator=false');
        
        // Set up the same event handlers as for an initiator peer
        this.setupPeerEventListeners();
    }
    
    setupPeerEventListeners() {
        // Handle signaling data from the peer
        this.peer.on('signal', (data) => {
            console.log('Local signal generated, sending to peer:', data.type || 'ICE candidate');
            this.socket.emit('signal', { toSocketId: this.partnerSocketId, data });
        });

        // Handle connection established
        this.peer.on('connect', () => {
            console.log('Peer connection established!');
            this.eventTarget.dispatchEvent(new Event('connectionReady')); // Notify other modules
        });

        // Handle incoming data
        this.peer.on('data', (data) => {
            console.log('Received data:', data.toString());
        });

        // Handle errors
        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
        });

        // Handle peer connection close
        this.peer.on('close', () => {
            console.log('Peer connection closed');
        });
    }

    connectToPeer(partnerSocketId)
    {
        console.log(`Attempting to connect to peer with ID: ${partnerSocketId}`);
        
        // Store the partner socket ID
        this.partnerSocketId = partnerSocketId;
        
        // Create a new SimplePeer instance as initiator
        this.peer = new SimplePeer({
            initiator: true,
            trickle: true
        });
        
        console.log('SimplePeer instance created with initiator=true');

        // Set up event listeners
        this.setupPeerEventListeners();
    }

    closeConnection()
    {
        if (this.peer)
        {
            console.log('Closing peer connection');
            this.peer.destroy();
            this.peer = null;
        }
        // Clear the partner socket ID
        this.partnerSocketId = null;
    }

    getPeer()
    {
        return this.peer;
    }

    on(eventName, callback)
    {
        this.eventTarget.addEventListener(eventName, callback);
    }

    off(eventName, callback)
    {
        this.eventTarget.removeEventListener(eventName, callback);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCConnectionManager;
}