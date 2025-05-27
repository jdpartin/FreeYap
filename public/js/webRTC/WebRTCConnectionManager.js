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

        this.myIP = null;
        this.peerIP = null;

        this.connectionCount = 0; // Used to prevent delayed matchmaking from being called on an old connection

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

    GetPeerIP()
    {
        return this.peerIP;
    }

    GetMyIP()
    {
        return this.myIP;
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

        if (this.socket.id == null)
        {
            console.error('Socket ID is null. Cannot join matchmaking queue.');
            return;
        }

        this.matchmakingAPIClient.joinQueue(this.socket.id, chatMode, topics);

        this.#delayedMatchmakingRoutine(chatMode, topics);
    }

    async #delayedMatchmakingRoutine(chatMode, topics = [])
    {
        var connectionCount = this.connectionCount;

        // Matchmaking stagger to prevent race conditions: 50% chance for 9 or 10 seconds
        await new Promise(resolve => setTimeout(resolve, Math.random() < 0.5 ? 9000 : 10000));

        // Only connect if no peer connection exists and the connection count has not changed
        if (!this.peer && this.connectionCount === connectionCount)
        {
            if (this.socket.id == null)
            {
                console.error('Socket is not connected. Cannot start delayed matchmaking.');
                return;
            }

            console.log(`Starting delayed matchmaking. 
                Socket ID: ${this.socket.id},
                Topics: ${topics.length > 0 ? topics.join(', ') : 'None'},
            `);

            this.matchmakingAPIClient.delayedMatchmaking(this.socket.id, chatMode, topics);
        }
    }


    //#endregion

    //#region Socket Connection (Server Communication)


    async #connectToSocket()
    {
        const response = await fetch(`/my-ip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        this.myIP = data.ip;

        return new Promise((resolve) =>
        {
            this.socket = io();

            this.socket.on('connect', () =>
            {
                if (this.socket.id == null)
                {
                    console.error('Socket connection failed. No socket ID received.');
                    return;
                }

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
        // if the connection to the server is lost
        if (this.peer == null)
        {
            this.#connectToSocket();
        }
        else
        {
            // Do nothing
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

        this.peer.on('data', (data) => 
        {
            const parsedData = JSON.parse(data.toString());

            if (parsedData.type === 'send-ip')
            {
                this.peerIP = parsedData.ip;
                this.#raiseEvent('received-peer-ip');
            }
            else if (parsedData.type === 'request-ip')
            {
                this.peer.send(JSON.stringify({
                    type: 'send-ip',
                    ip: this.myIP
                }));
            }
        });
    }

    #handlePeerSignal(data)
    {
        this.socket.emit('signal', { toSocketId: this.partnerSocketId, data });
    }

    #handlePeerConnect()
    {
        this.peer.send(JSON.stringify({ type: 'request-ip' }));
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
        // Increment connection count to prevent delayed matchmaking from being called on the old connection
        this.connectionCount++;
        this.peer = null

        this.#raiseEvent('connectionClosed');

        if (this.socket.id == null)
        {
            this.#connectToSocket().then(() => {
                this.StartMatchmaking(this.chatMode);
            });
        }
        else
        {
            this.StartMatchmaking(this.chatMode);
        }
    }


    //#endregion

    //#endregion

}
