/**
 * TextChatInit - Initialization script for text chat widget
 * Instantiates and connects the various text chat modules
 */

class TextChatWidget {
    constructor(widgetId, options = {}) {
        this.widgetId = widgetId;
        this.options = {
            showTopics: options.showTopics !== false,
            enableEmoji: options.enableEmoji !== false,
            enableGif: options.enableGif !== false,
            enableVoiceRecording: options.enableVoiceRecording || false,
            ...options
        };

        // Get DOM elements
        this.elements = this.getDOMElements();

        // Initialize modules
        this.initializeModules();
        
        console.log(`TextChatWidget ${this.widgetId} initialized successfully`);
    }

    getDOMElements() {
        const widget = document.getElementById(this.widgetId);
        if (!widget) {
            throw new Error(`Widget container with ID "${this.widgetId}" not found`);
        }

        return {
            widget,
            chatBox: widget.querySelector(`#${this.widgetId}-chatBox`),
            messageInput: widget.querySelector(`#${this.widgetId}-messageInput`),
            sendButton: widget.querySelector(`#${this.widgetId}-sendButton`),
            startButton: widget.querySelector(`#${this.widgetId}-startButton`),
            endButton: widget.querySelector(`#${this.widgetId}-endButton`),
            statusMessage: widget.querySelector(`#${this.widgetId}-statusMessage`),
            emojiButton: widget.querySelector(`#${this.widgetId}-emojiButton`),
            emojiGifPanel: widget.querySelector(`#${this.widgetId}-emojiGifPanel`),
            userTopicsList: widget.querySelector(`#${this.widgetId}-user-topics-list`),
            partnerTopicsList: widget.querySelector(`#${this.widgetId}-partner-topics-list`),
            partnerTopicsHeader: widget.querySelector(`#${this.widgetId}-partner-topics-header`),
            chatSessionTitle: widget.querySelector(`#${this.widgetId}-chat-session-title`),
            voiceRecorderUI: widget.querySelector(`#${this.widgetId}-voiceRecorderUI`),
            voiceRecordButton: widget.querySelector(`#${this.widgetId}-voiceRecordButton`),
            voiceStopButton: widget.querySelector(`#${this.widgetId}-voiceStopButton`),
            voiceSendButton: widget.querySelector(`#${this.widgetId}-voiceSendButton`),
            voiceCancelButton: widget.querySelector(`#${this.widgetId}-voiceCancelButton`),
            voiceTimer: widget.querySelector(`#${this.widgetId}-voiceTimer`),
            voiceVisualizer: widget.querySelector(`#${this.widgetId}-voiceVisualizer`)
        };
    }

    initializeModules() {
        // Initialize core module (must be first)
        this.core = new TextChatCore(this.widgetId, this.elements, this.options);
        
        // Initialize topics module if topics are enabled
        if (this.options.showTopics) {
            this.topics = new TextChatTopics(this.widgetId, this.elements, this.core, this.options);
        }
        
        // Initialize emoji module if emoji or GIF are enabled
        if (this.options.enableEmoji || this.options.enableGif) {
            this.emoji = new TextChatEmoji(this.widgetId, this.elements, this.core, this.options);
        }
        
        // Initialize media module if voice recording is enabled
        if (this.options.enableVoiceRecording) {
            this.media = new TextChatMedia(this.widgetId, this.elements, this.core, this.options);
        }
    }
}

// Initialize the text chat widget when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const textChatWidgets = document.querySelectorAll('.text-chat-widget');
    
    textChatWidgets.forEach(widget => {
        const widgetId = widget.getAttribute('data-widget-id');
        const config = window.textChatWidgetConfig[widgetId];
        
        if (config) {
            new TextChatWidget(widgetId, config);
        } else {
            console.error('TextChatWidget configuration not found for widget:', widgetId);
        }
    });
});
