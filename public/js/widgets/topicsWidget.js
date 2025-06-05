class TopicsWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;
        this.semanticSimilarityAPIClient = new SemanticSimilarityAPIClient();

        this.messageType = 'topics-display';        
        
        // These are both maps topic: embedding
        this.peerTopics = null;
        this.myTopics = null;
        
        // Store topics as array for immediate rendering and exchange
        this.myTopicsArray = this.#getTopicsFromURL();
        this.myEmbeddingsReady = false;
        this.peerEmbeddingsReady = false;

        this.topicSimilarityMap = null;

        this.connectionLostAndMaxAttempts = false;
        this.needsMyTopicsRerender = false;

        this.partnerTopicsListElement = document.getElementById('partner-topics-list');
        this.myTopicsListElement = document.getElementById('user-topics-list');
        this.topicsContainer = document.querySelector('.topics-container');

        // Render topics immediately
        this.#renderBasicTopics();

        const eventTypes = this.webRTCConnectionManager.EventTypes;

        this.webRTCConnectionManager.on(eventTypes.PEER_CREATED, () =>
        {
            this.#handlePeerCreated();
        });

        this.webRTCConnectionManager.on(eventTypes.CONNECTION_READY, () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on(eventTypes.CONNECTION_CLOSED, () =>
        {
            this.#handleConnectionClosed();
        });

        this.webRTCConnectionManager.on(eventTypes.MAX_RECONNECT_ATTEMPTS_REACHED, () =>
        {
            this.#handleConnectionLostAndMaxAttempts();
        });

        this.webRTCConnectionManager.on(eventTypes.ERROR_REPORTED, () =>
        {
            var error = this.webRTCConnectionManager.reportedError;
            this.partnerTopicsListElement.innerHTML = `<div class="topics-empty">${error}</div>`;
        });

        window.topicsWidget = this; // Expose for debugging

        // Fetch embeddings in background
        this.#fetchMyEmbeddingsAsync();
    }    
    
    /**
     * Renders topics immediately without embeddings for instant display
     */
    #renderBasicTopics()
    {
        if (this.myTopicsArray && this.myTopicsArray.length > 0)
        {
            this.myTopicsListElement.innerHTML = '';
            
            for (let i = 0; i < this.myTopicsArray.length; i++)
            {
                const topic = this.myTopicsArray[i];
                const topicHtml = `<div class="topic-bubble wave-topic" style="animation-delay: ${i * 0.1}s;">${topic}</div>`;
                this.myTopicsListElement.innerHTML += topicHtml;
            }
        }
        else
        {
            this.myTopicsListElement.innerHTML = '<div class="topics-empty">No Topics</div>';
        }
    }

    /**
     * Fetches embeddings for my topics in the background
     */
    async #fetchMyEmbeddingsAsync()
    {
        if (this.myTopicsArray && this.myTopicsArray.length > 0)
        {
            try
            {
                const topicsAndEmbeddingsResponse = await this.semanticSimilarityAPIClient.GetBulkEmbeddings(this.myTopicsArray);

                // Convert to Map: topic -> embedding
                this.myTopics = new Map();
                topicsAndEmbeddingsResponse.embeddings.forEach(obj => {
                    this.myTopics.set(obj.topic, obj.embedding);
                });                this.myEmbeddingsReady = true;

                // Re-render with embeddings if peer topics are also ready
                if (this.peerEmbeddingsReady)
                {
                    this.#renderMyTopics();
                }
            }
            catch (error)
            {
                console.error('Error fetching my topic embeddings:', error);
                this.myEmbeddingsReady = false;
            }
        }        
        else
        {
            this.myEmbeddingsReady = true; // No topics to process
        }}

    #handlePeerCreated()
    {
        // set up the topics message handler before the connection is established
        this.webRTCConnectionManager.GetPeer().on('data', async (data) =>
        {
            const parsedData = JSON.parse(data.toString());

            if (parsedData.type === 'request-topics')
            {
                // Send topics immediately from array (no need to wait for embeddings)
                var topics = this.myTopicsArray || [];

                this.webRTCConnectionManager.SendMessage({
                    messageType: 'send-topics',
                    messageObject: { topics: topics }
                });
            }
            else if (parsedData.type === 'send-topics')
            {
                // Handle incoming topics from peer
                const topics = parsedData.topics || [];                
                if (topics.length === 0)
                {
                    console.warn('Received empty topics from peer.');
                    this.peerTopics = new Map();
                    this.peerEmbeddingsReady = true;
                    this.#updateTopicsUI();
                    
                    return;
                }

                // Fetch embeddings for peer topics
                try
                {
                    const topicsAndEmbeddingsResponse = await this.semanticSimilarityAPIClient.GetBulkEmbeddings(topics);

                    this.peerTopics = new Map();
                    topicsAndEmbeddingsResponse.embeddings.forEach(obj => {
                        this.peerTopics.set(obj.topic, obj.embedding);
                    });

                    this.peerEmbeddingsReady = true;
                    
                    // Re-render with similarity data if my embeddings are ready
                    if (this.myEmbeddingsReady)
                    {
                        this.#renderMyTopics();
                    }
                    
                    this.#updateTopicsUI();
                    this.#triggerMatchCelebration();
                }
                catch (error)
                {
                    console.error('Error fetching peer topic embeddings:', error);
                    this.peerEmbeddingsReady = false;
                }
            }
        });
    }

    #handleConnectionLostAndMaxAttempts()
    {
        this.connectionLostAndMaxAttempts = true;
        this.partnerTopicsListElement.innerHTML = '<div class="topics-empty">CONNECTION LOST!<br>Please refresh the page to try again.</div>';
    }

    #getTopicsFromURL()
    {
        const urlParams = new URLSearchParams(window.location.search);
        const topicsParam = urlParams.get('topics');
        let topics = [];
        
        if (topicsParam)
        {
            try
            {
                topics = JSON.parse(decodeURIComponent(topicsParam));
            }
            catch (e)
            {
                console.error('Error parsing topics from URL:', e);
            }
        }        
        
        return topics;
    }    
    
    /**
     * Gets a color based on similarity score
     * @param {number} similarity - Cosine similarity score (0 to 1, representing percentage directly)
     * @returns {string} CSS color class or inline style
     */
    #getSimilarityColor(similarity)
    {
        // Cosine similarity is already in 0-1 range representing percentage directly
        if (similarity >= 0.95) return 'similarity-very-high'; // Excellent match - green (95%+)
        if (similarity >= 0.85) return 'similarity-high'; // Good match - blue/teal (85%+)
        if (similarity >= 0.70) return 'similarity-medium'; // Decent match - yellow (70%+)
        if (similarity >= 0.50) return 'similarity-low'; // Weak match - orange (50%+)
        return 'similarity-very-low'; // Poor match - red (below 50%)
    }    
    
    /**
     * Gets fallback inline styles if CSS classes aren't available
     */
    #getSimilarityStyle(similarity)
    {
        // Just return empty string to avoid overriding text colors - let CSS classes handle styling
        return '';
    }

    /**
     * Gets plain language description for similarity level
     * @param {number} similarity - Cosine similarity score (0 to 1)
     * @returns {string} Plain language description
     */
    #getSimilarityDescription(similarity)
    {
        if (similarity >= 0.95) return 'strongly related to';
        if (similarity >= 0.85) return 'closely related to'; 
        if (similarity >= 0.70) return 'may be related to';
        if (similarity >= 0.50) return 'somewhat related to';
        return 'vaguely related to';
    }

    /**
     * Triggers a subtle celebration animation when matches are found
     */
    #triggerMatchCelebration()
    {
        if (this.topicsContainer)
        {
            // Add celebration animation class
            this.topicsContainer.classList.add('match-celebration');
            
            // Remove animation class after animation completes
            setTimeout(() =>
            {
                this.topicsContainer.classList.remove('match-celebration');
            }, 1200); // Match the animation duration
        }
    }
    
    #renderMyTopics()
    {
        this.myTopicsListElement.innerHTML = '';
        
        if (this.myTopics && this.myTopics.size > 0)
        {
            let similarityMap = null;
            let sortedMyTopics = [...this.myTopics];
            
            // If we have peer topics, calculate similarities for color coding and sorting
            if (this.peerTopics && this.peerTopics.size > 0)
            {
                try
                {
                    similarityMap = this.semanticSimilarityAPIClient.CrossCompareSimilarity(this.myTopics, this.peerTopics);
                    
                    // Sort my topics by similarity (highest first)
                    sortedMyTopics.sort((a, b) => {
                        const similarityA = similarityMap.has(a[0]) ? similarityMap.get(a[0]).similarity : -1;
                        const similarityB = similarityMap.has(b[0]) ? similarityMap.get(b[0]).similarity : -1;
                        return similarityB - similarityA;
                    });
                }
                catch (error)
                {
                    console.error('Error calculating topic similarities:', error);
                }
            }            
            
            for (let i = 0; i < sortedMyTopics.length; i++)
            {
                const [topic] = sortedMyTopics[i];
                let topicHtml = `<div class="topic-bubble wave-topic`;                
                
                if (similarityMap && similarityMap.has(topic))
                {
                    const match = similarityMap.get(topic);
                    const colorClass = this.#getSimilarityColor(match.similarity);
                    const style = this.#getSimilarityStyle(match.similarity);
                    const description = this.#getSimilarityDescription(match.similarity);
                    
                    topicHtml += ` ${colorClass}" style="${style}; animation-delay: ${i * 0.1}s;" title="This topic is ${description} partner's '${match.topic}'"`;
                }
                else
                {
                    topicHtml += `" style="animation-delay: ${i * 0.1}s;"`;
                }
                
                topicHtml += `>${topic}</div>`;
                this.myTopicsListElement.innerHTML += topicHtml;
            }
        }
        else
        {
            this.myTopicsListElement.innerHTML = '<div class="topics-empty">No Topics</div>';
        }
    }

    #renderPeerTopics()
    {
        if (this.peerTopics == null || this.peerTopics.size === 0)
        {
            let peer = this.webRTCConnectionManager.GetPeer();

            if (peer == null || peer.destroyed)
            {
                this.partnerTopicsListElement.innerHTML = '<div class="topics-empty"><i class="spinner-border spinner-border-sm"></i> Waiting for partner...</div>';
            }
            else
            {
                this.partnerTopicsListElement.innerHTML = '<div class="topics-empty">No Topics</div>';
            }
        }
        else
        {
            this.partnerTopicsListElement.innerHTML = '';

            let similarityMap = null;
            let sortedPeerTopics = [...this.peerTopics];
            
            // Calculate similarities for color coding and sorting partner topics
            if (this.myTopics && this.myTopics.size > 0)
            {
                try
                {
                    similarityMap = this.semanticSimilarityAPIClient.CrossCompareSimilarity(this.peerTopics, this.myTopics);
                    
                    this.topicSimilarityMap = similarityMap;

                    // Sort peer topics by similarity (highest first)
                    sortedPeerTopics.sort((a, b) => {
                        const similarityA = similarityMap.has(a[0]) ? similarityMap.get(a[0]).similarity : -1;
                        const similarityB = similarityMap.has(b[0]) ? similarityMap.get(b[0]).similarity : -1;
                        return similarityB - similarityA;
                    });
                }
                catch (error)
                {
                    console.error('Error calculating topic similarities:', error);
                }
            }            
            
            for (let i = 0; i < sortedPeerTopics.length; i++)
            {
                const [topic] = sortedPeerTopics[i];
                let topicHtml = `<div class="topic-bubble wave-topic`;

                if (similarityMap && similarityMap.has(topic))
                {
                    const match = similarityMap.get(topic);
                    const colorClass = this.#getSimilarityColor(match.similarity);
                    const style = this.#getSimilarityStyle(match.similarity);
                    const description = this.#getSimilarityDescription(match.similarity);
                    
                    topicHtml += ` ${colorClass}" style="${style}; animation-delay: ${i * 0.1}s;" title="This topic is ${description} your '${match.topic}'"`;
                }
                else
                {
                    topicHtml += `" style="animation-delay: ${i * 0.1}s;"`;
                }
                
                topicHtml += `>${topic}</div>`;
                this.partnerTopicsListElement.innerHTML += topicHtml;
            }
        }
    }        
    
    async #updateTopicsUI()
    {
        if (this.connectionLostAndMaxAttempts)
            return;

        // Always update peer topics (they change based on connection state)
        this.#renderPeerTopics();
    }
    
    #handleConnectionReady()
    {
        this.webRTCConnectionManager.SendMessage({
            messageType: 'request-topics',
            acknowledgmentMessageType: 'send-topics',
            requireAcknowledgment: true
        });
    }    
    
    #handleConnectionClosed()
    {
        this.peerTopics = null;
        this.topicSimilarityMap = null;
        this.peerEmbeddingsReady = false;
        // Re-render my topics without similarity data (back to basic view)
        this.#renderBasicTopics();
        this.#updateTopicsUI();
    }
}