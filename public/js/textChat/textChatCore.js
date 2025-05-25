/**
 * TextChatCore - Core functionality for text chat widget
 * Handles basic chat operations, WebRTC connection, and message handling
 */

class TextChatCore {
    constructor(widgetId, elements, options = {}) {
        this.widgetId = widgetId;
        this.elements = elements;
        this.options = options;

        // Core state
        this.peer = null;
        this.isConnected = false;
        this.partnerSocketId = null;
        this.partnerName = null;
        this.delayedMatchmakingTimeout = null;
        this.matchFound = false;
        this.hasReceivedPartnerTopics = false;
        this.hasSentSmartHello = false;
        this.userTopics = [];

        this.init();
    }

    init() {
        console.log(`TextChatCore initializing for widget: ${this.widgetId}`);
        this.setupEventListeners();
        this.setupWebRTCIntegration();
        this.userTopics = this.getTopicsFromURL();
    }

    setupEventListeners() {
        // Start button
        this.elements.startButton.addEventListener('click', () => this.startChat());
        
        // End button
        this.elements.endButton.addEventListener('click', () => this.endChat());
        
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
        // Listen for match-found events
        if (window.socket) {
            window.socket.on('match-found', (data) => {
                console.log(`TextChatCore ${this.widgetId}: Match found`);
                this.matchFound = true;
                this.handleMatchFound(data);
                
                if (this.delayedMatchmakingTimeout) {
                    clearTimeout(this.delayedMatchmakingTimeout);
                    this.delayedMatchmakingTimeout = null;
                }
            });

            // Listen for signal events
            window.socket.on('signal', ({ fromSocketId, data }) => {
                if (this.partnerSocketId && fromSocketId === this.partnerSocketId) {
                    this.handleSignal(data);
                }
            });
        }
    }

    async startChat() {
        console.log(`TextChatCore ${this.widgetId}: Starting chat`);
        
        // Reset state
        this.matchFound = false;
        if (this.delayedMatchmakingTimeout) {
            clearTimeout(this.delayedMatchmakingTimeout);
            this.delayedMatchmakingTimeout = null;
        }

        // Update UI
        this.updateStatus('Looking for a chat partner...', 'bi-hourglass-split');
        this.elements.statusMessage.classList.add('searching');
        this.elements.startButton.disabled = true;

        try {
            // Join matchmaking queue
            const response = await fetch('/api/matchmaking/join-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    socketId: window.socket.id, 
                    mode: 'text',
                    topics: this.userTopics 
                })
            });

            if (!response.ok) {
                throw new Error('Failed to join matchmaking queue');
            }

            console.log(`TextChatCore ${this.widgetId}: Successfully joined matchmaking queue`);

            // Set up delayed matchmaking
            this.delayedMatchmakingTimeout = setTimeout(async () => {
                if (this.matchFound) {
                    console.log('Match already found, skipping delayed matchmaking');
                    return;
                }

                try {
                    const delayedResponse = await fetch('/api/matchmaking/delayed-matchmaking', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ socketId: window.socket.id, topics: this.userTopics })
                    });

                    if (!delayedResponse.ok) {
                        throw new Error('Failed to perform delayed matchmaking');
                    }

                    console.log('Successfully called delayed matchmaking');
                } catch (error) {
                    console.error('Error during delayed matchmaking:', error);
                    this.updateStatus(`Error: ${error.message}`, 'bi-exclamation-triangle');
                    this.elements.startButton.disabled = false;
                    this.elements.statusMessage.classList.remove('searching');
                }
            }, 10000);
        } catch (error) {
            console.error('Error joining matchmaking queue:', error);
            this.updateStatus(`Error: ${error.message}`, 'bi-exclamation-triangle');
            this.elements.startButton.disabled = false;
            this.elements.statusMessage.classList.remove('searching');
        }
    }

    endChat() {
        console.log(`TextChatCore ${this.widgetId}: Ending chat`);
        
        // Reset UI state
        this.elements.startButton.disabled = false;
        this.elements.endButton.disabled = true;
        this.elements.statusMessage.innerHTML = '';
        this.elements.statusMessage.classList.remove('searching', 'connected');
        
        // Reset chat box
        this.elements.chatBox.innerHTML = `
            <div class="welcome-message text-center p-4">
                <div class="mb-3">
                    <i class="bi bi-chat-text fs-1" style="color: var(--primary);"></i>
                </div>
                <h5>Welcome to FreeYap Text Chat!</h5>
                <p class="text-muted">No messages yet. Start the conversation!</p>
            </div>
        `;
        
        // Disable message input
        this.elements.messageInput.disabled = true;
        this.elements.sendButton.disabled = true;
        
        // Destroy the WebRTC connection
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        // Reset state
        this.isConnected = false;
        this.partnerSocketId = null;
        this.partnerName = null;
        this.hasReceivedPartnerTopics = false;
        this.hasSentSmartHello = false;

        // Emit reset event for other modules
        this.emit('chatEnded');
    }

    handleMatchFound(data) {
        console.log(`TextChatCore ${this.widgetId}: Handling match found`, data);
        
        this.partnerSocketId = data.matchedSocketId;
        this.partnerName = this.getRandomPartnerName();
        
        // Emit match found event for other modules
        this.emit('matchFound', { partnerName: this.partnerName });

        // Initialize WebRTC peer connection
        if (!this.peer) {
            this.peer = new SimplePeer({ 
                initiator: data.isInitiator, 
                trickle: true 
            });
            this.setupPeer();
        }
    }

    setupPeer() {
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
            
            // Enable UI for active chat
            this.elements.endButton.disabled = false;
            this.elements.messageInput.disabled = false;
            this.elements.sendButton.disabled = false;
            
            // Update status
            this.updateStatus('Connected! Chat session started.', 'bi-check-circle-fill');
            this.elements.statusMessage.classList.remove('searching');
            this.elements.statusMessage.classList.add('connected');
            
            // Emit connection established event
            this.emit('connected');
            
            // Send topics if available
            if (this.userTopics && this.userTopics.length > 0) {
                const topicsMessage = {
                    type: 'topics',
                    topics: this.userTopics
                };
                this.peer.send(JSON.stringify(topicsMessage));
                console.log('Sent topics to partner:', this.userTopics);
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
    }

    updateStatus(status, iconClass = 'bi-info-circle') {
        this.elements.statusMessage.innerHTML = `<i class="${iconClass} me-2"></i>${status}`;
    }

    // Helper methods

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
        if (this.delayedMatchmakingTimeout) {
            clearTimeout(this.delayedMatchmakingTimeout);
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
