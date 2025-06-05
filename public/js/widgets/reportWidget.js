class ReportWidget
{
    
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'report-type';

        this.reportButtonElement = document.getElementById('report-illegal-button');        
        this.reportFormElement = document.getElementById('report-illegal-form');
        this.reportOverlayElement = document.getElementById('report-illegal-overlay');
        this.cancelButtonElement = document.getElementById('cancel-report-illegal');
        this.submitFormElement = document.getElementById('report-illegal-submit-form');
        this.detailsTextarea = document.getElementById('report-details');
        this.charCountElement = document.getElementById('char-count');
        this.confirmationModal = document.getElementById('report-illegal-confirmation');
        this.closeConfirmationButton = document.getElementById('close-report-confirmation');
        this.reportInteractionSelectElement = document.getElementById('report-interaction');

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

        window.reportWidget = this; // For debugging purposes

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
            this.reportButtonElement.disabled = false;
        }
    }

    #handleConnectionClosed()
    {
        // dont disable the button, they can report past connections
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

        // Form submission handling
        if (this.submitFormElement)
        {
            this.submitFormElement.addEventListener('submit', (e) =>
            {
                e.preventDefault();
                this.#handleFormSubmission();
            });
        }

        // Character counting for details textarea
        if (this.detailsTextarea && this.charCountElement)
        {
            this.detailsTextarea.addEventListener('input', () =>
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
            });
        }
    }

    #handleReportClick()
    {
        if (this.reportFormElement.classList.contains('hidden'))
        {
            this.reportFormElement.classList.remove('hidden');
            this.reportOverlayElement.classList.remove('hidden');

            this.reportInteractionSelectElement.innerHTML = '<option value="" disabled selected>-- Select an interaction --</option>'; // Clear previous options

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
                this.reportInteractionSelectElement.appendChild(option);
            }

            // Add all other interactions
            sortedIPs.slice(1).forEach(([date, ip]) =>
            {
                const option = createInteractionOption(date);
                this.reportInteractionSelectElement.appendChild(option);
            });
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

    #updateCharacterCount()
    {
        const currentLength = this.detailsTextarea.value.length;
        this.charCountElement.textContent = currentLength;
        
        // Change color based on character count
        if (currentLength > 900) {
            this.charCountElement.style.color = '#dc3545'; // Red
        } else if (currentLength > 800) {
            this.charCountElement.style.color = '#fd7e14'; // Orange
        } else {
            this.charCountElement.style.color = '#6c757d'; // Gray
        }
    }

    async #handleFormSubmission()
    {
        try {
            const formData = new FormData(this.submitFormElement);
            const contentType = formData.get('contentType');
            const details = formData.get('details');

            if (!contentType) {
                alert('Please select a report type.');
                return;
            }

            // Get submit button and show loading state
            const submitButton = this.submitFormElement.querySelector('#submit-report-illegal');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting...';
            submitButton.disabled = true;

            const selectedInteraction = this.reportInteractionSelectElement.value;
            var ip = this.peerIPHistory.get(new Date(selectedInteraction));

            if (!ip) {
                alert('Please select a valid interaction.');
                return;
            }

            // Prepare submission data
            const reportData = {
                contentType: contentType,
                details: details || '',
                userIP: ip,
                timestamp: new Date().toISOString()
            };

            // Submit to API
            const response = await fetch('/api/report/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            const result = await response.json();

            if (result.success) {
                // Hide the form and show confirmation
                this.#hideReport();
                this.#showConfirmation();
                
                // Reset the form
                this.submitFormElement.reset();
                this.#updateCharacterCount();
            } else {
                throw new Error(result.error || 'Failed to submit report');
            }

        } catch (error) {
            console.error('Failed to submit report:', error);
            alert('Failed to submit report. Please try again or contact help@freeyap.com directly.');
        } finally {
            // Restore submit button
            const submitButton = this.submitFormElement.querySelector('#submit-report-illegal');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-flag me-1"></i>Submit Report';
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
