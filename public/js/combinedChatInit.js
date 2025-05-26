/**
 * combinedChatInit.js - Initializes the combined text and video chat experience
 * 
 * This script coordinates the individual text and video chat modules
 * to work with a single shared WebRTC connection.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for shared WebRTC manager from main script
    const checkInterval = setInterval(() => {
        if (window.sharedWebRTCManager && window.sharedSocket) {
            clearInterval(checkInterval);
            initializeChat();
        }
    }, 100);

    function initializeChat() {
        console.log('Initializing combined chat with shared connection manager');
        
        // Initialize text chat module with the shared connection manager
        const textChatModule = new TextChat(window.sharedWebRTCManager);
        
        // Initialize video chat module with the shared connection manager
        const videoChatModule = new VideoChat(window.sharedWebRTCManager);
        
        // UI elements for text chat
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        const chatLogContainer = document.getElementById('chat-log-container');
        
        // UI elements for video chat
        const localVideo = document.getElementById('local-video');
        const remoteVideo = document.getElementById('remote-video');
        const startVideoBtn = document.getElementById('start-video-btn');
        const stopVideoBtn = document.getElementById('stop-video-btn');
        const muteVideoBtn = document.getElementById('mute-video-btn');
        const muteAudioBtn = document.getElementById('mute-audio-btn');
        
        // Set up text chat event handlers
        textChatModule.on('message', (event) => {
            addMessageToChat(event.detail.content, false);
        });
        
        // Set up video chat event handlers
        videoChatModule.on('localStream', (event) => {
            if (localVideo) {
                localVideo.srcObject = event.detail.stream;
            }
        });
        
        videoChatModule.on('remoteStream', (event) => {
            if (remoteVideo) {
                remoteVideo.srcObject = event.detail.stream;
            }
        });
        
        // Text chat UI event handlers
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                sendTextMessage();
            });
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendTextMessage();
                }
            });
        }
        
        // Video chat UI event handlers
        if (startVideoBtn) {
            startVideoBtn.addEventListener('click', async () => {
                startVideoBtn.disabled = true;
                const success = await videoChatModule.startVideo();
                if (success) {
                    stopVideoBtn.disabled = false;
                    muteVideoBtn.disabled = false;
                    muteAudioBtn.disabled = false;
                } else {
                    startVideoBtn.disabled = false;
                }
            });
        }
        
        if (stopVideoBtn) {
            stopVideoBtn.addEventListener('click', () => {
                videoChatModule.stopVideo();
                stopVideoBtn.disabled = true;
                muteVideoBtn.disabled = true;
                muteAudioBtn.disabled = true;
                startVideoBtn.disabled = false;
            });
        }
        
        if (muteVideoBtn) {
            muteVideoBtn.addEventListener('click', () => {
                const isCurrentlyMuted = muteVideoBtn.textContent.includes('Unmute');
                videoChatModule.toggleVideo(!isCurrentlyMuted);
                muteVideoBtn.textContent = isCurrentlyMuted ? 'Mute Video' : 'Unmute Video';
            });
        }
        
        if (muteAudioBtn) {
            muteAudioBtn.addEventListener('click', () => {
                const isCurrentlyMuted = muteAudioBtn.textContent.includes('Unmute');
                videoChatModule.toggleAudio(!isCurrentlyMuted);
                muteAudioBtn.textContent = isCurrentlyMuted ? 'Mute Audio' : 'Unmute Audio';
            });
        }
        
        // Function to send a text message
        function sendTextMessage() {
            if (!chatInput) return;
            
            const message = chatInput.value.trim();
            if (message === '') return;
            
            const success = textChatModule.sendMessage(message);
            
            if (success) {
                addMessageToChat(message, true);
                chatInput.value = '';
            }
        }
        
        // Function to add a message to the chat log
        function addMessageToChat(message, isSelf) {
            if (!chatLogContainer) return;
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `chat-message ${isSelf ? 'self' : 'other'}`;
            messageEl.innerHTML = `
                <div class="message-content">
                    <p>${escapeHTML(message)}</p>
                    <small class="message-time">${new Date().toLocaleTimeString()}</small>
                </div>
            `;
            
            // Add to chat log
            chatLogContainer.appendChild(messageEl);
            
            // Scroll to bottom
            chatLogContainer.scrollTop = chatLogContainer.scrollHeight;
        }
        
        // Helper function to escape HTML
        function escapeHTML(str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        
        // Enable UI elements once connection is ready
        window.sharedWebRTCManager.on('connectionReady', () => {
            if (chatInput) chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            if (startVideoBtn) startVideoBtn.disabled = false;
            
            // Clear welcome message in text chat
            if (chatLogContainer) {
                const welcomeMessage = chatLogContainer.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.remove();
                }
            }
            
            // Add system message
            addSystemMessage('Connected with a chat partner. You can now send messages and start video.');
        });
        
        // Function to add system message
        function addSystemMessage(message) {
            if (!chatLogContainer) return;
            
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message system';
            messageEl.innerHTML = `
                <div class="message-content">
                    <p>${escapeHTML(message)}</p>
                    <small class="message-time">${new Date().toLocaleTimeString()}</small>
                </div>
            `;
            
            chatLogContainer.appendChild(messageEl);
            chatLogContainer.scrollTop = chatLogContainer.scrollHeight;
        }
        
        // Expose modules to window
        window.textChatModule = textChatModule;
        window.videoChatModule = videoChatModule;
        
        console.log('Combined chat initialized successfully');
    }
});
