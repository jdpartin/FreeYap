/**
 * combinedChat.js - Module to coordinate shared connections between video and text chat widgets
 * 
 * This module serves as a bridge between the shared WebRTC connection manager
 * and the individual chat widgets (video and text).
 */

class CombinedChatCoordinator {
    constructor() {
        this.webRTCManager = window.sharedWebRTCManager;
        this.socket = window.sharedSocket;
        
        // Event listeners for coordinating between modules
        this.eventListeners = {};
        
        // Reference to video and text chat modules
        this.videoChat = null;
        this.textChat = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the coordinator
     */
    init() {
        // Wait for both chat modules to register
        this.on('videoChatReady', (videoChat) => {
            console.log('Video chat module registered');
            this.videoChat = videoChat;
            this._checkFullyInitialized();
        });
        
        this.on('textChatReady', (textChat) => {
            console.log('Text chat module registered');
            this.textChat = textChat;
            this._checkFullyInitialized();
        });
    }
    
    /**
     * Register a video chat module with the coordinator
     * @param {Object} videoChatModule - The video chat module instance
     */
    registerVideoChat(videoChatModule) {
        this.emit('videoChatReady', videoChatModule);
    }
    
    /**
     * Register a text chat module with the coordinator
     * @param {Object} textChatModule - The text chat module instance
     */
    registerTextChat(textChatModule) {
        this.emit('textChatReady', textChatModule);
    }
    
    /**
     * Check if both modules are registered and fully initialize
     * @private
     */
    _checkFullyInitialized() {
        if (this.videoChat && this.textChat) {
            console.log('Both chat modules registered. Combined chat fully initialized.');
            this.emit('fullyInitialized');
        }
    }
    
    /**
     * Add an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.eventListeners[event]) return;
        
        const index = this.eventListeners[event].indexOf(callback);
        if (index !== -1) {
            this.eventListeners[event].splice(index, 1);
        }
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to the listeners
     */
    emit(event, ...args) {
        if (!this.eventListeners[event]) return;
        
        for (const callback of this.eventListeners[event]) {
            callback(...args);
        }
    }
}

// Create a global coordinator instance when the script loads
window.combinedChatCoordinator = new CombinedChatCoordinator();
