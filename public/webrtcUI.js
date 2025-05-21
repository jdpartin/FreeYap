/**
 * WebRTC UI Module
 * Handles user interface components and interactions for WebRTC demo
 */

// Keep track of whether UI is initialized
let uiInitialized = false;
let connectionId = Math.random().toString(36).substring(2, 10); // Generate a unique ID for this session

// Initialize all UI components and event listeners
function initializeUI() {
    if (uiInitialized) return;
    
    // Initialize log toggle button
    const toggleLogButton = document.getElementById('toggleLog');
    if (toggleLogButton) {
        toggleLogButton.addEventListener('click', toggleLogPanel);
    }
    
    // Initialize resolution selector
    const resolutionSelect = document.getElementById('resolutionSelect');
    if (resolutionSelect) {
        resolutionSelect.addEventListener('change', function() {
            if (window.changeResolution) {
                window.changeResolution(this.value);
            }
        });
    }
    
    // Initialize frame rate slider
    const frameRateSlider = document.getElementById('frameRateSlider');
    const frameRateValue = document.getElementById('frameRateValue');
    if (frameRateSlider && frameRateValue) {
        frameRateSlider.addEventListener('input', function() {
            frameRateValue.textContent = this.value + ' fps';
        });
        
        frameRateSlider.addEventListener('change', function() {
            if (window.changeFrameRate) {
                window.changeFrameRate(this.value);
            }
        });
    }
    
    // Initialize video bitrate slider
    const videoBitrateSlider = document.getElementById('videoBitrateSlider');
    const videoBitrateValue = document.getElementById('videoBitrateValue');
    if (videoBitrateSlider && videoBitrateValue) {
        videoBitrateSlider.addEventListener('input', function() {
            videoBitrateValue.textContent = this.value + ' kbps';
        });
        
        videoBitrateSlider.addEventListener('change', function() {
            if (window.updateConnectionQuality) {
                window.updateConnectionQuality(parseInt(this.value));
            }
        });
    }
    
    // Initialize audio quality slider
    const audioQualitySlider = document.getElementById('audioQualitySlider');
    const audioQualityValue = document.getElementById('audioQualityValue');
    if (audioQualitySlider && audioQualityValue) {
        audioQualitySlider.addEventListener('input', function() {
            audioQualityValue.textContent = this.value + ' kbps';
        });
    }
    
    // Initialize media control buttons
    initializeMediaControlButtons();
    
    // Initialize remote audio volume control
    const remoteAudioVolume = document.getElementById('remoteAudioVolume');
    if (remoteAudioVolume) {
        remoteAudioVolume.addEventListener('input', function() {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.volume = this.value;
            }
        });
    }
    
    // Initialize chat controls
    initializeChatControls();
    
    // Add initial log entry
    addLogEntry('WebRTC demo initialized with session ID: ' + connectionId);
    
    uiInitialized = true;
}

// Initialize media control buttons
function initializeMediaControlButtons() {
    // Mute/unmute button
    const toggleMuteButton = document.getElementById('toggleMute');
    if (toggleMuteButton) {
        toggleMuteButton.addEventListener('click', function() {
            if (window.toggleAudio) {
                const enabled = window.toggleAudio();
                this.innerHTML = enabled ? 
                    '<i class="fa fa-microphone"></i> Mute' : 
                    '<i class="fa fa-microphone-slash"></i> Unmute';
            }
        });
    }
    
    // Toggle video button
    const toggleVideoButton = document.getElementById('toggleVideo');
    if (toggleVideoButton) {
        toggleVideoButton.addEventListener('click', function() {
            if (window.toggleVideo) {
                const enabled = window.toggleVideo();
                this.innerHTML = enabled ? 
                    '<i class="fa fa-video"></i> Disable Video' : 
                    '<i class="fa fa-video-slash"></i> Enable Video';
            }
        });
    }
    
    // Screenshot button
    const takeScreenshotButton = document.getElementById('takeScreenshot');
    if (takeScreenshotButton) {
        takeScreenshotButton.addEventListener('click', function() {
            if (window.takeScreenshot) {
                const remoteVideo = document.getElementById('remoteVideo');
                const screenshotDataUrl = window.takeScreenshot(remoteVideo);
                
                if (screenshotDataUrl) {
                    // Create download link
                    const link = document.createElement('a');
                    link.download = `webrtc-screenshot-${Date.now()}.png`;
                    link.href = screenshotDataUrl;
                    link.click();
                }
            }
        });
    }
    
    // Recording button
    const recordingButton = document.getElementById('startRecording');
    if (recordingButton) {
        recordingButton.addEventListener('click', function() {
            if (this.dataset.recording === 'true') {
                // Stop recording
                if (window.stopRecording && window.stopRecording()) {
                    this.innerHTML = '<i class="fa fa-record-vinyl"></i> Start Recording';
                    this.classList.replace('btn-warning', 'btn-danger');
                    this.dataset.recording = 'false';
                }
            } else {
                // Start recording
                const remoteVideo = document.getElementById('remoteVideo');
                if (window.startRecording && remoteVideo && remoteVideo.srcObject && 
                    window.startRecording(remoteVideo.srcObject)) {
                    this.innerHTML = '<i class="fa fa-stop"></i> Stop Recording';
                    this.classList.replace('btn-danger', 'btn-warning');
                    this.dataset.recording = 'true';
                }
            }
        });
    }
    
    // Camera switching button
    const switchCameraButton = document.getElementById('switchCamera');
    if (switchCameraButton) {
        switchCameraButton.addEventListener('click', function() {
            if (window.switchCamera) {
                window.switchCamera();
            }
        });
    }
    
    // Fullscreen button
    const fullscreenButton = document.getElementById('fullscreenRemote');
    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', function() {
            const remoteVideo = document.getElementById('remoteVideo');
            if (!remoteVideo) return;
            
            if (!document.fullscreenElement) {
                if (remoteVideo.requestFullscreen) {
                    remoteVideo.requestFullscreen();
                } else if (remoteVideo.webkitRequestFullscreen) {
                    remoteVideo.webkitRequestFullscreen();
                } else if (remoteVideo.msRequestFullscreen) {
                    remoteVideo.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        });
    }
}

// Initialize chat UI controls
function initializeChatControls() {
    // Send message button
    const sendMessageButton = document.getElementById('sendMessage');
    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', function() {
            sendChatMessage();
        });
    }
    
    // Chat input with Enter key event
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // File input control
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file && window.sendFile) {
                window.sendFile(file);
                this.value = ''; // Clear the file input
            }
        });
    }
}

// Helper function to send chat message
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    if (window.sendTextMessage && window.sendTextMessage(message)) {
        // If message sent successfully, add to UI and clear input
        if (window.addChatMessage) {
            window.addChatMessage(message, true);
        }
        chatInput.value = '';
    }
}

// Toggle log panel visibility
function toggleLogPanel() {
    const logPanel = document.getElementById('logPanel');
    const toggleLogButton = document.getElementById('toggleLog');
    
    if (!logPanel || !toggleLogButton) return;
    
    if (logPanel.style.display === 'none') {
        logPanel.style.display = 'block';
        toggleLogButton.textContent = 'Hide Connection Log';
    } else {
        logPanel.style.display = 'none';
        toggleLogButton.textContent = 'Show Connection Log';
    }
}

// Update connection status display
function updateStatus(message, isError = false) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.textContent = message;
        if (isError) {
            statusElement.style.color = '#dc3545';
            statusElement.className = 'status alert alert-danger';
        } else {
            statusElement.style.color = '#28a745';
            statusElement.className = 'status alert alert-success';
        }
    }
    
    // Also log to console with session ID
    const logPrefix = `[WebRTC ${connectionId}]`;
    if (isError) {
        console.error(`${logPrefix} ${message}`);
        addLogEntry(message, 'error');
    } else {
        console.log(`${logPrefix} ${message}`);
        addLogEntry(message, 'success');
    }
}

// Add a log entry
function addLogEntry(message, type = 'info') {
    const logEntries = document.getElementById('logEntries');
    if (!logEntries) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toISOString().substring(11, 19);
    entry.textContent = `${timestamp} - ${message}`;
    
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
}

// Update connection quality indicator
function updateConnectionQualityIndicator(packetLoss, latency, bitrate) {
    const qualityElement = document.getElementById('connectionQuality');
    const statsElement = document.getElementById('connectionStats');
    
    if (!qualityElement && !statsElement) return;
    
    let quality = 'Excellent';
    let color = '#28a745';
    
    if (packetLoss > 5 || latency > 300) {
        quality = 'Poor';
        color = '#dc3545';
    } else if (packetLoss > 2 || latency > 150) {
        quality = 'Fair';
        color = '#ffc107';
    } else if (packetLoss > 0.5 || latency > 70) {
        quality = 'Good';
        color = '#17a2b8';
    }
    
    if (qualityElement) {
        qualityElement.textContent = quality;
        qualityElement.style.color = color;
    }
    
    if (statsElement) {
        statsElement.textContent = 
            `Latency: ${latency}ms, Packet Loss: ${packetLoss.toFixed(1)}%, Bitrate: ${Math.round(bitrate)} kbps`;
    }
}

// Enable/disable call button
function setCallButtonState(enabled) {
    const startCallButton = document.getElementById('startCall');
    if (startCallButton) {
        startCallButton.disabled = !enabled;
    }
}

// Export connectionId for other modules to use
window.getConnectionId = function() {
    return connectionId;
}
