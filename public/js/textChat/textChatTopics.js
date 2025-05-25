/**
 * TextChatTopics - Topics management for text chat widget
 * Handles displaying and managing user and partner topics
 */

class TextChatTopics {
    constructor(widgetId, elements, core, options = {}) {
        this.widgetId = widgetId;
        this.elements = elements;
        this.core = core;
        this.options = options;

        this.init();
    }

    init() {
        if (!this.options.showTopics) {
            this.hideTopicsDisplay();
            return;
        }

        console.log(`TextChatTopics initializing for widget: ${this.widgetId}`);
        
        // Listen for core events
        this.core.on('matchFound', (data) => this.handleMatchFound(data));
        this.core.on('topicsReceived', (topics) => this.displayPartnerTopics(topics));
        this.core.on('chatEnded', () => this.resetTopicsDisplay());
        this.core.on('connected', () => this.enableTopicsFeatures());

        // Display user topics if available
        if (this.core.userTopics && this.core.userTopics.length > 0) {
            this.displayUserTopics(this.core.userTopics);
        }
    }

    hideTopicsDisplay() {
        const topicsDisplay = this.elements.widget.querySelector('.topics-display');
        if (topicsDisplay) {
            topicsDisplay.style.display = 'none';
        }
    }

    handleMatchFound(data) {
        if (!this.options.showTopics) return;
        
        this.updatePartnerSectionHeader(data.partnerName);
        this.updateChatSessionTitle(data.partnerName);
    }

    displayUserTopics(topics) {
        if (!this.elements.userTopicsList || !this.options.showTopics) return;
        
        if (topics && topics.length > 0) {
            this.elements.userTopicsList.innerHTML = '';
            topics.forEach((topic, index) => {
                const topicBubble = this.createTopicBubble(topic, 'user-topic', index);
                this.elements.userTopicsList.appendChild(topicBubble);
            });
        } else {
            this.elements.userTopicsList.innerHTML = '<div class="topics-empty">No topics selected</div>';
        }
    }

    displayPartnerTopics(topics) {
        if (!this.elements.partnerTopicsList || !this.options.showTopics) return;
        
        if (topics && topics.length > 0) {
            this.elements.partnerTopicsList.innerHTML = '';
            topics.forEach((topic, index) => {
                const topicBubble = this.createTopicBubble(topic, 'partner-topic', index);
                this.elements.partnerTopicsList.appendChild(topicBubble);
            });
            
            // Add visual effect for receiving topics
            this.animateTopicsReceived();
        } else {
            this.elements.partnerTopicsList.innerHTML = '<div class="topics-empty">No topics shared</div>';
        }
    }

    createTopicBubble(topic, className = '', index = 0) {
        const topicBubble = document.createElement('span');
        topicBubble.className = `topic-bubble ${className}`;
        topicBubble.textContent = topic;
        topicBubble.style.animationDelay = `${index * 0.1}s`;
        topicBubble.classList.add('new-topic');
        
        // Add click handler for topic interaction
        topicBubble.addEventListener('click', () => {
            this.handleTopicClick(topic, className.includes('partner'));
        });
        
        return topicBubble;
    }

    handleTopicClick(topic, isPartnerTopic) {
        if (!this.core.isConnected) return;
        
        // Generate a conversation starter based on the topic
        const message = isPartnerTopic 
            ? `I'm really interested in hearing more about ${topic}. What drew you to this topic?`
            : `I'd love to share more about ${topic}. It's something I'm really passionate about!`;
        
        // Send the message using the core
        this.core.sendMessage(message);
    }

    updatePartnerSectionHeader(partnerName) {
        if (this.elements.partnerTopicsHeader && partnerName) {
            this.elements.partnerTopicsHeader.textContent = `${partnerName}'s Topics`;
        }
    }

    updateChatSessionTitle(partnerName) {
        if (this.elements.chatSessionTitle && partnerName) {
            this.elements.chatSessionTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat with ${partnerName}
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: inline;"></i>
            `;
        }
    }

    resetChatSessionTitle() {
        if (this.elements.chatSessionTitle) {
            this.elements.chatSessionTitle.innerHTML = `
                <i class="bi bi-chat-dots-fill me-2"></i>Chat Session
                <i class="bi bi-info-circle ms-2 chat-info-icon" 
                   title="This is a randomly generated name to help you connect personally while staying anonymous" 
                   style="cursor: help; display: none;"></i>
            `;
        }
    }

    resetTopicsDisplay() {
        if (!this.options.showTopics) return;
        
        // Reset partner topics
        if (this.elements.partnerTopicsList) {
            this.elements.partnerTopicsList.innerHTML = '<div class="topics-empty">Waiting for partner...</div>';
        }
        
        // Reset headers
        if (this.elements.partnerTopicsHeader) {
            this.elements.partnerTopicsHeader.textContent = "Partner's Topics";
        }
        
        this.resetChatSessionTitle();
    }

    enableTopicsFeatures() {
        // Enable any topics-specific features when connected
        this.addTopicInteractivity();
    }

    addTopicInteractivity() {
        // Add hover effects and interaction hints for topics
        const allTopics = this.elements.widget.querySelectorAll('.topic-bubble');
        allTopics.forEach(topic => {
            topic.style.cursor = 'pointer';
            topic.title = 'Click to start a conversation about this topic';
            
            // Add hover effect
            topic.addEventListener('mouseenter', () => {
                topic.style.transform = 'scale(1.05)';
                topic.style.transition = 'transform 0.2s ease';
            });
            
            topic.addEventListener('mouseleave', () => {
                topic.style.transform = 'scale(1)';
            });
        });
    }

    animateTopicsReceived() {
        // Add a visual effect when partner topics are received
        if (this.elements.partnerTopicsList) {
            this.elements.partnerTopicsList.style.borderColor = 'var(--primary)';
            this.elements.partnerTopicsList.style.boxShadow = '0 0 10px rgba(var(--primary-rgb), 0.3)';
            
            setTimeout(() => {
                this.elements.partnerTopicsList.style.borderColor = '';
                this.elements.partnerTopicsList.style.boxShadow = '';
            }, 2000);
        }
    }

    // Topic matching utilities
    findCommonTopics(userTopics, partnerTopics) {
        if (!userTopics || !partnerTopics) return [];
        
        return userTopics.filter(userTopic => 
            partnerTopics.some(partnerTopic => 
                this.areTopicsSimilar(userTopic, partnerTopic)
            )
        );
    }

    areTopicsSimilar(topic1, topic2) {
        const t1 = topic1.toLowerCase().trim();
        const t2 = topic2.toLowerCase().trim();
        
        // Exact match
        if (t1 === t2) return true;
        
        // Partial match
        if (t1.includes(t2) || t2.includes(t1)) return true;
        
        // Add more sophisticated matching logic here if needed
        // For example, using word similarity, synonyms, etc.
        
        return false;
    }

    suggestConversationStarters(userTopics, partnerTopics) {
        const commonTopics = this.findCommonTopics(userTopics, partnerTopics);
        const starters = [];
        
        if (commonTopics.length > 0) {
            commonTopics.forEach(topic => {
                starters.push(`I see we both are interested in ${topic}! What's your experience with it?`);
                starters.push(`${topic} is fascinating! How did you get into it?`);
            });
        } else {
            // Generate starters for different topics
            if (partnerTopics && partnerTopics.length > 0) {
                const randomTopic = partnerTopics[Math.floor(Math.random() * partnerTopics.length)];
                starters.push(`I'm curious about ${randomTopic}. Can you tell me more about it?`);
                starters.push(`${randomTopic} sounds interesting! What draws you to that?`);
            }
        }
        
        return starters;
    }

    // Public API methods
    getUserTopics() {
        return this.core.userTopics || [];
    }

    getPartnerTopics() {
        const partnerTopicElements = this.elements.partnerTopicsList?.querySelectorAll('.topic-bubble.partner-topic');
        if (!partnerTopicElements) return [];
        
        return Array.from(partnerTopicElements).map(el => el.textContent);
    }

    highlightTopic(topicText) {
        const allTopics = this.elements.widget.querySelectorAll('.topic-bubble');
        allTopics.forEach(topic => {
            if (topic.textContent.toLowerCase().includes(topicText.toLowerCase())) {
                topic.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)';
                topic.style.border = '2px solid var(--primary)';
                
                setTimeout(() => {
                    topic.style.backgroundColor = '';
                    topic.style.border = '';
                }, 3000);
            }
        });
    }

    addTopic(topicText, isUserTopic = true) {
        const targetList = isUserTopic ? this.elements.userTopicsList : this.elements.partnerTopicsList;
        const className = isUserTopic ? 'user-topic' : 'partner-topic';
        
        if (targetList) {
            // Remove empty message if present
            const emptyMessage = targetList.querySelector('.topics-empty');
            if (emptyMessage) {
                emptyMessage.remove();
            }
            
            const topicBubble = this.createTopicBubble(topicText, className);
            targetList.appendChild(topicBubble);
            
            // Update core topics if it's a user topic
            if (isUserTopic && this.core.userTopics) {
                this.core.userTopics.push(topicText);
            }
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChatTopics;
}
