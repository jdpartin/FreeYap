class VoiceChatWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.eventTarget = new EventTarget();
        this.messageType = 'voice-chat';
        
        this.localStream = null;
        this.remoteStream = null;        this.muteAudioBtn = document.getElementById('mute-audio-btn');
        this.localAudioElement = document.getElementById('local-audio');
        this.remoteAudioElement = document.getElementById('remote-audio');

        // Audio analysis properties
        this.audioContext = null;
        this.localAnalyser = null;
        this.remoteAnalyser = null;
        this.localIconContainer = null;
        this.remoteIconContainer = null;
        this.volumeAnalysisActive = false;        // Make this widget instance available globally for other modules
        window.voiceChatWidget = this;
        
        // Dispatch an event when the widget is initialized
        document.dispatchEvent(new Event('voiceChatWidgetInitialized'));
        
        // Ensure local audio stays muted to prevent feedback
        this.#enforceLocalAudioMuted();
        
        this.webRTCConnectionManager.on('connectionReady', () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on('connectionClosed', () =>
        {
            this.#handleConnectionClosed();
        });

        this.#setupUIEventListeners();
        this.#setupAudioIconContainers();
        this.MediaInitialization = this.#initializeMedia();
    }    
    
    async #initializeMedia()
    {
        try
        {            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });            // Assign local stream to local audio element and ensure it's muted
            if (this.localAudioElement) {
                this.localAudioElement.srcObject = this.localStream;
                this.localAudioElement.muted = true; // Critical: Prevent feedback
                console.log('VoiceChat: Local audio element configured with muted stream to prevent feedback');
            }

            // Initialize audio analysis after getting the stream
            this.#initializeAudioAnalysis();

            return true;
        }
        catch (error)
        {
            console.error('VoiceChat: Failed to initialize media:', error);
            return false;
        }
    }

    #setupAudioIconContainers()
    {
        // Get references to the audio icon containers
        const audioWrappers = document.querySelectorAll('.audio-wrapper');
        if (audioWrappers.length >= 2)
        {
            this.localIconContainer = audioWrappers[0].querySelector('.audio-icon-container');
            this.remoteIconContainer = audioWrappers[1].querySelector('.audio-icon-container');
        }
    }    #initializeAudioAnalysis()
    {
        try
        {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Set up local audio analysis
            if (this.localStream)
            {
                const localSource = this.audioContext.createMediaStreamSource(this.localStream);
                this.localAnalyser = this.audioContext.createAnalyser();
                this.localAnalyser.fftSize = 256;
                
                // CRITICAL: Only connect to analyser, NOT to destination to prevent feedback
                localSource.connect(this.localAnalyser);
                // DO NOT connect to this.audioContext.destination - this would cause feedback!
                
                // Start volume analysis
                this.volumeAnalysisActive = true;
                this.#analyzeVolume();
            }
        }
        catch (error)
        {
            console.error('VoiceChat: Failed to initialize audio analysis:', error);
        }
    }

    #analyzeVolume()
    {
        if (!this.volumeAnalysisActive || !this.localAnalyser)
        {
            return;
        }

        const bufferLength = this.localAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () =>
        {
            if (!this.volumeAnalysisActive)
            {
                return;
            }

            this.localAnalyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++)
            {
                sum += dataArray[i];
            }
            const averageVolume = sum / bufferLength;
            
            // Update local icon based on volume
            this.#updateVolumeVisualization(this.localIconContainer, averageVolume);

            // Continue analysis
            requestAnimationFrame(checkVolume);
        };

        checkVolume();
    }

    #updateVolumeVisualization(iconContainer, volume)
    {
        if (!iconContainer)
        {
            return;
        }

        // Remove all volume classes
        iconContainer.classList.remove('volume-silent', 'volume-low', 'volume-medium', 'volume-high', 'volume-peak');

        // Determine volume level and apply appropriate class
        if (volume < 5)
        {
            iconContainer.classList.add('volume-silent');
        }
        else if (volume < 15)
        {
            iconContainer.classList.add('volume-low');
        }
        else if (volume < 30)
        {
            iconContainer.classList.add('volume-medium');
        }
        else if (volume < 50)
        {
            iconContainer.classList.add('volume-high');
        }
        else
        {
            iconContainer.classList.add('volume-peak');
        }
    }    
    
    #handleConnectionReady()
    {
        let peer = this.webRTCConnectionManager.GetPeer();

        this.#setupVoiceChannel(peer);
        this.#startVoiceTransmission(peer);

        this.muteAudioBtn.disabled = false;
    }

    #handleConnectionClosed()
    {
        this.remoteStream = null;

        // Stop volume analysis
        this.volumeAnalysisActive = false;

        // Reset volume visualizations
        if (this.localIconContainer)
        {
            this.localIconContainer.classList.remove('volume-silent', 'volume-low', 'volume-medium', 'volume-high', 'volume-peak');
        }
        if (this.remoteIconContainer)
        {
            this.remoteIconContainer.classList.remove('volume-silent', 'volume-low', 'volume-medium', 'volume-high', 'volume-peak');
        }        // Stop local audio tracks
        if (this.localStream)
        {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Clear local audio element
        if (this.localAudioElement)
        {
            this.localAudioElement.srcObject = null;
            this.localAudioElement.muted = true; // Ensure it stays muted
        }
    }

    #setupVoiceChannel(peer)
    {
        peer.on('stream', (stream) =>
        {
            this.remoteStream = stream;
            this.remoteAudioElement.srcObject = stream;
            
            // Set up remote audio analysis
            this.#setupRemoteAudioAnalysis(stream);
        });
    }    #setupRemoteAudioAnalysis(stream)
    {
        try
        {
            if (this.audioContext && stream)
            {
                const remoteSource = this.audioContext.createMediaStreamSource(stream);
                this.remoteAnalyser = this.audioContext.createAnalyser();
                this.remoteAnalyser.fftSize = 256;
                
                // CRITICAL: Only connect to analyser, NOT to destination
                remoteSource.connect(this.remoteAnalyser);
                // DO NOT connect to this.audioContext.destination
                
                // Start remote volume analysis
                this.#analyzeRemoteVolume();
            }
        }
        catch (error)
        {
            console.error('VoiceChat: Failed to set up remote audio analysis:', error);
        }
    }

    #analyzeRemoteVolume()
    {
        if (!this.volumeAnalysisActive || !this.remoteAnalyser)
        {
            return;
        }

        const bufferLength = this.remoteAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkRemoteVolume = () =>
        {
            if (!this.volumeAnalysisActive || !this.remoteAnalyser)
            {
                return;
            }

            this.remoteAnalyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++)
            {
                sum += dataArray[i];
            }
            const averageVolume = sum / bufferLength;
            
            // Update remote icon based on volume
            this.#updateVolumeVisualization(this.remoteIconContainer, averageVolume);

            // Continue analysis
            requestAnimationFrame(checkRemoteVolume);
        };

        checkRemoteVolume();
    }

    #startVoiceTransmission(peer)
    {
        peer.emit('stream', this.localStream);
    }    
    
    #toggleAudio(mute)
    {
        if (this.localStream)
        {
            const audioTracks = this.localStream.getAudioTracks();

            if (audioTracks.length > 0)
            {
                audioTracks.forEach(track =>
                {
                    track.enabled = !mute;
                });
                
                // Update local icon visual state
                if (this.localIconContainer)
                {
                    if (mute)
                    {
                        this.localIconContainer.classList.add('muted');
                        this.localIconContainer.classList.remove('volume-silent', 'volume-low', 'volume-medium', 'volume-high', 'volume-peak');
                    }
                    else
                    {
                        this.localIconContainer.classList.remove('muted');
                    }
                }
                
                return true;
            }
        }

        return false;
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
    }    #enforceLocalAudioMuted()
    {
        if (this.localAudioElement)
        {
            // Set initial muted state
            this.localAudioElement.muted = true;
            
            // Add event listener to prevent unmuting
            this.localAudioElement.addEventListener('volumechange', () =>
            {
                if (!this.localAudioElement.muted)
                {
                    console.warn('VoiceChat: Preventing local audio unmute to avoid feedback');
                    this.localAudioElement.muted = true;
                }
            });
            
            // Periodically check and enforce muted state
            setInterval(() =>
            {
                if (this.localAudioElement && !this.localAudioElement.muted)
                {
                    console.warn('VoiceChat: Re-enforcing local audio muted state');
                    this.localAudioElement.muted = true;
                }
            }, 1000); // Check every second
        }
    }

    // Cleanup method for proper resource management
    destroy()
    {
        this.volumeAnalysisActive = false;
        
        if (this.audioContext && this.audioContext.state !== 'closed')
        {
            this.audioContext.close();
        }
        
        if (this.localStream)
        {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // Clear audio elements
        if (this.localAudioElement)
        {
            this.localAudioElement.srcObject = null;
            this.localAudioElement.muted = true;
        }
        
        if (this.remoteAudioElement)
        {
            this.remoteAudioElement.srcObject = null;
        }
    }
}



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
    }, 0);
    
    console.log('Settings button clicked');
});
});