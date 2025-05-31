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
let canvasRenderingContext = null;
let animationFrameId = null;

// Global variables for remote video canvas rendering
let remoteCanvasRenderingContext = null;
let remoteAnimationFrameId = null;

// Get user media with current constraints
async function getLocalMedia() {
    try {
        // Stop any AI features that might be running
        if (typeof window.stopVirtualBackground === 'function' && 
            typeof window.isVirtualBackgroundActive === 'function' && 
            window.isVirtualBackgroundActive()) {
            window.stopVirtualBackground();
            // Update UI if needed
            const toggleVirtualBackgroundButton = document.getElementById('toggleVirtualBackground');
            if (toggleVirtualBackgroundButton) {
                toggleVirtualBackgroundButton.innerHTML = '<i class="fas fa-image"></i> Enable Virtual Background';
                toggleVirtualBackgroundButton.classList.replace('btn-success', 'btn-outline-success');
            }
        }
        
        if (localStream) {
            // Stop all existing tracks
            localStream.getTracks().forEach(track => track.stop());
            
            // Stop any ongoing canvas rendering
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }        localStream = await navigator.mediaDevices.getUserMedia(currentConstraints);
        
        // Set up the video element (hidden) as the source
        const localVideo = document.getElementById('localVideo');
        if (!localVideo) {
            console.error('[Media] Local video element not found');
            return localStream;
        }
        
        // Initialize video element with proper attributes
        initializeVideoElement(localVideo);
        
        // Set stream as source
        localVideo.srcObject = localStream;
        
        // Set up the canvas to display the video
        const outputCanvas = document.getElementById('localVideoCanvas');
        if (!outputCanvas) {
            console.error('[Media] Output canvas not found');
            return localStream;
        }
        
        // Wait for the video to have metadata to set the canvas dimensions
        await new Promise((resolve) => {
            if (localVideo.readyState >= 2) {
                resolve();
            } else {
                localVideo.onloadedmetadata = () => resolve();
            }
        });
        
        // Ensure the video is playing
        try {
            await localVideo.play();
        } catch (e) {
            console.error('[Media] Error playing local video:', e);
        }
        
        // Set the canvas dimensions to match the video
        outputCanvas.width = localVideo.videoWidth || 640;
        outputCanvas.height = localVideo.videoHeight || 480;
        
        console.log('[Media] Local video dimensions:', localVideo.videoWidth, 'x', localVideo.videoHeight, 
                    'Ready state:', localVideo.readyState);
        
        // Start rendering the video to the canvas
        startCanvasRendering(localVideo, outputCanvas);
        
        addLogEntry(`Local media stream started: ${localStream.getVideoTracks().length} video track(s), ${localStream.getAudioTracks().length} audio track(s)`, 'success');
        return localStream;
    } catch (error) {
        console.error('[Media] Error accessing media devices:', error);
        updateStatus('Error accessing camera/microphone: ' + error.message, true);
        addLogEntry('Media access error: ' + error.message, 'error');
        throw error;
    }
}

// Render video to canvas continuously
function startCanvasRendering(videoElement, canvasElement) {
    if (!videoElement || !canvasElement) {
        console.error('[Media] Cannot start canvas rendering: missing elements');
        return;
    }
    
    // Get the canvas context for rendering - recreate it to ensure it's fresh
    canvasRenderingContext = canvasElement.getContext('2d', { alpha: false });
    
    // Stop any existing animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Make sure video is playing
    if (videoElement.paused || videoElement.ended) {
        videoElement.play().catch(e => {
            console.error('[Media] Error playing video in canvas rendering:', e);
        });
    }
    
    // Function to calculate dimensions maintaining aspect ratio
    function calculateAspectRatioDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        return {
            width: srcWidth * ratio,
            height: srcHeight * ratio,
            offsetX: (maxWidth - srcWidth * ratio) / 2,
            offsetY: (maxHeight - srcHeight * ratio) / 2
        };
    }
    
    // Function to render each frame
    function renderFrame() {
        try {
            if (videoElement.readyState >= 2 && !videoElement.paused && !videoElement.ended) {
                // Get the display dimensions of the canvas from CSS
                const displayWidth = canvasElement.offsetWidth;
                const displayHeight = canvasElement.offsetHeight;
                
                // Set canvas internal dimensions to match display dimensions for best quality
                if (canvasElement.width !== displayWidth || canvasElement.height !== displayHeight) {
                    canvasElement.width = displayWidth;
                    canvasElement.height = displayHeight;
                }
                
                // Calculate dimensions to maintain aspect ratio
                const dimensions = calculateAspectRatioDimensions(
                    videoElement.videoWidth,
                    videoElement.videoHeight,
                    displayWidth,
                    displayHeight
                );
                
                // Clear the entire canvas
                canvasRenderingContext.fillStyle = '#000000';
                canvasRenderingContext.fillRect(0, 0, canvasElement.width, canvasElement.height);
                
                // Draw the video frame centered and maintaining aspect ratio
                canvasRenderingContext.drawImage(
                    videoElement,
                    dimensions.offsetX,
                    dimensions.offsetY,
                    dimensions.width,
                    dimensions.height
                );
                
            } else if (videoElement.paused || videoElement.ended) {
                // Try to restart video if it's paused or ended
                videoElement.play().catch(() => {});
            }
        } catch (e) {
            console.error('[Media] Error rendering frame to canvas:', e);
        }
        
        // Request the next frame
        animationFrameId = requestAnimationFrame(renderFrame);
    }
    
    console.log('[Media] Starting canvas rendering with video dimensions:', 
                videoElement.videoWidth, 'x', videoElement.videoHeight,
                'readyState:', videoElement.readyState,
                'display size:', canvasElement.offsetWidth, 'x', canvasElement.offsetHeight);
    
    // Start the rendering loop
    renderFrame();
    
    // Handle resize events to maintain proper scaling
    const resizeObserver = new ResizeObserver(() => {
        if (canvasElement.offsetWidth > 0 && canvasElement.offsetHeight > 0) {
            console.log('[Media] Canvas resized:', 
                        canvasElement.offsetWidth, 'x', canvasElement.offsetHeight);
        }
    });
    
    resizeObserver.observe(canvasElement);
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

// Take a screenshot from the video or canvas
function takeScreenshot(element) {
    // If element is a canvas, simply capture its content
    if (element instanceof HTMLCanvasElement) {
        try {
            const dataUrl = element.toDataURL('image/png');
            addLogEntry('Screenshot captured from canvas', 'success');
            return dataUrl;
        } catch (error) {
            console.error('[Media] Error taking screenshot from canvas:', error);
            addLogEntry('Failed to take screenshot from canvas', 'error');
            return null;
        }
    }
    
    // If element is a video
    if (element instanceof HTMLVideoElement && element.readyState !== 4) {
        addLogEntry('Cannot take screenshot - video not ready', 'error');
        return null;
    }
    
    const canvas = document.createElement('canvas');
    
    if (element instanceof HTMLVideoElement) {
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
    } else {
        // Default size if element is neither canvas nor video
        canvas.width = 640;
        canvas.height = 480;
        addLogEntry('Warning: Unknown element type for screenshot', 'warning');
    }
    
    const context = canvas.getContext('2d');
    
    try {
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
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

// Render remote video to canvas continuously
function startRemoteCanvasRendering(videoElement, canvasElement) {
    if (!videoElement || !canvasElement) {
        console.error('[Media] Cannot start remote canvas rendering: missing elements');
        return;
    }
    
    // Get the canvas context for rendering - recreate it to ensure it's fresh
    remoteCanvasRenderingContext = canvasElement.getContext('2d', { alpha: false });
    
    // Stop any existing animation frame
    if (remoteAnimationFrameId) {
        cancelAnimationFrame(remoteAnimationFrameId);
        remoteAnimationFrameId = null;
    }
    
    // Make sure video is playing
    if (videoElement.paused || videoElement.ended) {
        videoElement.play().catch(e => {
            console.error('[Media] Error playing remote video in canvas rendering:', e);
        });
    }
    
    // Function to calculate dimensions maintaining aspect ratio
    function calculateAspectRatioDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        return {
            width: srcWidth * ratio,
            height: srcHeight * ratio,
            offsetX: (maxWidth - srcWidth * ratio) / 2,
            offsetY: (maxHeight - srcHeight * ratio) / 2
        };
    }
      // Function to render each frame
    function renderFrame() {
        try {
            if (videoElement.readyState >= 2 && !videoElement.paused && !videoElement.ended) {
                // Get the display dimensions of the canvas from CSS
                const displayWidth = canvasElement.offsetWidth;
                const displayHeight = canvasElement.offsetHeight;
                
                // Only set canvas internal dimensions if they've actually changed to avoid constant resizing
                if (canvasElement.width !== displayWidth || canvasElement.height !== displayHeight) {
                    // Only resize if the difference is significant (more than 1 pixel) to avoid micro-adjustments
                    if (Math.abs(canvasElement.width - displayWidth) > 1 || Math.abs(canvasElement.height - displayHeight) > 1) {
                        console.log('[Media] Resizing remote canvas from', canvasElement.width, 'x', canvasElement.height, 
                                   'to', displayWidth, 'x', displayHeight);
                        canvasElement.width = displayWidth;
                        canvasElement.height = displayHeight;
                    }
                }
                
                // Calculate dimensions to maintain aspect ratio
                const dimensions = calculateAspectRatioDimensions(
                    videoElement.videoWidth,
                    videoElement.videoHeight,
                    canvasElement.width,
                    canvasElement.height
                );
                
                // Clear the entire canvas
                remoteCanvasRenderingContext.fillStyle = '#000000';
                remoteCanvasRenderingContext.fillRect(0, 0, canvasElement.width, canvasElement.height);
                
                // Draw the video frame centered and maintaining aspect ratio
                remoteCanvasRenderingContext.drawImage(
                    videoElement,
                    dimensions.offsetX,
                    dimensions.offsetY,
                    dimensions.width,
                    dimensions.height
                );
                
            } else if (videoElement.paused || videoElement.ended) {
                // Try to restart video if it's paused or ended
                videoElement.play().catch(() => {});
            }
        } catch (e) {
            console.error('[Media] Error rendering remote frame to canvas:', e);
        }
        
        // Request the next frame
        remoteAnimationFrameId = requestAnimationFrame(renderFrame);
    }
    
    console.log('[Media] Starting remote canvas rendering with video dimensions:', 
                videoElement.videoWidth, 'x', videoElement.videoHeight,
                'readyState:', videoElement.readyState,
                'display size:', canvasElement.offsetWidth, 'x', canvasElement.offsetHeight);
    
    // Start the rendering loop
    renderFrame();
    
    // Handle resize events to maintain proper scaling
    const resizeObserver = new ResizeObserver(() => {
        if (canvasElement.offsetWidth > 0 && canvasElement.offsetHeight > 0) {
            console.log('[Media] Remote canvas resized:', 
                        canvasElement.offsetWidth, 'x', canvasElement.offsetHeight);
        }
    });
    
    resizeObserver.observe(canvasElement);
}

// Stop remote canvas rendering
function stopRemoteCanvasRendering() {
    if (remoteAnimationFrameId) {
        cancelAnimationFrame(remoteAnimationFrameId);
        remoteAnimationFrameId = null;
    }
}    // Set up remote video stream with canvas rendering
function setupRemoteStream(remoteStream) {
    const remoteVideo = document.getElementById('remoteVideo');
    const remoteCanvas = document.getElementById('remoteVideoCanvas');
    
    if (!remoteVideo || !remoteCanvas) {
        console.error('[Media] Remote video elements not found');
        return;
    }
    
    // Initialize video element with proper attributes
    initializeVideoElement(remoteVideo);
    
    // Set the stream as source for the video element
    remoteVideo.srcObject = remoteStream;
    
    console.log('[Media] Setting up remote stream. Track count:', 
                remoteStream.getTracks().length,
                'Video tracks:', remoteStream.getVideoTracks().length);
    
    // Ensure the video plays
    remoteVideo.play().catch(e => {
        console.error('[Media] Error playing remote video:', e);
    });
    
    // Wait for video metadata to load before setting up canvas
    if (remoteVideo.readyState >= 2) {
        // Video already has metadata
        setupRemoteCanvas();
    } else {
        // Wait for metadata to load
        remoteVideo.onloadedmetadata = setupRemoteCanvas;
    }
    
    function setupRemoteCanvas() {
        // Set canvas dimensions to match video
        remoteCanvas.width = remoteVideo.videoWidth || 640;
        remoteCanvas.height = remoteVideo.videoHeight || 480;
        
        console.log('[Media] Remote video dimensions:', remoteVideo.videoWidth, 'x', remoteVideo.videoHeight,
                    'Ready state:', remoteVideo.readyState);
        
        // Start rendering to canvas
        startRemoteCanvasRendering(remoteVideo, remoteCanvas);
        addLogEntry('Remote video rendering to canvas started', 'info');
    }
}

/**
 * Initialize a video element with proper attributes for better performance and compatibility
 * @param {HTMLVideoElement} videoElement - The video element to initialize
 */
function initializeVideoElement(videoElement) {
    if (!videoElement) return;
    
    // Set attributes for better performance
    videoElement.playsInline = true; // Especially important for iOS
    videoElement.autoplay = true;
    
    // Add webkit-specific attribute for older iOS devices
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.setAttribute('playsinline', 'true');
    
    // Additional mobile-friendly attributes
    videoElement.setAttribute('muted', 'true'); // Helps with autoplay policies
    videoElement.controls = false; // Prevent native controls
    
    // Add event listeners for better debugging
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('[Media] Video loadedmetadata:', 
                    videoElement.videoWidth, 'x', videoElement.videoHeight);
    });
    
    videoElement.addEventListener('play', () => {
        console.log('[Media] Video started playing');
    });
    
    videoElement.addEventListener('pause', () => {
        console.log('[Media] Video paused');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('[Media] Video error:', e);
    });
}

// Export function to window
window.setupRemoteStream = setupRemoteStream;
window.startRemoteCanvasRendering = startRemoteCanvasRendering;
window.stopRemoteCanvasRendering = stopRemoteCanvasRendering;
window.initializeVideoElement = initializeVideoElement;
