class VibeCheckWidget
{    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'vibe-check';        this.vibeCheckButtonElement = document.getElementById('vibe-check-button');
        this.vibeCheckFormElement = document.getElementById('vibe-check-form');
        this.vibeCheckOverlayElement = document.getElementById('vibe-check-overlay');
        this.cancelButtonElement = document.getElementById('cancel-vibe-check');
        this.vibeCheckInteractionSelectElement = document.getElementById('vibe-check-interaction');

        // To be clear, these are hashed. We never store actual IPs.
        this.peerIPHistory = new Map();

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
        this.vibeCheckButtonElement.disabled = false;

        var peerIP = this.webRTCConnectionManager.GetPeerIP();

        if (peerIP) // unavailable during local testing
        {
            this.peerIPHistory.set(new Date(), this.webRTCConnectionManager.GetPeerIP());
        }
    }

    #handleConnectionClosed()
    {
        
    }
    
    #setupUIEventListeners()
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
            this.vibeCheckFormElement.classList.remove('hidden');
            this.vibeCheckOverlayElement.classList.remove('hidden');

            this.vibeCheckInteractionSelectElement.innerHTML = '<option value="" disabled selected>-- Select an interaction --</option>'; // Clear previous options

            // These IPs are hashed and NOT something the user will understand if they see.

            // sort by date descending and mark the first one as (this interaction)
            const sortedIPs = Array.from(this.peerIPHistory.entries()).sort((a, b) => b[0] - a[0]);

            function createInteractionOption(date)
            {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date.toLocaleString();// DO NOT show the IP in the VALUE or the TEXT
                return option;
            }            
            
            // Add the latest interaction as the first option with a special label
            if (sortedIPs.length > 0)
            {
                const [latestDate, latestIP] = sortedIPs[0];                
                const option = createInteractionOption(latestDate, latestIP);
                option.textContent = `${latestDate.toLocaleString()} (Most Recent)`;
                this.vibeCheckInteractionSelectElement.appendChild(option);
            }

            // Add all other interactions
            sortedIPs.slice(1).forEach(([date, ip]) =>
            {
                const option = createInteractionOption(date);
                this.vibeCheckInteractionSelectElement.appendChild(option);
            });
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
