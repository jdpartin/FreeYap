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
    }

    async #initializeMedia()
    {
        try
        {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
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
    }

    #startVideoTransmission(peer)
    {
        this.localStream.getTracks().forEach(track =>
        {
            peer.addTrack(track, this.localStream);
        });
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
        peer.on('stream', (stream) =>
        {
            this.remoteStream = stream;
            this.remoteVideoElement.srcObject = stream;
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
    
    // Public methods to support settings functionality
    
    /**
     * Change the media stream with new device constraints
     * @param {MediaStreamConstraints} constraints Media constraints to apply
     * @returns {Promise<boolean>} Success status
     */
    async changeMediaStream(constraints)
    {
        try
        {
            // Get new stream with the constraints
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Stop tracks in old stream
            if (this.localStream)
            {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            // Set new stream as local stream
            this.localStream = newStream;
            this.localVideoElement.srcObject = newStream;
            
            // If we have a peer connection, replace tracks
            if (this.webRTCConnectionManager && this.webRTCConnectionManager.GetPeer())
            {
                const peer = this.webRTCConnectionManager.GetPeer();
                
                // For each new track, find the corresponding sender and replace
                newStream.getTracks().forEach(track =>
                {
                    const sender = peer.getSenders().find(s => 
                        s.track && s.track.kind === track.kind);
                        
                    if (sender)
                    {
                        sender.replaceTrack(track);
                    }
                    else
                    {
                        peer.addTrack(track, newStream);
                    }
                });
            }
            
            return true;
        }
        catch (error)
        {
            console.error('Error changing media stream:', error);
            return false;
        }
    }
    
    /**
     * Get current media devices
     * @returns {Promise<MediaDeviceInfo[]>} List of media devices
     */
    async getMediaDevices()
    {
        try
        {
            return await navigator.mediaDevices.enumerateDevices();
        }
        catch (error)
        {
            console.error('Error getting media devices:', error);
            return [];
        }
    }
    
    /**
     * Set audio output device (if supported by browser)
     * @param {string} deviceId Device ID to use for audio output
     * @returns {boolean} Success status
     */
    setAudioOutputDevice(deviceId)
    {
        if (!this.remoteVideoElement || !this.remoteVideoElement.setSinkId)
        {
            return false;
        }
        
        try
        {
            this.remoteVideoElement.setSinkId(deviceId);
            return true;
        }
        catch (error)
        {
            console.error('Error setting audio output device:', error);
            return false;
        }
    }
}