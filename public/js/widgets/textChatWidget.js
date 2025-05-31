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

        window.textChatWidget = this;
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

    SendImage(url)
    {
        this.#sendImage(url);
    }

    SendGame(embedUrl)
    {
        this.#sendGame(embedUrl);
    }

    #sendGame(embedUrl)
    {
        let type = 'sent';

        this.#addGameToUI(embedUrl, type);

        let peer = this.webRTCConnectionManager.GetPeer();

        peer.send(JSON.stringify({
            type: `${this.messageType}-game`,
            embedUrl: embedUrl,
            timestamp: new Date().toISOString()
        }));
    }

    #addGameToUI(embedUrl, type)
    {
        if (this.isFirstMessage)
        {
            this.chatLogContainer.innerHTML = ''; // Clear welcome message
            this.isFirstMessage = false;
        }

        document.querySelectorAll('.game-message').forEach(el => {
            el.innerHTML = '<i class="bi bi-controller"></i> Game Ended'; // Clear any existing game elements
        });        const gameEl = this.#createGameMessageElement(type, embedUrl);
        this.chatLogContainer.appendChild(gameEl);
        
        this.chatInput.value = '';
        this.chatLogContainer.scrollTop = this.chatLogContainer.scrollHeight;
    }    
    
    #createGameMessageElement(type, embedUrl)
    {
        const container = document.createElement('div');
        container.className = `message-container ${type} game-message-container`;
        
        const message = document.createElement('div');
        message.className = `message message-${type} game-message`;
          // Create both mobile and desktop versions, let CSS handle the display       
          message.innerHTML = `
            <div class="game-embed-container">
                <iframe src="${embedUrl}" class="game-embed" frameborder="0"></iframe>
                <div class="desktop-game-controls" style="padding: 0.5rem; border-top: 1px solid #dee2e6; background-color: #f8f9fa;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn btn-sm btn-outline-success open-game-link-btn" 
                                data-embed-url="${embedUrl}"
                                style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                            <i class="bi bi-box-arrow-up-right"></i> Open Game in a New Tab
                        </button>
                    </div>
                </div>
            </div>
            <div class="mobile-game-message">
                <div class="mobile-game-icon">
                    <i class="bi bi-controller" style="font-size: 2rem; color: var(--primary);"></i>
                </div>
                <div class="mobile-game-text">
                    <h6 style="margin: 0.5rem 0 0.25rem 0; color: var(--primary);">Game Shared</h6>
                    <p style="margin: 0; color: #6c757d; font-size: 0.9rem;">
                        Games may not work on mobile devices. Please use a desktop or laptop to play.
                    </p>
                    <button class="btn btn-sm btn-outline-primary copy-game-link-btn" 
                            data-embed-url="${embedUrl}"
                            style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                        <i class="bi bi-link-45deg"></i> Copy Link
                    </button>
                </div>
            </div>
        `;

        const meta = document.createElement('div');
        meta.className = 'message-meta';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        meta.textContent = time;
        container.appendChild(message);
        container.appendChild(meta);

        // Add event listener for copy link button
        const copyLinkBtn = container.querySelector('.copy-game-link-btn');
        if (copyLinkBtn)
        {
            copyLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const embedUrl = copyLinkBtn.getAttribute('data-embed-url');
                const gameLink = `https://freeyap.com/play-game?embed=${encodeURIComponent(embedUrl)}`;
                
                navigator.clipboard.writeText(gameLink).then(() => {
                    // Temporarily change button text to show success
                    const originalText = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = '<i class="bi bi-check"></i> Copied!';
                    copyLinkBtn.classList.remove('btn-outline-primary');
                    copyLinkBtn.classList.add('btn-success');
                    
                    setTimeout(() => {
                        copyLinkBtn.innerHTML = originalText;
                        copyLinkBtn.classList.remove('btn-success');
                        copyLinkBtn.classList.add('btn-outline-primary');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy link:', err);
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = gameLink;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                      // Show success feedback
                    const originalText = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = '<i class="bi bi-check"></i> Copied!';
                    copyLinkBtn.classList.remove('btn-outline-primary');
                    copyLinkBtn.classList.add('btn-success');
                    
                    setTimeout(() => {
                        copyLinkBtn.innerHTML = originalText;
                        copyLinkBtn.classList.remove('btn-success');
                        copyLinkBtn.classList.add('btn-outline-primary');
                    }, 2000);
                });
            });
        }

        // Add event listener for open game button
        const openGameBtn = container.querySelector('.open-game-link-btn');
        if (openGameBtn)
        {
            openGameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const embedUrl = openGameBtn.getAttribute('data-embed-url');
                const gameLink = `https://freeyap.com/play-game?embed=${encodeURIComponent(embedUrl)}`;
                
                // Open the game link in a new tab
                window.open(gameLink, '_blank');
            });
        }

        return container;
    }

    #addMessageToUI(message, type)
    {
        if (this.isFirstMessage)
        {
            this.chatLogContainer.innerHTML = ''; // Clear welcome message
            this.isFirstMessage = false;
        }

        const messageEl = this.#createTextMessageElement(type, message);
        this.chatLogContainer.appendChild(messageEl);
        
        this.chatInput.value = '';
        this.chatLogContainer.scrollTop = this.chatLogContainer.scrollHeight;
    }

    #addImageToUI(imageTag, type)
    {
        if (this.isFirstMessage)
        {
            this.chatLogContainer.innerHTML = ''; // Clear welcome message
            this.isFirstMessage = false;
        }

        const imageEl = this.#createImageMessageElement(type, imageTag);

        this.chatLogContainer.appendChild(imageEl);
        this.chatLogContainer.scrollTop = this.chatLogContainer.scrollHeight;
    }

    #sendImage(url)
    {
        let type = 'sent';

        const imageTag = this.#getImageTagFromUrl(url)

        this.#addImageToUI(imageTag, type);

        let peer = this.webRTCConnectionManager.GetPeer();

        peer.send(JSON.stringify({
            type: `${this.messageType}-image`,
            url: url,
            timestamp: new Date().toISOString()
        }));
    }

    #getImageTagFromUrl(url)
    {
        return `<img src="${url}" alt="Image, gif, or sticker sent in the chat" class="chat-image" />`;
    }

    #createTextMessageElement(type, content)
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

    #createImageMessageElement(type, imageTag)
    {
        const container = document.createElement('div');
        container.className = `message-container ${type}`;
        
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.innerHTML = imageTag; // Assuming imageTag is a valid HTML string for an image
        
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
                let type = 'received';

                const parsedData = JSON.parse(data.toString());

                if (parsedData.type === this.messageType)
                {
                    this.#addMessageToUI(parsedData.content, type);
                }
                else if (parsedData.type === `${this.messageType}-image`)
                {
                    this.#addImageToUI(this.#getImageTagFromUrl(parsedData.url), type);
                }
                else if (parsedData.type === `${this.messageType}-game`)
                {
                    this.#addGameToUI(parsedData.embedUrl, type);
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



/****** Page JS ******/

var giphyAPIClient;
var gamesAPIClient;

const debounceDelay = 700;

const trendingGifLimit = 20;
const searchGifLimit = 30;
const trendingStickerLimit = 20;
const searchStickerLimit = 30;

var emojiPicker;
var multiplayerGames;

document.addEventListener('DOMContentLoaded', function () {
    giphyAPIClient = new GiphyAPIClient();
    gamesAPIClient = new GamesAPIClient();

    initializeMediaTabSwitching();
    initializeUtilityItemFunctionality();
    addChatEnterKeyListener();
    initializeMediaButton();

    // add logic to allow closing media pop up always by clicking chat background
    document.getElementById("chat-log-container").addEventListener('click', () => {
        document.getElementById("custom-popup").style.display = 'none';
    })
});

function initializeMediaButton()
{
    var mediaButton = document.getElementById("emoji-button");
    var mediaPopUp = document.getElementById("custom-popup");

    mediaButton.addEventListener('click', () =>
    {
        initializeEmojiPicker(); // Ensure it is initialized since it is the first tab

        if (mediaPopUp.style.display == 'none')
        {
            mediaPopUp.style.display = 'block';
        }
        else
        {
            mediaPopUp.style.display = 'none';
        }
    });
}

function initializeEmojiPicker()
{
    if (!emojiPicker)
    {
        var emojiPickerContainer = document.getElementById("emoji-picker-container");
        var chatInput = document.getElementById("chat-input");

        emojiPicker = document.createElement('emoji-picker');
        emojiPicker.style.width = '100%';
        emojiPicker.style.height = '100%';
        emojiPicker.style.border = 'none';
        emojiPickerContainer.appendChild(emojiPicker);

        emojiPicker.addEventListener('emoji-click', (event) => {
            chatInput.value += event.detail.emoji.unicode;
        });
    }        
}

async function initializeGifPicker()
{
    var gifsContainer = document.getElementById("gif-container");

    if (gifsContainer.innerHTML == '')
    {
        searchGifs();

        var gifSearchBar = document.getElementById("gif-search-bar");

        let debounceTimer;

        gifSearchBar.addEventListener('keyup', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchGifs();
            }, debounceDelay);
        });
    }
}

async function searchGifs()
{
    var gifsContainer = document.getElementById("gif-container");

    gifsContainer.innerHTML =  `<div class="spinner-border" role="status">
                                    <span class="sr-only">Searching...</span>
                                </div>`;
    
    var gifSearchBar = document.getElementById("gif-search-bar");

    if (gifSearchBar.value == "")
    {
        putGifsInContainer(await giphyAPIClient.GetTrendingGifs(trendingGifLimit));
    }
    else
    {
        putGifsInContainer(await giphyAPIClient.SearchGifs(gifSearchBar.value, searchGifLimit));
    }
}

function putGifsInContainer(gifResult)
{
    var gifsContainer = document.getElementById("gif-container");

    gifsContainer.innerHTML = '';

    if (gifResult.data && gifResult.data.length > 0)
    {
        gifResult.data.forEach(gifData => {
        gifsContainer.innerHTML += `<img src="${gifData.images.original.url}" 
                                        alt="Trending GIF" 
                                        class="gif-image" 
                                        data-gif-url="${gifData.images.original.url}">`;
        });
    }
    else
    {
        gifsContainer.innerHTML = 'Giphy did not return any results';
    }
    
    const gifImages = gifsContainer.querySelectorAll('.gif-image');

    gifImages.forEach(gifImage => {
        gifImage.addEventListener('click', () => {
            window.textChatWidget.SendImage(gifImage.src);
        });
    });
}

async function initializeStickerPicker()
{
    var stickerContainer = document.getElementById("sticker-container");

    if (stickerContainer.innerHTML == '')
    {
        searchStickers();

        var stickerSearchBar = document.getElementById("sticker-search-bar");

        let debounceTimer;

        stickerSearchBar.addEventListener('keyup', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchStickers();
            }, debounceDelay);
        });
    }
}

async function searchStickers()
{
    var stickersContainer = document.getElementById("sticker-container");

    stickersContainer.innerHTML =  `<div class="spinner-border" role="status">
                                        <span class="sr-only">Searching...</span>
                                    </div>`;
    
    var stickerSearchBar = document.getElementById("sticker-search-bar");

    if (stickerSearchBar.value == "")
    {
        putStickersInContainer(await giphyAPIClient.GetTrendingStickers(trendingStickerLimit));
    }
    else
    {
        putStickersInContainer(await giphyAPIClient.SearchStickers(stickerSearchBar.value, searchStickerLimit));
    }
}

function putStickersInContainer(stickerResult)
{
    var stickerContainer = document.getElementById("sticker-container");

    stickerContainer.innerHTML = '';

    if (stickerResult.data && stickerResult.data.length > 0)
    {
        stickerResult.data.forEach(stickerData => {
        stickerContainer.innerHTML += `<img src="${stickerData.images.original.url}" 
                                            alt="Trending Sticker" 
                                            class="sticker-image" 
                                            data-sticker-url="${stickerData.images.original.url}">`;
        });
    }
    else
    {
        stickerContainer.innerHTML = 'Giphy did not return any results';
    }

    const stickerImages = stickerContainer.querySelectorAll('.sticker-image');

    stickerImages.forEach(stickerImage => {
        stickerImage.addEventListener('click', () => {
            window.textChatWidget.SendImage(stickerImage.src);
        });
    });
}

async function initializeGamesPicker()
{
    var gameContainer = document.getElementById("game-container");

    if (gameContainer.innerHTML == '')
    {
        searchGames();

        var gameSearchBar = document.getElementById("game-search-bar");
        var gameCategorySelect = document.getElementById("game-category-select");

        var gameCategories = await gamesAPIClient.getMultiplayerGameCategories();

        if (gameCategories && gameCategories.length > 0)
        {
            gameCategories.forEach(category => {
                var option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                gameCategorySelect.appendChild(option);
            });
        }

        let debounceTimer;

        gameSearchBar.addEventListener('keyup', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchGames();
            }, debounceDelay);
        });

        gameCategorySelect.addEventListener('change', () => {
            searchGames();
        });
    }
}

async function searchGames()
{
    var gameContainer = document.getElementById("game-container");
    var gameCategorySelect = document.getElementById("game-category-select");
    var selectedCategory = gameCategorySelect.value;

    gameContainer.innerHTML =  `<div class="spinner-border" role="status">
                                    <span class="sr-only">Searching...</span>
                                </div>`;
    
    var gameSearchBar = document.getElementById("game-search-bar");

    if (gameSearchBar.value == "")
    {
        if (selectedCategory == "")
        {
            putGamesInContainer(await getMultiplayerGames(null, 25));
        }
        else
        {
            putGamesInContainer(await getMultiplayerGamesByCategory(null, selectedCategory, 30));
        }
    }
    else
    {
        if (selectedCategory == "")
        {
            putGamesInContainer(await getMultiplayerGames(gameSearchBar.value, 50));
        }
        else
        {
            putGamesInContainer(await getMultiplayerGamesByCategory(gameSearchBar.value, selectedCategory, 50));
        }
    }   
}

async function getMultiplayerGames(searchTerm, limit)
{
    return await gamesAPIClient.getMultiplayerGames(searchTerm, limit);
}

async function getMultiplayerGamesByCategory(searchTerm, categoryId, limit)
{
    return await gamesAPIClient.getMultiplayerGamesByCategory(categoryId, searchTerm, limit);
}

function putGamesInContainer(gameResult)
{
    var gameContainer = document.getElementById("game-container");

    gameContainer.innerHTML = '';

    if (gameResult.data && gameResult.data.length > 0)
    {
        gameResult.data.forEach(gameData => {
            // Escape HTML characters in description for safe display in title attribute
            const escapedDescription = (gameData.description || 'No description available')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            gameContainer.innerHTML += `
                <div class="game-div" title="${escapedDescription}">
                    <img src="${gameData.image}" 
                        alt="${gameData.title}"
                        class="game-image">
                    <h5>${gameData.title}</h5>
                    <div style="display:none;" class="game-embed-url">${gameData.embed}</div>
                </div>`;
        });
    }
    else
    {
        gameContainer.innerHTML = 'No games found';
    }

    const gameDivs = gameContainer.querySelectorAll('.game-div');

    gameDivs.forEach(gameDiv => {
        gameDiv.addEventListener('click', () => {
            window.textChatWidget.SendGame(gameDiv.querySelector('.game-embed-url').innerHTML);
        });
    });
}

function initializeMediaTabSwitching()
{
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => {
                pane.style.display = 'none';
                pane.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const targetPane = document.getElementById(targetTab + '-tab');
            if (targetPane) {
                targetPane.style.display = 'block';
                targetPane.classList.add('active');
            }

            // Initialize emoji picker when emojis tab is selected
            if (targetTab === 'emojis')
            {
                initializeEmojiPicker();
            }
            else if (targetTab === 'gifs')
            {
                initializeGifPicker();
            }
            else if (targetTab === 'stickers')
            {
                initializeStickerPicker();
            }
            else if (targetTab === 'games')
            {
                initializeGamesPicker();
            }
        });
    });
}

function initializeUtilityItemFunctionality()
{
    const utilityItems = document.querySelectorAll('.utility-item');
    
    utilityItems.forEach(item => {
        item.addEventListener('click', () => {
            const utilityType = item.getAttribute('data-utility');
            console.log('Utility selected:', utilityType);
            
            alert(`${utilityType.charAt(0).toUpperCase() + utilityType.slice(1)} feature will be implemented soon!`);
        });
    });
}

function addChatEnterKeyListener()
{
    var chatInput = document.getElementById("chat-input");

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent newline in the input
            const sendButton = document.getElementById('send-button');
            if (!sendButton.disabled) {
                sendButton.click(); // Trigger the send button click
            }
        }
    });
}