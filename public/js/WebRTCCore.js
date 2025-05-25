/**
 * WebRTCCore.js
 * Core WebRTC connection management module for FreeYap
 * Handles basic connection setup and provides event system for widgets
 */

// Main WebRTC connection controller that manages the peer-to-peer connection
class WebRTCCore {
    constructor() {
        // Core properties
        this.socket = io('http://localhost:3000');
        this.mySocketId = null;
        this.partnerSocketId = null;
        this.peer = null;
        this.isInitiator = false;
        this.localStream = null;
        this.partnerName = null;

        // Connection state
        this.isConnected = false;
        this.isConnecting = false;
        
        // Registered widgets and channels
        this.widgets = {};
        this.dataChannels = {};
        this.eventListeners = {};
        
        // Make socket available globally for other scripts
        window.socket = this.socket;
        
        // Initialize connection listeners
        this._initSocketListeners();
        
        // Gender-neutral names from diverse backgrounds
        this.genderNeutralNames = [
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
        
        // Make core available globally for widgets
        window.WebRTCCore = this;
    }

    /**
     * Initialize socket.io event listeners
     * @private
     */
    _initSocketListeners() {
        // Socket connection events
        this.socket.on('connect', () => {
            console.log('Connected to socket.io');
            this._triggerEvent('socketConnected');
        });

        this.socket.on('youAre', ({ socketId }) => {
            this.mySocketId = socketId;
            this._triggerEvent('socketIdentified', { socketId });
        });

        // WebRTC signaling events
        this.socket.on('signal', ({ fromSocketId, data }) => {
            console.log('Received signal from', fromSocketId);

            // Only accept signals from our matched partner
            if (this.partnerSocketId && fromSocketId !== this.partnerSocketId) {
                console.warn('Received signal from unexpected socket:', fromSocketId);
                return;
            }

            // If we don't have a partner yet, set it (for cases where signal comes before match-found)
            if (!this.partnerSocketId) {
                this.partnerSocketId = fromSocketId;
            }

            if (!this.peer) {
                // If we receive a signal but don't have a peer, we must be the non-initiator
                this._initPeer(false);
            }

            this.peer.signal(data);
        });

        // Match found event
        this.socket.on('match-found', ({ socketId, matchedSocketId, isInitiator: serverIsInitiator }) => {
            console.log('Match found with socket ID:', matchedSocketId, 'I am initiator:', serverIsInitiator);

            // Set the partner socket ID and initiator status
            this.partnerSocketId = matchedSocketId;
            this.isInitiator = serverIsInitiator;
            
            // Generate a random name for the partner
            this.partnerName = this._getRandomPartnerName();
            console.log('Partner will be called:', this.partnerName);

            // Initialize WebRTC connection
            if (!this.peer) {
                this._initPeer(serverIsInitiator);
            } else {
                console.warn('Peer already exists, skipping initialization.');
            }
            
            // Trigger match found event for widgets
            this._triggerEvent('matchFound', {
                partnerSocketId: matchedSocketId,
                isInitiator: serverIsInitiator,
                partnerName: this.partnerName
            });
        });
    }

    /**
     * Initialize the WebRTC peer connection
     * @param {boolean} initiator - Whether this peer is the initiator
     * @private
     */
    _initPeer(initiator) {
        this.isConnecting = true;
        
        // Create the peer object
        this.peer = new SimplePeer({ 
            initiator: initiator, 
            trickle: true,
            stream: this.localStream // Add local stream if available
        });

        // Setup peer event handlers
        this.peer.on('signal', data => {
            if (this.partnerSocketId) {
                this.socket.emit('signal', { toSocketId: this.partnerSocketId, data });
            } else {
                console.log("Waiting to receive partner's socket ID...");
            }
        });

        this.peer.on('connect', () => {
            console.log('Peer connection established!');
            this.isConnected = true;
            this.isConnecting = false;
            
            // Notify widgets of connection
            this._triggerEvent('peerConnected');
        });

        this.peer.on('data', data => {
            try {
                // Parse incoming message
                const message = JSON.parse(data.toString());
                
                // Handle the message based on its type
                if (message.channel && this.widgets[message.channel]) {
                    // Route the message to the appropriate widget
                    this._triggerEvent(`data:${message.channel}`, message.data);
                } else {
                    // Legacy support for messages without channel
                    this._triggerEvent('data', message);
                }
            } catch (error) {
                // If it's not JSON, handle as plain text message
                console.log('Received raw data:', data.toString());
                this._triggerEvent('rawData', data.toString());
            }
        });

        this.peer.on('error', err => {
            console.error('Peer error:', err);
            this._triggerEvent('peerError', err);
        });

        this.peer.on('close', () => {
            console.log('Peer connection closed');
            this.isConnected = false;
            this._triggerEvent('peerClosed');
        });

        // Handle remote stream
        this.peer.on('stream', remoteStream => {
            console.log('Received remote stream');
            this._triggerEvent('remoteStream', remoteStream);
        });
    }

    /**
     * Send data to the connected peer through a specific channel
     * @param {string} channel - The channel name for routing
     * @param {object} data - The data to send
     * @param {string} type - The message type (optional)
     * @returns {boolean} - Success or failure
     */
    sendData(channel, data, type = null) {
        if (!this.peer || !this.isConnected) {
            console.error('Cannot send data: no active peer connection');
            return false;
        }

        try {
            // Build the message with channel for routing
            const message = {
                channel: channel,
                data: data
            };
            
            // Add type if provided
            if (type) {
                message.data.type = type;
            }
            
            // Send as JSON
            this.peer.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            return false;
        }
    }

    /**
     * Initialize a media stream with specific constraints
     * @param {MediaStreamConstraints} constraints - Media constraints for getUserMedia
     * @returns {Promise<MediaStream>} - The local media stream
     */
    async initializeMediaStream(constraints = null) {
        try {
            // Use provided constraints or determine based on page context
            let mediaConstraints = constraints;
            
            if (!mediaConstraints) {
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
            
            // Request media stream
            this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            
            // Add the local stream to the peer connection if it exists
            if (this.peer && !this.peer.destroyed) {
                this.peer.addStream(this.localStream);
            }
            
            // Notify widgets
            this._triggerEvent('localStream', this.localStream);

            return this.localStream;
        } catch (err) {
            console.error('Error accessing media devices:', err);
            this._triggerEvent('mediaError', err);
            throw err;
        }
    }

    /**
     * Get a random gender-neutral name for the partner
     * @returns {string} - A random name
     * @private
     */
    _getRandomPartnerName() {
        const randomIndex = Math.floor(Math.random() * this.genderNeutralNames.length);
        return this.genderNeutralNames[randomIndex];
    }

    /**
     * Register a widget with the core
     * @param {string} name - Unique identifier for the widget
     * @param {object} widget - The widget instance
     */
    registerWidget(name, widget) {
        if (this.widgets[name]) {
            console.warn(`Widget "${name}" already registered, replacing...`);
        }
        
        this.widgets[name] = widget;
        console.log(`Widget "${name}" registered with WebRTCCore`);
    }

    /**
     * Remove a widget registration
     * @param {string} name - Identifier of the widget to remove
     */
    unregisterWidget(name) {
        if (this.widgets[name]) {
            delete this.widgets[name];
            console.log(`Widget "${name}" unregistered`);
        }
    }

    /**
     * Add event listener for core events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event]
                .filter(listener => listener !== callback);
        }
    }

    /**
     * Trigger an event for all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
    _triggerEvent(event, data = null) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clean up peer connection and reset state
     */
    cleanupConnection() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.partnerSocketId = null;
        this.partnerName = null;
        this.isInitiator = false;
        this.isConnected = false;
        this.isConnecting = false;
        
        // Notify widgets
        this._triggerEvent('connectionCleaned');
        
        console.log('Peer connection cleaned up');
    }

    /**
     * Get the current partner name
     * @returns {string} - Partner name or "Partner" if not available
     */
    getPartnerName() {
        return this.partnerName || 'Partner';
    }
    
    /**
     * Function to get topics from URL parameters
     * @returns {Array} - Array of user topics from URL
     */
    getTopicsFromURL() {
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
}

// Initialize the WebRTCCore when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create single global instance
    if (!window.webrtcCore) {
        window.webrtcCore = new WebRTCCore();
    }
});
