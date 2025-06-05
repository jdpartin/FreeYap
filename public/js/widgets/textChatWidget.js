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
        
        this.chatLogContainer.scrollTop = this.chatLogContainer.scrollHeight;

        if (type === 'sent')
        {
            this.chatInput.value = ''; // Clear input after sending
        }
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
          this.isFirstMessage = true; // Reset for new connection        // Reset ice breaker button to original state
        const generateTemplateBtn = document.getElementById('generate-template-btn');
        if (generateTemplateBtn) {
            generateTemplateBtn.innerHTML = '<i class="bi bi-pencil"></i> Create Introduction';
            generateTemplateBtn.removeAttribute('data-mode');
        }
        
        // Clear compatibility score display
        this.clearCompatibilityScore();
        
        // Hide generated message container
        const container = document.getElementById('generated-message-container');
        if (container) {
            container.style.display = 'none';
        }

        // Reset ice-breaker tab state
        this.#resetIceBreakerTab();
        
        // Close media selector popup
        this.#closeMediaSelectorPopup();
    }

    /**
     * Reset ice-breaker tab to initial state when connection closes
     * @private
     */
    #resetIceBreakerTab()
    {
        // Reset ice-breaker container initialization state
        const iceBreakerContainer = document.getElementById('ice-breaker-container');
        if (iceBreakerContainer) {
            iceBreakerContainer.removeAttribute('data-initialized');
        }

        // Reset suggested games container population state
        const suggestedGamesContainer = document.getElementById('suggested-games-container');
        if (suggestedGamesContainer) {
            suggestedGamesContainer.removeAttribute('data-populated');
            suggestedGamesContainer.innerHTML = '<p class="text-muted text-center">Games will appear here when you connect with someone.</p>';
        }
    }

    /**
     * Close the media selector popup when connection closes
     * @private
     */
    #closeMediaSelectorPopup()
    {
        const customPopup = document.getElementById('custom-popup');
        if (customPopup) {
            customPopup.style.display = 'none';
        }
    }

    updateCompatibilityScore()
    {
        const compatibilityDisplay = document.getElementById('compatibility-score-display');
        if (!compatibilityDisplay) 
        {
            console.warn('Compatibility score display element not found');
            return;
        }

        try 
        {
            const score = getTopicCompatabilityScore();
            
            if (score === '' || score === null || score === undefined) 
            {
                // No score available yet - show loading state
                compatibilityDisplay.innerHTML = `
                    <div class="compatibility-loading text-center">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span class="ms-2 text-muted">Calculating compatibility...</span>
                    </div>
                `;
                return;
            }

            // Convert score to percentage and determine compatibility level
            const percentage = Math.round(score * 100);
            let compatibilityLevel = '';
            let compatibilityColor = '';
            let compatibilityIcon = '';

            if (percentage >= 80) 
            {
                compatibilityLevel = 'Excellent Match!';
                compatibilityColor = 'success';
                compatibilityIcon = '🔥';
            } 
            else if (percentage >= 60) 
            {
                compatibilityLevel = 'Great Match!';
                compatibilityColor = 'primary';
                compatibilityIcon = '⭐';
            } 
            else if (percentage >= 40) 
            {
                compatibilityLevel = 'Good Match';
                compatibilityColor = 'warning';
                compatibilityIcon = '👍';
            } 
            else 
            {
                compatibilityLevel = 'Different Interests';
                compatibilityColor = 'secondary';
                compatibilityIcon = '🤝';
            }

            // Update the display with the score
            compatibilityDisplay.innerHTML = `
                <div class="compatibility-score-container">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="compatibility-icon">${compatibilityIcon}</span>
                        <div class="compatibility-percentage text-${compatibilityColor} fw-bold fs-5">
                            ${percentage}%
                        </div>
                    </div>
                    <div class="compatibility-level text-${compatibilityColor} fw-semibold">
                        ${compatibilityLevel}
                    </div>
                    <div class="compatibility-description text-muted small mt-1">
                        Based on ${window.topicsWidget?.myTopics?.size || 0} of your topics and ${window.topicsWidget?.peerTopics?.size || 0} of theirs
                    </div>
                </div>
            `;
        } 
        catch (error) 
        {
            console.error('Error updating compatibility score:', error);
            compatibilityDisplay.innerHTML = `
                <div class="compatibility-error text-center text-muted">
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="ms-1">Unable to calculate compatibility</span>
                </div>
            `;
        }
    }    clearCompatibilityScore()
    {
        const compatibilityDisplay = document.getElementById('compatibility-score-display');
        if (compatibilityDisplay) 
        {
            compatibilityDisplay.innerHTML = `
                <div class="compatibility-waiting text-center text-muted">
                    <i class="bi bi-heart"></i>
                    <span class="ms-1">Connect to see compatibility</span>
                </div>
            `;
        }
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

    var gifData = gifResult;

    gifsContainer.innerHTML = '';

    if (gifData && gifData.length > 0)
    {
        gifData.forEach(gifData => {
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

    var stickerData = stickerResult;

    stickerContainer.innerHTML = '';

    if (stickerData && stickerData.length > 0)
    {
        stickerData.forEach(stickerData => {
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
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                
                // Reset ice-breakers icon to black when deactivating
                if (btn.getAttribute('data-tab') === 'ice-breakers') {
                    btn.innerHTML = `<i class="icon-icebreaker"></i>`
                    
                    // Reset the generate button when leaving ice-breakers tab
                    const generateTemplateBtn = document.getElementById('generate-template-btn');
                    if (generateTemplateBtn) {
                        generateTemplateBtn.innerHTML = '<i class="bi bi-pencil"></i> Create Introduction';
                        generateTemplateBtn.removeAttribute('data-mode');
                    }
                    
                    // Hide generated message container
                    const container = document.getElementById('generated-message-container');
                    if (container) {
                        container.style.display = 'none';
                    }
                }
            });
            tabPanes.forEach(pane => {
                pane.style.display = 'none';
                pane.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            
            // Change ice-breakers icon to white when activating
            if (targetTab === 'ice-breakers') {
                button.innerHTML = `<i class="icon-icebreaker active"></i>`;
            }
            
            const targetPane = document.getElementById(targetTab + '-tab');
            if (targetPane) {
                targetPane.style.display = 'block';
                targetPane.classList.add('active');
            }            // Initialize emoji picker when emojis tab is selected
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
            else if (targetTab === 'ice-breakers')
            {
                initializeIceBreakerPicker();
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

function initializeIceBreakerPicker()
{
    // Check if event listeners are already attached to prevent duplicate initialization
    const iceBreakerContainer = document.getElementById('ice-breaker-container');
    if (!iceBreakerContainer || iceBreakerContainer.hasAttribute('data-initialized')) {
        return;
    }
    
    // Mark as initialized
    iceBreakerContainer.setAttribute('data-initialized', 'true');
    
    // Set up event listeners for AI-powered message buttons
    const generateTemplateBtn = document.getElementById('generate-template-btn');
    if (generateTemplateBtn) {
        generateTemplateBtn.addEventListener('click', () => {
            const originalHtml = generateTemplateBtn.innerHTML;
            generateTemplateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Generating...';
            generateTemplateBtn.disabled = true;
            
            setTimeout(() => {
                try {
                    // Generate the personalized introduction message
                    const introMessage = createPeerIntroductionMessage();
                    
                    // Reset button state
                    generateTemplateBtn.innerHTML = originalHtml;
                    generateTemplateBtn.disabled = false;
                    
                    if (introMessage) {
                        displayGeneratedMessage(introMessage);
                        // Change button to regenerate mode
                        updateButtonToRegenerateMode(generateTemplateBtn);
                    } else {
                        alert('Unable to generate a personalized message at this time. Please try again when you\'re connected to a partner.');
                    }
                } catch (error) {
                    console.error('Error generating introduction message:', error);
                    generateTemplateBtn.innerHTML = originalHtml;
                    generateTemplateBtn.disabled = false;
                    alert('An error occurred while generating your message. Please try again.');
                }
            }, 800); // Shorter delay for better UX
        });
    }
    
    const topicInsightsBtn = document.getElementById('topic-insights-btn');
    if (topicInsightsBtn) {
        topicInsightsBtn.addEventListener('click', () => {
            alert('Topic Insights coming soon! This will show your compatibility score and shared interest analysis.');
        });
    }
    
    // Set up event listeners for recommended content buttons
    const recommendedGifsBtn = document.getElementById('recommended-gifs-btn');
    if (recommendedGifsBtn) {
        recommendedGifsBtn.addEventListener('click', () => {
            alert('Smart GIF recommendations coming soon! Based on your shared interests semantic analysis.');
        });
    }
    
    const recommendedStickersBtn = document.getElementById('recommended-stickers-btn');
    if (recommendedStickersBtn) {
        recommendedStickersBtn.addEventListener('click', () => {
            alert('Smart Sticker recommendations coming soon! Perfectly matched to your combined interests.');
        });
    }
    
    const recommendedGamesBtn = document.getElementById('recommended-games-btn');
    if (recommendedGamesBtn) {
        recommendedGamesBtn.addEventListener('click', () => {
            alert('Smart Game recommendations coming soon! Games you\'ll both love based on your interests.');
        });
    }
    
    const compatibilityBtn = document.getElementById('compatibility-btn');
    if (compatibilityBtn) {
        compatibilityBtn.addEventListener('click', () => {
            alert('Compatibility Score coming soon! See how well your interests align with a detailed breakdown.');
        });
    }
    
    // Set up event listeners for conversation starter items
    const iceBreakerItems = document.querySelectorAll('.ice-breaker-item[data-question]');
    iceBreakerItems.forEach(item => {
        item.addEventListener('click', () => {
            const question = item.getAttribute('data-question');
            const chatInput = document.getElementById('chat-input');
            const sendButton = document.getElementById('send-button');
            
            if (chatInput && !chatInput.disabled && question) {
                chatInput.value = question;
                if (!sendButton.disabled) {
                    sendButton.click();
                }
                
                // Close the popup after sending
                const popup = document.getElementById('custom-popup');
                if (popup) {
                    popup.style.display = 'none';
                }
            }
        });
    });
    
    // Set up event listeners for fun interactive feature buttons
    const quickPollBtn = document.getElementById('quick-poll-btn');
    if (quickPollBtn) {
        quickPollBtn.addEventListener('click', () => {
            alert('Quick Poll feature coming soon! Create instant polls to learn about each other.');
        });
    }
    
    const wouldYouRatherBtn = document.getElementById('would-you-rather-btn');
    if (wouldYouRatherBtn) {
        wouldYouRatherBtn.addEventListener('click', () => {
            alert('Would You Rather questions coming soon! Fun dilemmas based on your interests.');
        });
    }
      
    const factShareBtn = document.getElementById('fact-share-btn');
    if (factShareBtn) {
        factShareBtn.addEventListener('click', () => {
            alert('Fun Facts sharing coming soon! Discover interesting facts about your shared topics.');
        });
    }

    // Update compatibility score when ice-breakers tab is first opened
    if (window.textChatWidget) {
        window.textChatWidget.updateCompatibilityScore();
    }

    populateGamesForYouBoth(); // Populate games for both users based on shared topics
}

async function populateGamesForYouBoth()
{
    const suggestedGamesContainer = document.getElementById('suggested-games-container');
    
    if (!suggestedGamesContainer)
    {
        console.error('Suggested games container not found');
        return;
    }

    // Check if already populated to avoid re-populating
    if (suggestedGamesContainer.hasAttribute('data-populated'))
    {
        return;
    }

    // Mark as being populated
    suggestedGamesContainer.setAttribute('data-populated', 'true');

    // Show loading state
    suggestedGamesContainer.innerHTML = `
        <div class="text-center p-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="sr-only">Loading games...</span>
            </div>
            <div class="mt-2 text-muted">Finding perfect games for you both...</div>
        </div>
    `;

    try
    {
        // Get shared topics keywords for game matching
        let keywords = [];
        
        if (window.topicsWidget && window.topicsWidget.topicSimilarityMap)
        {
            // Extract keywords from shared topics
            const topicMap = window.topicsWidget.topicSimilarityMap;
            keywords = Array.from(topicMap.keys());
            
            // Also include the matched topics
            Array.from(topicMap.values()).forEach(match => {
                if (match.topic && !keywords.includes(match.topic))
                {
                    keywords.push(match.topic);
                }
            });

            console.log('Shared topics keywords:', keywords);
        }

        // If no shared topics, get some popular multiplayer games
        if (keywords.length === 0)
        {
            const fallbackGames = await gamesAPIClient.getMultiplayerGames('', 5);
            displaySuggestedGames(fallbackGames.data || [], false);
            return;
        }

        // Get best matching games using our new endpoint
        const matchingGameResponse = await gamesAPIClient.getBestMatchingMultiplayerGames(keywords, 5);
        
        if (matchingGameResponse.success && matchingGameResponse.data)
        {
            displaySuggestedGames(matchingGameResponse.data, true);
        }
        else
        {
            // Fallback to random popular games
            const fallbackGames = await gamesAPIClient.getMultiplayerGames('', 3);
            displaySuggestedGames(fallbackGames.data || [], false);
        }
    }
    catch (error)
    {
        console.error('Error populating games for you both:', error);
        suggestedGamesContainer.innerHTML = `
            <div class="text-center p-3 text-muted">
                <i class="bi bi-exclamation-circle"></i>
                <div>Unable to load game suggestions right now</div>
            </div>
        `;
    }
}

function displaySuggestedGames(games, isPersonalized)
{
    const suggestedGamesContainer = document.getElementById('suggested-games-container');
    
    if (!games || games.length === 0)
    {
        suggestedGamesContainer.innerHTML = `
            <div class="text-center p-3 text-muted">
                <i class="bi bi-controller"></i>
                <div>No games found - try the Games tab for more options!</div>
            </div>
        `;
        return;
    }

    const gameElements = games.map(game => {
        // Escape HTML characters for safe display
        const escapedTitle = (game.title || 'Untitled Game')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
            
        const escapedDescription = (game.description || 'No description available')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Truncate description for display
        const maxLength = 80;
        const truncatedDescription = escapedDescription.length > maxLength 
            ? escapedDescription.substring(0, maxLength) + '...' 
            : escapedDescription;

        return `
            <div class="suggested-game-item mb-2 p-2 border rounded" 
                 style="cursor: pointer; transition: all 0.3s ease; border-color: rgba(255, 79, 122, 0.2) !important;"
                 data-embed-url="${game.embed}"
                 data-game-title="${escapedTitle}"
                 onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 3px 8px rgba(255, 79, 122, 0.15)'; this.style.borderColor='var(--primary)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='rgba(255, 79, 122, 0.2)';">
                <div class="d-flex align-items-center">
                    <img src="${game.image}" 
                         alt="${escapedTitle}"
                         class="rounded me-2"
                         style="width: 50px; height: 50px; object-fit: cover;"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjBGMkY1Ii8+CjxwYXRoIGQ9Ik0yNSAyNUwyMCAyMFYzMEwyNSAyNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';">
                    <div class="flex-grow-1">
                        <h6 class="mb-1" style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">${escapedTitle}</h6>
                        <p class="mb-0 text-muted" style="font-size: 0.75rem; line-height: 1.3;">${truncatedDescription}</p>
                    </div>
                    <i class="bi bi-play-circle text-primary ms-2" style="font-size: 1.2rem;"></i>
                </div>
            </div>
        `;
    }).join('');

    const headerText = isPersonalized 
        ? '<i class="bi bi-heart text-danger"></i> Perfect matches based on your interests!'
        : '<i class="bi bi-star text-warning"></i> Popular multiplayer games';

    suggestedGamesContainer.innerHTML = `
        <div class="mb-2 text-center">
            <small class="text-muted">${headerText}</small>
        </div>
        ${gameElements}
    `;

    // Add click event listeners to suggested game items
    const gameItems = suggestedGamesContainer.querySelectorAll('.suggested-game-item');
    gameItems.forEach(item => {
        item.addEventListener('click', () => {
            const embedUrl = item.getAttribute('data-embed-url');
            const gameTitle = item.getAttribute('data-game-title');
            
            if (embedUrl && window.textChatWidget)
            {
                window.textChatWidget.SendGame(embedUrl);
                
                // Close the popup after sending
                const popup = document.getElementById('custom-popup');
                if (popup)
                {
                    popup.style.display = 'none';
                }
            }
        });
    });
}

function createPeerIntroductionMessage()
{
    if (!window.topicsWidget || !window.topicsWidget.semanticSimilarityAPIClient)
    {
        console.error('Topics Widget or Semantic Similarity API Client is not initialized.');
        return '';
    }

    var semanticSimilarityAPIClient = window.topicsWidget.semanticSimilarityAPIClient;

    /*Example value:
     * Map {
     *   "programming" => { topic: "coding", similarity: 0.87 },
     *   "music" => { topic: "songs", similarity: 0.72 },
     *   "sports" => { topic: "basketball", similarity: 0.65 },
     *   "cooking" => { topic: "recipes", similarity: 0.81 }
     * }
     */    var topicsMapping = window.topicsWidget.topicSimilarityMap;

    // Message templates for when there are no shared topics
    const noSharedTopicsMessages = [
        "Hey! Looks like we have different interests - perfect chance to learn something new! What's something you're passionate about?",
        "Hi there! We seem to have totally different vibes - I love that! What's one thing you're really into?",
        "Hey! Different interests = great conversations! What's something you could talk about for hours?",
        "Nice to meet you! I'm curious - what's been keeping you excited lately?",
        "Hey! Variety is the spice of life - what's something you're into that might surprise me?"
    ];

    // Check if we have any topic mappings to work with
    if (!topicsMapping || topicsMapping.size === 0)
    {
        const randomIndex = Math.floor(Math.random() * noSharedTopicsMessages.length);
        return noSharedTopicsMessages[randomIndex];
    }

    // get the entry with the highest similarity score
    var bestMatch = Array.from(topicsMapping.entries()).reduce((best, current) => {
        return current[1].similarity > best[1].similarity ? current : best;
    });
    
    // Create a message based on the best match

    // Message templates for identical topics
    const identicalTopicMessages = [
        (topic) => `Hey! I see we're both into ${topic}! What got you started with it?`,
        (topic) => `Cool, another ${topic} enthusiast! What's your favorite thing about it lately?`,
        (topic) => `Nice! We both love ${topic}. Any recent discoveries or favorites you'd recommend?`,
        (topic) => `Sweet! Fellow ${topic} fan here. What's something about it that others might not know?`,
        (topic) => `Awesome! We both like ${topic}. What's been your latest obsession with it?`,
        (topic) => `Hey there! ${topic} is great - what's your current favorite thing about it?`
    ];

    // Message templates for similar but different topics
    const similarTopicMessages = [
        (topic1, topic2) => `Hey! I love ${topic1} and I see you're into ${topic2} - I bet there's some cool overlap there. What connects them for you?`,
        (topic1, topic2) => `Cool! ${topic1} and ${topic2} have some interesting similarities. Which one got you hooked first?`,
        (topic1, topic2) => `Nice! We've got ${topic1} and ${topic2} in common. Ever noticed how they complement each other?`,
        (topic1, topic2) => `Hey there! ${topic1} meets ${topic2} - sounds like we have similar tastes! What's your current favorite in either area?`,
        (topic1, topic2) => `Sweet! ${topic1} and ${topic2} - great combo! What's something exciting happening in either world lately?`,
        (topic1, topic2) => `Awesome! I'm into ${topic1} and you like ${topic2}. Any chance there's some crossover between them?`
    ];

    // if the words are identical
    if (bestMatch[0] === bestMatch[1].topic)
    {
        const randomIndex = Math.floor(Math.random() * identicalTopicMessages.length);
        return identicalTopicMessages[randomIndex](bestMatch[0]);
    }
    else
    {
        const randomIndex = Math.floor(Math.random() * similarTopicMessages.length);
        return similarTopicMessages[randomIndex](bestMatch[0], bestMatch[1].topic);
    }
}

function displayGeneratedMessage(message)
{
    const container = document.getElementById('generated-message-container');
    const messageText = document.getElementById('generated-message-text');
    const messageWrapper = container?.querySelector('.generated-message-wrapper');
    
    if (!container || !messageText || !messageWrapper) {
        console.error('Generated message display elements not found');
        return;
    }
    
    // Display the message
    messageText.textContent = message;
    container.style.display = 'block';
    
    // Add click event listener to send the message
    messageWrapper.onclick = function() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
        if (chatInput && !chatInput.disabled && message) {
            // Set the message in the input field
            chatInput.value = message;
            
            // Send the message if the send button is enabled
            if (sendButton && !sendButton.disabled) {
                sendButton.click();
            }
            
            // Hide the generated message container after sending
            container.style.display = 'none';
              // Reset button to original state
            const generateTemplateBtn = document.getElementById('generate-template-btn');
            if (generateTemplateBtn) {
                generateTemplateBtn.innerHTML = '<i class="bi bi-pencil"></i> Create Introduction';
                generateTemplateBtn.removeAttribute('data-mode');
            }
            
            // Close the popup after sending
            const popup = document.getElementById('custom-popup');
            if (popup) {
                popup.style.display = 'none';
            }
        }
    };
    
    // Add hover effects for better UX
    messageWrapper.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 12px rgba(255, 79, 122, 0.3)';
        this.style.borderColor = 'var(--primary)';
    });
    
    messageWrapper.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        this.style.borderColor = 'var(--primary)';
    });
}

function updateButtonToRegenerateMode(button)
{
    button.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Regenerate';
    button.setAttribute('data-mode', 'regenerate');
}

function resetButtonToOriginalMode(button)
{
    button.innerHTML = '<i class="bi bi-pencil"></i> Create Introduction';
    button.removeAttribute('data-mode');
}

function getTopicCompatabilityScore()
{
    if (!window.topicsWidget || !window.topicsWidget.semanticSimilarityAPIClient)
    {
        console.error('Topics Widget or Semantic Similarity API Client is not initialized.');
        return '';
    }

    var topicsWidget = window.topicsWidget;
    var semanticSimilarityAPIClient = topicsWidget.semanticSimilarityAPIClient;

    // Check if both topic maps exist and have embeddings
    if (!topicsWidget.myTopics || !topicsWidget.peerTopics || 
        topicsWidget.myTopics.size === 0 || topicsWidget.peerTopics.size === 0)
    {
        console.log('Missing topic data for compatibility calculation');
        return '';
    }

    console.log('Calculating compatibility score for topics:', topicsWidget.myTopics, topicsWidget.peerTopics);

    // Convert Map values to arrays for the CalculateAverageSimilarity function
    const myTopicEmbeddings = Array.from(topicsWidget.myTopics.values());
    const peerTopicEmbeddings = Array.from(topicsWidget.peerTopics.values());

    return semanticSimilarityAPIClient.CalculateAverageSimilarity(myTopicEmbeddings, peerTopicEmbeddings);
}

