/**
 * WebRTC Media Module
 * Handles media streams, constraints, and media-related controls
 */

// Global media variables
let localStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let currentConstraints = {
    video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
    },
    audio: true
};

// Get user media with current constraints
async function getLocalMedia() {
    try {
        if (localStream) {
            // Stop all existing tracks
            localStream.getTracks().forEach(track => track.stop());
        }

        localStream = await navigator.mediaDevices.getUserMedia(currentConstraints);
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        
        addLogEntry(`Local media stream started: ${localStream.getVideoTracks().length} video track(s), ${localStream.getAudioTracks().length} audio track(s)`, 'success');
        return localStream;
    } catch (error) {
        console.error('[Media] Error accessing media devices:', error);
        updateStatus('Error accessing camera/microphone: ' + error.message, true);
        addLogEntry('Media access error: ' + error.message, 'error');
        throw error;
    }
}

// List available media devices
async function listMediaDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        console.log('[Media] Available video inputs:', videoInputs);
        console.log('[Media] Available audio inputs:', audioInputs);
        console.log('[Media] Available audio outputs:', audioOutputs);
        
        return { videoInputs, audioInputs, audioOutputs };
    } catch (error) {
        console.error('[Media] Error listing media devices:', error);
        return { videoInputs: [], audioInputs: [], audioOutputs: [] };
    }
}

// Change video resolution
async function changeResolution(resolution) {
    const [width, height] = resolution.split('x').map(Number);
    
    currentConstraints.video.width = { ideal: width };
    currentConstraints.video.height = { ideal: height };
    
    addLogEntry(`Changing resolution to ${width}x${height}`, 'info');
    
    // If we have an active stream, restart it with new constraints
    if (localStream && localStream.getVideoTracks().length > 0) {
        await getLocalMedia();
        
        // If we have an active peer connection, we need to replace the track
        if (window.peerConnection) {
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = window.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                await sender.replaceTrack(videoTrack);
                addLogEntry('Video track replaced in peer connection', 'info');
            }
        }
    }
}

// Change frame rate
async function changeFrameRate(frameRate) {
    frameRate = Number(frameRate);
    currentConstraints.video.frameRate = { ideal: frameRate };
    
    addLogEntry(`Changing frame rate to ${frameRate} fps`, 'info');
    
    // If we have an active stream, update the track constraints
    if (localStream && localStream.getVideoTracks().length > 0) {
        const videoTrack = localStream.getVideoTracks()[0];
        
        try {
            await videoTrack.applyConstraints({ 
                frameRate: { ideal: frameRate } 
            });
            addLogEntry('Frame rate changed', 'success');
        } catch (e) {
            console.error('[Media] Error applying frame rate constraint:', e);
            addLogEntry('Failed to change frame rate', 'error');
        }
    }
}

// Toggle audio mute
function toggleAudio() {
    if (!localStream) return false;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    
    const enabled = !audioTracks[0].enabled;
    audioTracks.forEach(track => {
        track.enabled = enabled;
    });
    
    addLogEntry(`Microphone ${enabled ? 'unmuted' : 'muted'}`, 'info');
    return enabled;
}

// Toggle video
function toggleVideo() {
    if (!localStream) return false;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;
    
    const enabled = !videoTracks[0].enabled;
    videoTracks.forEach(track => {
        track.enabled = enabled;
    });
    
    addLogEntry(`Camera ${enabled ? 'enabled' : 'disabled'}`, 'info');
    return enabled;
}

// Switch camera (cycle through available video devices)
async function switchCamera() {
    try {
        const { videoInputs } = await listMediaDevices();
        
        if (videoInputs.length <= 1) {
            addLogEntry('No alternative cameras found', 'info');
            return false;
        }
        
        // Find the currently active device
        const currentTrack = localStream?.getVideoTracks()[0];
        const currentDeviceId = currentTrack?.getSettings()?.deviceId;
        
        // Find the next device in the list
        let nextDeviceIndex = 0;
        if (currentDeviceId) {
            const currentIndex = videoInputs.findIndex(device => device.deviceId === currentDeviceId);
            if (currentIndex >= 0) {
                nextDeviceIndex = (currentIndex + 1) % videoInputs.length;
            }
        }
        
        // Update constraints with the new device ID
        currentConstraints.video.deviceId = { exact: videoInputs[nextDeviceIndex].deviceId };
        
        // Apply new constraints by getting a new stream
        await getLocalMedia();
        
        // If we have an active peer connection, we need to replace the track
        if (window.peerConnection) {
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = window.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }
        }
        
        addLogEntry(`Switched to camera: ${videoInputs[nextDeviceIndex].label}`, 'success');
        return true;
    } catch (error) {
        console.error('[Media] Error switching camera:', error);
        addLogEntry('Failed to switch camera', 'error');
        return false;
    }
}

// Take a screenshot from the video
function takeScreenshot(videoElement) {
    if (!videoElement || videoElement.readyState !== 4) {
        addLogEntry('Cannot take screenshot - video not ready', 'error');
        return null;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    try {
        const dataUrl = canvas.toDataURL('image/png');
        addLogEntry('Screenshot captured', 'success');
        return dataUrl;
    } catch (error) {
        console.error('[Media] Error taking screenshot:', error);
        addLogEntry('Failed to take screenshot', 'error');
        return null;
    }
}

// Start recording the local video and audio
function startRecording(stream) {
    if (!stream) {
        addLogEntry('Cannot record - no media stream', 'error');
        return false;
    }
    
    try {
        recordedChunks = [];
        const options = { mimeType: 'video/webm; codecs=vp9,opus' };
        mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // Create a download link
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `webrtc-recording-${new Date().toISOString()}.webm`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            addLogEntry('Recording saved', 'success');
        };
        
        mediaRecorder.start();
        addLogEntry('Recording started', 'info');
        return true;
    } catch (error) {
        console.error('[Media] Error starting recording:', error);
        addLogEntry('Failed to start recording', 'error');
        return false;
    }
}

// Stop recording
function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        addLogEntry('No active recording to stop', 'info');
        return false;
    }
    
    mediaRecorder.stop();
    addLogEntry('Recording stopped', 'info');
    return true;
}
