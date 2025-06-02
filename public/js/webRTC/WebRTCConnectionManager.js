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

        // the stream must be added when the matchFound event is raised
        this.stream = null;

        this.connectionReady = false;

        this.peerConnectionTimeoutStarted = false;

        this.myIP = null;
        this.peerIP = null;

        this.socketConnectionLostCount = 0;
        this.lastSocketConnectionLostTime = null;
        this.socketConnectionLostThreshold = 3; // max reconnect attempts before displaying connection lost message

        this.connectionCount = 0; // Used to prevent delayed matchmaking from being called on an old connection
        this.socketConnectionCount = 0; // Used to track the number of socket connections

        window.webRTCConnectionManager = this;

        this.matchmakingAPIClient = new MatchmakingAPIClient();
        this.initialization = this.#connectToSocket(false);
    }

    //#endregion

    //#region Public Methods

    /**
     * Sends a message over the WebRTC connection.
     * If requireAcknowledgment is true, it will retry if no acknowledgment is received within the specified timeout.
     * A listener is needed to handle the incoming message before calling this method.
     * Listeners need to be set up before the connection is ready
     * Dont forget to wait for connectionReady before sending messages.
     * Dont pass the ackEnf variable, it is for retries.
     */
    SendMessage({
        messageType, 
        messageObject = null, 
        callbackFunction = null,
        requireAcknowledgment = false,
        acknowledgmentMessageType = null,
        acknowledgmentTimeoutMS = 1000,
        maxRetries = 3,
        ackEnf = null
    })
    {
        /*
            Example:

            Connection not yet ready:

                // the chanel is always called 'data'
                peer.on('data', (data) =>
                {
                    const parsedData = JSON.parse(data.toString());

                    // The messageType is received from the peer
                    if (parsedData.type === 'request-ip')
                    {                        // We send back the acknowledgment message type with the response
                        this.SendMessage({
                            messageType: 'send-ip',
                            messageObject: { ip: this.myIP }
                        });
                    }
                    // we dont need to handle the acknowledgment message type here, 
                    // it is handled by the SendMessage method
                });


            Once the connection is ready:                // now we send the request (remember, this will happen from both sides)
                this.SendMessage({
                    messageType: 'request-ip',
                    acknowledgmentMessageType: 'send-ip',
                    requireAcknowledgment: true,
                    callbackFunction: (data) => {
                        console.log('Received IP from peer:', data.ip);
                    }
                });
        */
        if (requireAcknowledgment)
        {
            ackEnf ??= new MessageAcknowledgmentEnforcer(
                messageType, 
                messageObject, 
                callbackFunction,
                requireAcknowledgment, 
                acknowledgmentMessageType,
                acknowledgmentTimeoutMS,
                maxRetries,
                this
            );

            this.peer.on('data', (data) => 
            {
                const parsedData = JSON.parse(data.toString());

                if (parsedData.type === acknowledgmentMessageType)
                {
                    ackEnf.ReceiveCallback(parsedData);
                }
            });
        }

        this.peer.send(JSON.stringify({
            type: messageType,
            ...messageObject
        }));
    }

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
        this.peer.destroy();
        this.peerIP = null;
        this.partnerSocketId = null;
        this.#connectToSocket();
        //this.#raiseEvent('closed'); No need to call this because peer.destroy() will call it
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


    async #startPeerConnectionTimeout()
    {
        if (this.peer && !this.peerConnectionTimeoutStarted && !this.connectionReady)
        {
            return new Promise((resolve) => {
                this.peerConnectionTimeoutStarted = true;

                setTimeout(() => {
                    this.peerConnectionTimeoutStarted = false;

                    if (!this.connectionReady)
                    {
                        this.CloseConnection();
                        this.#raiseEvent('peerTimeout');
                    }
                    resolve();
                }, 10000);
            });
        }
    }

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
        }

        return topics;
    }

    async #startMatchmaking(chatMode = null)
    {
        await this.initialization;

        if (chatMode == null)
        {
            if (this.chatMode == null)
            {
                console.error('Chat mode is not set. Cannot start matchmaking.');
                return;
            }

            chatMode = this.chatMode;
        }
        else
        {
            this.chatMode = chatMode;
        }

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
        let matchmakingDelay = (Math.random() * 1000) + 9000;// Random delay between 9 and 10 seconds
        await new Promise(resolve => setTimeout(resolve, matchmakingDelay));

        // Only connect if no peer connection exists and the connection count has not changed
        if (!this.peer && this.connectionCount === connectionCount)
        {
            if (this.socket.id == null)
            {
                console.error('Socket is not connected. Cannot start delayed matchmaking.');
                return;
            }

            this.matchmakingAPIClient.delayedMatchmaking(this.socket.id, chatMode, topics);
        }
    }


    //#endregion

    //#region Socket Connection (Server Communication)


    async #connectToSocket(matchmake = true)
    {
        this.socketConnectionCount++;

        if (!this.myIP)
        {
            // we only need the ip of the first connection, so we can skip this if we already have it
            const response = await fetch(`/my-ip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            this.myIP = data.ip;
        }

        return new Promise((resolve) =>
        {
            this.socket = io();

            this.#startSocketTimeoutCounter();

            this.socket.on('connect', () =>
            {
                if (this.socket.id == null)
                {
                    console.error('Socket connection failed. No socket ID received.');

                    this.socket.disconnect();
                    this.socket = null;

                    this.#handleSocketClose();
                    return;
                }

                this.#setupSocketListeners();
                this.#raiseEvent('socketConnected');

                if (matchmake)
                    this.#startMatchmaking();

                resolve();
            });
        });
    }

    async #startSocketTimeoutCounter()
    {
        let currentSocketConnectionCount = this.socketConnectionCount; 

        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.socket && !this.peer && this.socketConnectionCount == currentSocketConnectionCount
                    && (!this.socket.connected || this.socket.id == null))
                {
                    console.error('Socket connection timed out.');

                    this.#raiseEvent('socketConnectionTimeout');

                    this.socket.disconnect();
                    this.socket = null;
                    
                    this.#handleSocketClose();

                    resolve();
                }
                resolve();
            }, 5000); // 5 seconds timeout
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
    
    async #handleSignal(fromSocketId, data)
    {
        if (!this.peer)
        {
            this.partnerSocketId = fromSocketId;
            await this.#createNonInitiatorPeer();
            this.peer.signal(data);
        }
        else if (fromSocketId === this.partnerSocketId)
        {
            this.peer.signal(data);
        }
    }    
    
    async #handleMatchFound(isInitiator, matchedSocketId)
    {
        this.#raiseEvent('matchFound');

        if (isInitiator)
        {
            await this.#connectToPeer(matchedSocketId);
        }
        else
        {
            this.partnerSocketId = matchedSocketId;
            await this.#createNonInitiatorPeer();
        }

        this.#startPeerConnectionTimeout();
    }

    async #handleSocketClose()
    {
        if (this.peer == null) // We disconnect on purpose when a peer connection is established
        {
            this.socketConnectionLostCount++;
            this.lastSocketConnectionLostTime = Date.now();

            if (this.socketConnectionLostCount <= this.socketConnectionLostThreshold)
            {
                console.warn(`Socket connection lost. Attempting to reconnect...`);

                this.#raiseEvent('connectionLost');

                this.socket.disconnect();
                this.socket = null;

                // wait for a short period before reconnecting
                await new Promise(resolve => setTimeout(resolve, 2000));

                this.#connectToSocket();
            }
            else
            {
                console.error(`Socket connection lost. Reached maximum reconnect attempts (${this.socketConnectionLostThreshold}).`);
                
                window.alert('Connection lost. Please refresh the page to try again.');
                
                this.#raiseEvent('connectionClosed');
                this.#raiseEvent('connectionLostMaxAttempts');
            }
        }
    }


    //#endregion

    //#region Peer Connection (WebRTC)    
    async #getICEServerConfiguration()
    {
        try {
            const response = await fetch('/ice-servers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            const data = await response.json();
            return data.iceServers;
        } catch (error) {
            console.error('Failed to fetch ICE server configuration, using fallback STUN servers:', error);
            
            // Fallback to basic STUN servers if the endpoint fails
            return [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun.stunprotocol.org:3478' }
            ];
        }
    }    
    
    async #connectToPeer(partnerSocketId)
    {
        this.partnerSocketId = partnerSocketId;
        
        const iceServerConfig = await this.#getICEServerConfiguration();
        
        if (this.stream)
        {
            this.peer = new SimplePeer({
                initiator: true,
                trickle: true,
                stream: this.stream,
                config: { iceServers: iceServerConfig }
            });
        }
        else
        {
            this.peer = new SimplePeer({
                initiator: true,
                trickle: true,
                config: { iceServers: iceServerConfig }
            });
        }
        
        this.#setupPeerEventListeners();
        this.#raiseEvent('peerCreated');
    }

    async #createNonInitiatorPeer()
    {
        const iceServerConfig = await this.#getICEServerConfiguration();
        
        if (this.stream)
        {
            this.peer = new SimplePeer({
                initiator: false,
                trickle: true,
                stream: this.stream,
                config: { iceServers: iceServerConfig }
            });
        }
        else
        {
            this.peer = new SimplePeer({
                initiator: false,
                trickle: true,
                config: { iceServers: iceServerConfig }
            });
        }
        
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

        // Handle IP address exchange
        this.peer.on('data', (data) =>
        {
            const parsedData = JSON.parse(data.toString());

            if (parsedData.type === 'request-ip')            {
                this.SendMessage({
                    messageType: 'send-ip',
                    messageObject: { ip: this.myIP }
                });
            }
        });
    }

    #handlePeerSignal(data)
    {
        this.socket.emit('signal', { toSocketId: this.partnerSocketId, data });
    }

    #handlePeerConnect()
    {
        this.connectionReady = true;

        // Handle IP address exchange
        this.SendMessage({
            messageType: 'request-ip',
            acknowledgmentMessageType: 'send-ip',
            requireAcknowledgment: true,
            callbackFunction: data => 
            {
                this.peerIP = data.ip;
            }
        });

        if (this.socket)
        {
            this.socket.disconnect();
            this.socket = null;
        }
        
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

        if (this.socket)
        {
            this.socket.disconnect();
            this.socket = null;
        }

        this.#raiseEvent('connectionClosed');
        this.#connectToSocket();
    }


    //#endregion

    //#endregion

}


class MessageAcknowledgmentEnforcer
{
    constructor(
        messageType, 
        messageObject, 
        callbackFunction,
        requireAcknowledgment,
        acknowledgmentMessageType,
        acknowledgmentTimeoutMS,
        maxRetries,
        webRTCConnectionManager
    )
    {
        this.messageType = messageType;
        this.messageObject = messageObject;
        this.callbackFunction = callbackFunction;
        this.requireAcknowledgment = requireAcknowledgment;
        this.acknowledgmentTimeoutMS = acknowledgmentTimeoutMS;
        this.acknowledgmentMessageType = acknowledgmentMessageType;
        this.maxRetries = maxRetries;
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.receivedCallback = false;
        this.retryCount = 0;

        if (this.requireAcknowledgment)
        {
            this.#startTimeout();
        }
    }

    ReceiveCallback(data)
    {
        if (!this.receivedCallback) 
        {
            this.receivedCallback = true;

            if (this.callbackFunction && typeof this.callbackFunction === 'function')
            {
                this.callbackFunction(data);
            }
        }
    }

    async #startTimeout()
    {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!this.receivedCallback && this.retryCount < this.maxRetries)
                {
                    this.retryCount++;                    this.webRTCConnectionManager.SendMessage({
                        messageType: this.messageType,
                        messageObject: this.messageObject,
                        callbackFunction: this.callbackFunction,
                        requireAcknowledgment: this.requireAcknowledgment,
                        acknowledgmentMessageType: this.acknowledgmentMessageType,
                        acknowledgmentTimeoutMS: this.acknowledgmentTimeoutMS,
                        maxRetries: this.maxRetries,
                        ackEnf: this
                    });
                }
                resolve();
            }, this.acknowledgmentTimeoutMS);
        });
    }
}

// Set up beforeunload event to close the connection when the page is unloaded
window.addEventListener('beforeunload', () =>
{
    if (window.webRTCConnectionManager)
    {
        if (window.webRTCConnectionManager.peer)
        {
            window.webRTCConnectionManager.peer.destroy();
            window.webRTCConnectionManager.peerIP = null;
            window.webRTCConnectionManager.partnerSocketId = null;
        }

        if (window.webRTCConnectionManager.socket)
        {
            window.webRTCConnectionManager.socket.disconnect();
            window.webRTCConnectionManager.socket = null;
        }
    }
});