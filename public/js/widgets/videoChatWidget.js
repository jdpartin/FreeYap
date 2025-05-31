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
        
        // Dispatch an event when the widget is initialized
        document.dispatchEvent(new Event('videoChatWidgetInitialized'));

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
    }    async #initializeMedia()
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
                    facingMode: 'user'
                },
                audio: true
            });
            
            this.localVideoElement.srcObject = this.localStream;
            
            return true;
        }
        catch (error)
        {
            console.error('VideoChat: Failed to initialize media:', error);
            return false;
        }
    }

    #handleConnectionReady()
    {
        let peer = this.webRTCConnectionManager.GetPeer();

        this.#setupVideoChannel(peer);
        this.#startVideoTransmission(peer);

        this.muteVideoBtn.disabled = false;
        this.muteAudioBtn.disabled = false;
    }

    #handleConnectionClosed()
    {
        this.remoteStream = null;

        this.remoteVideoElement.srcObject = null;

        this.muteVideoBtn.disabled = true;
        this.muteAudioBtn.disabled = true;
    }    #startVideoTransmission(peer)
    {
        if (this.localStream)
        {
            try 
            {
                // Use the correct SimplePeer API to add the local stream
                peer.addStream(this.localStream);
                console.log('VideoChat: Local video stream added to peer connection');
            }
            catch (error)
            {
                console.error('VideoChat: Failed to add local stream to peer:', error);
            }
        }
        else
        {
            console.warn('VideoChat: No local stream available to transmit - media may not be initialized yet');
        }
    }

    #toggleVideo(mute)
    {
        if (this.localStream)
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
        }
        return false;
    }

    #setupVideoChannel(peer)
    {
        peer.on('stream', stream =>
        {
            this.remoteStream = stream;
            this.remoteVideoElement.srcObject = this.remoteStream;
        });
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
                
                return true;
            }
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
        if (videoElement.id === 'local-video') {
            videoElement.muted = true;
            videoElement.setAttribute('muted', 'true');
        }
        
        console.log('VideoChat: Initialized video element with mobile attributes:', videoElement.id);
    }
}