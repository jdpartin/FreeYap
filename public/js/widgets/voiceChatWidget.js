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
        this.remoteAudioElement = document.getElementById('remote-audio');

        // Make this widget instance available globally for other modules
        window.voiceChatWidget = this;
        
        // Dispatch an event when the widget is initialized
        document.dispatchEvent(new Event('voiceChatWidgetInitialized'));
        
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
                video: false,
                audio: true
            });

            
            
            return true;
        }
        catch (error)
        {
            console.error('VoiceChat: Failed to initialize media:', error);
            return false;
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

        this.muteAudioBtn.disabled = true;
    }

    #setupVoiceChannel(peer)
    {
        peer.on('stream', (stream) =>
        {
            this.remoteStream = stream;
            this.remoteAudioElement.srcObject = stream;
        });
    }

    #startVoiceTransmission(peer)
    {
        this.localStream.getTracks().forEach(track =>
        {
            peer.addTrack(track, this.localStream);
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