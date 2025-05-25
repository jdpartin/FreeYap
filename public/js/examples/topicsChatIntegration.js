/**
 * topicsChatIntegration.js
 * Example of how to integrate topics and chat widgets together
 */

// Integration with optional smart hello feature
class TopicsChatIntegration {
    /**
     * Initialize integration between topics and chat widgets
     * @param {object} options - Configuration options
     * @param {boolean} options.enableSmartHello - Whether to enable smart hello messages
     * @param {boolean} options.enableTopicSuggestions - Whether to enable suggesting chat topics
     */
    static initialize(options = {}) {
        const enableSmartHello = options.enableSmartHello !== undefined ? options.enableSmartHello : true;
        const enableTopicSuggestions = options.enableTopicSuggestions !== undefined ? options.enableTopicSuggestions : true;
        
        // Wait for both widgets to be available
        this.waitForWidgets().then(() => {
            console.log('Initializing Topics-Chat integration');
            
            // Initialize topics widget with chat integration
            if (!window.topicsWidget) {
                window.topicsWidget = new WebRTCTopicsWidget({
                    enableSmartHello: enableSmartHello,
                    smartHelloChannel: 'chat',
                    onTopicSimilarityCalculated: (data) => {
                        if (enableTopicSuggestions) {
                            this.handleTopicSimilarities(data);
                        }
                    }
                });
            } else {
                // Update existing widget settings
                window.topicsWidget.enableSmartHello = enableSmartHello;
                window.topicsWidget.smartHelloChannel = 'chat';
                
                // Hook up callback if not already set
                if (enableTopicSuggestions && !window.topicsWidget.onTopicSimilarityCalculated) {
                    window.topicsWidget.onTopicSimilarityCalculated = (data) => {
                        this.handleTopicSimilarities(data);
                    };
                }
            }
            
            // Add chat suggestions UI if needed
            if (enableTopicSuggestions) {
                this.addChatSuggestionsUI();
            }
        }).catch(error => {
            console.error('Error initializing Topics-Chat integration:', error);
        });
    }
    
    /**
     * Wait for both chat and topics widgets to be available
     * @returns {Promise} - Resolves when both widgets are ready
     */
    static waitForWidgets() {
        return new Promise((resolve, reject) => {
            const checkWidgets = () => {
                if (window.webrtcCore) {
                    // Check if chat widget is available or can be created
                    const hasChatElements = document.getElementById('chat-input') && document.getElementById('chat-messages');
                    
                    // Check if topics elements exist
                    const hasTopicsElements = document.getElementById('user-topics-list') || document.getElementById('partner-topics-list');
                    
                    if (hasChatElements && hasTopicsElements) {
                        // Ensure chat widget exists
                        if (!window.chatWidget) {
                            window.chatWidget = new WebRTCChatWidget();
                        }
                        
                        resolve();
                    } else {
                        // If elements don't exist, reject with meaningful error
                        if (!hasChatElements) {
                            reject(new Error('Chat elements not found in the DOM'));
                        } else {
                            reject(new Error('Topics elements not found in the DOM'));
                        }
                    }
                } else {
                    // Retry after a short delay
                    setTimeout(checkWidgets, 100);
                }
            };
            
            checkWidgets();
        });
    }
    
    /**
     * Handle topic similarity data to enhance chat experience
     * @param {object} data - Topic similarity data
     */
    static handleTopicSimilarities(data) {
        // Extract relevant information
        const { similarities, topMatch, secondMatch } = data;
        
        if (!similarities || similarities.length === 0) return;
        
        // Create conversation suggestions based on similarities
        const suggestions = [];
        
        // Add suggestion based on top match
        if (topMatch && topMatch.similarity > 0.3) {
            suggestions.push({
                text: `Tell me more about ${topMatch.partnerTopic}?`,
                action: () => this.sendChatMessage(`Tell me more about ${topMatch.partnerTopic}?`)
            });
        }
        
        // Add suggestion for comparing topics
        if (topMatch) {
            suggestions.push({
                text: `How do you see ${topMatch.userTopic} and ${topMatch.partnerTopic} relating to each other?`,
                action: () => this.sendChatMessage(`How do you see ${topMatch.userTopic} and ${topMatch.partnerTopic} relating to each other?`)
            });
        }
        
        // Add suggestion based on second match if available
        if (secondMatch) {
            suggestions.push({
                text: `What got you interested in ${secondMatch.partnerTopic}?`,
                action: () => this.sendChatMessage(`What got you interested in ${secondMatch.partnerTopic}?`)
            });
        }
        
        // Display suggestions in UI
        this.displayChatSuggestions(suggestions);
    }
    
    /**
     * Add chat suggestions UI to the page
     */
    static addChatSuggestionsUI() {
        // Check if suggestions container already exists
        if (document.getElementById('chat-suggestions')) return;
        
        // Find chat input area to position suggestions above it
        const chatInputContainer = document.querySelector('.chat-input-container') || 
                                  document.getElementById('chat-input').parentElement;
        
        if (!chatInputContainer) return;
        
        // Create suggestions container
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'chat-suggestions';
        suggestionsContainer.className = 'chat-suggestions';
        suggestionsContainer.style.display = 'none'; // Hide initially
        
        // Add suggestions container before chat input
        chatInputContainer.parentNode.insertBefore(suggestionsContainer, chatInputContainer);
        
        // Add CSS for suggestions
        const style = document.createElement('style');
        style.textContent = `
            .chat-suggestions {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 10px;
            }
            
            .chat-suggestions-title {
                font-size: 14px;
                color: #6c757d;
                margin-bottom: 8px;
            }
            
            .chat-suggestion-pill {
                display: inline-block;
                background-color: #e9ecef;
                border: 1px solid #ced4da;
                border-radius: 20px;
                padding: 5px 12px;
                margin: 3px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.2s;
            }
            
            .chat-suggestion-pill:hover {
                background-color: #dee2e6;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Display chat suggestions in the UI
     * @param {Array} suggestions - Array of suggestion objects
     */
    static displayChatSuggestions(suggestions) {
        const container = document.getElementById('chat-suggestions');
        if (!container) return;
        
        // Clear previous suggestions
        container.innerHTML = '';
        
        // Create title
        const title = document.createElement('div');
        title.className = 'chat-suggestions-title';
        title.textContent = 'Topic suggestions:';
        container.appendChild(title);
        
        // Add each suggestion
        suggestions.forEach(suggestion => {
            const pill = document.createElement('div');
            pill.className = 'chat-suggestion-pill';
            pill.textContent = suggestion.text;
            pill.addEventListener('click', suggestion.action);
            container.appendChild(pill);
        });
        
        // Show the suggestions
        container.style.display = 'block';
        
        // Hide suggestions after 30 seconds if not used
        setTimeout(() => {
            container.style.display = 'none';
        }, 30000);
    }
    
    /**
     * Send a message through the chat widget
     * @param {string} message - Message to send
     */
    static sendChatMessage(message) {
        if (!window.chatWidget || !message) return;
        
        // Fill the chat input with the suggestion
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = message;
            chatInput.focus();
            
            // Option 1: Automatically send message
            // const sendButton = document.getElementById('chat-send');
            // if (sendButton) sendButton.click();
            
            // Option 2: Let user modify before sending (preferred approach)
            // Do nothing, let user press send when ready
        }
    }
}

// Auto-initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for core to be loaded
    setTimeout(() => {
        if (window.webrtcCore) {
            // Initialize with default settings
            TopicsChatIntegration.initialize();
        }
    }, 500);
});
