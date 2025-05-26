/**
 * TextChatCore - Core functionality for text chat widget
 * Handles basic chat operations, WebRTC connection, and message handling
 */

class TextChatCore {    constructor(widgetId, elements, options = {}) {
        this.widgetId = widgetId;
        this.elements = elements;
        this.options = options;

        // Core state
        this.peer = null;
        this.isConnected = false;
        this.partnerSocketId = null;
        this.partnerName = null;
        this.userTopics = [];

        // Expose public methods for external access
        window.textChatWidgets = window.textChatWidgets || {};
        window.textChatWidgets[widgetId] = {
            sendMessage: (message) => this.sendTextMessage(message),
            isConnected: () => this.isConnected,
            setupConnection: (data) => this.setupConnection(data)
        };

        this.init();
    }

    init() {
        console.log(`TextChatCore initializing for widget: ${this.widgetId}`);
        this.setupEventListeners();
        this.setupWebRTCIntegration();
    }

    setupEventListeners() {
        // Enable send button and message input when connected
        this.elements.sendButton.disabled = true;
        this.elements.messageInput.disabled = true;

        // Send button
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());

        // Enter key on message input
        this.elements.messageInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.sendMessage();
            }
        });
    }

    setupWebRTCIntegration() {
        if (window.socket) {
            // Listen for match-found events
            window.socket.on('match-found', (data) => {
                console.log(`TextChatCore ${this.widgetId}: Match found`);
                this.partnerSocketId = data.matchedSocketId;
                this.partnerName = this.getRandomPartnerName();
                this.updateStatus(`Connected to ${this.partnerName}`, 'bi-check-circle-fill');

                // Enable UI elements
                this.elements.messageInput.disabled = false;
                this.elements.sendButton.disabled = false;
            });

            // Listen for signal events
            window.socket.on('signal', ({ fromSocketId, data }) => {
                if (this.partnerSocketId && fromSocketId === this.partnerSocketId) {
                    this.handleSignal(data);
                }
            });

            // Handle connection close
            window.socket.on('disconnect', () => {
                console.log(`TextChatCore ${this.widgetId}: Connection closed`);
                this.partnerSocketId = null;
                this.partnerName = null;
                this.updateStatus('Disconnected', 'bi-x-circle-fill');

                // Disable UI elements
                this.elements.messageInput.disabled = true;
                this.elements.sendButton.disabled = true;
            });
        }
    }    setupConnection(data) {
        console.log(`TextChatCore ${this.widgetId}: Setting up connection from external source`, data);
        
        // Set partner socket ID
        this.partnerSocketId = data.partnerSocketId;
        
        // Generate a random name for the partner
        this.partnerName = window.getPartnerName ? window.getPartnerName() : this.getRandomPartnerName();
        
        // Update status
        this.updateStatus('Connected to chat partner', 'bi-check-circle-fill', true);
        
        // Check if we should use an existing peer from the main connection
        if (data.useExistingPeer && data.sharedPeer) {
            console.log(`TextChatCore ${this.widgetId}: Using shared peer connection`);
            
            // Clean up any existing peer that's not the shared peer
            if (this.peer && this.peer !== data.sharedPeer) {
                this.peer.destroy();
                this.peer = null;
            }
            
            // Use the shared peer
            this.peer = data.sharedPeer;
            this.isConnected = true;
            this.isSharedConnection = true; // Mark that we're using a shared connection
            
            // No need to set up signal handlers - the main connection handles that
            // But we do need to set up our own data and connection handlers
            
            // Handle already established connection
            if (this.peer.connected) {
                console.log(`TextChatCore ${this.widgetId}: Shared peer is already connected`);
                this.handleConnected();
                
                // Mark our text chat as "secondary" on this shared peer
                this.peer._hasTextChatHandler = true;
            }
            
            // Still register our own data handler but with special handling for shared peer
            this.setupDataHandlerForSharedPeer(this.peer);
        } 
        // Initialize WebRTC peer connection if no shared peer and we don't have one already
        else if (!this.peer) {
            console.log(`TextChatCore ${this.widgetId}: Creating new peer connection`);
            this.peer = new SimplePeer({ 
                initiator: data.isInitiator, 
                trickle: true 
            });
            // Mark messages from this peer as text-chat only
            const originalSignal = this.peer.signal.bind(this.peer);
            this.peer.signal = function(data) {
                if (data && data.type && (data.type === 'offer' || data.type === 'answer')) {
                    data._textchatOnly = true; // Add marker for the text-chat-only connection
                }
                return originalSignal(data);
            };
            this.setupPeer();
        }
        
        // Enable UI for chat
        this.elements.messageInput.disabled = false;
        this.elements.sendButton.disabled = false;
        
        if (this.elements.emojiButton) {
            this.elements.emojiButton.disabled = false;
        }
        
        if (this.options.showControls) {
            if (this.elements.startButton) this.elements.startButton.disabled = true;
            if (this.elements.endButton) this.elements.endButton.disabled = false;
        }
    }
    
    // Special data handler for shared peer to avoid conflicts with main handler
    setupDataHandlerForSharedPeer(peer) {
        if (!peer || peer._textChatDataHandlerInstalled) {
            return; // Already has a handler or invalid peer
        }
        
        peer._textChatDataHandlerInstalled = true;
        
        // Use the existing data event but filter for text chat messages
        const originalDataHandler = peer.listeners('data')[0]; // Store original handler if it exists
        
        peer.removeAllListeners('data'); // Remove all data handlers
        
        // Add our combined handler that processes messages and then passes to original
        peer.on('data', (data) => {
            try {
                const messageStr = data.toString();
                const message = JSON.parse(messageStr);
                
                // Handle text chat specific messages
                if (message.type === 'topics') {
                    console.log(`TextChatCore ${this.widgetId}: Received partner topics:`, message.topics);
                    this.hasReceivedPartnerTopics = true;
                    
                    // Emit topics received event
                    this.emit('topicsReceived', message.topics);
                    
                    // Don't send smart hello from text chat widget when using shared peer
                    // Main connection will handle that
                } else if (message.type === 'message') {
                    console.log(`TextChatCore ${this.widgetId}: Received message:`, message.content);
                    this.displayMessage(this.partnerName || 'Partner', message.content);
                    
                    // Emit message received event
                    this.emit('messageReceived', {
                        sender: this.partnerName || 'Partner',
                        content: message.content
                    });
                }
                
                // Also pass to original handler if it exists (for non-text-chat handlers)
                if (originalDataHandler) {
                    originalDataHandler(data);
                }
            } catch (error) {
                // If it's not JSON or there's an error, make sure original handler gets it
                if (originalDataHandler) {
                    originalDataHandler(data);
                } else {
                    // If no original handler, treat as plain text message
                    console.log(`TextChatCore ${this.widgetId}: Received non-JSON message:`, data.toString());
                    this.displayMessage(this.partnerName || 'Partner', data.toString());
                }
            }
        });
    }
    
    // Handle when peer is connected
    handleConnected() {
        // Update status
        this.updateStatus('Connected! Chat session started.', 'bi-check-circle-fill');
        this.elements.statusMessage.classList.remove('searching');
        this.elements.statusMessage.classList.add('connected');
        
        // Emit connection established event
        this.emit('connected');
    }
    
    // Setup data handler for peer
    setupDataHandler(peer) {
        peer.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'topics') {
                    console.log('Received partner topics:', message.topics);
                    this.hasReceivedPartnerTopics = true;
                    
                    // Emit topics received event
                    this.emit('topicsReceived', message.topics);
                    
                    // Don't send smart hello from text chat widget when using shared peer
                    // Main connection will handle that
                } else if (message.type === 'message') {
                    console.log('Received message:', message.content);
                    this.displayMessage(this.partnerName || 'Partner', message.content);
                    
                    // Emit message received event
                    this.emit('messageReceived', {
                        sender: this.partnerName || 'Partner',
                        content: message.content
                    });
                }
            } catch (error) {
                // If it's not JSON, treat as plain text message
                console.log('Received non-JSON message:', data.toString());
                this.displayMessage(this.partnerName || 'Partner', data.toString());
            }
        });
    }    setupPeer() {
        if (!this.peer) return;

        // Handle signaling
        this.peer.on('signal', (data) => {
            if (this.partnerSocketId && window.socket) {
                window.socket.emit('signal', { 
                    toSocketId: this.partnerSocketId, 
                    data 
                });
            }
        });
        
        // Handle connection established
        this.peer.on('connect', () => {
            console.log(`TextChatCore ${this.widgetId}: Peer connection established`);
            this.isConnected = true;
            
            this.handleConnected();
            
            // Send topics if available and if this is our own peer 
            // (not a shared one from WebRTCClient)
            if (!this.peer._textChatConfigured && this.userTopics && this.userTopics.length > 0) {
                try {
                    const topicsMessage = {
                        type: 'topics',
                        topics: this.userTopics
                    };
                    this.peer.send(JSON.stringify(topicsMessage));
                    console.log('Sent topics to partner:', this.userTopics);
                } catch (err) {
                    console.error('Error sending topics:', err);
                    // Retry after a delay
                    setTimeout(() => {
                        if (this.peer && !this.peer.destroyed && this.peer.connected) {
                            try {
                                const topicsMessage = {
                                    type: 'topics',
                                    topics: this.userTopics
                                };
                                this.peer.send(JSON.stringify(topicsMessage));
                                console.log('Retry: Sent topics to partner:', this.userTopics);
                            } catch (retryErr) {
                                console.error('Failed to send topics after retry:', retryErr);
                            }
                        }
                    }, 1000);
                }
            }
        });
        
        // Set up the data handler
        this.setupDataHandler(this.peer);
        
        // Handle peer errors
        this.peer.on('error', (err) => {
            console.error(`TextChatCore ${this.widgetId}: Peer connection error:`, err);
            
            // Only handle errors if this is our own peer (not shared)
            if (!this.peer._textChatConfigured) {
                this.emit('error', err);
            }
        });
        
        // Handle peer close
        this.peer.on('close', () => {
            console.log(`TextChatCore ${this.widgetId}: Peer connection closed`);
            
            // Only handle close if this is our own peer (not shared)
            if (!this.peer._textChatConfigured) {
                this.isConnected = false;
                this.emit('disconnected');
            }
        });

        // Handle incoming data
        this.peer.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'topics') {
                    console.log('Received partner topics:', message.topics);
                    this.hasReceivedPartnerTopics = true;
                    
                    // Emit topics received event
                    this.emit('topicsReceived', message.topics);
                    
                    // Send smart hello message
                    this.checkAndSendSmartHello(message.topics);
                } else if (message.type === 'message') {
                    console.log('Received message:', message.content);
                    this.appendMessage(this.partnerName || 'Partner', message.content);
                } else {
                    // Emit custom message event for other modules to handle
                    this.emit('customMessage', message);
                }
            } catch (error) {
                // Handle plain text messages (backward compatibility)
                console.log('Received message:', data.toString());
                this.appendMessage(this.partnerName || 'Partner', data.toString());
            }
        });

        // Handle connection close
        this.peer.on('close', () => {
            console.log(`TextChatCore ${this.widgetId}: Peer connection closed`);
            this.endChat();
        });

        // Handle errors
        this.peer.on('error', (err) => {
            console.error(`TextChatCore ${this.widgetId}: Peer connection error:`, err);
            this.updateStatus(`Error: ${err.message}`, 'bi-exclamation-triangle');
            this.endChat();
        });
    }

    handleSignal(data) {
        if (this.peer) {
            this.peer.signal(data);
        }
    }

    sendMessage(message = null) {
        const messageText = message || this.elements.messageInput.value.trim();
        if (!messageText || !this.peer || !this.isConnected) {
            return false;
        }

        console.log(`TextChatCore ${this.widgetId}: Sending message:`, messageText);
        
        try {
            const messageData = {
                type: 'message',
                content: messageText
            };
            this.peer.send(JSON.stringify(messageData));
            this.appendMessage('You', messageText);
            
            if (!message) { // Only clear input if it came from the input field
                this.elements.messageInput.value = '';
            }
            
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    sendCustomMessage(messageData) {
        if (!this.peer || !this.isConnected) {
            return false;
        }

        try {
            this.peer.send(JSON.stringify(messageData));
            return true;
        } catch (error) {
            console.error('Error sending custom message:', error);
            return false;
        }
    }

    appendMessage(sender, message) {
        // Remove welcome message if it exists
        const welcomeMessage = this.elements.chatBox.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = sender === 'You' ? 'message-container sent' : 'message-container received';
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message ${sender === 'You' ? 'message-sent' : 'message-received'}">
                <div class="message-content">${this.escapeHtml(message)}</div>
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                    ${sender === 'You' ? '<i class="bi bi-check2-all"></i>' : ''}
                </div>
            </div>
        `;
        
        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }    updateStatus(status, iconClass = 'bi-info-circle', showSpinner = false) {
        if (showSpinner) {
            this.elements.statusMessage.innerHTML = `<span class="spinner"></span>${status}`;
        } else {
            this.elements.statusMessage.innerHTML = `<i class="${iconClass} me-2"></i>${status}`;
        }
    }    // Helper methods

    getTopicsFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const topicsParam = urlParams.get('topics');
        if (topicsParam) {
            try {
                return JSON.parse(decodeURIComponent(topicsParam));
            } catch (e) {
                console.error('Error parsing topics from URL:', e);
            }
        }
        return [];
    }
    
    // Generate a random partner name for the chat
    getRandomPartnerName() {
        // List of gender-neutral names from diverse backgrounds
        const genderNeutralNames = [
            'Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Sage', 'Quinn', 
            'Cameron', 'Drew', 'Jamie', 'Kai', 'Logan', 'Nova', 'Parker', 'River', 
            'Sky', 'Tate', 'Val', 'Winter', 'Ari', 'Jae', 'Lin', 'Nour', 'Sami',
            'Dana', 'Indigo', 'Jesse', 'Rami', 'Rowan', 'Shay', 'Blake', 'Charlie'
        ];
        
        const randomIndex = Math.floor(Math.random() * genderNeutralNames.length);
        return genderNeutralNames[randomIndex];
    }

    getRandomPartnerName() {
        const names = [
            'Alex', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Sage', 'Quinn', 'River', 'Sky',
            'Cameron', 'Drew', 'Emery', 'Finley', 'Hayden', 'Jamie', 'Kendall', 'Lane', 'Peyton', 'Rowan'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    checkAndSendSmartHello(partnerTopics) {
        if (!this.hasSentSmartHello && this.userTopics && this.userTopics.length > 0 && partnerTopics && partnerTopics.length > 0) {
            this.sendSmartHelloMessage(this.userTopics, partnerTopics);
            this.hasSentSmartHello = true;
        }
    }

    async sendSmartHelloMessage(userTopics, partnerTopics) {
        if (!this.peer || !userTopics || !partnerTopics || userTopics.length === 0 || partnerTopics.length === 0) {
            // Fallback to generic hello
            const fallbackMessage = {
                type: 'message',
                content: "Hey there! Great to meet someone new. What brings you here today? 😊"
            };
            this.peer.send(JSON.stringify(fallbackMessage));
            return;
        }

        try {
            // Simple topic matching for smart hello
            const commonTopics = userTopics.filter(topic => 
                partnerTopics.some(partnerTopic => 
                    topic.toLowerCase().includes(partnerTopic.toLowerCase()) ||
                    partnerTopic.toLowerCase().includes(topic.toLowerCase())
                )
            );

            let helloContent;
            if (commonTopics.length > 0) {
                const commonTopic = commonTopics[0];
                helloContent = `Hey! I noticed we both have an interest in ${commonTopic}! What got you interested in that topic? 😊`;
            } else {
                const randomUserTopic = userTopics[Math.floor(Math.random() * userTopics.length)];
                const randomPartnerTopic = partnerTopics[Math.floor(Math.random() * partnerTopics.length)];
                helloContent = `Hi! I see we have some interesting topics to explore together. I've been thinking about ${randomUserTopic}, and I'm curious about your interest in ${randomPartnerTopic}. What's your story with that? 😊`;
            }

            const smartHelloMessage = {
                type: 'message',
                content: helloContent
            };

            // Add a small delay to make it feel more natural
            setTimeout(() => {
                if (this.peer && this.isConnected) {
                    this.peer.send(JSON.stringify(smartHelloMessage));
                    console.log('Sent smart hello message:', helloContent);
                }
            }, 1500);

        } catch (error) {
            console.error('Error creating smart hello message:', error);
            
            // Fallback message
            const fallbackMessage = {
                type: 'message',
                content: "Hey! Great to connect with someone new. Looking forward to our conversation! 😊"
            };
            this.peer.send(JSON.stringify(fallbackMessage));
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event system for inter-module communication
    _eventListeners = {};

    on(event, callback) {
        if (!this._eventListeners[event]) {
            this._eventListeners[event] = [];
        }
        this._eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this._eventListeners[event]) {
            this._eventListeners[event].forEach(callback => callback(data));
        }
    }

    // Public API methods

    destroy() {
        if (this.peer) {
            this.peer.destroy();
        }
        console.log(`TextChatCore ${this.widgetId} destroyed`);
    }

    getStatus() {
        return {
            widgetId: this.widgetId,
            isConnected: this.isConnected,
            partnerName: this.partnerName,
            userTopics: this.userTopics
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChatCore;
}
