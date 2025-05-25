/**
 * WebRTCTopicsWidget.js
 * Topics widget for WebRTC communication
 * Handles topic display, similarity calculation, and smart messaging
 */

class WebRTCTopicsWidget {
    /**
     * Create a new topics widget
     * @param {object} options - Configuration options
     * @param {string} options.userTopicsListId - ID of the user topics list element
     * @param {string} options.partnerTopicsListId - ID of the partner topics list element
     * @param {string} options.partnerTopicsHeaderId - ID of the partner topics header element
     * @param {string} options.topicsContainerId - ID of the topics container element
     * @param {boolean} options.enableSmartHello - Whether to enable smart hello messages
     */    constructor(options = {}) {
        // Widget elements
        this.userTopicsList = document.getElementById(options.userTopicsListId || 'user-topics-list');
        this.partnerTopicsList = document.getElementById(options.partnerTopicsListId || 'partner-topics-list');
        this.partnerTopicsHeader = document.getElementById(options.partnerTopicsHeaderId || 'partner-topics-header');
        this.topicsContainer = document.getElementById(options.topicsContainerId || 'topics-container');
        
        // Widget properties
        this.channelName = 'topics';
        this.core = window.webrtcCore;
        this.userTopics = [];
        this.partnerTopics = [];
        this.hasReceivedPartnerTopics = false;
        this.hasSentSmartHello = false;
        
        // Configuration options
        this.enableSmartHello = options.enableSmartHello !== undefined ? options.enableSmartHello : true;
        this.smartHelloChannel = options.smartHelloChannel || 'chat';
        this.onTopicSimilarityCalculated = options.onTopicSimilarityCalculated || null;
        
        // Register with core
        if (this.core) {
            this.core.registerWidget(this.channelName, this);
            
            // Get topics from URL or from provided options
            this.userTopics = options.userTopics || this.core.getTopicsFromURL();
            
            // Set up event listeners and initialize
            this._setupEventListeners();
            this._initialize();
            
            console.log('Topics widget initialized and registered with WebRTCCore');
        } else {
            console.error('WebRTCCore not found. Make sure WebRTCCore.js is loaded first.');
        }
    }

    /**
     * Set up WebRTCCore event listeners
     * @private
     */
    _setupEventListeners() {
        // Listen for peer connection
        this.core.addEventListener('peerConnected', () => {
            this._handlePeerConnected();
        });
        
        // Listen for incoming topics
        this.core.addEventListener(`data:${this.channelName}`, (data) => {
            this._handleIncomingTopics(data);
        });
        
        // Handle partner name update
        this.core.addEventListener('matchFound', (data) => {
            this.updatePartnerSectionHeader(data.partnerName);
        });
        
        // Handle connection cleanup
        this.core.addEventListener('connectionCleaned', () => {
            this._handleConnectionCleaned();
        });
    }

    /**
     * Initialize the topics widget
     * @private
     */
    _initialize() {
        // Display user's topics
        this.displayUserTopics(this.userTopics);
    }

    /**
     * Handle peer connection established
     * @private
     */
    _handlePeerConnected() {
        // Send topics immediately when connection is established
        if (this.userTopics && this.userTopics.length > 0) {
            this.sendTopics(this.userTopics);
        }
    }

    /**
     * Handle incoming topics data
     * @param {object} data - Topics data received
     * @private
     */
    _handleIncomingTopics(data) {
        if (data && data.topics) {
            console.log('Received partner topics:', data.topics);
            
            this.partnerTopics = data.topics;
            this.hasReceivedPartnerTopics = true;
            
            // Use similarity-enabled display function
            this.displayTopicsWithSimilarity(this.userTopics, this.partnerTopics);
            
            // Send smart hello message if enabled
            if (this.enableSmartHello) {
                this.checkAndSendSmartHello();
            }
        }
    }

    /**
     * Handle connection cleaned up
     * @private
     */
    _handleConnectionCleaned() {
        // Reset widget state
        this.partnerTopics = [];
        this.hasReceivedPartnerTopics = false;
        this.hasSentSmartHello = false;
        
        // Clear partner topics display
        if (this.partnerTopicsList) {
            this.partnerTopicsList.innerHTML = '<div class="topics-empty">No topics shared</div>';
        }
    }

    /**
     * Send topics to the connected peer
     * @param {Array} topics - Array of topics to send
     */
    sendTopics(topics) {
        if (!topics || topics.length === 0) return;
        
        const topicsMessage = {
            type: 'topics',
            topics: topics
        };
        
        this.core.sendData(this.channelName, topicsMessage);
        console.log('Sent topics to partner:', topics);
    }

    /**
     * Display user's topics
     * @param {Array} topics - Array of user topics
     */
    displayUserTopics(topics) {
        if (!this.userTopicsList) return;
        
        if (topics && topics.length > 0) {
            this.userTopicsList.innerHTML = '';
            topics.forEach((topic, index) => {
                const topicBubble = document.createElement('span');
                topicBubble.className = 'topic-bubble';
                topicBubble.textContent = topic;
                topicBubble.style.animationDelay = `${index * 0.1}s`;
                topicBubble.classList.add('new-topic');
                this.userTopicsList.appendChild(topicBubble);
            });
        } else {
            this.userTopicsList.innerHTML = '<div class="topics-empty">No topics selected</div>';
        }
    }

    /**
     * Display partner's topics
     * @param {Array} partnerTopics - Array of partner topics
     */
    displayPartnerTopics(partnerTopics) {
        if (!this.partnerTopicsList) return;
        
        // Update the partner section header with the random name
        this.updatePartnerSectionHeader();
        
        if (partnerTopics && partnerTopics.length > 0) {
            this.partnerTopicsList.innerHTML = '';
            partnerTopics.forEach((topic, index) => {
                const topicBubble = document.createElement('span');
                topicBubble.className = 'topic-bubble';
                topicBubble.textContent = topic;
                topicBubble.style.animationDelay = `${index * 0.1}s`;
                topicBubble.classList.add('new-topic');
                this.partnerTopicsList.appendChild(topicBubble);
            });
        } else {
            this.partnerTopicsList.innerHTML = '<div class="topics-empty">No topics shared</div>';
        }
    }

    /**
     * Update partner section header with random name
     * @param {string} partnerName - Partner's name (optional)
     */
    updatePartnerSectionHeader(partnerName = null) {
        // Update partner topics header
        if (this.partnerTopicsHeader) {
            const name = partnerName || this.core.getPartnerName();
            this.partnerTopicsHeader.textContent = `${name}'s Topics`;
        }
        
        // Update waiting message if present
        if (this.partnerTopicsList) {
            const waitingMessage = this.partnerTopicsList.querySelector('.topics-empty');
            if (waitingMessage && waitingMessage.textContent.includes('Waiting for partner')) {
                waitingMessage.textContent = `Waiting for ${this.core.getPartnerName()}...`;
            }
        }
    }

    /**
     * Display topics with similarity analysis
     * @param {Array} userTopics - Array of user topics
     * @param {Array} partnerTopics - Array of partner topics
     */
    async displayTopicsWithSimilarity(userTopics, partnerTopics) {
        // Display basic topics first
        this.displayUserTopics(userTopics);
        this.displayPartnerTopics(partnerTopics);
        
        // If both users have topics, calculate and display similarities
        if (userTopics && userTopics.length > 0 && partnerTopics && partnerTopics.length > 0) {
            const similarities = await this.calculateTopicSimilarities(userTopics, partnerTopics);
            
            if (similarities.length > 0) {
                // Update topic display with similarity information
                this.updateTopicsWithSimilarityScores(similarities);
            }
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} vecA - First vector
     * @param {Array} vecB - Second vector
     * @returns {number} - Similarity value between 0 and 1
     */
    calculateCosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Get bulk topic embeddings from the server
     * @param {Array} topics - Array of topics
     * @returns {Array} - Array of embeddings with topic and embedding properties
     */
    async getBulkTopicEmbeddings(topics) {
        if (!topics || topics.length === 0) {
            return [];
        }
        
        try {
            const response = await fetch('/api/semantic-similarity/bulk-embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topics })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                return data.embeddings;
            } else {
                console.error('Failed to get bulk embeddings:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching bulk embeddings:', error);
            return [];
        }
    }

    /**
     * Calculate similarities between two sets of topics
     * @param {Array} userTopics - Array of user topics
     * @param {Array} partnerTopics - Array of partner topics
     * @returns {Array} - Array of similarity objects
     */
    async calculateTopicSimilarities(userTopics, partnerTopics) {
        if (!userTopics || !partnerTopics || userTopics.length === 0 || partnerTopics.length === 0) {
            return [];
        }

        try {
            // Get all unique topics
            const allTopics = [...new Set([...userTopics, ...partnerTopics])];
            
            // Get embeddings for all topics
            const embeddings = await this.getBulkTopicEmbeddings(allTopics);
            
            // Create embedding lookup map
            const embeddingMap = {};
            embeddings.forEach(item => {
                embeddingMap[item.topic] = item.embedding;
            });

            // Calculate similarities
            const similarities = [];
            
            userTopics.forEach(userTopic => {
                const userEmbedding = embeddingMap[userTopic];
                if (!userEmbedding) return;
                
                partnerTopics.forEach(partnerTopic => {
                    const partnerEmbedding = embeddingMap[partnerTopic];
                    if (!partnerEmbedding) return;
                    
                    const similarity = this.calculateCosineSimilarity(userEmbedding, partnerEmbedding);
                    similarities.push({
                        userTopic,
                        partnerTopic,
                        similarity,
                        similarityPercentage: Math.round(similarity * 10000) / 100
                    });
                });
            });

            // Sort by similarity score (highest first)
            similarities.sort((a, b) => b.similarity - a.similarity);
            
            return similarities;
        } catch (error) {
            console.error('Error calculating topic similarities:', error);
            return [];
        }
    }

    /**
     * Get similarity color based on score
     * @param {number} similarity - Similarity value between 0 and 1
     * @returns {string} - CSS color value
     */
    getSimilarityColor(similarity) {
        // Convert similarity (0-1) to color
        if (similarity >= 0.8) return '#28a745'; // High similarity - green
        if (similarity >= 0.6) return '#ffc107'; // Medium similarity - yellow/orange
        if (similarity >= 0.4) return '#fd7e14'; // Low-medium similarity - orange
        if (similarity >= 0.2) return '#dc3545'; // Low similarity - red
        return '#6c757d'; // Very low similarity - gray
    }

    /**
     * Update topic bubbles with similarity scores and colors
     * @param {Array} similarities - Array of similarity objects
     */
    updateTopicsWithSimilarityScores(similarities) {
        if (!this.userTopicsList || !this.partnerTopicsList) return;

        // Create maps for best similarities
        const userTopicSimilarities = {};
        const partnerTopicSimilarities = {};
        
        // Find best similarity for each topic
        similarities.forEach(sim => {
            if (!userTopicSimilarities[sim.userTopic] || userTopicSimilarities[sim.userTopic].similarity < sim.similarity) {
                userTopicSimilarities[sim.userTopic] = sim;
            }
            if (!partnerTopicSimilarities[sim.partnerTopic] || partnerTopicSimilarities[sim.partnerTopic].similarity < sim.similarity) {
                partnerTopicSimilarities[sim.partnerTopic] = sim;
            }
        });
        
        // Update user topic bubbles
        const userBubbles = this.userTopicsList.querySelectorAll('.topic-bubble');
        userBubbles.forEach(bubble => {
            const topic = bubble.textContent;
            const similarity = userTopicSimilarities[topic];
            
            if (similarity) {
                const color = this.getSimilarityColor(similarity.similarity);
                bubble.style.borderLeft = `4px solid ${color}`;
                bubble.title = `Best match with ${this.core.getPartnerName()}: "${similarity.partnerTopic}" (${similarity.similarityPercentage}% similar)`;
                bubble.style.cursor = 'help';
            }
        });
        
        // Update partner topic bubbles
        const partnerBubbles = this.partnerTopicsList.querySelectorAll('.topic-bubble');
        partnerBubbles.forEach(bubble => {
            const topic = bubble.textContent;
            const similarity = partnerTopicSimilarities[topic];
            
            if (similarity) {
                const color = this.getSimilarityColor(similarity.similarity);
                bubble.style.borderLeft = `4px solid ${color}`;
                bubble.title = `Best match with your topic: "${similarity.userTopic}" (${similarity.similarityPercentage}% similar)`;
                bubble.style.cursor = 'help';
            }
        });
        
        // Add similarity legend
        this.addSimilarityLegend();
    }

    /**
     * Add similarity legend to help users understand colors
     */
    addSimilarityLegend() {
        const existingLegend = document.getElementById('similarity-legend');
        if (existingLegend || !this.topicsContainer) return;
        
        const legend = document.createElement('div');
        legend.id = 'similarity-legend';
        legend.className = 'similarity-legend';
        legend.innerHTML = `
            <div class="legend-title">Similarity Guide:</div>
            <div class="legend-items">
                <span class="legend-item">
                    <span class="legend-color" style="background-color: #28a745;"></span>
                    High (80%+)
                </span>
                <span class="legend-item">
                    <span class="legend-color" style="background-color: #ffc107;"></span>
                    Medium (60%+)
                </span>
                <span class="legend-item">
                    <span class="legend-color" style="background-color: #fd7e14;"></span>
                    Low-Med (40%+)
                </span>
                <span class="legend-item">
                    <span class="legend-color" style="background-color: #dc3545;"></span>
                    Low (20%+)
                </span>
                <span class="legend-item">
                    <span class="legend-color" style="background-color: #6c757d;"></span>
                    Very Low
                </span>
            </div>
        `;
        
        this.topicsContainer.appendChild(legend);
    }    /**
     * Check if we should send smart hello and do it
     */
    checkAndSendSmartHello() {
        // Only send if we have both user topics and partner topics, and haven't sent it yet
        if (!this.hasSentSmartHello && this.userTopics && this.userTopics.length > 0 
            && this.partnerTopics && this.partnerTopics.length > 0) {
            this.sendSmartHelloMessage(this.userTopics, this.partnerTopics);
            this.hasSentSmartHello = true;
        }
    }
    
    /**
     * Set user topics programmatically (not from URL)
     * @param {Array} topics - Array of topic strings
     */
    setUserTopics(topics) {
        if (Array.isArray(topics)) {
            this.userTopics = topics;
            this.displayUserTopics(topics);
            
            // If we already have partner topics, update similarities
            if (this.hasReceivedPartnerTopics) {
                this.displayTopicsWithSimilarity(this.userTopics, this.partnerTopics);
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * Get the current topic similarities
     * @returns {Promise<Array>} - Similarity analysis results
     */
    async getTopicSimilarities() {
        if (this.userTopics && this.userTopics.length > 0 && 
            this.partnerTopics && this.partnerTopics.length > 0) {
            return await this.calculateTopicSimilarities(this.userTopics, this.partnerTopics);
        }
        return [];
    }
    
    /**
     * Generate a smart hello message without sending it
     * @returns {Promise<string>} - The generated message
     */
    async generateSmartHelloMessage() {
        if (!this.userTopics || !this.partnerTopics || 
            this.userTopics.length === 0 || this.partnerTopics.length === 0) {
            return "Hey! Great to connect with someone new. Looking forward to our conversation! 😊";
        }
        
        try {
            const similarities = await this.calculateTopicSimilarities(this.userTopics, this.partnerTopics);
            // Rest of the smart hello generation logic is in sendSmartHelloMessage
            // This is a simplification to avoid duplicating all that logic
            // A real implementation would extract the message generation logic to a separate method
            if (similarities.length > 0) {
                const topMatch = similarities[0];
                return `Hi there! I notice you're interested in ${topMatch.partnerTopic}. I'd love to hear your thoughts on it!`;
            } else {
                return "Hi! I'm looking forward to chatting about our interests. What brings you here today?";
            }
        } catch (error) {
            console.error("Error generating smart hello:", error);
            return "Hey! Great to connect with someone new. Looking forward to our conversation! 😊";
        }
    }

    /**
     * Send smart hello message based on topic similarities
     * @param {Array} userTopics - Array of user topics
     * @param {Array} partnerTopics - Array of partner topics 
     */
    async sendSmartHelloMessage(userTopics, partnerTopics) {
        // Don't proceed if not connected or no topics
        if (!this.core || !this.core.isConnected || !userTopics || !partnerTopics 
            || userTopics.length === 0 || partnerTopics.length === 0) {
            return;
        }

        try {
            // Calculate similarities between topics
            const similarities = await this.calculateTopicSimilarities(userTopics, partnerTopics);
            
            let helloContent = "";
            
            if (similarities.length > 0) {
                // Get the top similar topic pairs, ensuring we don't repeat topics
                const topSimilarities = similarities.slice(0, 3);
                const topMatch = topSimilarities[0];
                
                // Find a second match that uses different topics from the first match
                let secondMatch = null;
                for (let i = 1; i < topSimilarities.length; i++) {
                    const candidate = topSimilarities[i];
                    if (candidate.userTopic !== topMatch.userTopic && candidate.partnerTopic !== topMatch.partnerTopic) {
                        secondMatch = candidate;
                        break;
                    }
                }
                
                if (topMatch.similarity > 0.6) {
                    // High similarity - exciting match
                    if (secondMatch) {
                        helloContent = `Hey! I noticed some really cool connections between our interests! I've been exploring ${topMatch.userTopic} and saw you're into ${topMatch.partnerTopic} - they seem quite related! Plus I see you're also interested in ${secondMatch.partnerTopic} while I've been thinking about ${secondMatch.userTopic}. What got you interested in ${topMatch.partnerTopic}? 🌟`;
                    } else {
                        helloContent = `Hi there! What are the odds - I was just thinking about ${topMatch.userTopic} and I see you're into ${topMatch.partnerTopic}! We definitely have some common ground here. What's your take on ${topMatch.partnerTopic}? 😄`;
                    }
                } else if (topMatch.similarity > 0.3) {
                    // Moderate similarity - curious connection
                    helloContent = `Hey! Interesting combination of interests we have here. I'm curious about ${topMatch.partnerTopic} - I've been exploring ${topMatch.userTopic} lately. Do you see any connections between these topics? Would love to hear your perspective! 🤔`;
                } else {
                    // Low similarity - embrace the difference
                    if (secondMatch) {
                        helloContent = `Hi! I love how different our interests are - you're into ${topMatch.partnerTopic} and ${secondMatch.partnerTopic}, while I've been diving deep into ${topMatch.userTopic} and ${secondMatch.userTopic}. I'm really curious to learn from your perspective! What drew you to ${topMatch.partnerTopic}? 🌈`;
                    } else {
                        helloContent = `Hey there! This is fascinating - you're exploring ${topMatch.partnerTopic} while I've been deep into ${topMatch.userTopic}. I think we could learn a lot from each other! What's the most interesting thing about ${topMatch.partnerTopic} that you've discovered? ✨`;
                    }
                }
            } else {
                // No similarities calculated - generic but warm
                const randomUserTopic = userTopics[Math.floor(Math.random() * userTopics.length)];
                const randomPartnerTopic = partnerTopics[Math.floor(Math.random() * partnerTopics.length)];
                helloContent = `Hi! I see we have some interesting topics to explore together. I've been thinking a lot about ${randomUserTopic} lately, and I'm really curious about your interest in ${randomPartnerTopic}. What's your story with that? 😊`;
            }
              const smartHelloMessage = {
                type: 'message',
                content: helloContent
            };
            
            // Trigger callbacks with similarity data if provided
            if (this.onTopicSimilarityCalculated && typeof this.onTopicSimilarityCalculated === 'function') {
                this.onTopicSimilarityCalculated({
                    similarities,
                    topMatch: topMatch,
                    secondMatch: secondMatch,
                    message: helloContent
                });
            }
            
            // Only send the hello message if enabled
            if (this.enableSmartHello) {
                // Add a small delay to make it feel more natural
                setTimeout(() => {
                    // Send through the configured channel (default: chat)
                    this.core.sendData(this.smartHelloChannel, smartHelloMessage);
                    console.log('Sent smart hello message:', helloContent);
                }, 1500);
            }
            
        } catch (error) {
            console.error('Error creating smart hello message:', error);
            
            // Fallback message if something goes wrong and smart hello is enabled
            if (this.enableSmartHello) {
                const fallbackMessage = {
                    type: 'message',
                    content: "Hey! Great to connect with someone new. Looking forward to our conversation! 😊"
                };
                
                this.core.sendData(this.smartHelloChannel, fallbackMessage);
            }
        }
    }
}

// Initialize the topics widget when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for WebRTCCore to be available
    setTimeout(() => {
        if (window.webrtcCore) {
            // Auto-initialize if the required elements exist
            const userTopicsList = document.getElementById('user-topics-list');
            const partnerTopicsList = document.getElementById('partner-topics-list');
            
            if (userTopicsList || partnerTopicsList) {
                window.topicsWidget = new WebRTCTopicsWidget();
            }
        }
    }, 300);
});
