/**
 * WebRTCMediaWidget.js
 * Media widget for WebRTC communication
 * Handles video and audio streams and controls
 */

class WebRTCMediaWidget {
    /**
     * Create a new media widget
     * @param {object} options - Configuration options
     * @param {string} options.localVideoId - ID of the local video element
     * @param {string} options.remoteVideoId - ID of the remote video element
     * @param {string} options.toggleCameraId - ID of the toggle camera button
     * @param {string} options.toggleMicId - ID of the toggle microphone button
     * @param {boolean} options.autoInitialize - Whether to initialize media on startup
     * @param {MediaStreamConstraints} options.constraints - Media constraints
     */
    constructor(options = {}) {
        // Widget elements
        this.localVideo = document.getElementById(options.localVideoId || 'localVideo');
        this.remoteVideo = document.getElementById(options.remoteVideoId || 'remoteVideo');
        this.toggleCameraButton = document.getElementById(options.toggleCameraId || 'toggle-camera');
        this.toggleMicButton = document.getElementById(options.toggleMicId || 'toggle-mic');
        
        // Widget properties
        this.channelName = 'media';
        this.core = window.webrtcCore;
        this.isCameraOn = true;
        this.isMicOn = true;
        this.autoInitialize = options.autoInitialize !== undefined ? options.autoInitialize : true;
        this.constraints = options.constraints || null;
        
        // Register with core
        if (this.core) {
            this.core.registerWidget(this.channelName, this);
            
            // Set up event listeners
            this._setupEventListeners();
            
            // Auto-initialize media if configured
            if (this.autoInitialize && (this.localVideo || this.remoteVideo)) {
                this.initializeMedia();
            }
            
            console.log('Media widget initialized and registered with WebRTCCore');
        } else {
            console.error('WebRTCCore not found. Make sure WebRTCCore.js is loaded first.');
        }
    }

    /**
     * Set up DOM and WebRTCCore event listeners
     * @private
     */
    _setupEventListeners() {
        // Toggle camera button
        if (this.toggleCameraButton) {
            this.toggleCameraButton.addEventListener('click', () => this.toggleCamera());
        }
        
        // Toggle mic button
        if (this.toggleMicButton) {
            this.toggleMicButton.addEventListener('click', () => this.toggleMicrophone());
        }
        
        // Handle remote stream
        this.core.addEventListener('remoteStream', (stream) => {
            this._handleRemoteStream(stream);
        });
        
        // Handle local stream
        this.core.addEventListener('localStream', (stream) => {
            this._handleLocalStream(stream);
        });
    }

    /**
     * Initialize media stream
     * @returns {Promise<MediaStream>} - The local media stream
     */
    async initializeMedia() {
        try {
            // Get constraints based on available elements
            let mediaConstraints = this.constraints;
            
            if (!mediaConstraints) {
                if (this.localVideo && this.remoteVideo) {
                    // Video chat - both video and audio
                    mediaConstraints = { video: true, audio: true };
                    console.log('Video chat detected - requesting video and audio');
                } else if (!this.localVideo && !this.remoteVideo) {
                    // Audio only - for voice chat
                    mediaConstraints = { video: false, audio: true };
                    console.log('Voice chat detected - requesting audio only');
                } else {
                    // Default constraints
                    mediaConstraints = { video: true, audio: true };
                }
            }
            
            // Request stream through core
            const stream = await this.core.initializeMediaStream(mediaConstraints);
            return stream;
        } catch (error) {
            console.error('Media widget: Error initializing media stream:', error);
            throw error;
        }
    }

    /**
     * Handle the local media stream
     * @param {MediaStream} stream - Local media stream
     * @private
     */
    _handleLocalStream(stream) {
        if (this.localVideo && stream) {
            this.localVideo.srcObject = stream;
            console.log('Local stream attached to video element');
        }
    }

    /**
     * Handle the remote media stream
     * @param {MediaStream} stream - Remote media stream
     * @private
     */
    _handleRemoteStream(stream) {
        if (this.remoteVideo && stream) {
            this.remoteVideo.srcObject = stream;
            console.log('Remote stream attached to video element');
        }
    }

    /**
     * Toggle camera on/off
     */
    toggleCamera() {
        const stream = this.core.localStream;
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                this.isCameraOn = !this.isCameraOn;
                videoTrack.enabled = this.isCameraOn;
                
                if (this.toggleCameraButton) {
                    this.toggleCameraButton.innerHTML = this.isCameraOn ? 
                        '<i class="bi bi-camera-video-fill"></i> Camera On' : 
                        '<i class="bi bi-camera-video-off"></i> Camera Off';
                    
                    this.toggleCameraButton.classList.toggle('btn-danger', !this.isCameraOn);
                    this.toggleCameraButton.classList.toggle('btn-success', this.isCameraOn);
                }
                
                console.log(`Camera ${this.isCameraOn ? 'enabled' : 'disabled'}`);
            }
        }
    }

    /**
     * Toggle microphone on/off
     */
    toggleMicrophone() {
        const stream = this.core.localStream;
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                this.isMicOn = !this.isMicOn;
                audioTrack.enabled = this.isMicOn;
                
                if (this.toggleMicButton) {
                    this.toggleMicButton.innerHTML = this.isMicOn ? 
                        '<i class="bi bi-mic-fill"></i> Mic On' : 
                        '<i class="bi bi-mic-mute"></i> Mic Off';
                    
                    this.toggleMicButton.classList.toggle('btn-danger', !this.isMicOn);
                    this.toggleMicButton.classList.toggle('btn-success', this.isMicOn);
                }
                
                console.log(`Microphone ${this.isMicOn ? 'enabled' : 'disabled'}`);
            }
        }
    }
    
    /**
     * Clean up media resources
     */
    cleanup() {
        // Stop tracks in local stream
        if (this.core.localStream) {
            this.core.localStream.getTracks().forEach(track => {
                track.stop();
            });
        }
        
        // Clear video elements
        if (this.localVideo) {
            this.localVideo.srcObject = null;
        }
        
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
        }
        
        console.log('Media widget cleaned up');
    }
}

// Initialize the media widget when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for WebRTCCore to be available
    setTimeout(() => {
        if (window.webrtcCore) {
            // Auto-initialize if the required elements exist
            const localVideo = document.getElementById('localVideo');
            const remoteVideo = document.getElementById('remoteVideo');
            
            if (localVideo || remoteVideo) {
                window.mediaWidget = new WebRTCMediaWidget();
            }
        }
    }, 200);
});
