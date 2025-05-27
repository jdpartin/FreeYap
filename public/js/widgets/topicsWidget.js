class TopicsWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.messageType = 'topics-display';

        this.peerTopics = null;
        this.myTopics = this.#getTopicsFromURL();

        this.partnerTopicsListElement = document.getElementById('partner-topics-list');
        this.myTopicsListElement = document.getElementById('user-topics-list');

        this.webRTCConnectionManager.on('connectionReady', () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on('connectionClosed', () =>
        {
            this.#handleConnectionClosed();
        });

        this.#updateTopicsUI();
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

    #setupDataChannel(peer)
    {
        peer.on('data', (data) => 
        {
            try 
            {
                const parsedData = JSON.parse(data.toString());

                if (parsedData.type === this.messageType)
                {
                    this.peerTopics = parsedData.topics;
                    this.#updateTopicsUI();
                }
                else if (parsedData.type === 'request-topics')
                {
                    this.#sendTopics(peer);
                }
            }
            catch (error)
            {
                console.error(error);
            }
        });

        // Request peer topics when the data channel is ready
        peer.send(JSON.stringify({ type: 'request-topics' }));
    }

    #sendTopics(peer)
    {
        const topicsMessage = {
            type: this.messageType,
            topics: this.myTopics
        };

        peer.send(JSON.stringify(topicsMessage));
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
        this.#setupDataChannel(this.webRTCConnectionManager.GetPeer());
    }

    #handleConnectionClosed()
    {
        this.peerTopics = null;
        this.#updateTopicsUI();
    }
}