/**
 * WebRTCIntegration.js
 * Example integration script for FreeYap WebRTC modules
 * Shows how to initialize and configure WebRTC components for different pages
 */

// WebRTC component initialization based on page type
class WebRTCIntegration {
    /**
     * Initialize WebRTC components based on the current page
     */
    static initializeForCurrentPage() {
        // Wait for WebRTCCore to be fully initialized
        if (!window.webrtcCore) {
            console.error('WebRTCCore not found. Make sure WebRTCCore.js is loaded first.');
            return;
        }

        // Detect page type based on URL or DOM elements
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('textChat')) {
            this.initializeTextChat();
        } else if (currentPath.includes('videoChat')) {
            this.initializeVideoChat();
        } else if (currentPath.includes('voiceChat')) {
            this.initializeVoiceChat();
        } else {
            // Try to autodetect based on elements present
            this.autodetectAndInitialize();
        }
    }    /**
     * Initialize text chat configuration
     */
    static initializeTextChat() {
        console.log('Initializing text chat configuration');
        
        // We only need chat widget for text chat
        // Don't request camera/mic permissions unless specifically needed later
        
        // Initialize chat widget if not already done
        if (!window.chatWidget && document.getElementById('chat-input')) {
            window.chatWidget = new WebRTCChatWidget();
        }
        
        // Initialize topics widget separately if elements exist
        this.initializeTopicsWidget();
    }
    
    /**
     * Initialize topics widget with proper configuration
     * @param {object} options - Optional configuration options
     */
    static initializeTopicsWidget(options = {}) {
        // Check if required elements exist
        const userTopicsList = document.getElementById('user-topics-list');
        const partnerTopicsList = document.getElementById('partner-topics-list');
        
        if ((userTopicsList || partnerTopicsList) && !window.topicsWidget) {
            console.log('Initializing topics widget');
            
            // Create topics widget with default or custom options
            window.topicsWidget = new WebRTCTopicsWidget({
                // Combine default options with any provided options
                enableSmartHello: true,
                smartHelloChannel: 'chat',
                onTopicSimilarityCalculated: (data) => {
                    console.log('Topic similarities calculated:', data);
                    // You can add custom behavior here based on similarity data
                },
                ...options
            });
        }
    }

    /**
     * Initialize video chat configuration
     */
    static initializeVideoChat() {
        console.log('Initializing video chat configuration');
        
        // For video chat, we need all components including media with video
        this.initializeMediaForVideo();
    }

    /**
     * Initialize voice chat configuration
     */
    static initializeVoiceChat() {
        console.log('Initializing voice chat configuration');
        
        // For voice chat, initialize media with audio only
        this.initializeMediaForVoice();
    }

    /**
     * Initialize media streams for video chat
     */
    static initializeMediaForVideo() {
        // Check if media widget is already available
        if (window.mediaWidget) {
            window.mediaWidget.initializeMedia({ video: true, audio: true });
        } else {
            // Request permissions directly from core
            window.webrtcCore.initializeMediaStream({ video: true, audio: true });
        }
        
        // Update UI to reflect available controls
        this.updateMediaControls();
    }

    /**
     * Initialize media streams for voice chat
     */
    static initializeMediaForVoice() {
        // Check if media widget is already available
        if (window.mediaWidget) {
            window.mediaWidget.initializeMedia({ video: false, audio: true });
        } else {
            // Request permissions directly from core
            window.webrtcCore.initializeMediaStream({ video: false, audio: true });
        }
        
        // Update UI to reflect audio-only controls
        this.updateMediaControls(false, true);
    }
    
    /**
     * Update media controls visibility based on available devices
     * @param {boolean} showVideo - Whether to show video controls
     * @param {boolean} showAudio - Whether to show audio controls
     */
    static updateMediaControls(showVideo = true, showAudio = true) {
        const toggleCameraButton = document.getElementById('toggle-camera');
        const toggleMicButton = document.getElementById('toggle-mic');
        
        if (toggleCameraButton) {
            toggleCameraButton.style.display = showVideo ? 'block' : 'none';
        }
        
        if (toggleMicButton) {
            toggleMicButton.style.display = showAudio ? 'block' : 'none';
        }
    }    /**
     * Auto-detect page type based on available DOM elements and initialize accordingly
     */
    static autodetectAndInitialize() {
        // Check for video elements
        const hasVideoElements = document.getElementById('localVideo') && document.getElementById('remoteVideo');
        
        // Check for chat elements
        const hasChatElements = document.getElementById('chat-input') && document.getElementById('chat-messages');
        
        // Check for voice-specific elements
        const hasVoiceElements = document.querySelector('.voice-container') && !document.getElementById('remoteVideo');
        
        // Check for topics elements separately
        const hasTopicsElements = document.getElementById('user-topics-list') || document.getElementById('partner-topics-list');
        
        if (hasVideoElements) {
            // Video chat detected
            this.initializeVideoChat();
        } else if (hasVoiceElements) {
            // Voice chat detected
            this.initializeVoiceChat();
        } else if (hasChatElements) {
            // Text chat detected
            this.initializeTextChat();
        } else {
            console.log('Could not auto-detect page type, using default initialization');
            // Default to minimal initialization
        }
        
        // Always check for topics elements regardless of page type
        // This ensures topics can be used independently on any page type
        if (hasTopicsElements && !window.topicsWidget) {
            this.initializeTopicsWidget();
        }
    }
}

// Initialize WebRTC integration when the document is ready and core is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for WebRTCCore to be available
    setTimeout(() => {
        if (window.webrtcCore) {
            WebRTCIntegration.initializeForCurrentPage();
        } else {
            console.error('WebRTCCore not initialized. Please ensure WebRTCCore.js is loaded.');
        }
    }, 500);
});
