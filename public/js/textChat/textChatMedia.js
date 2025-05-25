/**
 * TextChatMedia - Media functionality for text chat widget
 * Handles voice recording, video recording, photo capture, screen sharing, and file attachments
 */

class TextChatMedia {
    constructor(widgetId, elements, core, options = {}) {
        this.widgetId = widgetId;
        this.elements = elements;
        this.core = core;
        this.options = options;

        // Media state
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.mediaStream = null;
        this.isRecording = false;
        this.recordingType = null; // 'voice', 'video', 'screen'
        this.recordingTimer = null;
        this.recordingStartTime = null;

        this.init();
    }

    init() {
        console.log(`TextChatMedia initializing for widget: ${this.widgetId}`);
        
        this.setupEventListeners();
        this.setupUtilityPanels();

        // Listen for core events
        this.core.on('connected', () => this.enableMediaFeatures());
        this.core.on('chatEnded', () => this.disableMediaFeatures());
        this.core.on('customMessage', (message) => this.handleCustomMessage(message));
    }

    setupEventListeners() {
        // Utility option buttons
        const utilityOptions = [
            'attachmentOption', 'photoOption', 'videoRecordOption', 
            'voiceRecordOption', 'screenShareOption'
        ];

        utilityOptions.forEach(optionId => {
            const button = this.elements.widget.querySelector(`#${this.widgetId}-${optionId}`);
            if (button) {
                button.addEventListener('click', () => this.handleUtilityOption(optionId));
            }
        });

        // File input handlers
        const attachmentInput = this.elements.widget.querySelector(`#${this.widgetId}-attachmentInput`);
        if (attachmentInput) {
            attachmentInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        // Close panel buttons
        this.elements.widget.querySelectorAll('.utility-panel .btn-close').forEach(button => {
            button.addEventListener('click', function() {
                const panel = this.closest('.utility-panel');
                if (panel) {
                    panel.classList.add('d-none');
                }
            });
        });
    }

    setupUtilityPanels() {
        this.setupVoiceRecording();
        this.setupVideoRecording();
        this.setupPhotoCapture();
        this.setupScreenSharing();
    }

    setupVoiceRecording() {
        const voicePanel = this.elements.widget.querySelector(`#${this.widgetId}-voiceRecorderUI`);
        if (!voicePanel) return;

        const recordButton = voicePanel.querySelector(`#${this.widgetId}-voiceRecordButton`);
        const stopButton = voicePanel.querySelector(`#${this.widgetId}-voiceStopButton`);
        const sendButton = voicePanel.querySelector(`#${this.widgetId}-voiceSendButton`);
        const cancelButton = voicePanel.querySelector(`#${this.widgetId}-voiceCancelButton`);

        if (recordButton) {
            recordButton.addEventListener('click', () => this.startVoiceRecording());
        }
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopRecording());
        }
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendVoiceRecording());
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelRecording());
        }
    }

    setupVideoRecording() {
        const videoPanel = this.elements.widget.querySelector(`#${this.widgetId}-videoRecorderUI`);
        if (!videoPanel) return;

        const recordButton = videoPanel.querySelector(`#${this.widgetId}-videoRecordButton`);
        const stopButton = videoPanel.querySelector(`#${this.widgetId}-videoStopButton`);
        const sendButton = videoPanel.querySelector(`#${this.widgetId}-videoSendButton`);
        const cancelButton = videoPanel.querySelector(`#${this.widgetId}-videoCancelButton`);

        if (recordButton) {
            recordButton.addEventListener('click', () => this.startVideoRecording());
        }
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopRecording());
        }
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendVideoRecording());
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelRecording());
        }
    }

    setupPhotoCapture() {
        const photoPanel = this.elements.widget.querySelector(`#${this.widgetId}-photoUI`);
        if (!photoPanel) return;

        const takePictureButton = photoPanel.querySelector(`#${this.widgetId}-takePictureButton`);
        const retakeButton = photoPanel.querySelector(`#${this.widgetId}-retakePictureButton`);
        const sendButton = photoPanel.querySelector(`#${this.widgetId}-sendPictureButton`);
        const cancelButton = photoPanel.querySelector(`#${this.widgetId}-cancelPictureButton`);

        if (takePictureButton) {
            takePictureButton.addEventListener('click', () => this.takePicture());
        }
        if (retakeButton) {
            retakeButton.addEventListener('click', () => this.retakePicture());
        }
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendPicture());
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelPhotoCapture());
        }
    }

    setupScreenSharing() {
        const screenPanel = this.elements.widget.querySelector(`#${this.widgetId}-screenShareUI`);
        if (!screenPanel) return;

        const startButton = screenPanel.querySelector(`#${this.widgetId}-startScreenShareButton`);
        const stopButton = screenPanel.querySelector(`#${this.widgetId}-stopScreenShareButton`);
        const cancelButton = screenPanel.querySelector(`#${this.widgetId}-cancelScreenShareButton`);

        if (startButton) {
            startButton.addEventListener('click', () => this.startScreenShare());
        }
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopScreenShare());
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelScreenShare());
        }
    }

    handleUtilityOption(optionId) {
        // Hide all utility panels first
        this.elements.widget.querySelectorAll('.utility-panel').forEach(panel => {
            panel.classList.add('d-none');
        });

        switch (optionId) {
            case 'attachmentOption':
                this.openFileDialog();
                break;
            case 'photoOption':
                this.openPhotoCapture();
                break;
            case 'videoRecordOption':
                this.openVideoRecording();
                break;
            case 'voiceRecordOption':
                this.openVoiceRecording();
                break;
            case 'screenShareOption':
                this.openScreenShare();
                break;
        }
    }

    openFileDialog() {
        const attachmentInput = this.elements.widget.querySelector(`#${this.widgetId}-attachmentInput`);
        if (attachmentInput) {
            attachmentInput.click();
        }
    }

    openPhotoCapture() {
        const photoPanel = this.elements.widget.querySelector(`#${this.widgetId}-photoUI`);
        if (photoPanel) {
            photoPanel.classList.remove('d-none');
            this.initializeCameraPreview();
        }
    }

    openVideoRecording() {
        const videoPanel = this.elements.widget.querySelector(`#${this.widgetId}-videoRecorderUI`);
        if (videoPanel) {
            videoPanel.classList.remove('d-none');
        }
    }

    openVoiceRecording() {
        const voicePanel = this.elements.widget.querySelector(`#${this.widgetId}-voiceRecorderUI`);
        if (voicePanel) {
            voicePanel.classList.remove('d-none');
        }
    }

    openScreenShare() {
        const screenPanel = this.elements.widget.querySelector(`#${this.widgetId}-screenShareUI`);
        if (screenPanel) {
            screenPanel.classList.remove('d-none');
        }
    }

    async initializeCameraPreview() {
        const cameraPreview = this.elements.widget.querySelector(`#${this.widgetId}-cameraPreview`);
        if (!cameraPreview) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraPreview.srcObject = stream;
            this.mediaStream = stream;
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showToast('Camera access denied or not available');
        }
    }

    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.startRecording(stream, 'voice');
            
            const voicePanel = this.elements.widget.querySelector(`#${this.widgetId}-voiceRecorderUI`);
            this.updateRecordingUI(voicePanel, true);
            this.startRecordingTimer(`#${this.widgetId}-voiceTimer`);
        } catch (error) {
            console.error('Error starting voice recording:', error);
            this.showToast('Microphone access denied or not available');
        }
    }

    async startVideoRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            const videoPreview = this.elements.widget.querySelector(`#${this.widgetId}-videoPreview`);
            if (videoPreview) {
                videoPreview.srcObject = stream;
            }
            
            this.startRecording(stream, 'video');
            
            const videoPanel = this.elements.widget.querySelector(`#${this.widgetId}-videoRecorderUI`);
            this.updateRecordingUI(videoPanel, true);
            this.startRecordingTimer(`#${this.widgetId}-videoTimer`);
        } catch (error) {
            console.error('Error starting video recording:', error);
            this.showToast('Camera/microphone access denied or not available');
        }
    }

    startRecording(stream, type) {
        this.mediaStream = stream;
        this.recordingType = type;
        this.recordedChunks = [];
        
        const options = { mimeType: type === 'voice' ? 'audio/webm' : 'video/webm' };
        this.mediaRecorder = new MediaRecorder(stream, options);
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
            this.showRecordingControls();
        };
        
        this.mediaRecorder.start();
        this.isRecording = true;
        this.recordingStartTime = Date.now();
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.stopRecordingTimer();
            
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }
        }
    }

    startRecordingTimer(timerSelector) {
        const timerElement = this.elements.widget.querySelector(timerSelector);
        if (!timerElement) return;
        
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    updateRecordingUI(panel, isRecording) {
        if (!panel) return;
        
        const recordButton = panel.querySelector('[id*="Record"]');
        const stopButton = panel.querySelector('[id*="Stop"]');
        const sendButton = panel.querySelector('[id*="Send"]');
        
        if (recordButton) recordButton.classList.toggle('d-none', isRecording);
        if (stopButton) stopButton.classList.toggle('d-none', !isRecording);
        if (sendButton) sendButton.classList.toggle('d-none', isRecording);
    }

    showRecordingControls() {
        const panelSelector = this.recordingType === 'voice' ? 
            `#${this.widgetId}-voiceRecorderUI` : 
            `#${this.widgetId}-videoRecorderUI`;
        
        const panel = this.elements.widget.querySelector(panelSelector);
        this.updateRecordingUI(panel, false);
    }

    async sendVoiceRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        await this.sendMediaBlob(blob, 'voice');
        this.cancelRecording();
    }

    async sendVideoRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        await this.sendMediaBlob(blob, 'video');
        this.cancelRecording();
    }

    async sendMediaBlob(blob, type) {
        try {
            // Convert blob to base64 for transmission
            const base64Data = await this.blobToBase64(blob);
            
            const mediaMessage = {
                type: 'media',
                mediaType: type,
                data: base64Data,
                size: blob.size
            };
            
            if (this.core.sendCustomMessage(mediaMessage)) {
                this.displaySentMedia(type, base64Data);
                this.showToast(`${type} sent successfully!`);
            }
        } catch (error) {
            console.error('Error sending media:', error);
            this.showToast('Failed to send media');
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    cancelRecording() {
        this.stopRecording();
        
        // Hide recording panels
        const panels = [
            `#${this.widgetId}-voiceRecorderUI`,
            `#${this.widgetId}-videoRecorderUI`
        ];
        
        panels.forEach(panelId => {
            const panel = this.elements.widget.querySelector(panelId);
            if (panel) {
                panel.classList.add('d-none');
                this.resetRecordingPanel(panel);
            }
        });
        
        this.cleanupRecording();
    }

    resetRecordingPanel(panel) {
        // Reset timer
        const timer = panel.querySelector('[id*="Timer"]');
        if (timer) timer.textContent = '00:00';
        
        // Reset button states
        this.updateRecordingUI(panel, false);
        
        // Hide send button
        const sendButton = panel.querySelector('[id*="Send"]');
        if (sendButton) sendButton.classList.add('d-none');
    }

    cleanupRecording() {
        this.recordedChunks = [];
        this.recordingType = null;
        this.recordingStartTime = null;
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    async takePicture() {
        const cameraPreview = this.elements.widget.querySelector(`#${this.widgetId}-cameraPreview`);
        const photoPreview = this.elements.widget.querySelector(`#${this.widgetId}-photoPreview`);
        
        if (!cameraPreview || !photoPreview) return;
        
        // Create canvas to capture photo
        const canvas = document.createElement('canvas');
        canvas.width = cameraPreview.videoWidth;
        canvas.height = cameraPreview.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(cameraPreview, 0, 0);
        
        // Convert to blob
        canvas.toBlob(blob => {
            this.capturedPhoto = blob;
            photoPreview.src = URL.createObjectURL(blob);
            
            // Show photo preview, hide camera
            cameraPreview.classList.add('d-none');
            photoPreview.classList.remove('d-none');
            
            // Update button states
            const photoPanel = this.elements.widget.querySelector(`#${this.widgetId}-photoUI`);
            this.updatePhotoUI(photoPanel, true);
        }, 'image/jpeg', 0.8);
    }

    retakePicture() {
        const cameraPreview = this.elements.widget.querySelector(`#${this.widgetId}-cameraPreview`);
        const photoPreview = this.elements.widget.querySelector(`#${this.widgetId}-photoPreview`);
        
        if (cameraPreview && photoPreview) {
            cameraPreview.classList.remove('d-none');
            photoPreview.classList.add('d-none');
            
            const photoPanel = this.elements.widget.querySelector(`#${this.widgetId}-photoUI`);
            this.updatePhotoUI(photoPanel, false);
        }
        
        this.capturedPhoto = null;
    }

    async sendPicture() {
        if (!this.capturedPhoto) return;
        
        await this.sendMediaBlob(this.capturedPhoto, 'image');
        this.cancelPhotoCapture();
    }

    updatePhotoUI(panel, hasPhoto) {
        if (!panel) return;
        
        const takePictureButton = panel.querySelector(`#${this.widgetId}-takePictureButton`);
        const retakeButton = panel.querySelector(`#${this.widgetId}-retakePictureButton`);
        const sendButton = panel.querySelector(`#${this.widgetId}-sendPictureButton`);
        
        if (takePictureButton) takePictureButton.classList.toggle('d-none', hasPhoto);
        if (retakeButton) retakeButton.classList.toggle('d-none', !hasPhoto);
        if (sendButton) sendButton.classList.toggle('d-none', !hasPhoto);
    }

    cancelPhotoCapture() {
        const photoPanel = this.elements.widget.querySelector(`#${this.widgetId}-photoUI`);
        if (photoPanel) {
            photoPanel.classList.add('d-none');
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        this.capturedPhoto = null;
    }

    async startScreenShare() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            
            const screenPreview = this.elements.widget.querySelector(`#${this.widgetId}-screenSharePreview`);
            if (screenPreview) {
                screenPreview.srcObject = stream;
            }
            
            // Send screen share data via WebRTC data channel
            const screenShareMessage = {
                type: 'screenShare',
                action: 'start'
            };
            
            this.core.sendCustomMessage(screenShareMessage);
            
            // Update UI
            const screenPanel = this.elements.widget.querySelector(`#${this.widgetId}-screenShareUI`);
            this.updateScreenShareUI(screenPanel, true);
            
            this.mediaStream = stream;
        } catch (error) {
            console.error('Error starting screen share:', error);
            this.showToast('Screen sharing not available or permission denied');
        }
    }

    stopScreenShare() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        const screenShareMessage = {
            type: 'screenShare',
            action: 'stop'
        };
        
        this.core.sendCustomMessage(screenShareMessage);
        this.cancelScreenShare();
    }

    updateScreenShareUI(panel, isSharing) {
        if (!panel) return;
        
        const startButton = panel.querySelector(`#${this.widgetId}-startScreenShareButton`);
        const stopButton = panel.querySelector(`#${this.widgetId}-stopScreenShareButton`);
        
        if (startButton) startButton.classList.toggle('d-none', isSharing);
        if (stopButton) stopButton.classList.toggle('d-none', !isSharing);
    }

    cancelScreenShare() {
        const screenPanel = this.elements.widget.querySelector(`#${this.widgetId}-screenShareUI`);
        if (screenPanel) {
            screenPanel.classList.add('d-none');
            this.updateScreenShareUI(screenPanel, false);
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    async handleFileSelection(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        const file = files[0];
        
        // Check file size (limit to 10MB for demo)
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('File too large. Maximum size is 10MB.');
            return;
        }
        
        try {
            const base64Data = await this.fileToBase64(file);
            
            const fileMessage = {
                type: 'file',
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                data: base64Data
            };
            
            if (this.core.sendCustomMessage(fileMessage)) {
                this.displaySentFile(file.name, file.type);
                this.showToast('File sent successfully!');
            }
        } catch (error) {
            console.error('Error sending file:', error);
            this.showToast('Failed to send file');
        }
        
        // Clear input
        event.target.value = '';
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    displaySentMedia(type, data) {
        const messageElement = this.createMediaMessage(type, data, true);
        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    displayReceivedMedia(type, data) {
        const messageElement = this.createMediaMessage(type, data, false);
        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    displaySentFile(fileName, fileType) {
        const messageElement = this.createFileMessage(fileName, fileType, true);
        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    displayReceivedFile(fileName, fileType, data) {
        const messageElement = this.createFileMessage(fileName, fileType, false, data);
        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    createMediaMessage(type, data, isSent) {
        // Remove welcome message if it exists
        const welcomeMessage = this.elements.chatBox.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = isSent ? 'message-container sent' : 'message-container received';

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let mediaContent = '';
        switch (type) {
            case 'image':
                mediaContent = `<img src="${data}" alt="Shared image" style="max-width: 100%; border-radius: 8px;">`;
                break;
            case 'voice':
                mediaContent = `<audio controls style="max-width: 100%;"><source src="${data}" type="audio/webm"></audio>`;
                break;
            case 'video':
                mediaContent = `<video controls style="max-width: 100%; border-radius: 8px;"><source src="${data}" type="video/webm"></video>`;
                break;
        }

        messageElement.innerHTML = `
            <div class="message ${isSent ? 'message-sent' : 'message-received'}">
                <div class="message-content">
                    ${mediaContent}
                </div>
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                    ${isSent ? '<i class="bi bi-check2-all"></i>' : ''}
                </div>
            </div>
        `;

        return messageElement;
    }

    createFileMessage(fileName, fileType, isSent, data = null) {
        // Remove welcome message if it exists
        const welcomeMessage = this.elements.chatBox.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = isSent ? 'message-container sent' : 'message-container received';

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const fileIcon = this.getFileIcon(fileType);
        const downloadLink = data ? `<a href="${data}" download="${fileName}" class="btn btn-sm btn-outline-primary ms-2">Download</a>` : '';

        messageElement.innerHTML = `
            <div class="message ${isSent ? 'message-sent' : 'message-received'}">
                <div class="message-content">
                    <div class="file-attachment">
                        <i class="${fileIcon} me-2"></i>
                        <span>${fileName}</span>
                        ${downloadLink}
                    </div>
                </div>
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                    ${isSent ? '<i class="bi bi-check2-all"></i>' : ''}
                </div>
            </div>
        `;

        return messageElement;
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'bi bi-image';
        if (fileType.startsWith('video/')) return 'bi bi-camera-video';
        if (fileType.startsWith('audio/')) return 'bi bi-music-note';
        if (fileType.includes('pdf')) return 'bi bi-file-pdf';
        if (fileType.includes('word')) return 'bi bi-file-word';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'bi bi-file-excel';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'bi bi-file-ppt';
        if (fileType.includes('text/')) return 'bi bi-file-text';
        return 'bi bi-file-earmark';
    }

    handleCustomMessage(message) {
        switch (message.type) {
            case 'media':
                this.displayReceivedMedia(message.mediaType, message.data);
                break;
            case 'file':
                this.displayReceivedFile(message.fileName, message.fileType, message.data);
                break;
            case 'screenShare':
                this.handleScreenShareMessage(message);
                break;
        }
    }

    handleScreenShareMessage(message) {
        if (message.action === 'start') {
            this.showToast('Partner started screen sharing');
        } else if (message.action === 'stop') {
            this.showToast('Partner stopped screen sharing');
        }
    }

    showToast(message) {
        // Create toast element
        const toastEl = document.createElement('div');
        toastEl.className = 'media-toast';
        toastEl.textContent = message;
        toastEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toastEl);
        
        // Trigger animation
        setTimeout(() => toastEl.style.opacity = '1', 10);
        
        // Remove after delay
        setTimeout(() => {
            toastEl.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(toastEl)) {
                    document.body.removeChild(toastEl);
                }
            }, 300);
        }, 3000);
    }

    enableMediaFeatures() {
        // Enable media options when connected
        const mediaButtons = this.elements.widget.querySelectorAll('.utility-item');
        mediaButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
        });
    }

    disableMediaFeatures() {
        // Clean up any active media streams
        this.cancelRecording();
        this.cancelPhotoCapture();
        this.cancelScreenShare();
        
        // Disable media options
        const mediaButtons = this.elements.widget.querySelectorAll('.utility-item');
        mediaButtons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.5';
        });
    }

    // Public API methods
    async requestPermissions() {
        const permissions = [];
        
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            permissions.push('microphone');
        } catch (e) {
            console.warn('Microphone permission denied');
        }
        
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            permissions.push('camera');
        } catch (e) {
            console.warn('Camera permission denied');
        }
        
        return permissions;
    }

    setMaxFileSize(sizeInMB) {
        this.maxFileSize = sizeInMB * 1024 * 1024;
    }

    getSupportedFormats() {
        return {
            audio: MediaRecorder.isTypeSupported('audio/webm'),
            video: MediaRecorder.isTypeSupported('video/webm'),
            screen: 'getDisplayMedia' in navigator.mediaDevices
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChatMedia;
}
