class WebRTCConnectionManager
{
    //#region Constructor


    constructor()
    {
        this.EventTypes = Object.freeze({
            // Matchmaking Events
            MATCH_FOUND: 'matchFound',
            RETRY_MATCHMAKING_STARTED: 'retryMatchmakingStarted',
            RETRY_MATCHMAKING_ERROR: 'retryMatchmakingError',
            MATCHMAKING_ERROR: 'matchmakingError',

            // Peer Connection Events
            CONNECTION_READY: 'connectionReady',
            CONNECTION_CLOSED: 'connectionClosed',
            CONNECTION_ERROR: 'connectionError',
            CONNECTION_LOST: 'connectionLost',
            CONNECTION_LOST_MAX_ATTEMPTS: 'connectionLostMaxAttempts',
            PEER_TIMEOUT: 'peerTimeout',
            PEER_CREATED: 'peerCreated',
            PEER_IP_HASH_RECEIVED: 'peerIPHashReceived',

            // TURN Server Events
            TURN_USAGE_READY: 'turnUsageReady',

            // Socket Connection Events
            SOCKET_CONNECTED: 'socketConnected',
            SOCKET_CONNECTION_ERROR: 'socketConnectionError',
            SOCKET_CONNECTION_TIMEOUT: 'socketConnectionTimeout',
            MAX_RECONNECT_ATTEMPTS_REACHED: 'maxReconnectAttemptsReached',

            // Error Events
            ERROR_REPORTED: 'errorReported'
        });

        this.reportedError = null;
        
        this.eventTarget = new EventTarget();// EventTarget for custom events

        this.peer = null;
        this.chatMode = null;
        this.partnerSocketId = null;
        this.socket = null;

        // the stream must be added when the matchFound event is raised
        this.stream = null;

        this.connectionReady = false;
        this.peerIsUsingTURN = false; // Indicates if the peer is using a TURN server for connection

        this.peerConnectionTimeoutStarted = false;

        // To be clear, these are hashed. We never store actual IPs.
        this.myIP = null;
        this.peerIP = null;

        // settings to indicate content preferences, default strictly to prevent NSFW content
        this.nudity = false;
        this.gore = false;

        this.socketConnectionLostCount = 0;
        this.lastSocketConnectionLostTime = null;
        this.socketConnectionLostThreshold = 3; // max reconnect attempts before displaying connection lost message

        this.connectionCount = 0; // Used to prevent delayed matchmaking from being called on an old connection
        this.socketConnectionCount = 0; // Used to track the number of socket connections

        window.webRTCConnectionManager = this;

        this.#getContentPreferencesFromCookies();

        this.matchmakingAPIClient = new MatchmakingAPIClient();
        this.initialization = this.#connectToSocket(false);
    }

    //#endregion

    //#region Public Methods


    ReportError(message, error = null)
    {
        console.error(`WebRTCConnectionManager Error: ${message}`, error);
        this.reportedError = message;
        this.#raiseEvent(this.EventTypes.ERROR_REPORTED);
    }

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
        
        if (!this.peer)
        {
            console.error('Cannot send message: peer connection not established');
            return false;
        }

        try 
        {
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
                    try 
                    {
                        const parsedData = JSON.parse(data.toString());

                        if (parsedData.type === acknowledgmentMessageType)
                        {
                            ackEnf.ReceiveCallback(parsedData);
                        }
                    }
                    catch (error)
                    {
                        console.error('Error parsing acknowledgment data:', error);
                    }
                });
            }

            this.peer.send(JSON.stringify({
                type: messageType,
                ...messageObject
            }));
            
            return true;
        }
        catch (error)
        {
            console.error('Error sending message:', error);
            return false;
        }
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
    
    /**
     * Returns whether the peer connection is using TURN servers.
     * Listen for TURN_USAGE_READY event to know when this value is accurate.
     */
    IsPeerUsingTURN()
    {
        return this.peerIsUsingTURN;
    }    
    
    CloseConnection()
    {
        // increment connection count to prevent delayed matchmaking from being called on the old connection
        this.connectionCount++;

        if (this.peer)
        {
            this.peer.destroy();
        }
        this.peer = null;
        this.peerIP = null;
        this.partnerSocketId = null;
        this.connectionReady = false;
        this.peerConnectionTimeoutStarted = false;

        this.#connectToSocket();
        //this.#raiseEvent('closed'); No need to call this because peer.destroy() will call it
    }    
    
    async StartMatchmaking(chatMode)
    {
        this.#startMatchmaking(chatMode);
    }

    /**
     * Forces a retry of matchmaking - useful when user is stuck in a bad state
     */
    async RetryMatchmaking()
    {
        this.connectionCount++;

        // Reset connection state
        if (this.peer)
        {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.connectionReady = false;
        this.peerConnectionTimeoutStarted = false;
        this.peerIP = null;
        this.partnerSocketId = null;
        
        // Reset socket connection lost count to allow fresh attempts
        this.socketConnectionLostCount = 0;
        
        // Disconnect and reconnect socket
        if (this.socket)
        {
            this.socket.disconnect();
            this.socket = null;
        }
        
        try 
        {
            await this.#connectToSocket();
            this.#raiseEvent(this.EventTypes.RETRY_MATCHMAKING_STARTED);
        }
        catch (error)
        {
            console.error('Error during matchmaking retry:', error);
            this.#raiseEvent(this.EventTypes.RETRY_MATCHMAKING_ERROR);
        }
    }    
    
    /**
     * Checks if the user is in a state where they need to retry matchmaking
     */
    IsStuckState()
    {
        return (
            // No socket connection and exceeded retry threshold
            (this.socket == null && this.socketConnectionLostCount > this.socketConnectionLostThreshold) ||
            // Socket exists but no ID
            (this.socket && this.socket.id == null) ||
            // No peer and no socket
            (!this.peer && this.socket == null) ||
            // Socket not connected
            (this.socket && !this.socket.connected)
        );
    }

    /**
     * Gets the current connection status for debugging
     */
    GetConnectionStatus()
    {
        return {
            hasSocket: !!this.socket,
            socketId: this.socket?.id || null,
            socketConnected: this.socket?.connected || false,
            hasPeer: !!this.peer,
            connectionReady: this.connectionReady,
            socketConnectionLostCount: this.socketConnectionLostCount,
            connectionCount: this.connectionCount,
            socketConnectionCount: this.socketConnectionCount,
            isStuck: this.IsStuckState(),
            chatMode: this.chatMode,
            partnerSocketId: this.partnerSocketId,
            peerIP: this.peerIP,
            myIP: this.myIP
        };
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


    #getContentPreferencesFromCookies()
    {
        try {
            // Cookie utility function to get cookie value
            function getCookie(name) {
                const nameEQ = name + "=";
                const ca = document.cookie.split(';');
                for (let i = 0; i < ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
                }
                return null;
            }

            // Convert integer preference to boolean/null
            function mapPreferenceToBoolean(preference) {
                switch (parseInt(preference)) {
                    case 0: return false; // None (block)
                    case 1: return null;  // Allow
                    case 2: return true;  // Show
                    default: return false; // Default to block if invalid
                }
            }

            // Get preferences from cookie
            const cookiePrefs = getCookie('freeyap_vibe_preferences');
            if (!cookiePrefs) {
                return {
                    nudity: false,  // Default to block
                    gore: false     // Default to block
                };
            }

            const preferences = JSON.parse(cookiePrefs);
            
            this.nudity = mapPreferenceToBoolean(preferences.nudityPreference);
            this.gore = mapPreferenceToBoolean(preferences.gorePreference);

        } catch (error) {
            console.warn('Error retrieving content preferences from cookies:', error);
        }
    }

    async #startPeerConnectionTimeout()
    {
        if (this.peer && !this.peerConnectionTimeoutStarted && !this.connectionReady)
        {
            var currentConnectionCount = this.connectionCount;

            return new Promise((resolve) => {
                this.peerConnectionTimeoutStarted = true;

                setTimeout(() => {
                    this.peerConnectionTimeoutStarted = false;

                    if (!this.connectionReady 
                        && this.connectionCount === currentConnectionCount
                        && this.peer
                        && this.peer.destroyed === false)
                    {
                        this.CloseConnection();
                        this.#raiseEvent(this.EventTypes.PEER_TIMEOUT);
                    }
                    resolve();
                }, 10000);
            });
        }
    }

    //#region Events


    #raiseEvent(eventEnumValue)
    {
        if (!Object.values(this.EventTypes).includes(eventEnumValue))
        {
            console.error(`Invalid event type: ${eventEnumValue}`);
            return;
        }

        const event = new Event(eventEnumValue);
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
                this.#raiseEvent(this.EventTypes.MATCHMAKING_ERROR);
                return;
            }

            chatMode = this.chatMode;
        }
        else
        {
            this.chatMode = chatMode;
        }

        let topics = this.#getTopicsFromURL();        
        
        if (this.socket == null || this.socket.id == null)
        {
            console.error('Socket ID is null. Cannot join matchmaking queue. Attempting to reconnect...');
            this.connectionCount++; // Invalidate any pending delayed matchmaking
            this.#raiseEvent(this.EventTypes.MATCHMAKING_ERROR);
            
            // Try to reconnect and retry matchmaking
            try 
            {
                await this.#connectToSocket();
            }
            catch (error)
            {
                console.error('Error reconnecting socket for matchmaking:', error);
                return;
            }
        }
        else
        {
            this.matchmakingAPIClient.joinQueue(this.socket.id, chatMode, this.gore, this.nudity, this.myIP, topics);
            this.#delayedMatchmakingRoutine(chatMode, topics);
        }
    }
    
    async #delayedMatchmakingRoutine(chatMode, topics = [])
    {
        var connectionCount = this.connectionCount;

        // Matchmaking stagger to prevent race conditions
        let matchmakingDelay = (Math.random() * 1000) + 9000;// Random delay between 9 and 10 seconds
        await new Promise(resolve => setTimeout(resolve, matchmakingDelay));

        // Only connect if no peer connection exists and the connection count has not changed
        if (!this.peer && this.connectionCount === connectionCount)
        {
            if (this.socket && this.socket.connected && this.socket.id != null)
            {
                this.matchmakingAPIClient.delayedMatchmaking(this.socket.id, chatMode, this.gore, this.nudity, this.myIP, topics);
            }
            else
            {
                console.error('Socket is not connected. Cannot start delayed matchmaking. Attempting to reconnect...');
                
                // Try to reconnect and retry delayed matchmaking
                try 
                {
                    await this.#connectToSocket();
                }
                catch (error)
                {
                    console.error('Error reconnecting socket for delayed matchmaking:', error);
                }
                return;
            }
        }
    }


    //#endregion

    //#region Socket Connection (Server Communication)
    async #connectToSocket(matchmake = true)
    {
        if (this.socket && this.socket.connected && this.socket.id != null)
        {
            console.warn('Socket is already connected. No need to reconnect.');

            // doesnt hurt to start matchmaking again just in case
            if (matchmake)
            {
                //this.#startMatchmaking(this.chatMode);
            }

            return Promise.resolve();
        }

        this.socketConnectionCount++;

        try 
        {
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

                if (!response.ok)
                {
                    throw new Error(`Failed to fetch IP: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // strip the local IP if included
                var fixedIP = data.ip;
                
                if (splitIp.length > 1)
                {
                    var splitIp = data.ip.split(',');
                    
                    splitIp = splitIp.filter(ip => !ip.trim().startsWith('192.168.') 
                                                && !ip.trim().startsWith('10.') 
                                                && !ip.trim().startsWith('172.') 
                                                && !ip.trim().startsWith('127.')
                                                && !ip.trim().startsWith('::1'));

                    fixedIP = splitIp[0].trim();
                    console.log('Using fixed IP');
                }
                else if (
                       data.ip.trim().startsWith('192.168.') 
                    || data.ip.trim().startsWith('10.') 
                    || data.ip.trim().startsWith('172.') 
                    || data.ip.trim().startsWith('127.')
                    || data.ip.trim().startsWith('::1')
                )
                {
                    fixedIP = null;
                    console.warn('Local IP detected, using null for myIP');
                }

                this.myIP = this.#hashIP(fixedIP);

                console.log('My hashed IP address:', this.myIP);
            }
        }
        catch (error)
        {
            console.error('Failed to fetch IP address:', error);
        }

        return new Promise((resolve, reject) =>
        {
            try 
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
                        resolve(); // Don't reject, let the retry logic handle it
                        return;
                    }

                    this.#setupSocketListeners();
                    this.#raiseEvent(this.EventTypes.SOCKET_CONNECTED);

                    if (matchmake && this.chatMode)
                    {
                        this.#startMatchmaking();
                    }

                    resolve();
                });                
                
                this.socket.on('connect_error', (error) =>
                {
                    console.error('Socket connection error:', error);
                    this.connectionCount++; // Invalidate any pending delayed matchmaking
                    this.#raiseEvent(this.EventTypes.SOCKET_CONNECTION_ERROR);
                    resolve(); // Don't reject, let the retry logic handle it
                });

                this.socket.on('disconnect', (reason) =>
                {
                    console.warn('Socket disconnected:', reason);
                    if (reason === 'io server disconnect')
                    {
                        // The disconnection was initiated by the server, reconnect manually
                        this.socket.connect();
                    }
                });
            }
            catch (error)
            {
                console.error('Error creating socket connection:', error);
                this.#raiseEvent(this.EventTypes.SOCKET_CONNECTION_ERROR);
                resolve(); // Don't reject, let the retry logic handle it
            }
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
                    this.connectionCount++; // Invalidate any pending delayed matchmaking

                    this.#raiseEvent(this.EventTypes.SOCKET_CONNECTION_TIMEOUT);

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

    #hashIP(ipAddress)
    {
        // Import CryptoJS (make sure crypto-js is loaded)
        if (typeof CryptoJS === 'undefined')
        {
            console.error('CryptoJS library not loaded');
            return null;
        }
        
        if (!ipAddress)
        {
            return null;
        }
        
        // Add a salt for consistency
        const salt = 'FreeYap2025';
        const combined = ipAddress + salt;
        
        // Create SHA256 hash
        const hash = CryptoJS.SHA256(combined).toString();
        
        return hash;
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
        this.connectionCount++; // Increment connection count to prevent delayed matchmaking from being called on the old connection

        this.#raiseEvent(this.EventTypes.MATCH_FOUND);

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
                console.warn(`Socket connection lost. Attempting to reconnect... (Attempt ${this.socketConnectionLostCount}/${this.socketConnectionLostThreshold})`);

                this.#raiseEvent(this.EventTypes.CONNECTION_LOST);

                this.socket?.disconnect();
                this.socket = null;

                // wait for a short period before reconnecting
                await new Promise(resolve => setTimeout(resolve, 2000));

                try 
                {
                    await this.#connectToSocket();
                    // Reset connection lost count on successful reconnection
                    this.socketConnectionLostCount = 0;
                }
                catch (error)
                {
                    console.error('Failed to reconnect socket:', error);
                    // Don't reset the count, let it try again or reach the threshold
                }
            }
            else
            {
                console.error(`Socket connection lost. Reached maximum reconnect attempts (${this.socketConnectionLostThreshold}).`);
                
                this.#raiseEvent(this.EventTypes.CONNECTION_CLOSED);
                this.#raiseEvent(this.EventTypes.CONNECTION_LOST_MAX_ATTEMPTS);
                this.#raiseEvent(this.EventTypes.MAX_RECONNECT_ATTEMPTS_REACHED);
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
        this.#raiseEvent(this.EventTypes.PEER_CREATED);
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
        this.#raiseEvent(this.EventTypes.PEER_CREATED);
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
            try 
            {
                const parsedData = JSON.parse(data.toString());

                if (parsedData.type === 'request-ip')
                {
                    this.SendMessage({
                        messageType: 'send-ip',
                        messageObject: { ip: this.myIP }
                    });
                }
            }
            catch (error)
            {
                console.error('Error parsing peer data:', error);
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

        // Start proper TURN detection after connection is established
        this.#detectTURNUsage();

        // Handle IP address exchange
        this.SendMessage({
            messageType: 'request-ip',
            acknowledgmentMessageType: 'send-ip',
            requireAcknowledgment: true,
            callbackFunction: data => 
            {
                this.peerIP = data.ip;// already hashed be peer
                this.#raiseEvent(this.EventTypes.PEER_IP_HASH_RECEIVED);
            }
        });

        if (this.socket)
        {
            this.socket.disconnect();
            this.socket = null;
        }

        this.#raiseEvent(this.EventTypes.CONNECTION_READY);
    }
      
    #handlePeerError(err)
    {
        console.error('Peer error:', err);
        this.#raiseEvent(this.EventTypes.CONNECTION_ERROR);
        
        // Increment connection count to invalidate delayed matchmaking regardless of recovery attempt
        this.connectionCount++;
        
        // If peer error occurs during connection attempts, try to recover
        if (!this.connectionReady && this.peer)
        {
            console.warn('Peer error during connection setup, attempting to restart connection...');
            this.CloseConnection();
        }    }
    
    /**
     * Detects if the peer connection is using TURN servers by analyzing the active ICE candidate pair.
     * This method provides accurate TURN detection by examining the actual connection path,
     * not just the configuration.
     */
    async #detectTURNUsage()
    {
        this.peerIsUsingTURN = false;

        if (!this.peer || !this.peer._pc)
        {
            console.warn('Cannot detect TURN usage: peer connection not available');
            return;
        }

        try 
        {
            // Wait a moment for ICE connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 1000));

            const stats = await this.peer._pc.getStats();
            
            for (const report of stats.values())
            {
                // Look for the selected candidate pair (the active connection)
                if (report.type === 'candidate-pair' && report.state === 'succeeded')
                {
                    // Get the local and remote candidate details
                    const localCandidate = [...stats.values()].find(
                        stat => stat.type === 'local-candidate' && stat.id === report.localCandidateId
                    );
                    const remoteCandidate = [...stats.values()].find(
                        stat => stat.type === 'remote-candidate' && stat.id === report.remoteCandidateId
                    );

                    if (localCandidate && remoteCandidate)
                    {
                        // Check if either candidate is using TURN (relay type)
                        const localUsingTURN = localCandidate.candidateType === 'relay';
                        const remoteUsingTURN = remoteCandidate.candidateType === 'relay';
                        
                        this.peerIsUsingTURN = localUsingTURN || remoteUsingTURN;
                        
                        return;
                    }
                }
            }
            
            // Fallback: if no succeeded candidate pair found, check for any relay candidates
            let hasRelayCandidate = false;
            for (const report of stats.values())
            {
                if ((report.type === 'local-candidate' || report.type === 'remote-candidate') && 
                    report.candidateType === 'relay')
                {
                    hasRelayCandidate = true;
                    break;
                }
            }
            
            this.peerIsUsingTURN = hasRelayCandidate;
            console.log(`TURN Detection (fallback): ${this.peerIsUsingTURN ? 'TURN detected' : 'Direct/STUN connection'}`);
        }
        catch (error)
        {
            console.error('Error during TURN detection:', error);
            // Default to false if detection fails
            this.peerIsUsingTURN = false;
        }
    }
    
    #handlePeerClose()
    {
        // Increment connection count to prevent delayed matchmaking from being called on the old connection
        this.connectionCount++;
        this.peer = null;
        this.connectionReady = false;
        this.peerConnectionTimeoutStarted = false;
        this.peerIP = null;
        this.partnerSocketId = null;

        if (this.socket)
        {
            this.socket.disconnect();
            this.socket = null;
        }

        this.#raiseEvent(this.EventTypes.CONNECTION_CLOSED);
        this.#connectToSocket();
    }


    //#endregion

    //#endregion

}


class MessageAcknowledgmentEnforcer
{    constructor(
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
        this.createdAt = Date.now();

        if (this.requireAcknowledgment)
        {
            this.#startTimeout();
        }
    }ReceiveCallback(data)
    {
        if (!this.receivedCallback) 
        {
            this.receivedCallback = true;
            const responseTime = Date.now();
            
            if (this.callbackFunction && typeof this.callbackFunction === 'function')
            {
                try 
                {
                    this.callbackFunction(data);
                }
                catch (error)
                {
                    console.error(`[MessageAck] Error executing callback function for ${this.messageType}:`, error);
                }
            }
        }
    }
    
    async #startTimeout()
    {
        const timeoutStart = Date.now();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const timeoutEnd = Date.now();
                const actualTimeout = timeoutEnd - timeoutStart;
                
                if (!this.receivedCallback && this.retryCount < this.maxRetries)
                {
                    this.retryCount++;

                    const sendResult = this.webRTCConnectionManager.SendMessage({
                        messageType: this.messageType,
                        messageObject: this.messageObject,
                        callbackFunction: this.callbackFunction,
                        requireAcknowledgment: this.requireAcknowledgment,
                        acknowledgmentMessageType: this.acknowledgmentMessageType,
                        acknowledgmentTimeoutMS: this.acknowledgmentTimeoutMS,
                        maxRetries: this.maxRetries,
                        ackEnf: this
                    });
                    
                    if (!sendResult)
                    {
                        console.error(`[MessageAck] Failed to send retry message for ${this.messageType}`);
                    }
                }
                else if (!this.receivedCallback && this.retryCount >= this.maxRetries)
                {
                    console.error(`[MessageAck] FINAL FAILURE - Message acknowledgment failed after ${this.maxRetries} retries`);
                    console.error(`[MessageAck] Failure Details:`);
                    console.error(`  - Message Type: ${this.messageType}`);
                    console.error(`  - Expected Ack Type: ${this.acknowledgmentMessageType}`);
                    console.error(`  - Total Attempts: ${this.retryCount}`);
                    console.error(`  - Timeout Duration: ${this.acknowledgmentTimeoutMS}ms`);
                    console.error(`  - Final Wait Time: ${actualTimeout}ms`);
                    console.error(`  - Message Object:`, this.messageObject);
                    console.error(`  - Connection State:`, this.webRTCConnectionManager.GetConnectionStatus());
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
        // Increment connection count to invalidate any pending delayed matchmaking
        window.webRTCConnectionManager.connectionCount++;
        
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