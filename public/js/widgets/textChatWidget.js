class TextChatWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.eventTarget = new EventTarget();
        this.messageType = 'text-chat';

        this.statusBar = document.getElementById('status-bar');
        this.connectionStatus = document.getElementById('connection-status');
        this.emojiButton = document.getElementById('emoji-button');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        this.chatLogContainer = document.getElementById('chat-log-container');

        this.isFirstMessage = true;

        this.webRTCConnectionManager.on('connectionReady', () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on('connectionClosed', () =>
        {
            this.#handleConnectionClosed();
        });

        this.sendButton.addEventListener('click', () =>    
        {
            const message = this.chatInput.value;
            if (message.trim())
            {
                this.SendMessage(message);
            }
        });
    }

    SendMessage(message)
    {
        let type = 'sent';
        let peer = this.webRTCConnectionManager.GetPeer();

        if (!peer || peer.destroyed)
        {
            console.error('Peer connection is not ready. Cannot send message.');
            return false;
        }
        
        try
        {
            const formattedMessage =
                {
                    type: this.messageType,
                    content: message,
                    timestamp: new Date().toISOString()
                };
            
            peer.send(JSON.stringify(formattedMessage));

            this.#addMessageToUI(message, type);

            return true;
        }
        catch (error)
        {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    #addMessageToUI(message, type)
    {
        if (this.isFirstMessage)
        {
            this.chatLogContainer.innerHTML = ''; // Clear welcome message
            this.isFirstMessage = false;
        }

        const messageEl = this.#createMessageElement(type, message);
        this.chatLogContainer.appendChild(messageEl);
        
        this.chatInput.value = '';
        this.chatLogContainer.scrollTop = this.chatLogContainer.scrollHeight;
    }

    #createMessageElement(type, content)
    {
        const container = document.createElement('div');
        container.className = `message-container ${type}`;
        
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = content;
        
        const meta = document.createElement('div');
        meta.className = 'message-meta';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        meta.textContent = time;
        
        container.appendChild(message);
        container.appendChild(meta);
        
        return container;
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
                    let type = 'received';
                    this.#addMessageToUI(parsedData.content, type);
                }
            }
            catch (error)
            {
                console.error(error);
            }
        });
    }

    #handleConnectionReady()
    {
        this.#setupDataChannel(this.webRTCConnectionManager.GetPeer());

        this.chatInput.disabled = false;
        this.sendButton.disabled = false;
        this.emojiButton.disabled = false;

        this.chatLogContainer.innerHTML =   `<div class="welcome-message text-center p-4">
                                                <h5>You're Connected!</h5>
                                                <p>No messages yet, send one!</p>
                                             </div>`;
        
        this.isFirstMessage = true; // Reset for new connection
    }

    #handleConnectionClosed()
    {
        this.chatInput.disabled = true;
        this.sendButton.disabled = true;
        this.emojiButton.disabled = true;

        this.chatLogContainer.innerHTML =   `<div class="welcome-message text-center p-4">
                                                <h5>Welcome to FreeYap!</h5>
                                                <p>You can chat here once you're connected to a partner.</p>
                                             </div>`;
        
        this.isFirstMessage = true; // Reset for new connection
    }
}

