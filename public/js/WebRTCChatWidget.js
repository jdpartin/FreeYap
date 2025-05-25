/**
 * WebRTCChatWidget.js
 * Chat widget for WebRTC communication
 * Handles text messaging functionality using the WebRTCCore
 */

class WebRTCChatWidget {
    /**
     * Create a new chat widget
     * @param {object} options - Configuration options
     * @param {string} options.chatInputId - ID of the chat input element
     * @param {string} options.chatSendButtonId - ID of the send button element
     * @param {string} options.chatMessagesId - ID of the chat messages container
     * @param {string} options.chatTitleId - ID of the chat title element (optional)
     */
    constructor(options = {}) {
        // Widget elements
        this.chatInput = document.getElementById(options.chatInputId || 'chat-input');
        this.chatSendButton = document.getElementById(options.chatSendButtonId || 'chat-send');
        this.chatMessages = document.getElementById(options.chatMessagesId || 'chat-messages');
        this.chatTitle = document.getElementById(options.chatTitleId || 'chat-session-title');
        
        // Make sure required elements exist
        if (!this.chatInput || !this.chatSendButton || !this.chatMessages) {
            console.error('Chat widget error: Required DOM elements not found');
            return;
        }
        
        // Widget properties
        this.channelName = 'chat';
        this.core = window.webrtcCore;
        
        // Register with core
        if (this.core) {
            this.core.registerWidget(this.channelName, this);
            
            // Set up event listeners
            this._setupEventListeners();
            
            console.log('Chat widget initialized and registered with WebRTCCore');
        } else {
            console.error('WebRTCCore not found. Make sure WebRTCCore.js is loaded first.');
        }
    }

    /**
     * Set up DOM and WebRTCCore event listeners
     * @private
     */
    _setupEventListeners() {
        // Handle send button click
        this.chatSendButton.addEventListener('click', () => this._handleSendMessage());
        
        // Handle enter key press in chat input
        this.chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this._handleSendMessage();
            }
        });
        
        // Listen for incoming chat messages
        this.core.addEventListener(`data:${this.channelName}`, (data) => {
            this._handleIncomingMessage(data);
        });
        
        // Handle legacy messages (without channel)
        this.core.addEventListener('data', (message) => {
            if (message.type === 'message') {
                this.appendMessage(this.core.getPartnerName(), message.content);
            }
        });
        
        // Update chat title when match is found
        this.core.addEventListener('matchFound', (data) => {
            this.updateChatSessionTitle(data.partnerName);
        });
        
        // Reset chat title when connection is cleaned up
        this.core.addEventListener('connectionCleaned', () => {
            this.resetChatSessionTitle();
        });
    }

    /**
     * Handle sending a message
     * @private
     */
    _handleSendMessage() {
        const message = this.chatInput.value.trim();
        if (message && this.core && this.core.isConnected) {
            const messageData = {
                type: 'message',
                content: message
            };
            
            if (this.core.sendData(this.channelName, messageData)) {
                this.appendMessage('You', message);
                this.chatInput.value = '';
            }
        }
    }

    /**
     * Handle incoming message data
     * @param {object} data - Message data received
     * @private
     */
    _handleIncomingMessage(data) {
        if (data && data.type === 'message') {
            this.appendMessage(this.core.getPartnerName(), data.content);
        }
    }

    /**
     * Append a message to the chat display
     * @param {string} sender - Name of message sender
     * @param {string} content - Message content
     */
    appendMessage(sender, content) {
        if (!this.chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        // Create sender span with appropriate class
        const senderSpan = document.createElement('span');
        senderSpan.className = sender === 'You' ? 'chat-sender-self' : 'chat-sender-partner';
        senderSpan.textContent = `${sender}: `;
        
        // Create content span
        const contentSpan = document.createElement('span');
        contentSpan.className = 'chat-content';
        contentSpan.textContent = content;
        
        // Assemble message
        messageElement.appendChild(senderSpan);
        messageElement.appendChild(contentSpan);
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Update chat session title with partner name
     * @param {string} partnerName - Partner's name
     */
    updateChatSessionTitle(partnerName = null) {
        if (!this.chatTitle) return;
        
        const name = partnerName || this.core.getPartnerName();
        
        // Update the title text
        const iconElement = this.chatTitle.querySelector('.bi-chat-dots-fill');
        if (iconElement) {
            this.chatTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat with ${name}
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help;"></i>
            `;
            
            // Initialize Bootstrap tooltip for the info icon if Bootstrap is available
            const infoIcon = this.chatTitle.querySelector('.chat-info-icon');
            if (infoIcon && typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                new bootstrap.Tooltip(infoIcon, {
                    placement: 'bottom',
                    trigger: 'hover focus'
                });
            }
        }
    }

    /**
     * Reset chat session title to default
     */
    resetChatSessionTitle() {
        if (!this.chatTitle) return;
        
        // Check which page we're on to set appropriate default title
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('textChat')) {
            this.chatTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat Session
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: none;"></i>
            `;
        } else {
            this.chatTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill"></i> Chat
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: none;"></i>
            `;
        }
    }
}

// Initialize the chat widget when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for WebRTCCore to be available
    setTimeout(() => {
        if (window.webrtcCore) {
            // Auto-initialize if the required elements exist
            const chatInput = document.getElementById('chat-input');
            const chatSendButton = document.getElementById('chat-send');
            const chatMessages = document.getElementById('chat-messages');
            
            if (chatInput && chatSendButton && chatMessages) {
                window.chatWidget = new WebRTCChatWidget();
            }
        }
    }, 100);
});
