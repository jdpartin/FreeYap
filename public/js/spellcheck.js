/**
 * Client-side spell checking utility for FreeYap
 * Uses typo-js with Hunspell dictionaries for professional spell checking
 */

class FreeYapSpellChecker {
    constructor() {
        this.typo = null;
        this.isInitialized = false;
        this.customWords = new Set(); // User-added words
        this.loadDictionary();
        this.loadCustomWords();
    }    /**
     * Load Hunspell dictionary using typo-js
     */
    async loadDictionary() {
        try {
            console.log('Loading spell checker dictionaries...');
            
            // Load dictionary files
            const [affData, dicData] = await Promise.all([
                fetch('/dictionaries/en_US.aff').then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load .aff file: ${response.status}`);
                    }
                    return response.text();
                }),
                fetch('/dictionaries/en_US.dic').then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load .dic file: ${response.status}`);
                    }
                    return response.text();
                })
            ]);

            // Check if Typo is available
            if (typeof Typo === 'undefined') {
                throw new Error('Typo-js library not loaded');
            }

            this.typo = new Typo('en_US', affData, dicData, {
                platform: 'any'
            });
            
            this.isInitialized = true;
            console.log('✓ Spell checker initialized successfully with Hunspell dictionary');
            
        } catch (error) {
            console.warn('Failed to load Hunspell dictionary, falling back to basic checker:', error);
            this.initializeFallbackChecker();
        }
    }

    /**
     * Initialize fallback spell checker with basic word list
     */
    initializeFallbackChecker() {
        console.log('Initializing fallback spell checker...');
        
        this.fallbackDictionary = new Set([
            // Basic words
            'hello', 'world', 'chat', 'video', 'voice', 'text', 'message', 'send',
            'connect', 'match', 'topic', 'interest', 'discuss', 'talk', 'speak',
            'type', 'write', 'share', 'anonymous', 'private', 'safe', 'secure',
            'friend', 'stranger', 'person', 'people', 'conversation', 'communication',
            'real', 'time', 'live', 'online', 'platform', 'service', 'free',
            'easy', 'simple', 'quick', 'fast', 'instant', 'immediate', 'direct',
            'good', 'great', 'awesome', 'nice', 'cool', 'amazing', 'wonderful',
            'thanks', 'thank', 'please', 'sorry', 'excuse', 'welcome', 'goodbye',
            'yes', 'no', 'okay', 'sure', 'maybe', 'probably', 'definitely',
            'what', 'when', 'where', 'who', 'why', 'how', 'which', 'that',
            'gaming', 'games', 'music', 'movies', 'books', 'sports', 'art', 'science',
            'technology', 'programming', 'coding', 'design', 'photography', 'travel',
            'food', 'cooking', 'fitness', 'health', 'relationships', 'dating',
            // Internet/chat words
            'lol', 'lmao', 'omg', 'wtf', 'btw', 'brb', 'ttyl', 'imo', 'tbh', 'fyi', 'irl', 'dm',
            'gonna', 'wanna', 'gotta', 'dunno', 'kinda', 'sorta', 'yeah', 'nah',
            // Common contractions without apostrophes
            'dont', 'cant', 'wont', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt', 'havent',
            'shouldnt', 'couldnt', 'wouldnt', 'didnt', 'doesnt', 'thats', 'whats', 'hes', 'shes'
        ]);
        
        this.isInitialized = true;
        console.log('✓ Fallback spell checker initialized');
    }

    /**
     * Check if a word is spelled correctly
     */
    isCorrect(word) {
        if (!this.isInitialized) return true; // Don't mark as incorrect while loading

        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length === 0) return true;

        // Check custom words first
        if (this.customWords.has(cleanWord)) return true;

        // Check if it's a number
        if (/^\d+$/.test(cleanWord)) return true;

        // Check if it's a single letter
        if (cleanWord.length === 1) return true;

        // Use typo-js if available
        if (this.typo) {
            return this.typo.check(cleanWord);
        }

        // Use fallback dictionary
        if (this.fallbackDictionary) {
            return this.fallbackDictionary.has(cleanWord);
        }

        return true; // Default to correct if nothing is loaded
    }

    /**
     * Get suggestions for a misspelled word
     */
    getSuggestions(word) {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        
        if (cleanWord.length === 0) return [];

        // Use typo-js if available
        if (this.typo) {
            const suggestions = this.typo.suggest(cleanWord);
            return suggestions.slice(0, 5); // Return top 5 suggestions
        }

        // Use fallback suggestions
        return this.generateFallbackSuggestions(cleanWord).slice(0, 3);
    }

    /**
     * Generate basic suggestions for fallback mode
     */
    generateFallbackSuggestions(word) {
        if (!this.fallbackDictionary) return [];

        const suggestions = [];
        const dictArray = Array.from(this.fallbackDictionary);
        
        // Find words with similar length and basic edit distance
        for (const dictWord of dictArray) {
            if (Math.abs(dictWord.length - word.length) <= 2) {
                const distance = this.levenshteinDistance(word, dictWord);
                if (distance <= 2) {
                    suggestions.push(dictWord);
                }
            }
        }

        // Sort by edit distance
        suggestions.sort((a, b) => {
            const distA = this.levenshteinDistance(word, a);
            const distB = this.levenshteinDistance(word, b);
            return distA - distB;
        });

        return suggestions;
    }

    /**
     * Calculate Levenshtein distance between two words
     */
    levenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Add a word to custom dictionary
     */
    addWord(word) {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 0) {
            this.customWords.add(cleanWord);
            this.saveCustomWords();
            console.log('Added word to custom dictionary:', cleanWord);
        }
    }

    /**
     * Save custom words to localStorage
     */
    saveCustomWords() {
        try {
            localStorage.setItem('freeyap_custom_words', JSON.stringify(Array.from(this.customWords)));
        } catch (error) {
            console.warn('Could not save custom words:', error);
        }
    }

    /**
     * Load custom words from localStorage
     */
    loadCustomWords() {
        try {
            const saved = localStorage.getItem('freeyap_custom_words');
            if (saved) {
                const words = JSON.parse(saved);
                words.forEach(word => this.customWords.add(word));
                console.log('Loaded', this.customWords.size, 'custom words');
            }
        } catch (error) {
            console.warn('Could not load custom words:', error);
        }
    }

    /**
     * Check text and return words with spelling errors
     */
    checkText(text) {
        const words = text.split(/\s+/);
        const errors = [];

        words.forEach((word, index) => {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length > 1 && !this.isCorrect(cleanWord)) {
                errors.push({
                    word: cleanWord,
                    originalWord: word,
                    position: index,
                    suggestions: this.getSuggestions(cleanWord)
                });
            }
        });

        return errors;
    }
}

// Initialize global spell checker
window.freeYapSpellChecker = new FreeYapSpellChecker();

/**
 * Utility functions for integrating spell check with form elements
 */
window.SpellCheckUtils = {
    /**
     * Add spell checking to a text input or textarea
     */
    enableSpellCheck(element, options = {}) {
        if (!element) return;

        const config = {
            showUnderlines: true,
            showSuggestions: true,
            autoCorrect: false,
            ...options
        };

        // Add spell check styling
        if (config.showUnderlines) {
            element.style.position = 'relative';
        }

        let debounceTimer = null;

        element.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.checkElementText(element, config);
            }, 300);
        });

        element.addEventListener('blur', () => {
            this.checkElementText(element, config);
        });
    },

    /**
     * Check text in a specific element
     */
    checkElementText(element, config) {
        if (!window.freeYapSpellChecker.isInitialized) return;

        const text = element.value;
        const errors = window.freeYapSpellChecker.checkText(text);

        if (config.showUnderlines) {
            this.highlightErrors(element, errors);
        }

        // Trigger custom event for errors found
        element.dispatchEvent(new CustomEvent('spellcheckComplete', {
            detail: { errors, element }
        }));
    },

    /**
     * Highlight spelling errors (simplified version)
     */
    highlightErrors(element, errors) {
        // For now, just add a class to indicate spell check is active
        if (errors.length > 0) {
            element.classList.add('spell-check-errors');
            element.title = `${errors.length} potential spelling error(s) found`;
        } else {
            element.classList.remove('spell-check-errors');
            element.title = '';
        }
    },

    /**
     * Show suggestions for a misspelled word
     */
    showSuggestions(word, position, callback) {
        const suggestions = window.freeYapSpellChecker.getSuggestions(word);
        
        if (suggestions.length > 0) {
            // Create a simple suggestions dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'spell-suggestions-dropdown';
            dropdown.innerHTML = suggestions.map(suggestion => 
                `<div class="suggestion-item" data-word="${suggestion}">${suggestion}</div>`
            ).join('');

            // Add event listeners
            dropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('suggestion-item')) {
                    const selectedWord = e.target.dataset.word;
                    if (callback) callback(selectedWord);
                    dropdown.remove();
                }
            });

            document.body.appendChild(dropdown);
            
            // Position near cursor/element
            dropdown.style.position = 'absolute';
            dropdown.style.zIndex = '1000';
            
            return dropdown;
        }
        
        return null;
    }
};
