class TextChat
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;
        this.eventTarget = new EventTarget(); // For emitting custom events
        this.messageType = 'text-chat'; // Identifier for this specific module's messages
        
        // Listen for the connectionReady event
        this.webRTCConnectionManager.on('connectionReady', () => {
            this.setupDataChannel(this.webRTCConnectionManager.getPeer());
            console.log('Text chat module connected to peer');
        });
    }

    setupDataChannel(peer)
    {
        console.log('Setting up data handlers for text chat module');
        
        // Store the peer for sending messages later
        this.peer = peer;
        
        // Handle incoming messages
        peer.on('data', (data) => {
            try {
                // Try to parse as JSON to check if it's meant for this module
                const parsedData = JSON.parse(data.toString());
                
                // Only process messages meant for this module
                if (parsedData.type === this.messageType) {
                    console.log('Received text chat message:', parsedData.content);
                    
                    // Emit an event with the received message
                    const event = new CustomEvent('message', { 
                        detail: { 
                            content: parsedData.content,
                            timestamp: parsedData.timestamp || new Date().toISOString()
                        }
                    });
                    this.eventTarget.dispatchEvent(event);
                }
            } catch (error) {
                // If parsing fails, it might be a raw message not following our protocol
                // We can either ignore it or handle it based on your requirements
                console.log('Received non-JSON data, ignoring in text chat module');
            }
        });
    }

    sendMessage(message)
    {
        if (!this.peer || this.peer.destroyed) {
            console.error('Peer connection is not ready. Cannot send message.');
            return false;
        }
        
        try {
            // Format the message with our module identifier
            const formattedMessage = {
                type: this.messageType,
                content: message,
                timestamp: new Date().toISOString()
            };
            
            // Send as JSON string
            console.log('Sending text chat message:', message);
            this.peer.send(JSON.stringify(formattedMessage));
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }
    
    // Add event listeners for receiving messages
    on(eventName, callback) {
        this.eventTarget.addEventListener(eventName, callback);
        return this;
    }
    
    // Remove event listeners
    off(eventName, callback) {
        this.eventTarget.removeEventListener(eventName, callback);
        return this;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChat;
}