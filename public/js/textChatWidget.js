/**
 * TextChatWidget - Modular Text Chat Component
 * A self-contained text chat widget that can be embedded anywhere
 * 
 * Dependencies:
 * - Socket.IO client
 * - SimplePeer library
 * - WebRTCClient.js (for core WebRTC functionality)
 * - Bootstrap (for styling)
 */

class TextChatWidget {
    constructor(widgetId, options = {}) {
        this.widgetId = widgetId;
        this.options = {
            showTopics: options.showTopics !== false,
            enableEmoji: options.enableEmoji !== false,
            enableGif: options.enableGif !== false,
            enableVoiceRecording: options.enableVoiceRecording || false,
            ...options
        };

        // Widget state
        this.peer = null;
        this.isConnected = false;
        this.partnerSocketId = null;
        this.partnerName = null;
        this.delayedMatchmakingTimeout = null;
        this.matchFound = false;
        this.hasReceivedPartnerTopics = false;
        this.hasSentSmartHello = false;
        this.userTopics = [];

        // Initialize the widget
        this.init();
    }

    init() {
        console.log(`Initializing TextChatWidget: ${this.widgetId}`);
        
        // Get DOM elements
        this.elements = this.getDOMElements();
        
        // Check dependencies
        if (!this.checkDependencies()) {
            console.error('TextChatWidget: Missing required dependencies');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Setup emoji panel if enabled
        if (this.options.enableEmoji) {
            this.setupEmojiPanel();
        }

        // Setup GIF panel if enabled
        if (this.options.enableGif) {
            this.setupGifPanel();
        }

        // Get user topics from URL
        this.userTopics = this.getTopicsFromURL();
        if (this.userTopics.length > 0 && this.options.showTopics) {
            this.displayUserTopics(this.userTopics);
        }

        // Setup WebRTC integration
        this.setupWebRTCIntegration();

        console.log(`TextChatWidget ${this.widgetId} initialized successfully`);
    }

    getDOMElements() {
        const widget = document.getElementById(this.widgetId);
        if (!widget) {
            throw new Error(`Widget container with ID "${this.widgetId}" not found`);
        }

        return {
            widget,
            chatBox: widget.querySelector(`#${this.widgetId}-chatBox`),
            messageInput: widget.querySelector(`#${this.widgetId}-messageInput`),
            sendButton: widget.querySelector(`#${this.widgetId}-sendButton`),
            startButton: widget.querySelector(`#${this.widgetId}-startButton`),
            endButton: widget.querySelector(`#${this.widgetId}-endButton`),
            statusMessage: widget.querySelector(`#${this.widgetId}-statusMessage`),
            emojiButton: widget.querySelector(`#${this.widgetId}-emojiButton`),
            emojiGifPanel: widget.querySelector(`#${this.widgetId}-emojiGifPanel`),
            userTopicsList: widget.querySelector(`#${this.widgetId}-user-topics-list`),
            partnerTopicsList: widget.querySelector(`#${this.widgetId}-partner-topics-list`),
            partnerTopicsHeader: widget.querySelector(`#${this.widgetId}-partner-topics-header`),
            chatSessionTitle: widget.querySelector(`#${this.widgetId}-chat-session-title`)
        };
    }

    checkDependencies() {
        const required = [
            { name: 'Socket.IO', check: () => typeof io !== 'undefined' },
            { name: 'SimplePeer', check: () => typeof SimplePeer !== 'undefined' },
            { name: 'WebRTCClient', check: () => typeof window.socket !== 'undefined' }
        ];

        const missing = required.filter(dep => !dep.check());
        if (missing.length > 0) {
            console.error('Missing dependencies:', missing.map(dep => dep.name));
            return false;
        }
        return true;
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

        // Emoji button (if enabled)
        if (this.options.enableEmoji && this.elements.emojiButton) {
            this.elements.emojiButton.addEventListener('click', () => {
                this.elements.emojiGifPanel.classList.toggle('d-none');
            });

            // Close panel when clicking outside
            document.addEventListener('click', (event) => {
                if (!this.elements.widget.contains(event.target)) {
                    this.elements.emojiGifPanel.classList.add('d-none');
                }
            });
        }
    }

    setupWebRTCIntegration() {
        // Listen for match-found events
        if (window.socket) {
            window.socket.on('match-found', (data) => {
                console.log(`TextChatWidget ${this.widgetId}: Match found`);
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
        console.log(`TextChatWidget ${this.widgetId}: Starting chat`);
        
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

            console.log(`TextChatWidget ${this.widgetId}: Successfully joined matchmaking queue`);

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
        console.log(`TextChatWidget ${this.widgetId}: Ending chat`);
        
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
        if (this.elements.emojiButton) {
            this.elements.emojiButton.disabled = true;
        }
        
        // Hide panels if they're open
        if (this.elements.emojiGifPanel) {
            this.elements.emojiGifPanel.classList.add('d-none');
        }
        
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

        // Reset topics display
        if (this.options.showTopics) {
            this.elements.partnerTopicsList.innerHTML = '<div class="topics-empty">Waiting for partner...</div>';
            this.resetChatSessionTitle();
        }
    }

    handleMatchFound(data) {
        console.log(`TextChatWidget ${this.widgetId}: Handling match found`, data);
        
        this.partnerSocketId = data.matchedSocketId;
        this.partnerName = this.getRandomPartnerName();
        
        if (this.options.showTopics) {
            this.updatePartnerSectionHeader();
            this.updateChatSessionTitle();
        }

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
            console.log(`TextChatWidget ${this.widgetId}: Peer connection established`);
            this.isConnected = true;
            
            // Enable UI for active chat
            this.elements.endButton.disabled = false;
            this.elements.messageInput.disabled = false;
            this.elements.sendButton.disabled = false;
            if (this.elements.emojiButton) {
                this.elements.emojiButton.disabled = false;
            }
            
            // Update status
            this.updateStatus('Connected! Chat session started.', 'bi-check-circle-fill');
            this.elements.statusMessage.classList.remove('searching');
            this.elements.statusMessage.classList.add('connected');
            
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
                    
                    if (this.options.showTopics) {
                        this.displayPartnerTopics(message.topics);
                    }
                    
                    // Send smart hello message
                    this.checkAndSendSmartHello(message.topics);
                } else if (message.type === 'message') {
                    console.log('Received message:', message.content);
                    this.appendMessage(this.partnerName || 'Partner', message.content);
                }
            } catch (error) {
                // Handle plain text messages (backward compatibility)
                console.log('Received message:', data.toString());
                this.appendMessage(this.partnerName || 'Partner', data.toString());
            }
        });

        // Handle connection close
        this.peer.on('close', () => {
            console.log(`TextChatWidget ${this.widgetId}: Peer connection closed`);
            this.endChat();
        });

        // Handle errors
        this.peer.on('error', (err) => {
            console.error(`TextChatWidget ${this.widgetId}: Peer connection error:`, err);
            this.updateStatus(`Error: ${err.message}`, 'bi-exclamation-triangle');
            this.endChat();
        });
    }

    handleSignal(data) {
        if (this.peer) {
            this.peer.signal(data);
        }
    }

    sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || !this.peer || !this.isConnected) {
            return;
        }

        console.log(`TextChatWidget ${this.widgetId}: Sending message:`, message);
        
        try {
            const messageData = {
                type: 'message',
                content: message
            };
            this.peer.send(JSON.stringify(messageData));
            this.appendMessage('You', message);
            this.elements.messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
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

    displayUserTopics(topics) {
        if (!this.elements.userTopicsList || !this.options.showTopics) return;
        
        if (topics && topics.length > 0) {
            this.elements.userTopicsList.innerHTML = '';
            topics.forEach((topic, index) => {
                const topicBubble = document.createElement('span');
                topicBubble.className = 'topic-bubble';
                topicBubble.textContent = topic;
                topicBubble.style.animationDelay = `${index * 0.1}s`;
                topicBubble.classList.add('new-topic');
                this.elements.userTopicsList.appendChild(topicBubble);
            });
        } else {
            this.elements.userTopicsList.innerHTML = '<div class="topics-empty">No topics selected</div>';
        }
    }

    displayPartnerTopics(topics) {
        if (!this.elements.partnerTopicsList || !this.options.showTopics) return;
        
        if (topics && topics.length > 0) {
            this.elements.partnerTopicsList.innerHTML = '';
            topics.forEach((topic, index) => {
                const topicBubble = document.createElement('span');
                topicBubble.className = 'topic-bubble partner-topic';
                topicBubble.textContent = topic;
                topicBubble.style.animationDelay = `${index * 0.1}s`;
                topicBubble.classList.add('new-topic');
                this.elements.partnerTopicsList.appendChild(topicBubble);
            });
        } else {
            this.elements.partnerTopicsList.innerHTML = '<div class="topics-empty">No topics shared</div>';
        }
    }

    updatePartnerSectionHeader() {
        if (this.elements.partnerTopicsHeader && this.partnerName) {
            this.elements.partnerTopicsHeader.textContent = `${this.partnerName}'s Topics`;
        }
    }

    updateChatSessionTitle() {
        if (this.elements.chatSessionTitle && this.partnerName) {
            this.elements.chatSessionTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat with ${this.partnerName}
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: inline;"></i>
            `;
        }
    }

    resetChatSessionTitle() {
        if (this.elements.chatSessionTitle) {
            this.elements.chatSessionTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat Session
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: none;"></i>
            `;
        }
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

    setupEmojiPanel() {
        // Basic emoji setup - can be expanded
        const emojiContainer = this.elements.widget.querySelector(`#${this.widgetId}-emoji-smileys`);
        if (emojiContainer) {
            const basicEmojis = ['😊', '😂', '🤔', '👍', '👎', '❤️', '😍', '😢', '😡', '🙄', '😎', '🤗', '😴', '🤯', '🎉'];
            basicEmojis.forEach(emoji => {
                const emojiSpan = document.createElement('span');
                emojiSpan.textContent = emoji;
                emojiSpan.className = 'emoji-item';
                emojiSpan.style.cursor = 'pointer';
                emojiSpan.style.fontSize = '1.5rem';
                emojiSpan.style.margin = '0.25rem';
                emojiSpan.style.display = 'inline-block';
                emojiSpan.addEventListener('click', () => {
                    this.elements.messageInput.value += emoji;
                    this.elements.emojiGifPanel.classList.add('d-none');
                    this.elements.messageInput.focus();
                });
                emojiContainer.appendChild(emojiSpan);
            });
        }
    }

    setupGifPanel() {
        // Basic GIF setup - placeholder for future implementation
        const gifSearch = this.elements.widget.querySelector(`#${this.widgetId}-gifSearch`);
        const gifResults = this.elements.widget.querySelector(`#${this.widgetId}-gifResults`);
        
        if (gifSearch && gifResults) {
            gifSearch.addEventListener('input', (e) => {
                // Placeholder for GIF search functionality
                gifResults.innerHTML = '<div class="text-center p-3 text-muted">GIF search coming soon!</div>';
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API methods

    destroy() {
        if (this.peer) {
            this.peer.destroy();
        }
        if (this.delayedMatchmakingTimeout) {
            clearTimeout(this.delayedMatchmakingTimeout);
        }
        console.log(`TextChatWidget ${this.widgetId} destroyed`);
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

// Make TextChatWidget available globally
window.TextChatWidget = TextChatWidget;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChatWidget;
}
