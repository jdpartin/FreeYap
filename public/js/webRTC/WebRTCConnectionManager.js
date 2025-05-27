class WebRTCConnectionManager
{
    //#region Constructor


    constructor()
    {
        this.eventTarget = new EventTarget();// EventTarget for custom events

        this.peer = null;
        this.chatMode = null;
        this.partnerSocketId = null;
        this.socket = null;

        window.webRTCConnectionManager = this;

        this.matchmakingAPIClient = new MatchmakingAPIClient();
        this.initialization = this.#connectToSocket();
    }


    //#endregion

    //#region Public Methods


    GetPeer()
    {
        return this.peer;
    }

    CloseConnection()
    {
        
    }

    async StartMatchmaking(chatMode)
    {
        this.#startMatchmaking(chatMode);
    }

    on(eventName, callback)
    {
        this.eventTarget.addEventListener(eventName, callback);
    }

    off(eventName, callback)
    {
        this.eventTarget.removeEventListener(eventName, callback);
    }


    //#endregion

    //#region Private Methods

    //#region Events


    #raiseEvent(eventName)
    {
        const event = new Event(eventName);
        this.eventTarget.dispatchEvent(event);
    }


    //#endregion

    //#region Matchmaking


    #getTopicsFromURL()
    {
        const urlParams = new URLSearchParams(window.location.search);
        const topicsParam = urlParams.get('topics');
        let topics = [];
        
        if (topicsParam)
        {
            topics = JSON.parse(decodeURIComponent(topicsParam));
            console.log('Extracted topics from URL:', topics);
        }

        return topics;
    }

    async #startMatchmaking(chatMode)
    {
        await this.initialization;

        this.chatMode = chatMode;

        let topics = this.#getTopicsFromURL();

        this.matchmakingAPIClient.joinQueue(this.socket.id, chatMode, topics);

        this.#delayedMatchmakingRoutine(chatMode, topics);
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


    //#endregion

    //#region Socket Connection (Server Communication)


    async #connectToSocket()
    {
        return new Promise((resolve) =>
        {
            this.socket = io();

            this.socket.on('connect', () =>
            {
                this.#setupSocketListeners();
                this.#raiseEvent('socketConnected');
                resolve();
            });
        });
    }

    #setupSocketListeners()
    {
        this.socket.on('signal', ({ fromSocketId, data }) =>
        {
            this.#handleSignal(fromSocketId, data);
        });

        this.socket.on('match-found', ({ isInitiator, matchedSocketId }) => {
            this.#handleMatchFound(isInitiator, matchedSocketId);
        });

        this.socket.on('close', () => {
            this.#handleSocketClose();
        });
    }

    #handleSignal(fromSocketId, data)
    {
        if (!this.peer)
        {
            this.partnerSocketId = fromSocketId;
            this.#createNonInitiatorPeer();
            this.peer.signal(data);
        }
        else if (fromSocketId === this.partnerSocketId)
        {
            this.peer.signal(data);
        }
    }

    #handleMatchFound(isInitiator, matchedSocketId)
    {
        if (isInitiator)
        {
            this.#connectToPeer(matchedSocketId);
        }
        else
        {
            this.partnerSocketId = matchedSocketId;
            this.#createNonInitiatorPeer();
        }

        this.#raiseEvent('matchFound');
    }

    #handleSocketClose()
    {
        if (this.peer == null)
        {
            // always connect to the server if no peer connection exists
            // then call matchmaking again
        }
        else
        {
            // do nothing if a peer connection exists
        }
    }


    //#endregion

    //#region Peer Connection (WebRTC)


    #connectToPeer(partnerSocketId)
    {
        this.partnerSocketId = partnerSocketId;
        
        this.peer = new SimplePeer({
            initiator: true,
            trickle: true
        });
        
        this.#setupPeerEventListeners();
        this.#raiseEvent('peerCreated');
    }

    #createNonInitiatorPeer()
    {
        this.peer = new SimplePeer({
            initiator: false,
            trickle: true
        });
        
        this.#setupPeerEventListeners();
        this.#raiseEvent('peerCreated');
    }

    #setupPeerEventListeners()
    {
        this.peer.on('signal', (data) => {
            this.#handlePeerSignal(data)
        });

        this.peer.on('connect', () => {
            this.#handlePeerConnect();
        });

        this.peer.on('error', (err) => {
            this.#handlePeerError(err);
        });

        this.peer.on('close', () => {
            this.#handlePeerClose();
        });
    }

    #handlePeerSignal(data)
    {
        this.socket.emit('signal', { toSocketId: this.partnerSocketId, data });
    }

    #handlePeerConnect()
    {
        this.socket.disconnect();// Disconnect from the socket server once the peer connection is established
        this.#raiseEvent('connectionReady');
    }

    #handlePeerError(err)
    {
        console.error('Peer error:', err);
        this.#raiseEvent('connectionError');
    }

    #handlePeerClose()
    {
        this.#raiseEvent('connectionClosed');
        this.peer = null
        this.initialization = this.#connectToSocket();
        this.StartMatchmaking(this.chatMode);
    }


    //#endregion

    //#endregion

}
