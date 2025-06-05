class BlockWidget
{
    
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'block-type';

        this.blockButtonElement = document.getElementById('block-user-button');        
        this.blockFormElement = document.getElementById('block-user-form');
        this.blockOverlayElement = document.getElementById('block-user-overlay');
        this.cancelButtonElement = document.getElementById('cancel-block-user');
        this.submitFormElement = document.getElementById('block-user-submit-form');
        this.reasonTextarea = document.getElementById('block-reason');
        this.charCountElement = document.getElementById('char-count');
        this.confirmationModal = document.getElementById('block-user-confirmation');
        this.closeConfirmationButton = document.getElementById('close-block-confirmation');
        this.blockInteractionSelectElement = document.getElementById('block-interaction');

        // To be clear, these are hashed. We never store actual IPs.
        this.peerIPHistory = new Map();

        const eventTypes = this.webRTCConnectionManager.EventTypes;

        this.webRTCConnectionManager.on(eventTypes.CONNECTION_READY, () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on(eventTypes.PEER_IP_HASH_RECEIVED, () =>
        {
            this.#handlePeerIPHashReceived();
        });

        this.webRTCConnectionManager.on(eventTypes.CONNECTION_CLOSED, () =>
        {
            this.#handleConnectionClosed();
        });

        this.#setupUIEventListeners();
    }

    #handleConnectionReady()
    {
        // enabled once an IP has been received, not here.
    }

    #handlePeerIPHashReceived()
    {
        var peerIP = this.webRTCConnectionManager.GetPeerIP();

        if (peerIP)
        {
            this.peerIPHistory.set(new Date(), peerIP);
            this.blockButtonElement.disabled = false;
        }
    }

    #handleConnectionClosed()
    {
        // dont disable the button, they can block past connections
    }    

    #setupUIEventListeners()
    {
        if (this.blockButtonElement)
        {
            this.blockButtonElement.addEventListener('click', () =>
            {
                this.#handleBlockClick();
            });
        }

        if (this.blockOverlayElement)
        {
            this.blockOverlayElement.addEventListener('click', () =>
            {
                this.#hideBlock();
            });
        }        
        
        if (this.cancelButtonElement)
        {
            this.cancelButtonElement.addEventListener('click', () =>
            {
                this.#hideBlock();
            });
        }

        // Form submission handling
        if (this.submitFormElement)
        {
            this.submitFormElement.addEventListener('submit', (e) =>
            {
                e.preventDefault();
                this.#handleFormSubmission();
            });
        }

        // Character counting for reason textarea
        if (this.reasonTextarea && this.charCountElement)
        {
            this.reasonTextarea.addEventListener('input', () =>
            {
                this.#updateCharacterCount();
            });
        }

        // Confirmation modal close handler
        if (this.closeConfirmationButton)
        {
            this.closeConfirmationButton.addEventListener('click', () =>
            {
                this.#hideConfirmation();
            });        }
    }

    #handleBlockClick()
    {
        if (this.blockFormElement.classList.contains('hidden'))
        {
            this.blockFormElement.classList.remove('hidden');
            this.blockOverlayElement.classList.remove('hidden');

            this.blockInteractionSelectElement.innerHTML = '<option value="" disabled selected>-- Select an interaction --</option>'; // Clear previous options

            // sort by date descending and mark the first one as (this interaction)
            const sortedIPs = Array.from(this.peerIPHistory.entries()).sort((a, b) => b[0] - a[0]);

            function createInteractionOption(date, ip)
            {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date.toLocaleString();
                return option;
            }

            // Add the latest interaction as the first option with a special label
            if (sortedIPs.length > 0)
            {
                const [latestDate, latestIP] = sortedIPs[0];
                const option = createInteractionOption(latestDate, latestIP);
                option.textContent = `${latestDate.toLocaleString()} (Most Recent)`;
                this.blockInteractionSelectElement.appendChild(option);
            }

            // Add all other interactions
            sortedIPs.slice(1).forEach(([date, ip]) =>
            {
                const option = createInteractionOption(date, ip);
                this.blockInteractionSelectElement.appendChild(option);
            });
        }
        else
        {
            this.#hideBlock();        
        }
    }

    #hideBlock()
    {
        this.blockFormElement.classList.add('hidden');
        this.blockOverlayElement.classList.add('hidden');    }

    #updateCharacterCount()
    {
        const currentLength = this.reasonTextarea.value.length;
        this.charCountElement.textContent = currentLength;
        
        // Change color based on character count
        if (currentLength > 450) {
            this.charCountElement.style.color = '#dc3545'; // Red
        } else if (currentLength > 400) {
            this.charCountElement.style.color = '#fd7e14'; // Orange
        } else {
            this.charCountElement.style.color = '#6c757d'; // Gray
        }
    }    
    
    async #handleFormSubmission()
    {
        try
        {
            const formData = new FormData(this.submitFormElement);
            const date = formData.get('block-interaction');

            const blockedIp = this.peerIPHistory.get(new Date(date));
            const sourceIp = this.webRTCConnectionManager.myIP;

            if (!blockedIp || !sourceIp)
            {
                this.#hideBlock();
                this.webRTCConnectionManager.CloseConnection();
                return;
            }

            await this.webRTCConnectionManager.matchmakingAPIClient.blockUser(sourceIp, blockedIp);

            this.#hideBlock();
            this.#showConfirmation();
            this.webRTCConnectionManager.CloseConnection();
        }
        catch (error)
        {
            console.error('Failed to block user:', error);
            alert('Failed to block user. Please try again or contact help@freeyap.com directly.');
        }
        finally
        {
            // Restore submit button
            const submitButton = this.submitFormElement.querySelector('#submit-block-user');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-ban me-1"></i>Block User';
                submitButton.disabled = false;
            }
        }
    }

    #showConfirmation()
    {
        if (this.confirmationModal) {
            this.confirmationModal.classList.remove('hidden');
        }
    }

    #hideConfirmation()
    {
        if (this.confirmationModal) {
            this.confirmationModal.classList.add('hidden');
        }
    }

}
