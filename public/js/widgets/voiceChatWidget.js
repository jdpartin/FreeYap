class VoiceChatWidget
{    
    
    constructor(webRTCConnectionManager)
    {        
        this.webRTCConnectionManager = webRTCConnectionManager;
        const eventTypes = this.webRTCConnectionManager.EventTypes;

        this.eventTarget = new EventTarget();
        this.messageType = 'voice-chat';
        
        this.localStream = null;
        this.remoteStream = null;        

        this.muteAudioBtn = document.getElementById('mute-audio-btn');
        this.localAudioElement = document.getElementById('local-audio');
        this.remoteAudioElement = document.getElementById('remote-audio');        this.localAnalyzer = null;
        this.remoteAnalyzer = null;
        this.animationFrame = null;
        this.isAnalyzing = false;
        
        // Enhanced audio state tracking for smoother transitions
        this.localVolumeHistory = [];
        this.remoteVolumeHistory = [];
        this.localCurrentState = 'idle';
        this.remoteCurrentState = 'idle';
        this.stateTransitionBuffer = 8; // frames to smooth transitions
        this.volumeHistorySize = 10; // number of frames to keep in history
          // Make this widget instance available globally for other modules
        window.voiceChatWidget = this;

        // Initialize blob states to idle on page load
        this.#initializeBlobStates();

        this.webRTCConnectionManager.on(eventTypes.MATCH_FOUND, () =>
        {
            this.#handleMatchFound();
        });

        this.webRTCConnectionManager.on(eventTypes.PEER_CREATED, () =>
        {
            this.#handlePeerCreated();
        });
        
        this.webRTCConnectionManager.on(eventTypes.CONNECTION_READY, () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on(eventTypes.CONNECTION_CLOSED, () =>
        {
            this.#handleConnectionClosed();
        });

        this.#setupUIEventListeners();
        this.MediaInitialization = this.#initializeMedia();
    }    #initializeBlobStates() {
        // Initialize local blob to idle and remote blob to muted on page load
        setTimeout(() => {
            // Initialize with discrete states that will use CSS animations
            if (window.setLocalBlobState) window.setLocalBlobState('idle');
            if (window.setRemoteBlobState) window.setRemoteBlobState('muted');
        }, 100); // Small delay to ensure DOM is ready
    }

    #handleMatchFound()
    {
        this.webRTCConnectionManager.stream = this.localStream;
    }

    #handlePeerCreated()
    {
        let peer = this.webRTCConnectionManager.GetPeer();        peer.on('stream', (stream) =>
        {
            this.remoteStream = stream;

            if ('srcObject' in this.remoteAudioElement)
            {
                this.remoteAudioElement.srcObject = stream;
            }
            else
            {
                this.remoteAudioElement.src = window.URL.createObjectURL(stream); // for older browsers
            }            this.remoteAnalyzer = this.#createAudioAnalyzer(stream);
            
            // Initialize remote blob to breathing state when peer connects
            // This uses CSS animation until audio analysis detects sound
            if (window.setRemoteBlobState) window.setRemoteBlobState('breathing');
        });
    }
      async #initializeMedia()
    {
        try
        {
            // voice chat keeps audio bitrate limit all the time even off turn       
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    bitrate: { ideal: 128000, max: 256000 } // 128kbps ideal, 256kbps max
                }
            });            
            
            if ('srcObject' in this.localAudioElement)
            {
                this.localAudioElement.srcObject = this.localStream;
            }
            else
            {
                this.localAudioElement.src = window.URL.createObjectURL(this.localStream); // for older browsers
            }            this.localAnalyzer = this.#createAudioAnalyzer(this.localStream);
            
            // Start local audio analysis immediately when media is ready
            this.#startLocalAudioAnalysis();

            return true;
        }        
        catch (error)
        {
            console.error('VoiceChat: Failed to initialize media:', error);
            this.webRTCConnectionManager.ReportError('<i class="fas fa-exclamation-triangle"></i> Microphone access denied.');
            return false;
        }
    }    async #handleConnectionReady()
    {
        // Ensure media is initialized before setting up voice transmission
        await this.MediaInitialization;

        this.muteAudioBtn.disabled = false;

        // Stop local-only analysis and upgrade to full audio analysis (local + remote)
        this.#stopAudioAnalysis();
        this.#startAudioAnalysis();
    }    #handleConnectionClosed()
    {
        this.remoteStream = null;
        this.remoteAudioElement.srcObject = null;

        // Stop audio analysis and cleanup
        this.#stopAudioAnalysis();
        this.remoteAnalyzer = null;
          // Reset blobs to appropriate states and clear any morphing styles
        // Use discrete states which will trigger CSS animations
        if (window.setLocalBlobState) window.setLocalBlobState('idle');
        if (window.setRemoteBlobState) window.setRemoteBlobState('muted');
        
        // Clear any inline morphing styles
        const localBlob = document.querySelector('.local-blob');
        const remoteBlob = document.querySelector('.remote-blob');
        const localContainer = localBlob?.closest('.blob-container');
        const remoteContainer = remoteBlob?.closest('.blob-container');
        
        if (localBlob) {
            localBlob.style.transform = '';
            localBlob.style.borderRadius = '';
            localBlob.style.opacity = '';
            localBlob.style.boxShadow = '';
        }
        if (remoteBlob) {
            remoteBlob.style.transform = '';
            remoteBlob.style.borderRadius = '';
            remoteBlob.style.opacity = '';
            remoteBlob.style.boxShadow = '';
        }
        if (localContainer) {
            localContainer.style.removeProperty('--shadow-width');
            localContainer.style.removeProperty('--shadow-height');
            localContainer.style.removeProperty('--shadow-opacity');
        }
        if (remoteContainer) {
            remoteContainer.style.removeProperty('--shadow-width');
            remoteContainer.style.removeProperty('--shadow-height');
            remoteContainer.style.removeProperty('--shadow-opacity');
        }
    }
      #toggleAudio(mute)
    {
        const audioTracks = this.localStream.getAudioTracks();

        if (audioTracks.length > 0)
        {
            audioTracks.forEach(track =>
            {
                track.enabled = !mute;
            });            // Update local blob state based on mute status
            if (mute) {
                // When muted, use discrete state system for CSS animation
                if (window.setLocalBlobState) {
                    window.setLocalBlobState('muted');
                }
            } else {
                // When unmuted, start with idle state, let audio analysis take over
                if (window.setLocalBlobState) {
                    window.setLocalBlobState('idle');
                }
            }
            
            return true;
        }
        return false;
    }#createAudioAnalyzer(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        // Enhanced settings for more sensitive audio detection
        analyser.fftSize = 512; // Increased for better frequency resolution
        analyser.smoothingTimeConstant = 0.6; // Reduced for faster response
        analyser.minDecibels = -85; // Lower threshold for quiet sounds
        analyser.maxDecibels = -10; // Higher threshold for loud sounds
        
        source.connect(analyser);
        
        return {
            analyser,
            audioContext,
            dataArray: new Uint8Array(analyser.frequencyBinCount)
        };
    }#getVolumeLevel(analyzer) {
        analyzer.analyser.getByteFrequencyData(analyzer.dataArray);
        
        // Calculate multiple audio metrics for more sensitive detection
        let sum = 0;
        let lowFreqSum = 0;  // 0-85Hz (bass/low voice)
        let midFreqSum = 0;  // 85-340Hz (vocal range)
        let highFreqSum = 0; // 340Hz+ (consonants/high voice)
        
        const lowEnd = Math.floor(analyzer.dataArray.length * 0.1);
        const midEnd = Math.floor(analyzer.dataArray.length * 0.4);
        
        for (let i = 0; i < analyzer.dataArray.length; i++) {
            const value = analyzer.dataArray[i];
            sum += value;
            
            if (i < lowEnd) {
                lowFreqSum += value;
            } else if (i < midEnd) {
                midFreqSum += value;
            } else {
                highFreqSum += value;
            }
        }
        
        // Calculate weighted average with emphasis on vocal frequencies
        const lowAvg = lowFreqSum / lowEnd;
        const midAvg = midFreqSum / (midEnd - lowEnd);
        const highAvg = highFreqSum / (analyzer.dataArray.length - midEnd);
        
        // Weight vocal frequencies more heavily
        const weightedVolume = (lowAvg * 0.3 + midAvg * 0.5 + highAvg * 0.2);
        const overallVolume = (sum / analyzer.dataArray.length);
        
        // Combine weighted and overall for final volume
        const volume = ((weightedVolume * 0.7) + (overallVolume * 0.3)) / 255 * 100;
        
        return {
            volume: volume,
            lowFreq: lowAvg / 255 * 100,
            midFreq: midAvg / 255 * 100,
            highFreq: highAvg / 255 * 100
        };
    }

    #getSmoothedAudioState(volumeData, isLocal = true) {
        const history = isLocal ? this.localVolumeHistory : this.remoteVolumeHistory;
        const currentState = isLocal ? this.localCurrentState : this.remoteCurrentState;
        
        // Add current volume to history
        history.push(volumeData);
        if (history.length > this.volumeHistorySize) {
            history.shift();
        }
        
        // Calculate moving averages for smoother detection
        const recentFrames = Math.min(5, history.length);
        const recentHistory = history.slice(-recentFrames);
        
        const avgVolume = recentHistory.reduce((sum, data) => sum + data.volume, 0) / recentHistory.length;
        const avgMidFreq = recentHistory.reduce((sum, data) => sum + data.midFreq, 0) / recentHistory.length;
        
        // Enhanced thresholds with hysteresis to prevent jittery transitions
        let newState;
        
        // More sensitive thresholds
        if (avgVolume < 1.5 && avgMidFreq < 2) {
            newState = 'idle';
        } else if (avgVolume < 4 && avgMidFreq < 6) {
            newState = 'breathing';
        } else if (avgVolume < 12 && avgMidFreq < 15) {
            newState = 'whisper';
        } else if (avgVolume < 25 && avgMidFreq < 30) {
            newState = 'speaking-soft';
        } else if (avgVolume < 45) {
            newState = 'speaking';
        } else {
            newState = 'speaking-loud';
        }
        
        // Apply hysteresis - require sustained level change to switch states
        if (newState !== currentState) {
            // Count how many recent frames support the new state
            let supportingFrames = 0;
            for (let i = Math.max(0, history.length - this.stateTransitionBuffer); i < history.length; i++) {
                const frameData = history[i];
                const frameVolume = frameData.volume;
                
                let frameState;
                if (frameVolume < 1.5) frameState = 'idle';
                else if (frameVolume < 4) frameState = 'breathing';
                else if (frameVolume < 12) frameState = 'whisper';
                else if (frameVolume < 25) frameState = 'speaking-soft';
                else if (frameVolume < 45) frameState = 'speaking';
                else frameState = 'speaking-loud';
                
                if (frameState === newState) supportingFrames++;
            }
            
            // Only change state if enough frames support it
            const requiredFrames = Math.ceil(this.stateTransitionBuffer * 0.6);
            if (supportingFrames >= requiredFrames) {
                if (isLocal) {
                    this.localCurrentState = newState;
                } else {
                    this.remoteCurrentState = newState;
                }
                return newState;
            } else {
                // Not enough support, keep current state
                return currentState;
            }
        }
          return currentState;
    }    #startLocalAudioAnalysis() {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;
        
        const analyzeLocalAudio = () => {
            if (!this.isAnalyzing) return;
            
            // Analyze local audio only
            if (this.localAnalyzer && this.localStream) {
                const volumeData = this.#getVolumeLevel(this.localAnalyzer);
                // Use proportional morphing instead of discrete states
                if (window.setLocalBlobMorphing) {
                    window.setLocalBlobMorphing(volumeData);
                }
            }
            
            this.animationFrame = requestAnimationFrame(analyzeLocalAudio);
        };
        
        analyzeLocalAudio();
    }#startAudioAnalysis() {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;
        
        const analyzeAudio = () => {
            if (!this.isAnalyzing) return;
            
            // Analyze local audio
            if (this.localAnalyzer && this.localStream) {
                const volumeData = this.#getVolumeLevel(this.localAnalyzer);
                // Use proportional morphing instead of discrete states
                if (window.setLocalBlobMorphing) {
                    window.setLocalBlobMorphing(volumeData);
                }
            }
            
            // Analyze remote audio
            if (this.remoteAnalyzer && this.remoteStream) {
                const volumeData = this.#getVolumeLevel(this.remoteAnalyzer);
                // Use proportional morphing instead of discrete states
                if (window.setRemoteBlobMorphing) {
                    window.setRemoteBlobMorphing(volumeData);
                }
            }
            
            this.animationFrame = requestAnimationFrame(analyzeAudio);
        };
        
        analyzeAudio();
    }

    #stopAudioAnalysis() {
        this.isAnalyzing = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
      
    #setupUIEventListeners()
    {
        this.muteAudioBtn.addEventListener('click', () =>
        {
            const isCurrentlyMuted = this.muteAudioBtn.innerHTML.includes('slash');

            const success = this.#toggleAudio(!isCurrentlyMuted);

            this.muteAudioBtn.innerHTML = isCurrentlyMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';

            if (success)
            {
                this.muteAudioBtn.innerHTML = isCurrentlyMuted ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
            }
        });
    }    
}

/****** Blob Animation Functions ******/

// Blob shadow management functions
function updateBlobShadow(blobContainer, state) {
    if (!blobContainer) return;
    
    // Remove all shadow state classes
    blobContainer.classList.remove('speaking', 'breathing', 'whisper', 'speaking-soft', 'speaking-loud');
    
    // Add the appropriate state class
    if (state === 'speaking' || state === 'whisper' || state === 'speaking-soft' || state === 'speaking-loud') {
        blobContainer.classList.add(state);
    } else if (state === 'idle' || state === 'breathing') {
        blobContainer.classList.add('breathing');
    }
    // Note: muted state doesn't get a shadow animation
}

// Function to set local blob state
function setLocalBlobState(state) {
    const localBlob = document.querySelector('.local-blob');
    const localContainer = localBlob?.closest('.blob-container');
    
    if (localBlob && localContainer) {
        updateBlobShadow(localContainer, state);
        
        // Remove all state classes
        localBlob.classList.remove('speaking', 'whisper', 'speaking-soft', 'speaking-loud', 'muted', 'idle');
        
        // Add appropriate state class
        if (state === 'speaking' || state === 'whisper' || state === 'speaking-soft' || state === 'speaking-loud') {
            localBlob.classList.add(state);
        } else if (state === 'muted') {
            localBlob.classList.add('muted');
        } else if (state === 'idle') {
            localBlob.classList.add('idle');
        }
    }
}

// Function to set remote blob state
function setRemoteBlobState(state) {
    const remoteBlob = document.querySelector('.remote-blob');
    const remoteContainer = remoteBlob?.closest('.blob-container');
    
    if (remoteBlob && remoteContainer) {
        updateBlobShadow(remoteContainer, state);
        
        // Remove all state classes
        remoteBlob.classList.remove('speaking', 'whisper', 'speaking-soft', 'speaking-loud', 'muted', 'idle');
        
        // Add appropriate state class
        if (state === 'speaking' || state === 'whisper' || state === 'speaking-soft' || state === 'speaking-loud') {
            remoteBlob.classList.add(state);
        } else if (state === 'muted') {
            remoteBlob.classList.add('muted');
        } else if (state === 'idle') {
            remoteBlob.classList.add('idle');
        }
    }
}

// New proportional morphing functions for continuous blob animation
function setLocalBlobMorphing(volumeData) {
    const localBlob = document.querySelector('.local-blob');
    const localContainer = localBlob?.closest('.blob-container');
    
    if (localBlob && localContainer) {
        applyProportionalMorphing(localBlob, localContainer, volumeData);
    }
}

function setRemoteBlobMorphing(volumeData) {
    const remoteBlob = document.querySelector('.remote-blob');
    const remoteContainer = remoteBlob?.closest('.blob-container');
    
    if (remoteBlob && remoteContainer) {
        applyProportionalMorphing(remoteBlob, remoteContainer, volumeData);
    }
}

// Apply proportional morphing based on volume levels
function applyProportionalMorphing(blob, container, volumeData) {
    if (!blob || !container || !volumeData) {
        console.log('ApplyProportionalMorphing: Missing parameters', { blob: !!blob, container: !!container, volumeData: !!volumeData });
        return;
    }
    
    const { volume, midFreq } = volumeData;
    
    // Debug logging every 30 frames to avoid spam
    if (Math.random() < 0.03) {
        console.log('Blob morphing data:', { volume, midFreq, blobClass: blob.className });
    }
    
    // Check if the blob is muted and skip morphing
    if (blob.classList.contains('muted')) {
        console.log('Blob is muted, skipping morphing');
        return;
    }
      // Always use continuous morphing with speed proportional to volume
    // Clear discrete animation classes but keep idle for morphing
    blob.classList.remove('speaking', 'whisper', 'speaking-soft', 'speaking-loud');
    
    // Ensure idle class is present for CSS morphing animation
    if (!blob.classList.contains('idle')) {
        blob.classList.add('idle');
    }
      // Calculate animation speed based on volume (using playback rate to avoid restarting animation)
    const basePlaybackRate = 1; // Normal speed for idle (4s total)
    const maxPlaybackRate = 5; // 5x faster for high volume (0.8s effective duration)
    const volumeNormalized = Math.min(volume / 30, 1); // Normalize volume to 0-1
    const currentPlaybackRate = basePlaybackRate + (maxPlaybackRate - basePlaybackRate) * volumeNormalized;
    
    // Apply dynamic playback rate to speed up/slow down without restarting animation
    const animations = blob.getAnimations();
    animations.forEach(animation => {
        if (animation.animationName === 'premiumIdleBreathe') {
            animation.playbackRate = currentPlaybackRate;
        }
    });
    
    // Calculate proportional scale based on volume  
    // Base scale: 1.0, max scale: 1.3 for very loud sounds
    const baseScale = 1.0;
    const maxScale = 1.3;
    const volumeScale = Math.min(volume / 50, 1); // Normalize to 0-1 range
    const currentScale = baseScale + (maxScale - baseScale) * volumeScale;
    
    // Calculate proportional translation (floating effect)
    const maxTranslateY = -8; // pixels
    const currentTranslateY = maxTranslateY * volumeScale;
      // Add time-based morphing for continuous animation even at idle
    const time = Date.now() * 0.001; // Convert to seconds
    
    // Calculate proportional border-radius morphing with time-based animation
    // This will work alongside the CSS animation for enhanced morphing
    const baseBorderRadius = [58, 42, 35, 65, 55, 45, 65, 35];
    const morphIntensity = Math.min(volumeScale * 0.3, 0.2); // Subtle additional morphing
    const morphedBorderRadius = baseBorderRadius.map((value, index) => {
        const timeVariation = Math.sin(time * (1 + index * 0.1)) * morphIntensity * 8;
        return Math.max(30, Math.min(70, value + timeVariation));
    });
    
    // Only apply border-radius if there's significant volume to enhance the CSS animation
    if (volumeScale > 0.1) {
        blob.style.borderRadius = `${morphedBorderRadius[0]}% ${morphedBorderRadius[1]}% ${morphedBorderRadius[2]}% ${morphedBorderRadius[3]}% / ${morphedBorderRadius[4]}% ${morphedBorderRadius[5]}% ${morphedBorderRadius[6]}% ${morphedBorderRadius[7]}%`;
    } else {
        // Let CSS animation handle border-radius for idle state
        blob.style.borderRadius = '';
    }    // Apply the transforms smoothly with variable speed
    blob.style.transition = `transform 0.2s ease-out`;
    blob.style.transform = `scale(${currentScale}) translateY(${currentTranslateY}px)`;
    
    // Update container shadow proportionally
    updateProportionalShadow(container, volumeScale);
}

// Update shadow proportionally
function updateProportionalShadow(container, volumeScale) {
    if (!container) return;
    
    // Calculate shadow dimensions and opacity based on volume
    const baseShadowWidth = 70;
    const baseShadowHeight = 20;
    const maxShadowWidth = 95;
    const maxShadowHeight = 30;
    
    const currentShadowWidth = baseShadowWidth + (maxShadowWidth - baseShadowWidth) * volumeScale;
    const currentShadowHeight = baseShadowHeight + (maxShadowHeight - baseShadowHeight) * volumeScale;
    const baseShadowOpacity = 0.15; // Minimum shadow opacity for idle
    const shadowOpacity = baseShadowOpacity + (volumeScale * 0.65); // 0.15 to 0.8
    
    // Apply shadow styling
    container.style.setProperty('--shadow-width', `${currentShadowWidth}px`);
    container.style.setProperty('--shadow-height', `${currentShadowHeight}px`);
    container.style.setProperty('--shadow-opacity', shadowOpacity);
}

// Export functions for use by other modules
window.setLocalBlobState = setLocalBlobState;
window.setRemoteBlobState = setRemoteBlobState;
window.setLocalBlobMorphing = setLocalBlobMorphing;
window.setRemoteBlobMorphing = setRemoteBlobMorphing;

/****** Page JS ******/

document.addEventListener('DOMContentLoaded', function() {
// Handle effect menus
const effectMenus = document.querySelectorAll('.effect-menu');
const effectButtons = document.querySelectorAll('.effect-btn');
const closeMenuBtns = document.querySelectorAll('.close-menu-btn');

// Function to close all menus
function closeAllMenus() {
    effectMenus.forEach(menu => {
        menu.classList.remove('active');
    });
    
    effectButtons.forEach(btn => {
        btn.classList.remove('active');
    });
}

// Close menus when clicking outside
document.addEventListener('click', function(e) {
    const isMenuClick = e.target.closest('.effect-menu');
    const isEffectBtnClick = e.target.closest('.effect-btn');
    
    if (!isMenuClick && !isEffectBtnClick) {
        closeAllMenus();
    }
});

// Close button functionality
closeMenuBtns.forEach(btn => {
    btn.addEventListener('click', closeAllMenus);
});

// Effect option selection
const effectOptions = document.querySelectorAll('.effect-option');

effectOptions.forEach(option => {
    option.addEventListener('click', function() {
        const effectType = this.getAttribute('data-effect');
        const categoryContainer = this.closest('.effect-category');
        
        // Remove active class from siblings
        const siblings = categoryContainer.querySelectorAll('.effect-option');
        siblings.forEach(sibling => sibling.classList.remove('active'));
        
        // Add active class to selected option
        this.classList.add('active');
        
        // Show a visual indicator that the effect was applied
        const notification = document.createElement('div');
        notification.classList.add('toast', 'show', 'position-fixed', 'bottom-0', 'end-0', 'm-3');
        notification.style.zIndex = '1000';
        notification.style.backgroundColor = 'rgba(0,0,0,0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.innerHTML = `<div class="toast-body">Applied: ${effectType} voice effect</div>`;
        document.body.appendChild(notification);
        
        // Remove the notification after 2 seconds
        setTimeout(() => {
            notification.remove();
        }, 2000);
        
        // Apply the effect (placeholder for actual implementation)
        console.log(`Applying ${effectType} voice effect`);
        
        // Here you would call the actual function to apply the selected voice effect
    });
});

// Voice effect button functionality
effectButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Get the effect type from the button's title attribute
        const effectType = this.getAttribute('title');
        
        // Position the menu relative to the button
        const buttonRect = this.getBoundingClientRect();
        const effectMenusContainer = document.getElementById('effect-menus-container');
        
        // Update the position to be above the button
        effectMenusContainer.style.position = 'absolute';
        effectMenusContainer.style.bottom = '80px'; // Position above the bottom bar
        
        // Toggle active state for the clicked button
        this.classList.toggle('active');
        
        // Determine which menu to show
        let targetMenu;
        if (effectType === 'Voice Effects') {
            targetMenu = document.getElementById('voice-effects-menu');
        }
        
        // Close all menus
        effectMenus.forEach(menu => {
            menu.classList.remove('active');
        });
        
        // Toggle the target menu
        if (targetMenu) {
            targetMenu.classList.toggle('active');
            
            // Add a subtle animation effect
            targetMenu.style.animation = 'none';
            setTimeout(() => {
                targetMenu.style.animation = 'slideUp 0.3s ease';
            }, 10);
        }
        
        console.log(`${effectType} menu toggled`);
    });
});

const localWave = document.getElementById('local-wave');

// Settings button functionality - show a dropdown menu with options
const settingsBtn = document.getElementById('settings-btn');

settingsBtn.addEventListener('click', function() {
    // Create settings dropdown if it doesn't exist yet
    let settingsMenu = document.getElementById('settings-dropdown');
    
    if (!settingsMenu) {
        settingsMenu = document.createElement('div');
        settingsMenu.id = 'settings-dropdown';
        settingsMenu.classList.add('settings-dropdown', 'position-absolute', 'bg-white', 'p-2', 'rounded', 'shadow');
        settingsMenu.style.width = '200px';
        settingsMenu.style.right = '10px';
        settingsMenu.style.top = '60px';
        settingsMenu.style.zIndex = '100';
        
        settingsMenu.innerHTML = `
            <h6 class="dropdown-header border-bottom pb-2 mb-2">Audio Settings</h6>
            <div class="mb-3">
                <label for="microphoneSelect" class="form-label">Microphone</label>
                <select class="form-select form-select-sm" id="microphoneSelect">
                    <option selected>Default microphone</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="speakerSelect" class="form-label">Speaker</label>
                <select class="form-select form-select-sm" id="speakerSelect">
                    <option selected>Default speaker</option>
                </select>
            </div>
            <div class="mb-2">
                <label for="volumeControl" class="form-label">Volume</label>
                <input type="range" class="form-range" id="volumeControl" min="0" max="100" step="1" value="100">
            </div>
            <button class="btn btn-sm btn-primary w-100">Apply Settings</button>
        `;
        
        document.getElementById('voice-controls').appendChild(settingsMenu);
    } else {
        // Toggle visibility
        if (settingsMenu.style.display === 'none' || !settingsMenu.style.display) {
            settingsMenu.style.display = 'block';
        } else {
            settingsMenu.style.display = 'none';
        }
    }
    
    // Close settings menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closeSettings(e) {
            if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
                settingsMenu.style.display = 'none';
                document.removeEventListener('click', closeSettings);
            }
        });
    }, 0);      console.log('Settings button clicked');
});

});