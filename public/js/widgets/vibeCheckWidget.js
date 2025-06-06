class VibeCheckWidget
{    
    
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;
        const eventTypes = this.webRTCConnectionManager.EventTypes;

        this.messageType = 'vibe-check';        
        this.vibeCheckButtonElement = document.getElementById('vibe-check-button');
        this.vibeCheckFormElement = document.getElementById('vibe-check-form');        this.vibeCheckOverlayElement = document.getElementById('vibe-check-overlay');
        this.cancelButtonElement = document.getElementById('cancel-vibe-check');
        this.vibeCheckInteractionSelectElement = document.getElementById('vibe-check-interaction');
        this.vibeCheckConfirmationModal = document.getElementById('vibe-check-confirmation-modal');

        // To be clear, these are hashed. We never store actual IPs.
        this.peerIPHistory = new Map();

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
        // Enable once ip is received, not here.
    }

    #handlePeerIPHashReceived()
    {
        this.vibeCheckButtonElement.disabled = false;

        var peerIP = this.webRTCConnectionManager.GetPeerIP();

        if (peerIP)
        {
            this.peerIPHistory.set(new Date(), peerIP);
            this.blockButtonElement.disabled = false;
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

        if (this.vibeCheckFormElement)
        {
            this.vibeCheckFormElement.addEventListener('submit', (event) =>
            {
                event.preventDefault();
                this.#handleFormSubmission();
            });
        }

        // Add event listener for confirmation modal close button
        const confirmationCloseButton = document.getElementById('vibe-check-confirmation-close');
        if (confirmationCloseButton)
        {
            confirmationCloseButton.addEventListener('click', () =>
            {
                this.#hideConfirmation();
            });
        }

        // Add event listener for confirmation modal overlay
        if (this.vibeCheckConfirmationModal)
        {
            this.vibeCheckConfirmationModal.addEventListener('click', (event) =>
            {
                // Only close if clicking the overlay background, not the modal content
                if (event.target === this.vibeCheckConfirmationModal)
                {
                    this.#hideConfirmation();
                }
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
            
            // sort by date descending and mark the first one as (this interaction)
            const sortedIPs = Array.from(this.peerIPHistory.entries()).sort((a, b) => b[0] - a[0]);

            function createInteractionOption(date, hashed_ip)
            {
                const option = document.createElement('option');
                option.value = hashed_ip;
                option.textContent = date.toLocaleString();
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
                const option = createInteractionOption(date, ip);
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
      
    
    async #handleFormSubmission()
    {
        try
        {
            const formData = new FormData(this.vibeCheckFormElement);

            const reportedIp = formData.get('vibe-check-interaction');
            const nudity = formData.get('nudity') === 'on';
            const gore = formData.get('gore') === 'on';

            const verified = false; // Add verification logic later

            if (!reportedIp)
            {
                return;
            }

            // Validate that at least one content type is selected
            if (!nudityBool && !goreBool)
            {
                alert('Please select at least one content type (Nudity or Gore).');
                return;
            }

            const sourceIP = this.webRTCConnectionManager.myIP;

            await this.webRTCConnectionManager.matchmakingAPIClient.vibeCheck(reportedIp, sourceIP, gore, nudity, verified)

            this.#showConfirmation();
        }
        catch (error)
        {
            console.error('Failed to submit vibe check:', error);
        }
        finally
        {
            this.#hideVibeCheck();
            this.webRTCConnectionManager.CloseConnection();
            
            // Restore submit button
            const submitButton = this.vibeCheckFormElement.querySelector('#submit-vibe-check');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-check me-1"></i>Submit Vibe Check';
                submitButton.disabled = false;
            }
        }
    }    
    
    #showConfirmation()
    {
        if (this.vibeCheckConfirmationModal) {
            this.vibeCheckConfirmationModal.classList.remove('hidden');
        }
    }

    #hideConfirmation()
    {
        if (this.vibeCheckConfirmationModal) {
            this.vibeCheckConfirmationModal.classList.add('hidden');
        }
    }

}
