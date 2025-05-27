class VideoChatSettings
{
    constructor(videoChatWidget)
    {
        this.videoChatWidget = videoChatWidget;
        this.localStream = null;
        this.remoteStream = null;
        
        // Reference to settings modal elements
        this.settingsModal = null;
        this.audioInputSelect = null;
        this.videoInputSelect = null;
        this.audioOutputSelect = null;
        this.localVolumeSlider = null;
        this.remoteVolumeSlider = null;
        
        // Device info
        this.availableDevices = {
            audioinput: [],
            videoinput: [],
            audiooutput: []
        };
        
        // Settings state
        this.currentSettings = {
            audioInput: '',
            videoInput: '',
            audioOutput: '',
            localVolume: 1.0,  // 0 to 1.0
            remoteVolume: 1.0  // 0 to 1.0
        };
        
        // Create and initialize the modal
        this.#createSettingsModal();
    }
    
    /**
     * Create the settings modal and add it to the DOM
     */
    #createSettingsModal()
    {
        // Create settings modal HTML
        const modal = document.createElement('div');
        modal.id = 'video-settings-modal';
        modal.classList.add('modal', 'fade');
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'videoSettingsModalLabel');
        modal.setAttribute('aria-hidden', 'true');
          modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="videoSettingsModalLabel">Video & Audio Settings</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="video-input">Camera</label>
                            <select id="video-input" class="form-control"></select>
                        </div>
                        <div class="form-group">
                            <label for="audio-input">Microphone</label>
                            <select id="audio-input" class="form-control"></select>
                        </div>
                        <div class="form-group">
                            <label for="audio-output">Audio Output</label>
                            <select id="audio-output" class="form-control"></select>
                            <small class="text-muted">Note: Audio output selection is not supported in all browsers.</small>
                        </div>
                        <div class="form-group">
                            <label for="local-volume">Your Microphone Volume</label>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-volume-down mr-2"></i>
                                <input type="range" class="form-control-range" id="local-volume" min="0" max="1" step="0.01" value="1">
                                <i class="fas fa-volume-up ml-2"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="remote-volume">Remote Volume</label>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-volume-down mr-2"></i>
                                <input type="range" class="form-control-range" id="remote-volume" min="0" max="1" step="0.01" value="1">
                                <i class="fas fa-volume-up ml-2"></i>
                            </div>
                        </div>
                        <div class="video-preview-container mt-3">
                            <label>Camera Preview</label>
                            <div class="video-preview">
                                <video id="settings-video-preview" autoplay muted></video>
                            </div>
                        </div>
                    </div>                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="apply-settings">Apply</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to document
        document.body.appendChild(modal);
        
        // Store references to elements
        this.settingsModal = modal;
        this.audioInputSelect = document.getElementById('audio-input');
        this.videoInputSelect = document.getElementById('video-input');
        this.audioOutputSelect = document.getElementById('audio-output');
        this.localVolumeSlider = document.getElementById('local-volume');
        this.remoteVolumeSlider = document.getElementById('remote-volume');
        
        // Create reference to preview video
        this.videoPreview = document.getElementById('settings-video-preview');
        
        // Set up event listeners
        this.#setupEventListeners();
    }
    
    /**
     * Set up event listeners for settings controls
     */
    #setupEventListeners()
    {
        // Apply button click event
        document.getElementById('apply-settings').addEventListener('click', () => {
            this.applySettings();
            this.closeModal();
        });
        
        // Device selection change events
        this.videoInputSelect.addEventListener('change', () => {
            this.currentSettings.videoInput = this.videoInputSelect.value;
            this.updateVideoPreview();
        });
        
        this.audioInputSelect.addEventListener('change', () => {
            this.currentSettings.audioInput = this.audioInputSelect.value;
        });
        
        this.audioOutputSelect.addEventListener('change', () => {
            this.currentSettings.audioOutput = this.audioOutputSelect.value;
            this.applyAudioOutputDevice();
        });
        
        // Volume slider events
        this.localVolumeSlider.addEventListener('input', () => {
            this.currentSettings.localVolume = parseFloat(this.localVolumeSlider.value);
            this.applyLocalVolume();
        });
        
        this.remoteVolumeSlider.addEventListener('input', () => {
            this.currentSettings.remoteVolume = parseFloat(this.remoteVolumeSlider.value);
            this.applyRemoteVolume();
        });
          // Modal events
        this.settingsModal.addEventListener('show.bs.modal', () => {
            this.#onModalShow();
        });
        
        this.settingsModal.addEventListener('hidden.bs.modal', () => {
            this.#onModalHide();
        });
    }
      /**
     * Open the settings modal
     */
    openModal()
    {
        const modalInstance = new bootstrap.Modal(this.settingsModal);
        modalInstance.show();
    }
    
    /**
     * Close the settings modal
     */
    closeModal() 
    {
        const modalInstance = bootstrap.Modal.getInstance(this.settingsModal);
        if (modalInstance) {
            modalInstance.hide();
        }
    }
    
    /**
     * Handle modal show event
     */
    async #onModalShow()
    {
        // Get current streams from widget
        this.localStream = this.videoChatWidget.localStream;
        this.remoteStream = this.videoChatWidget.remoteStream;
        
        // Refresh device lists
        await this.#refreshDevices();
        
        // Update video preview
        this.updateVideoPreview();
        
        // Set initial slider values
        this.localVolumeSlider.value = this.currentSettings.localVolume;
        this.remoteVolumeSlider.value = this.currentSettings.remoteVolume;
    }
    
    /**
     * Handle modal hide event
     */
    #onModalHide()
    {
        // Stop any preview streams we created
        if (this.videoPreview.srcObject && 
            this.videoPreview.srcObject !== this.localStream) {
            this.videoPreview.srcObject.getTracks().forEach(track => track.stop());
        }
        
        this.videoPreview.srcObject = null;
    }
    
    /**
     * Apply all current settings
     */
    async applySettings()
    {
        try {
            // Apply audio/video devices
            await this.applyMediaDevices();
            
            // Apply volume settings
            this.applyLocalVolume();
            this.applyRemoteVolume();
            
            // Apply audio output device
            this.applyAudioOutputDevice();
            
            // Notify success
            this.showNotification('Settings applied successfully', 'success');
        } catch (error) {
            console.error('Failed to apply settings:', error);
            this.showNotification('Error applying settings: ' + error.message, 'error');
        }
    }
    
    /**
     * Apply volume to local audio stream
     */
    applyLocalVolume()
    {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                // Currently, the Web Audio API would be needed to adjust microphone volume
                // For now, we'll just indicate that this feature isn't fully supported
                console.log('Setting local volume to', this.currentSettings.localVolume);
                // Future implementation could use AudioContext to manipulate the stream
            }
        }
    }
    
    /**
     * Apply volume to remote audio stream
     */
    applyRemoteVolume()
    {
        if (this.remoteStream && this.videoChatWidget.remoteVideoElement) {
            this.videoChatWidget.remoteVideoElement.volume = this.currentSettings.remoteVolume;
        }
    }
    
    /**
     * Apply selected audio output device
     */
    applyAudioOutputDevice()
    {
        if (!this.currentSettings.audioOutput || 
            typeof this.videoChatWidget.remoteVideoElement.setSinkId !== 'function') {
            return;
        }
        
        try {
            this.videoChatWidget.remoteVideoElement.setSinkId(this.currentSettings.audioOutput);
        } catch (error) {
            console.error('Error setting audio output device:', error);
        }
    }
    
    /**
     * Apply media device selections
     */
    async applyMediaDevices()
    {
        // If no device changes, skip
        if (!this.currentSettings.videoInput && !this.currentSettings.audioInput) {
            return;
        }
        
        // Build constraints based on selected devices
        const constraints = {};
        
        if (this.currentSettings.videoInput) {
            constraints.video = { deviceId: { exact: this.currentSettings.videoInput } };
        }
        
        if (this.currentSettings.audioInput) {
            constraints.audio = { deviceId: { exact: this.currentSettings.audioInput } };
        }
        
        try {
            // Get new stream with selected devices
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Stop old tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            // Replace stream in video element
            this.videoChatWidget.localVideoElement.srcObject = newStream;
            
            // Replace tracks in the RTCPeerConnection if available
            if (this.videoChatWidget.webRTCConnectionManager && 
                this.videoChatWidget.webRTCConnectionManager.GetPeer()) {
                
                const peer = this.videoChatWidget.webRTCConnectionManager.GetPeer();
                
                // Replace tracks in peer connection
                newStream.getTracks().forEach(track => {
                    const sender = peer.getSenders().find(s => 
                        s.track && s.track.kind === track.kind);
                    
                    if (sender) {
                        sender.replaceTrack(track);
                    } else {
                        peer.addTrack(track, newStream);
                    }
                });
            }
            
            // Update local stream reference
            this.videoChatWidget.localStream = newStream;
            this.localStream = newStream;
            
        } catch (error) {
            console.error('Error applying media devices:', error);
            throw new Error('Could not access selected devices');
        }
    }
    
    /**
     * Update the video preview in settings
     */
    async updateVideoPreview()
    {
        // If no video device selected or same as current, use existing stream
        if (!this.currentSettings.videoInput || 
            (this.localStream && this.localStream.getVideoTracks()[0]?.getSettings().deviceId === this.currentSettings.videoInput)) {
            
            this.videoPreview.srcObject = this.localStream;
            return;
        }
        
        try {
            // Stop any existing preview stream
            if (this.videoPreview.srcObject && 
                this.videoPreview.srcObject !== this.localStream) {
                this.videoPreview.srcObject.getTracks().forEach(track => track.stop());
            }
            
            // Get new stream for preview only
            const previewStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: this.currentSettings.videoInput } }
            });
            
            this.videoPreview.srcObject = previewStream;
            
        } catch (error) {
            console.error('Error updating video preview:', error);
            this.videoPreview.srcObject = null;
        }
    }
    
    /**
     * Refresh the device lists
     */
    async #refreshDevices()
    {
        try {
            // Request permissions if needed
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            
            // Get all media devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // Clear previous device lists
            this.availableDevices = {
                audioinput: [],
                videoinput: [],
                audiooutput: []
            };
            
            // Sort devices by kind
            devices.forEach(device => {
                if (this.availableDevices[device.kind]) {
                    this.availableDevices[device.kind].push(device);
                }
            });
            
            // Save current selections
            const currentVideoInput = this.videoInputSelect.value;
            const currentAudioInput = this.audioInputSelect.value;
            const currentAudioOutput = this.audioOutputSelect.value;
            
            // Clear select elements
            this.videoInputSelect.innerHTML = '';
            this.audioInputSelect.innerHTML = '';
            this.audioOutputSelect.innerHTML = '';
            
            // Populate video input devices
            this.availableDevices.videoinput.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${this.videoInputSelect.options.length + 1}`;
                this.videoInputSelect.appendChild(option);
            });
            
            // Populate audio input devices
            this.availableDevices.audioinput.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${this.audioInputSelect.options.length + 1}`;
                this.audioInputSelect.appendChild(option);
            });
            
            // Populate audio output devices
            this.availableDevices.audiooutput.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Speaker ${this.audioOutputSelect.options.length + 1}`;
                this.audioOutputSelect.appendChild(option);
            });
            
            // Try to restore previous selections
            if (currentVideoInput) {
                this.videoInputSelect.value = currentVideoInput;
            } else if (this.localStream) {
                // Try to select the currently active device
                const currentDeviceId = this.localStream.getVideoTracks()[0]?.getSettings().deviceId;
                if (currentDeviceId) {
                    this.videoInputSelect.value = currentDeviceId;
                }
                this.currentSettings.videoInput = this.videoInputSelect.value;
            }
            
            if (currentAudioInput) {
                this.audioInputSelect.value = currentAudioInput;
            } else if (this.localStream) {
                // Try to select the currently active device
                const currentDeviceId = this.localStream.getAudioTracks()[0]?.getSettings().deviceId;
                if (currentDeviceId) {
                    this.audioInputSelect.value = currentDeviceId;
                }
                this.currentSettings.audioInput = this.audioInputSelect.value;
            }
            
            if (currentAudioOutput) {
                this.audioOutputSelect.value = currentAudioOutput;
            }
            this.currentSettings.audioOutput = this.audioOutputSelect.value;
            
        } catch (error) {
            console.error('Error refreshing device list:', error);
        }
    }
      /**
     * Display a notification to the user
     */
    showNotification(message, type = 'info')
    {
        try {
            // Check if toast container exists, if not create it
            let toastContainer = document.querySelector('.toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
                document.body.appendChild(toastContainer);
            }
    
            // Create toast
            const toast = document.createElement('div');
            toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'}`;
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
    
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `;
    
            // Add toast to container
            toastContainer.appendChild(toast);
            
            // Initialize Bootstrap toast and show it
            if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                const bootstrapToast = new bootstrap.Toast(toast, {
                    delay: 3000
                });
                
                bootstrapToast.show();
    
                // Remove toast from DOM after it's hidden
                toast.addEventListener('hidden.bs.toast', () => {
                    toast.remove();
                });
            } else {
                // Fallback if Bootstrap Toast is not available
                console.log('Notification:', message);
                
                // Manual timeout to remove the toast
                setTimeout(() => {
                    toast.classList.add('hiding');
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 500);
                }, 3000);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
}
