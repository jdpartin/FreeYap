class TopicsWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'topics-display';

        this.peerTopics = null;
        this.myTopics = this.#getTopicsFromURL();

        this.connectionLostAndMaxAttempts = false;

        this.partnerTopicsListElement = document.getElementById('partner-topics-list');
        this.myTopicsListElement = document.getElementById('user-topics-list');

        this.webRTCConnectionManager.on('matchFound', () =>
        {
            // set up the topics message handler before the connection is established
            this.webRTCConnectionManager.GetPeer().on('data', (data) =>
            {
                const parsedData = JSON.parse(data.toString());

                if (parsedData.type === 'request-topics')
                {
                    this.webRTCConnectionManager.SendMessage({
                        messageType: 'send-topics',
                        messageObject: { topics: this.myTopics }
                    });
                }
                // we dont need to handle the acknowledgment message type here, 
                // it is handled by the SendMessage method
            });
        });

        this.webRTCConnectionManager.on('connectionReady', () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on('connectionClosed', () =>
        {
            this.#handleConnectionClosed();
        });

        this.webRTCConnectionManager.on('connectionLostMaxAttempts', () =>
        {
            this.#handleConnectionLostAndMaxAttempts();
        });

        this.#updateTopicsUI();
    }

    #handleConnectionLostAndMaxAttempts()
    {
        this.connectionLostAndMaxAttempts = true;
        this.partnerTopicsListElement.innerHTML = '<div class="topics-empty">CONNECTION LOST!<br>Please refresh the page to try again.</div>';
    }

    #getTopicsFromURL()
    {
        const urlParams = new URLSearchParams(window.location.search);
        const topicsParam = urlParams.get('topics');
        let topics = [];
        
        if (topicsParam)
        {
            try
            {
                topics = JSON.parse(decodeURIComponent(topicsParam));
                console.log('Extracted topics from URL:', topics);
            }
            catch (e)
            {
                console.error('Error parsing topics from URL:', e);
            }
        }

        return topics;
    }

    async #updateTopicsUI()
    {
        var animationDelay = 100; // Delay in milliseconds for animation effect

        if (this.myTopicsListElement.innerHTML === '')
        {
            if (this.myTopics.length > 0)
            {
                for (const topic of this.myTopics)
                {
                    this.myTopicsListElement.innerHTML += `<div class="topic-bubble">${topic}</div>`;
                    //await new Promise(resolve => setTimeout(resolve, animationDelay));
                }
            }
            else
            {
                this.myTopicsListElement.innerHTML = '<div class="topics-empty">No Topics</div>';
            }
        }
        
        if (this.connectionLostAndMaxAttempts)
            return;

        if (this.peerTopics == null || this.peerTopics.length === 0)
        {
            let peer = this.webRTCConnectionManager.GetPeer();

            if (peer == null || peer.destroyed)
            {
                this.partnerTopicsListElement.innerHTML = '<div class="topics-empty"><i class="spinner-border spinner-border-sm"></i> Waiting for partner...</div>';
            }
            else
            {
                this.partnerTopicsListElement.innerHTML = '<div class="topics-empty">No Topics</div>';
            }
        }
        else
        {
            this.partnerTopicsListElement.innerHTML = '';

            for (const topic of this.peerTopics)
            {
                this.partnerTopicsListElement.innerHTML += `<div class="topic-bubble">${topic}</div>`;
                //await new Promise(resolve => setTimeout(resolve, animationDelay));
            }
        }
    }

    #handleConnectionReady()
    {
        this.webRTCConnectionManager.SendMessage({
            messageType: 'request-topics',
            acknowledgmentMessageType: 'send-topics',
            requireAcknowledgment: true,
            callbackFunction: (data) =>
            {
                this.peerTopics = data.topics;
                this.#updateTopicsUI();
            }
        });
    }

    #handleConnectionClosed()
    {
        this.peerTopics = null;
        this.#updateTopicsUI();
    }
}