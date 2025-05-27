class VibeCheckWidget
{    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'vibe-check';

        this.vibeCheckButtonElement = document.getElementById('vibe-check-button');
        this.vibeCheckFormElement = document.getElementById('vibe-check-form');
        this.vibeCheckOverlayElement = document.getElementById('vibe-check-overlay');
        this.cancelButtonElement = document.getElementById('cancel-vibe-check');

        this.capturedPeerIP = null; // for capturing during reporting

        this.webRTCConnectionManager.on('connectionReady', () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on('connectionClosed', () =>
        {
            this.#handleConnectionClosed();
        });

        this.#setupUIEventListeners();
    }

    #handleConnectionReady()
    {
        
    }

    #handleConnectionClosed()
    {
        
    }

    #capturePeerIP()
    {
        this.capturedPeerIP = this.webRTCConnectionManager.GetPeerIP();
    }    #setupUIEventListeners()
    {
        if (this.vibeCheckButtonElement)
        {
            this.vibeCheckButtonElement.addEventListener('click', () =>
            {
                this.#handleVibeCheckClick();
            });
        }

        if (this.vibeCheckOverlayElement)
        {
            this.vibeCheckOverlayElement.addEventListener('click', () =>
            {
                this.#hideVibeCheck();
            });
        }

        if (this.cancelButtonElement)
        {
            this.cancelButtonElement.addEventListener('click', () =>
            {
                this.#hideVibeCheck();
            });
        }
    }

    #handleVibeCheckClick()
    {
        if (this.vibeCheckFormElement.classList.contains('hidden'))
        {
            this.#capturePeerIP();
            this.vibeCheckFormElement.classList.remove('hidden');
            this.vibeCheckOverlayElement.classList.remove('hidden');
        }
        else
        {
            this.#hideVibeCheck();
        }
    }

    #hideVibeCheck()
    {
        this.vibeCheckFormElement.classList.add('hidden');
        this.vibeCheckOverlayElement.classList.add('hidden');
    }

}
