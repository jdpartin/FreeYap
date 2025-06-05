class VideoChatWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        // There is a vibe check widget in the video chat widget
        this.vibeCheckWidget = new VibeCheckWidget(webRTCConnectionManager);

        this.eventTarget = new EventTarget();
        this.messageType = 'video-chat';
        
        this.localStream = null;
        this.remoteStream = null;

        this.localVideoElement = document.getElementById('local-video');
        this.remoteVideoElement = document.getElementById('remote-video');

        this.muteVideoBtn = document.getElementById('mute-video-btn');
        this.muteAudioBtn = document.getElementById('mute-audio-btn');

        // Make this widget instance available globally for other modules
        window.videoChatWidget = this;

        const eventTypes = this.webRTCConnectionManager.EventTypes;

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
    }    
    
    async #initializeMedia()
    {
        try
        {
            // Initialize video elements with mobile-friendly attributes
            this.#initializeVideoElement(this.localVideoElement);
            this.#initializeVideoElement(this.remoteVideoElement);
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                    bitrate: { ideal: 1500000, max: 2500000 } // 1.5Mbps ideal, 2.5Mbps max
                },
                audio: {
                    bitrate: { ideal: 128000, max: 256000 } // 128kbps ideal, 256kbps max
                }
            });

            if ('srcObject' in this.localVideoElement) 
            {
                this.localVideoElement.srcObject = this.localStream;
            } 
            else 
            {
                this.localVideoElement.src = window.URL.createObjectURL(this.localStream);
            }
            
            return true;
        }
        catch (error)
        {
            console.error('VideoChat: Failed to initialize media:', error);
            this.webRTCConnectionManager.ReportError('<i class="fas fa-exclamation-triangle"></i> Camera and/or microphone access denied.');
            return false;
        }
    }
    
    async #handleConnectionReady()
    {
        await this.MediaInitialization;

        if (!this.webRTCConnectionManager.peerIsUsingTURN)
        {
            let peer = this.webRTCConnectionManager.GetPeer();

            const senders = peer.getSenders();
            
            for (const sender of senders)
            {
                if (sender.track)
                {
                    const params = sender.getParameters();
                    
                    if (params.encodings && params.encodings.length > 0)
                    {
                        params.encodings.forEach(encoding =>
                        {
                            delete encoding.maxBitrate;
                            
                            if (sender.track.kind === 'video')
                            {
                                delete encoding.maxFramerate;
                                encoding.scaleResolutionDownBy = 1;
                            }
                        });
                        
                        await sender.setParameters(params);
                    }
                }
            }
        }

        this.muteVideoBtn.disabled = false;
        this.muteAudioBtn.disabled = false;
    }

    async #handleConnectionClosed()
    {
        this.remoteStream = null;
        this.remoteVideoElement.srcObject = null;
        this.muteVideoBtn.disabled = true;
        this.muteAudioBtn.disabled = true;

        if (this.localStream)
        {
            const videoTracks = this.localStream.getVideoTracks();

            for (const track of videoTracks)
            {
                await track.applyConstraints({
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                    bitrate: { ideal: 1500000, max: 2500000 } // Reset to original 1.5Mbps ideal, 2.5Mbps max
                });
            }
        }
    }

    #toggleVideo(mute)
    {
        const videoTracks = this.localStream.getVideoTracks();

        if (videoTracks.length > 0)
        {
            videoTracks.forEach(track =>
            {
                track.enabled = !mute;
            });
            
            return true;
        }

        return false;
    }

    #handleMatchFound()
    {
        this.webRTCConnectionManager.stream = this.localStream;
    }

    #handlePeerCreated()
    {
        let peer = this.webRTCConnectionManager.GetPeer();

        peer.on('stream', stream =>
        {
            this.remoteStream = stream;

            if ('srcObject' in this.remoteVideoElement)
            {
                this.remoteVideoElement.srcObject = stream
            }
            else
            {
                this.remoteVideoElement.src = window.URL.createObjectURL(stream) // for older browsers
            }
        });
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
        this.muteVideoBtn.addEventListener('click', () =>
        {
            const isCurrentlyMuted = this.muteVideoBtn.innerHTML.includes('slash');

            const success = this.#toggleVideo(!isCurrentlyMuted);

            if (success)
            {
                this.muteVideoBtn.innerHTML = isCurrentlyMuted ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
            }
        });

        this.muteAudioBtn.addEventListener('click', () =>
        {
            const isCurrentlyMuted = this.muteAudioBtn.innerHTML.includes('slash');

            const success = this.#toggleAudio(!isCurrentlyMuted);

            if (success)
            {
                this.muteAudioBtn.innerHTML = isCurrentlyMuted ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
            }
        });
    }

    #initializeVideoElement(videoElement)
    {
        if (!videoElement) return;
        
        // Set attributes for mobile compatibility
        videoElement.playsInline = true; // Prevent fullscreen on iOS
        videoElement.setAttribute('webkit-playsinline', 'true'); // For older iOS devices
        videoElement.setAttribute('playsinline', 'true');
        videoElement.controls = false; // Hide native controls
        
        // For local video, keep it muted to prevent echo
        if (videoElement.id === 'local-video')
        {
            videoElement.muted = true;
            videoElement.setAttribute('muted', 'true');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
// Pre-calculate menu dimensions for proper positioning
const effectMenus = document.querySelectorAll('.effect-menu');
effectMenus.forEach(menu => {
    // Make the menu briefly visible to get dimensions
    menu.style.opacity = '0';
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    
    // Force layout calculation
    menu.offsetHeight;
    
    // Hide it again
    setTimeout(() => {
        menu.style.opacity = '';
        menu.style.display = '';
        menu.style.visibility = '';
    }, 10);
});

// Layout controls
const videoContainer = document.getElementById('video-container');
const layoutButtons = document.querySelectorAll('.layout-btn');

// Initialize with default layout
videoContainer.className = 'layout-default';
    layoutButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Remove active class from all buttons
        layoutButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Get previous layout type to clean up if needed
        const previousLayout = videoContainer.className.replace('layout-', '');
        
        // Apply layout
        const layoutType = this.getAttribute('data-layout');
        videoContainer.className = `layout-${layoutType}`;
        
        // Reset any existing styles when changing layouts
        const localWrapper = document.querySelector('.local-wrapper');            // Clean up previous layout
        if (previousLayout === 'pip') {
            // Remove any controls when leaving PiP mode
            const controls = localWrapper.querySelector('.pip-controls');
            if (controls) {
                controls.remove();
            }
            
            // Always remove the detached class when leaving PiP mode
            localWrapper.classList.remove('pip-detached');
            
            // Reset all position related styles
            localWrapper.style.top = "";
            localWrapper.style.left = "";
            localWrapper.style.right = "";
            localWrapper.style.bottom = "";
            localWrapper.classList.remove('minimized');
            
            // Remove any inline styles that might have been added during dragging
            localWrapper.style.position = "";
            localWrapper.style.transform = "";
            localWrapper.style.zIndex = "";
        }
        
        // Initialize PiP features if PiP layout is selected
        if (layoutType === 'pip') {
            initializePipFeatures();
        }
    });
});    // Function to initialize Picture-in-Picture features
function initializePipFeatures() {
    const localWrapper = document.querySelector('.local-wrapper');
    
    // Reset any previous positioning to ensure proper initial position
    localWrapper.style.top = "";
    localWrapper.style.left = "";
    localWrapper.style.right = "10px";
    localWrapper.style.bottom = "10px";
    
    // Remove any existing controls
    const existingControls = localWrapper.querySelector('.pip-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'pip-controls';
    
    // Add minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'pip-control-btn minimize-pip';
    minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
    minimizeBtn.title = 'Minimize';
    
    minimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        localWrapper.classList.toggle('minimized');
        this.innerHTML = localWrapper.classList.contains('minimized') ? 
            '<i class="fas fa-plus"></i>' : 
            '<i class="fas fa-minus"></i>';
        this.title = localWrapper.classList.contains('minimized') ? 
            'Maximize' : 'Minimize';
    });
    
    // Add controls to wrapper
    controlsContainer.appendChild(minimizeBtn);
    localWrapper.appendChild(controlsContainer);
    
    // Automatically detach the PiP
    // Give the layout a moment to stabilize before detaching
    setTimeout(() => {
        // Detach the PiP to window
        toggleDetachedMode(localWrapper, true);
        
        // Make the local video draggable after detaching
        makeDraggable(localWrapper);
    }, 100);
}
    // Function to toggle detached mode for PiP
function toggleDetachedMode(element, forceDetach = false) {
    const isDetached = element.classList.contains('pip-detached');
    
    // Only detach if not already detached or if forcing detach
    if (isDetached && !forceDetach) {
        // Reattach to container (should not happen now that we auto-detach)
        element.classList.remove('pip-detached');
        
        // Reset position to container
        element.style.right = "10px";
        element.style.bottom = "10px";
        element.style.top = "";
        element.style.left = "";
    } else if (!isDetached || forceDetach) {
        // Get current position and convert to viewport position
        const rect = element.getBoundingClientRect();
        
        // Apply fixed positioning
        element.classList.add('pip-detached');
        
        // Position at the same screen location but fixed
        element.style.top = rect.top + 'px';
        element.style.left = rect.left + 'px';
        element.style.right = "";
        element.style.bottom = "";
        
        // Default to bottom right if not previously positioned
        if (!element.style.top && !element.style.left) {
            element.style.bottom = '20px';
            element.style.right = '20px';
        }
    }
}// Function to make an element draggable
function makeDraggable(element) {
    // Store initial position and mouse offset
    let initialX, initialY, offsetX, offsetY;
    let isDragging = false;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        // Don't start drag if clicking on a control button
        if (e.target.closest('.pip-control-btn')) {
            return;
        }
        
        e = e || window.event;
        e.preventDefault();
        
        // Get the initial position of mouse relative to the element
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Store initial element position
        initialX = element.offsetLeft;
        initialY = element.offsetTop;
        
        // Start dragging
        isDragging = true;
        
        // Set up event listeners
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', closeDragElement);
    }
    
    function elementDrag(e) {
        e.preventDefault();
        
        if (isDragging) {
            // Check if element is detached
            const isDetached = element.classList.contains('pip-detached');
            
            // Calculate the new position directly from mouse position
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            
            if (isDetached) {
                // For detached mode, limit to viewport boundaries
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const elementRect = element.getBoundingClientRect();
                
                // Limit to viewport boundaries
                newLeft = Math.max(0, Math.min(newLeft, viewportWidth - elementRect.width));
                newTop = Math.max(0, Math.min(newTop, viewportHeight - elementRect.height));
            } else {
                // For contained mode, limit to parent boundaries
                const parent = element.parentElement;
                const parentRect = parent.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                
                // Limit to parent boundaries
                newLeft = Math.max(0, Math.min(newLeft, parentRect.width - elementRect.width));
                newTop = Math.max(0, Math.min(newTop, parentRect.height - elementRect.height));
            }
            
            // Apply new position with direct assignment for smoother movement
            element.style.left = newLeft + "px";
            element.style.top = newTop + "px";
            element.style.right = "auto";
            element.style.bottom = "auto";
        }
    }
    
    function closeDragElement() {
        // Stop dragging
        isDragging = false;
        
        // Remove event listeners
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
    }        // Extend makeDraggable function for touch support
    element.ontouchstart = touchDragStart;
    
    function touchDragStart(e) {
        // Don't start drag if touching a control button
        if (e.target.closest('.pip-control-btn')) {
            return;
        }
        
        e.preventDefault();
        const touch = e.touches[0];
        
        // Get the initial position of touch relative to the element
        const rect = element.getBoundingClientRect();
        offsetX = touch.clientX - rect.left;
        offsetY = touch.clientY - rect.top;
        
        // Store initial element position
        initialX = element.offsetLeft;
        initialY = element.offsetTop;
        
        // Start dragging
        isDragging = true;
        
        // Set up event listeners
        document.addEventListener('touchmove', touchDrag, { passive: false });
        document.addEventListener('touchend', closeTouchDrag);
        document.addEventListener('touchcancel', closeTouchDrag);
    }
    
    function touchDrag(e) {
        e.preventDefault();
        
        if (isDragging) {
            const touch = e.touches[0];
            
            // Check if element is detached
            const isDetached = element.classList.contains('pip-detached');
            
            // Calculate the new position directly from touch position
            let newLeft = touch.clientX - offsetX;
            let newTop = touch.clientY - offsetY;
            
            if (isDetached) {
                // For detached mode, limit to viewport boundaries
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const elementRect = element.getBoundingClientRect();
                
                // Limit to viewport boundaries
                newLeft = Math.max(0, Math.min(newLeft, viewportWidth - elementRect.width));
                newTop = Math.max(0, Math.min(newTop, viewportHeight - elementRect.height));
            } else {
                // For contained mode, limit to parent boundaries
                const parent = element.parentElement;
                const parentRect = parent.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                
                // Limit to parent boundaries
                newLeft = Math.max(0, Math.min(newLeft, parentRect.width - elementRect.width));
                newTop = Math.max(0, Math.min(newTop, parentRect.height - elementRect.height));
            }
            
            // Apply new position with direct assignment for smoother movement
            element.style.left = newLeft + "px";
            element.style.top = newTop + "px";
            element.style.right = "auto";
            element.style.bottom = "auto";
        }
    }
    
    function closeTouchDrag() {
        // Stop dragging
        isDragging = false;
        
        // Remove event listeners
        document.removeEventListener('touchmove', touchDrag);
        document.removeEventListener('touchend', closeTouchDrag);
        document.removeEventListener('touchcancel', closeTouchDrag);
    }
}    // Settings button functionality
const settingsBtn = document.getElementById('settings-btn');

// Initialize settings once the widget is available from the window object
let videoChatSettings;

function initializeSettings() {
    try {
        if (window.videoChatWidget) {
            videoChatSettings = new VideoChatSettings(window.videoChatWidget);
            settingsBtn.disabled = false;
        } else {
            console.error('Video chat widget not available for settings');
            settingsBtn.disabled = true;
        }
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
}

// Initialize settings after a short delay to ensure the widget is loaded
setTimeout(() => {
    if (window.videoChatWidget) {
        initializeSettings();
    } else {
        // Set up event listener for when widget is initialized
        document.addEventListener('videoChatWidgetInitialized', () => {
            setTimeout(initializeSettings, 100);
        });
    }
}, 100);

settingsBtn.addEventListener('click', function() {
    if (videoChatSettings) {
        videoChatSettings.openModal();
    } else {
        console.error('Settings not initialized yet');
    }
});

// Screen share button (placeholder for now)
const shareScreenBtn = document.getElementById('share-screen-btn');

shareScreenBtn.addEventListener('click', function() {
    // Placeholder for screen sharing functionality
    console.log('Screen share button clicked');
});

// Update UI when connection is ready
document.addEventListener('connectionReady', function() {
    settingsBtn.disabled = false;
    shareScreenBtn.disabled = false;
});

// Handle window resize for detached PiP
window.addEventListener('resize', function() {
    const detachedPip = document.querySelector('.pip-detached');
    
    if (detachedPip) {
        // Get current position and dimensions
        const rect = detachedPip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Check if PiP is partially outside viewport
        let newLeft = parseFloat(detachedPip.style.left);
        let newTop = parseFloat(detachedPip.style.top);
        
        // Adjust if outside right edge
        if (rect.right > viewportWidth) {
            newLeft = Math.max(0, viewportWidth - rect.width);
        }
        
        // Adjust if outside bottom edge
        if (rect.bottom > viewportHeight) {
            newTop = Math.max(0, viewportHeight - rect.height);
        }
        
        // Apply adjusted position
        detachedPip.style.left = newLeft + 'px';
        detachedPip.style.top = newTop + 'px';
    }
});
    // Video effects buttons functionality
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
        
        // Apply the effect (placeholder for actual implementation)
        console.log(`Applying ${effectType} effect`);
        
        // Here you would call the actual function to apply the selected effect
        // For example: applyVideoEffect(effectType) or applyAudioEffect(effectType)
    });
});

effectButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Get the effect type from the button's title attribute
        const effectType = this.getAttribute('title');
        
        // Toggle active state for the clicked button
        this.classList.toggle('active');
        
        // Determine which menu to show
        let targetMenu;
        switch (effectType) {
            case 'Backgrounds/Filters':
                targetMenu = document.getElementById('backgrounds-filters-menu');
                break;
            case 'Avatars':
                targetMenu = document.getElementById('avatars-menu');
                break;
            case 'Voice Effects':
                targetMenu = document.getElementById('voice-effects-menu');
                break;
            default:
                return;
        }
        
        // Close all menus
        effectMenus.forEach(menu => {
            if (menu !== targetMenu) {
                menu.classList.remove('active');
            }
        });
        
        // Toggle the target menu
        if (targetMenu) {
            const isActive = targetMenu.classList.contains('active');
                if (!isActive) {
                // Position the menu directly above the button
                const buttonRect = this.getBoundingClientRect();
                const containerRect = document.getElementById('video-container').getBoundingClientRect();
                
                // Make menu appear right above the bottom bar
                const bottomBarHeight = document.getElementById('bottom-bar').offsetHeight;
                const topPosition = containerRect.height - bottomBarHeight - targetMenu.offsetHeight - 10;
                
                // Center horizontally with the button
                const buttonCenterX = buttonRect.left - containerRect.left + (buttonRect.width / 2);
                const leftPosition = Math.max(10, Math.min(
                    containerRect.width - targetMenu.offsetWidth - 10,
                    buttonCenterX - (targetMenu.offsetWidth / 2)
                ));
                
                targetMenu.style.top = `${topPosition}px`;
                targetMenu.style.left = `${leftPosition}px`;
            }
            
            targetMenu.classList.toggle('active');
        }
    });
});
});