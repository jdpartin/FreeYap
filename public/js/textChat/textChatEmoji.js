/**
 * TextChatEmoji - Emoji and GIF functionality for text chat widget
 * Handles emoji picker, GIF search, and related messaging features
 */

class TextChatEmoji {
    constructor(widgetId, elements, core, options = {}) {
        this.widgetId = widgetId;
        this.elements = elements;
        this.core = core;
        this.options = options;

        this.currentEmojiCategory = 'smileys';
        this.gifSearchTimeout = null;

        this.init();
    }

    init() {
        if (!this.options.enableEmoji && !this.options.enableGif) {
            this.hideEmojiGifPanel();
            return;
        }

        console.log(`TextChatEmoji initializing for widget: ${this.widgetId}`);
        
        this.setupEventListeners();
        
        if (this.options.enableEmoji) {
            this.setupEmojiPanel();
        }
        
        if (this.options.enableGif) {
            this.setupGifPanel();
        }

        // Listen for core events
        this.core.on('connected', () => this.enableEmojiFeatures());
        this.core.on('chatEnded', () => this.disableEmojiFeatures());
        this.core.on('customMessage', (message) => this.handleCustomMessage(message));
    }

    hideEmojiGifPanel() {
        if (this.elements.emojiGifPanel) {
            this.elements.emojiGifPanel.style.display = 'none';
        }
        if (this.elements.emojiButton) {
            this.elements.emojiButton.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Emoji button toggle
        if (this.elements.emojiButton) {
            this.elements.emojiButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEmojiGifPanel();
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (event) => {
            if (!this.elements.widget.contains(event.target)) {
                this.closeEmojiGifPanel();
            }
        });

        // Setup emoji category buttons
        const categoryButtons = this.elements.widget.querySelectorAll('.emoji-categories button');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchEmojiCategory(btn.dataset.category, btn);
            });
        });

        // Setup GIF search
        const gifSearchInput = this.elements.widget.querySelector(`#${this.widgetId}-gifSearch`);
        if (gifSearchInput) {
            gifSearchInput.addEventListener('input', (e) => {
                this.handleGifSearch(e.target.value);
            });
        }
    }

    setupEmojiPanel() {
        const emojiContainer = this.elements.widget.querySelector(`#${this.widgetId}-emoji-smileys`);
        if (!emojiContainer) return;

        this.populateEmojiCategory('smileys', emojiContainer);
        
        // Setup other emoji categories
        this.setupEmojiCategories();
    }

    setupEmojiCategories() {
        const emojiCategories = {
            smileys: [
                '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', 
                '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', 
                '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', 
                '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', 
                '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
            ],
            people: [
                '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', 
                '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', 
                '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', 
                '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'
            ],
            animals: [
                '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', 
                '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', 
                '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', 
                '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', 
                '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'
            ],
            food: [
                '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', 
                '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', 
                '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', 
                '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', 
                '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫'
            ],
            activities: [
                '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', 
                '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', 
                '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', 
                '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🏇', '🧘‍♀️', 
                '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️'
            ],
            travel: [
                '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', 
                '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🚁', '✈️', '🛫', '🛬', '💺', '🚀', '🛸', 
                '🚉', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚝', '🚃', '🚋', 
                '🚌', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🎢', '🎡', '🎠', '🏗️', '🌁', '🗼', 
                '🏭', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽'
            ],
            objects: [
                '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', 
                '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', 
                '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', 
                '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', 
                '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️'
            ],
            symbols: [
                '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', 
                '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', 
                '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', 
                '♑', '♒', '♓', '🆔', '⚛️', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', 
                '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲'
            ]
        };

        // Setup each category container
        Object.keys(emojiCategories).forEach(category => {
            const container = this.elements.widget.querySelector(`#${this.widgetId}-emoji-${category}`);
            if (container) {
                this.populateEmojiCategory(category, container, emojiCategories[category]);
            }
        });
    }

    populateEmojiCategory(category, container, emojis = null) {
        if (!container) return;

        // Use provided emojis or get from default set
        const emojiList = emojis || this.getDefaultEmojis();
        
        container.innerHTML = '';
        emojiList.forEach(emoji => {
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emoji;
            emojiSpan.className = 'emoji-item';
            emojiSpan.title = emoji;
            emojiSpan.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            container.appendChild(emojiSpan);
        });
    }

    getDefaultEmojis() {
        return ['😊', '😂', '🤔', '👍', '👎', '❤️', '😍', '😢', '😡', '🙄', '😎', '🤗', '😴', '🤯', '🎉'];
    }

    switchEmojiCategory(category, button) {
        // Update active state
        const categoryButtons = this.elements.widget.querySelectorAll('.emoji-categories button');
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show/hide emoji containers
        const allContainers = this.elements.widget.querySelectorAll('[id*="emoji-"]');
        allContainers.forEach(container => {
            if (container.id.includes(`emoji-${category}`)) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });

        this.currentEmojiCategory = category;
    }

    insertEmoji(emoji) {
        if (this.elements.messageInput) {
            const start = this.elements.messageInput.selectionStart;
            const end = this.elements.messageInput.selectionEnd;
            const value = this.elements.messageInput.value;
            
            this.elements.messageInput.value = value.substring(0, start) + emoji + value.substring(end);
            
            // Move cursor position after the inserted emoji
            this.elements.messageInput.selectionStart = this.elements.messageInput.selectionEnd = start + emoji.length;
            this.elements.messageInput.focus();
        }
        
        this.closeEmojiGifPanel();
    }

    setupGifPanel() {
        this.loadTrendingGifs();
    }

    handleGifSearch(query) {
        if (this.gifSearchTimeout) {
            clearTimeout(this.gifSearchTimeout);
        }

        this.gifSearchTimeout = setTimeout(() => {
            if (query.trim().length > 2) {
                this.searchGifs(query);
            } else {
                this.loadTrendingGifs();
            }
        }, 500);
    }

    async searchGifs(query) {
        const gifResults = this.elements.widget.querySelector(`#${this.widgetId}-gifResults`);
        if (!gifResults) return;

        // Display loading state
        gifResults.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div></div>';

        try {
            // Use Giphy API (replace with your own API key for production)
            const apiKey = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
            const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&offset=0&rating=pg&lang=en`;

            const response = await fetch(url);
            const data = await response.json();

            this.displayGifs(data.data || [], gifResults);
        } catch (error) {
            console.error('Error fetching GIFs:', error);
            this.loadTrendingGifs(); // Fallback to trending
        }
    }

    async loadTrendingGifs() {
        const gifResults = this.elements.widget.querySelector(`#${this.widgetId}-gifResults`);
        if (!gifResults) return;

        try {
            const apiKey = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
            const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=pg`;

            const response = await fetch(url);
            const data = await response.json();

            this.displayGifs(data.data || [], gifResults);
        } catch (error) {
            console.error('Error loading trending GIFs:', error);
            this.displayFallbackGifs(gifResults);
        }
    }

    displayGifs(gifs, container) {
        if (!container) return;

        if (gifs.length === 0) {
            container.innerHTML = '<div class="text-center p-3 text-muted">No GIFs found</div>';
            return;
        }

        let html = '';
        gifs.forEach(gif => {
            const gifUrl = gif.images.fixed_height_small.url;
            const fullGifUrl = gif.images.fixed_height.url;
            const title = gif.title || 'GIF';
            html += `
                <div class="gif-item" data-gif-url="${fullGifUrl}">
                    <img src="${gifUrl}" alt="${title}" title="${title}" loading="lazy">
                </div>
            `;
        });

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.gif-item').forEach(item => {
            item.addEventListener('click', () => {
                const gifUrl = item.dataset.gifUrl;
                this.sendGif(gifUrl);
            });
        });
    }

    displayFallbackGifs(container) {
        const fallbackGifs = [
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTFhMGFtOHg2cDk3dDltbWV4dXp2cjZsbG9zZDkwYWd3cjZtcmI1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13CoXDiaCcCoyk/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmEyMDRkYmEwM2MyN2YxY2RlODRjYzQ1ZTljNjJiNjdmOTExM2NiMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xUPGcg1IJEKGCI6r5e/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnJseTdwc3ExeDhjZWVhZ2Z6YmFheTI4bHA5NXZ5c3RjdnAzN3l1eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/10bxTLrpJNS0PC/giphy.gif'
        ];

        let html = '';
        fallbackGifs.forEach(url => {
            html += `
                <div class="gif-item" data-gif-url="${url}">
                    <img src="${url}" alt="GIF" loading="lazy">
                </div>
            `;
        });

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.gif-item').forEach(item => {
            item.addEventListener('click', () => {
                const gifUrl = item.dataset.gifUrl;
                this.sendGif(gifUrl);
            });
        });
    }

    sendGif(gifUrl) {
        if (!this.core.isConnected) {
            console.warn('Cannot send GIF: not connected');
            return;
        }

        const gifMessage = {
            type: 'gif',
            url: gifUrl
        };

        if (this.core.sendCustomMessage(gifMessage)) {
            this.displaySentGif(gifUrl);
            this.closeEmojiGifPanel();
        }
    }

    displaySentGif(gifUrl) {
        // Remove welcome message if it exists
        const welcomeMessage = this.elements.chatBox.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message-container sent';

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageElement.innerHTML = `
            <div class="message message-sent">
                <div class="message-content">
                    <img src="${gifUrl}" alt="GIF" style="max-width: 100%; border-radius: 8px;" loading="lazy">
                </div>
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                    <i class="bi bi-check2-all"></i>
                </div>
            </div>
        `;

        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    displayReceivedGif(gifUrl, senderName) {
        // Remove welcome message if it exists
        const welcomeMessage = this.elements.chatBox.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message-container received';

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageElement.innerHTML = `
            <div class="message message-received">
                <div class="message-content">
                    <img src="${gifUrl}" alt="GIF" style="max-width: 100%; border-radius: 8px;" loading="lazy">
                </div>
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                </div>
            </div>
        `;

        this.elements.chatBox.appendChild(messageElement);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    handleCustomMessage(message) {
        if (message.type === 'gif') {
            this.displayReceivedGif(message.url, this.core.partnerName || 'Partner');
        }
    }

    toggleEmojiGifPanel() {
        if (this.elements.emojiGifPanel) {
            this.elements.emojiGifPanel.classList.toggle('d-none');
        }
    }

    closeEmojiGifPanel() {
        if (this.elements.emojiGifPanel) {
            this.elements.emojiGifPanel.classList.add('d-none');
        }
    }

    enableEmojiFeatures() {
        if (this.elements.emojiButton) {
            this.elements.emojiButton.disabled = false;
        }
    }

    disableEmojiFeatures() {
        if (this.elements.emojiButton) {
            this.elements.emojiButton.disabled = true;
        }
        this.closeEmojiGifPanel();
    }

    // Public API methods
    addCustomEmoji(emoji, category = 'custom') {
        const container = this.elements.widget.querySelector(`#${this.widgetId}-emoji-${category}`);
        if (container) {
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emoji;
            emojiSpan.className = 'emoji-item custom-emoji';
            emojiSpan.title = emoji;
            emojiSpan.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            container.appendChild(emojiSpan);
        }
    }

    setGifApiKey(apiKey) {
        this.gifApiKey = apiKey;
    }

    searchCustomGifs(query, apiEndpoint) {
        // Allow custom GIF search endpoints
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                const gifResults = this.elements.widget.querySelector(`#${this.widgetId}-gifResults`);
                this.displayGifs(data.gifs || [], gifResults);
            })
            .catch(error => {
                console.error('Error with custom GIF search:', error);
            });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChatEmoji;
}
