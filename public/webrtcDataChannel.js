/**
 * WebRTC Data Channel Module
 * Handles text chat and file transfers via WebRTC data channels
 */

// Global data channel variable
let dataChannel = null;

// Initialize data channel for a peer connection
function initializeDataChannel(peerConnection) {
    if (!peerConnection) {
        console.error('[DataChannel] No peer connection provided');
        return null;
    }
    
    try {
        // Create the data channel with ordered and reliable delivery
        dataChannel = peerConnection.createDataChannel("chat", {
            ordered: true,
        });
        
        setupDataChannel(dataChannel);
        addLogEntry('Data channel created', 'info');
        return dataChannel;
    } catch (error) {
        console.error('[DataChannel] Error creating data channel:', error);
        addLogEntry('Failed to create data channel: ' + error.message, 'error');
        return null;
    }
}

// Set up event handlers for the data channel
function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('[DataChannel] Data channel opened');
        addLogEntry('Chat connection established', 'success');
        document.getElementById('sendMessage').disabled = false;
        document.getElementById('fileInput').disabled = false;
        
        // Add welcome message to the chat
        addChatMessage('Chat connection established! You can now send messages.');
    };
    
    channel.onclose = () => {
        console.log('[DataChannel] Data channel closed');
        addLogEntry('Chat connection closed', 'info');
        document.getElementById('sendMessage').disabled = true;
        document.getElementById('fileInput').disabled = true;
    };
    
    channel.onerror = (error) => {
        console.error('[DataChannel] Data channel error:', error);
        addLogEntry('Chat error: ' + error, 'error');
    };
    
    channel.onmessage = (event) => {
        try {
            // Check if it's a file or text message
            const data = JSON.parse(event.data);
            
            if (data.type === 'file') {
                // It's a file message
                addChatMessage({
                    name: data.name,
                    size: data.size,
                    url: data.url
                }, false, true);
                addLogEntry(`Received file: ${data.name}`, 'info');
            } else if (data.type === 'text') {
                // It's a text message
                addChatMessage(data.message, false);
            }
        } catch (e) {
            // If it's not JSON, treat as plain text
            addChatMessage(event.data, false);
        }
    };
}

// Add a handler for receiving data channels from the remote peer
function handleIncomingDataChannel(event) {
    console.log('[DataChannel] Received data channel from remote peer');
    addLogEntry('Received data channel from peer', 'info');
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
}

// Send a text message through the data channel
function sendTextMessage(message) {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        addLogEntry('Cannot send message - chat not connected', 'error');
        return false;
    }
    
    try {
        // Send as JSON to distinguish from file transfers
        dataChannel.send(JSON.stringify({
            type: 'text',
            message: message
        }));
        
        addLogEntry('Message sent', 'info');
        return true;
    } catch (error) {
        console.error('[DataChannel] Error sending message:', error);
        addLogEntry('Failed to send message: ' + error.message, 'error');
        return false;
    }
}

// Send a file through the data channel
function sendFile(file) {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        addLogEntry('Cannot send file - chat not connected', 'error');
        return false;
    }
    
    if (!file) {
        addLogEntry('No file selected', 'error');
        return false;
    }
    
    // Check file size - data channel has limitations
    if (file.size > 10 * 1024 * 1024) {  // 10MB limit for simplicity
        addLogEntry('File too large - max size is 10MB', 'error');
        return false;
    }
    
    // Read the file and create a URL
    const fileReader = new FileReader();
    
    fileReader.onload = function() {
        const arrayBuffer = this.result;
        const fileUrl = URL.createObjectURL(new Blob([arrayBuffer]));
        
        try {
            // Send file metadata
            dataChannel.send(JSON.stringify({
                type: 'file',
                name: file.name,
                size: file.size,
                url: fileUrl
            }));
            
            addChatMessage({
                name: file.name,
                size: file.size,
                url: fileUrl
            }, true, true);
            
            addLogEntry(`File sent: ${file.name}`, 'success');
            return true;
        } catch (error) {
            console.error('[DataChannel] Error sending file:', error);
            addLogEntry('Failed to send file: ' + error.message, 'error');
            return false;
        }
    };
    
    fileReader.onerror = function() {
        addLogEntry('Error reading file', 'error');
    };
    
    fileReader.readAsArrayBuffer(file);
}

// Format file size in human-readable format
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Add a message to the chat display
function addChatMessage(message, isSent = false, isFile = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    
    if (isFile) {
        messageElement.className = `file-message ${isSent ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <div class="file-icon">
                <i class="fas fa-file"></i>
            </div>
            <div class="file-info">
                <div><strong>${message.name}</strong></div>
                <div>${formatFileSize(message.size)}</div>
            </div>
            <div class="file-actions">
                <button class="btn btn-sm btn-primary download-file" data-url="${message.url}">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
        
        // Add event listener for download button
        setTimeout(() => {
            const downloadBtn = messageElement.querySelector('.download-file');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function() {
                    const url = this.getAttribute('data-url');
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = message.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            }
        }, 0);
    } else {
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
        messageElement.textContent = typeof message === 'string' ? message : JSON.stringify(message);
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Check if data channel is open
function isDataChannelOpen() {
    return dataChannel && dataChannel.readyState === 'open';
}

// Get data channel or null if not available
function getDataChannel() {
    return dataChannel;
}
