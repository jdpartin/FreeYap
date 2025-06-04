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
        this.blockButtonElement.disabled = false;

        var peerIP = this.webRTCConnectionManager.GetPeerIP();

        if (peerIP) // unavailable during local testing
        {
            this.peerIPHistory.set(new Date(), this.webRTCConnectionManager.GetPeerIP());
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
                option.textContent = `${ip} - ${date.toLocaleString()}`;
                return option;
            }

            // Add the latest interaction as the first option with a special label
            if (sortedIPs.length > 0)
            {
                const [latestDate, latestIP] = sortedIPs[0];
                const option = createInteractionOption(latestDate, latestIP);
                option.textContent = `This interaction (${latestIP}) - ${latestDate.toLocaleString()}`;
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
            this.#hideBlock();        }
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
    }    async #handleFormSubmission()
    {
        try {
            const formData = new FormData(this.submitFormElement);
            const reason = formData.get('reason');

            // Get submit button and show loading state
            const submitButton = this.submitFormElement.querySelector('#submit-block-user');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Blocking...';
            submitButton.disabled = true;

            const selectedInteraction = this.blockInteractionSelectElement.value;
            var ip = this.peerIPHistory.get(new Date(selectedInteraction));

            if (!ip) {
                alert('Please select a valid interaction.');
                return;
            }

            // Prepare submission data
            const blockData = {
                reason: reason || '',
                userIP: ip,
                timestamp: new Date().toISOString()
            };

            // Submit to API
            const response = await fetch('/api/block/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(blockData)
            });

            const result = await response.json();

            if (result.success) {
                // Hide the form and show confirmation
                this.#hideBlock();
                this.#showConfirmation();
                
                // Reset the form
                this.submitFormElement.reset();
                this.#updateCharacterCount();
            } else {
                throw new Error(result.error || 'Failed to block user');
            }

        } catch (error) {
            console.error('Failed to block user:', error);
            alert('Failed to block user. Please try again or contact help@freeyap.com directly.');
        } finally {
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
