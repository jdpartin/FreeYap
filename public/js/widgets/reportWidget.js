class ReportWidget
{    
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'report-type';

        this.reportButtonElement = document.getElementById('vibe-check-button');
        this.reportFormElement = document.getElementById('vibe-check-form');
        this.reportOverlayElement = document.getElementById('vibe-check-overlay');
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
    }    
    
    #setupUIEventListeners()
    {
        if (this.reportButtonElement)
        {
            this.reportButtonElement.addEventListener('click', () =>
            {
                this.#handleReportClick();
            });
        }

        if (this.reportOverlayElement)
        {
            this.reportOverlayElement.addEventListener('click', () =>
            {
                this.#hideReport();
            });
        }

        if (this.cancelButtonElement)
        {
            this.cancelButtonElement.addEventListener('click', () =>
            {
                this.#hideReport();
            });
        }
    }

    #handleReportClick()
    {
        if (this.reportFormElement.classList.contains('hidden'))
        {
            this.#capturePeerIP();
            this.reportFormElement.classList.remove('hidden');
            this.reportOverlayElement.classList.remove('hidden');
        }
        else
        {
            this.#hideReport();
        }
    }

    #hideReport()
    {
        this.reportFormElement.classList.add('hidden');
        this.reportOverlayElement.classList.add('hidden');
    }

}
