/**
 * WebRTCWidgetLoader.js
 * Utility to dynamically add WebRTC widgets to pages
 * Can be used to add topics or other widgets on demand
 */

class WebRTCWidgetLoader {
    /**
     * Dynamically add a topics widget to the page
     * @param {object} options - Configuration options
     * @param {string} options.containerId - ID for the container element
     * @param {string} options.parentSelector - CSS selector for parent element to append to
     * @param {object} options.widgetOptions - Options to pass to the widget constructor
     * @returns {HTMLElement} The created container element
     */
    static addTopicsWidget(options = {}) {
        const containerId = options.containerId || 'dynamic-topics-container';
        const parentSelector = options.parentSelector || 'body';
        const widgetOptions = options.widgetOptions || {};
        
        // Check if container already exists
        let container = document.getElementById(containerId);
        
        if (!container) {
            // Create container
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'topics-container';
            
            // Create HTML structure for topics widget
            container.innerHTML = `
                <div class="user-topics">
                    <h3>Your Topics</h3>
                    <div id="user-topics-list"></div>
                </div>
                <div class="partner-topics">
                    <h3 id="partner-topics-header">Partner's Topics</h3>
                    <div id="partner-topics-list">
                        <div class="topics-empty">Waiting for partner...</div>
                    </div>
                </div>
            `;
            
            // Add to DOM
            const parent = document.querySelector(parentSelector);
            if (parent) {
                parent.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
            
            // Add default styling if needed
            this._addDefaultStyling();
        }
        
        // Initialize the topics widget if WebRTCCore is available
        if (window.webrtcCore && typeof WebRTCTopicsWidget !== 'undefined') {
            // Create the widget with any provided options
            const defaultOptions = {
                userTopicsListId: 'user-topics-list',
                partnerTopicsListId: 'partner-topics-list',
                partnerTopicsHeaderId: 'partner-topics-header',
                topicsContainerId: containerId
            };
            
            window.topicsWidget = new WebRTCTopicsWidget({
                ...defaultOptions,
                ...widgetOptions
            });
        } else {
            console.error('WebRTCCore or WebRTCTopicsWidget not available');
        }
        
        return container;
    }
    
    /**
     * Dynamically add a chat widget to the page
     * @param {object} options - Configuration options
     * @returns {HTMLElement} The created container element
     */
    static addChatWidget(options = {}) {
        const containerId = options.containerId || 'dynamic-chat-container';
        const parentSelector = options.parentSelector || 'body';
        const widgetOptions = options.widgetOptions || {};
        
        // Check if container already exists
        let container = document.getElementById(containerId);
        
        if (!container) {
            // Create container
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'chat-container';
            
            // Create HTML structure for chat widget
            container.innerHTML = `
                <div id="chat-session-title">
                    <i class="bi bi-chat-dots-fill me-2"></i>Chat Session
                </div>
                <div id="chat-messages"></div>
                <div class="chat-input-container">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button id="chat-send" class="btn btn-primary">Send</button>
                </div>
            `;
            
            // Add to DOM
            const parent = document.querySelector(parentSelector);
            if (parent) {
                parent.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        }
        
        // Initialize the chat widget if WebRTCCore is available
        if (window.webrtcCore && typeof WebRTCChatWidget !== 'undefined') {
            window.chatWidget = new WebRTCChatWidget(widgetOptions);
        } else {
            console.error('WebRTCCore or WebRTCChatWidget not available');
        }
        
        return container;
    }
    
    /**
     * Add default styling for dynamically added widgets
     * @private
     */
    static _addDefaultStyling() {
        // Check if styles are already added
        if (document.getElementById('webrtc-widgets-dynamic-styles')) {
            return;
        }
        
        // Create style element
        const style = document.createElement('style');
        style.id = 'webrtc-widgets-dynamic-styles';
        
        // Add CSS rules
        style.textContent = `
            .topics-container {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .user-topics, .partner-topics {
                margin-bottom: 15px;
            }
            
            .topic-bubble {
                display: inline-block;
                background-color: #e9ecef;
                border-radius: 20px;
                padding: 5px 12px;
                margin: 3px;
                font-size: 14px;
                animation: fadeIn 0.3s ease-in-out;
                border-left: 4px solid transparent;
            }
            
            .topics-empty {
                color: #6c757d;
                font-style: italic;
                font-size: 14px;
            }
            
            .similarity-legend {
                margin-top: 15px;
                font-size: 12px;
                border-top: 1px solid #dee2e6;
                padding-top: 10px;
            }
            
            .chat-container {
                border: 1px solid #dee2e6;
                border-radius: 8px;
                overflow: hidden;
            }
            
            #chat-session-title {
                background-color: #f8f9fa;
                padding: 10px 15px;
                border-bottom: 1px solid #dee2e6;
                font-weight: bold;
            }
            
            #chat-messages {
                height: 300px;
                overflow-y: auto;
                padding: 15px;
                background-color: white;
            }
            
            .chat-input-container {
                display: flex;
                padding: 10px;
                background-color: #f8f9fa;
                border-top: 1px solid #dee2e6;
            }
            
            #chat-input {
                flex-grow: 1;
                margin-right: 10px;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        
        // Add to document
        document.head.appendChild(style);
    }
}

// Make available globally
window.WebRTCWidgetLoader = WebRTCWidgetLoader;
