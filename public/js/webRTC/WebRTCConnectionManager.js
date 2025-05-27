class WebRTCConnectionManager
{
    constructor()
    {
        this.socket = io();
        this.peer = null;
        this.partnerSocketId = null;
        this.eventTarget = new EventTarget();
        this.matchmakingAPIClient = new MatchmakingAPIClient();

        this.socket.on('connect', async () => {
            
        });

        this.socket.on('signal', ({ fromSocketId, data }) =>
        {
            console.log('Received signal from ' + fromSocketId);

            if (this.peer && this.partnerSocketId && fromSocketId === this.partnerSocketId)
            {
                this.peer.signal(data);
            }
            else if (this.peer && fromSocketId !== this.partnerSocketId)
            {
                console.warn(`Ignoring signal from non-matching peer: ${fromSocketId}`);
            }
            else if (!this.peer)
            {
                this.partnerSocketId = fromSocketId;
                this.#createNonInitiatorPeer();
                
                this.peer.signal(data);
            }
        });

        this.socket.on('match-found', ({ isInitiator, matchedSocketId }) => {
            if (isInitiator)
            {
                this.#connectToPeer(matchedSocketId);
            }
            else
            {
                this.partnerSocketId = matchedSocketId;
                this.#createNonInitiatorPeer();
            }
        });

        this.initialization = this.#initialize();
    }

    GetPeer()
    {
        return this.peer;
    }

    on(eventName, callback)
    {
        this.eventTarget.addEventListener(eventName, callback);
    }

    off(eventName, callback)
    {
        this.eventTarget.removeEventListener(eventName, callback);
    }

    CloseConnection()
    {
        if (this.peer)
        {
            console.log('Closing peer connection');
            this.peer.destroy();
            this.peer = null;
        }
        
        this.partnerSocketId = null;
    }

    async StartMatchmaking(chatMode)
    {
        await this.initialization;

        let topics = this.#getTopicsFromURL();

        this.matchmakingAPIClient.joinQueue(this.socket.id, chatMode, topics);

        this.#delayedMatchmakingRoutine(chatMode, topics);
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

    async #delayedMatchmakingRoutine(chatMode, topics = [])
    {
        // Matchmaking stagger to prevent race conditions: 50% chance for 9 or 10 seconds
        await new Promise(resolve => setTimeout(resolve, Math.random() < 0.5 ? 9000 : 10000));

        if (!this.peer)
        {
            this.matchmakingAPIClient.delayedMatchmaking(this.socket.id, chatMode, topics);
        }
    }

    async #initialize()
    {
        return new Promise((resolve) =>
        {
            this.socket.on('connect', async () =>
            {
                resolve(); // Resolve the promise when the 'connect' event is received
            });
        });
    }

    #createNonInitiatorPeer()
    {
        this.peer = new SimplePeer({
            initiator: false,
            trickle: true
        });
        
        this.#setupPeerEventListeners();
    }
    
    #setupPeerEventListeners()
    {
        this.peer.on('signal', (data) => {
            this.socket.emit('signal', { toSocketId: this.partnerSocketId, data });
        });

        this.peer.on('connect', () => {
            this.eventTarget.dispatchEvent(new Event('connectionReady')); // Notify other modules
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
        });

        this.peer.on('close', () => {
            this.eventTarget.dispatchEvent(new Event('connectionClosed')); // Notify other modules
        });
    }

    #connectToPeer(partnerSocketId)
    {
        this.partnerSocketId = partnerSocketId;
        
        this.peer = new SimplePeer({
            initiator: true,
            trickle: true
        });
        
        this.#setupPeerEventListeners();
    }
}
