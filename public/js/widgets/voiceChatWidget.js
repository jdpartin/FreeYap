class VoiceChatWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.eventTarget = new EventTarget();
        this.messageType = 'voice-chat';
        
        this.localStream = null;
        this.remoteStream = null;        

        this.muteAudioBtn = document.getElementById('mute-audio-btn');
        this.localAudioElement = document.getElementById('local-audio');
        this.remoteAudioElement = document.getElementById('remote-audio');
        
        // Make this widget instance available globally for other modules
        window.voiceChatWidget = this;

        this.webRTCConnectionManager.on('matchFound', () =>
        {
            this.#handleMatchFound();
        });
        
        this.webRTCConnectionManager.on('connectionReady', () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on('connectionClosed', () =>
        {
            this.#handleConnectionClosed();
        });

        this.#setupUIEventListeners();
        this.MediaInitialization = this.#initializeMedia();
    }

    #handleMatchFound()
    {
        let peer = this.webRTCConnectionManager.GetPeer();

        peer.on('stream', (stream) =>
        {
            this.remoteStream = stream;
            this.remoteAudioElement.srcObject = this.remoteStream;
        });
    }
    
    async #initializeMedia()
    {
        try
        {            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });            
            
            this.localAudioElement.srcObject = this.localStream;

            return true;
        }
        catch (error)
        {
            console.error('VoiceChat: Failed to initialize media:', error);
            return false;
        }
    }

    async #handleConnectionReady()
    {
        // Ensure media is initialized before setting up voice transmission
        await this.MediaInitialization;
        
        this.#startVoiceTransmission();

        this.muteAudioBtn.disabled = false;
    }

    #handleConnectionClosed()
    {
        this.remoteStream = null;
        this.remoteAudioElement.srcObject = null;
    }
    
    #startVoiceTransmission()
    {
        try 
        {
            let peer = this.webRTCConnectionManager.GetPeer();

            // AI keeps changing this back to the wrong method
            // peer.addStream(this.localStream); is INCORRECT
            // The correct method is peer.emit('stream', this.localStream);
            // This is why the AI instructions explicitly state to not modify undrelated code when making changes
            peer.emit('stream', this.localStream);
        }
        catch (error)
        {
            console.error('VoiceChat: Failed to add local stream to peer:', error);
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
            });
            
            return true;
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