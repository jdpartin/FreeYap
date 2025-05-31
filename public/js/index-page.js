const topicInput = document.getElementById('topicInput');
const addTopicBtn = document.getElementById('addTopicBtn');
const topicList = document.getElementById('topicList');  const topics = [];
// Local cache for topic popularity - stores known values to avoid API calls
const topicPopularityCache = new Map();

// Debounce timer for input changes
let inputDebounceTimer = null;

// Cookie utility functions
function setCookie(name, value, days = 30) {
const expires = new Date();
expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
const nameEQ = name + "=";
const ca = document.cookie.split(';');
for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
    return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
}
return null;
}

// Save topics to cookie
function saveTopicsToCookie() {
setCookie('freeyap_user_topics', JSON.stringify(topics), 30);
}
// Load topics from cookie
function loadTopicsFromCookie() {
const savedTopics = getCookie('freeyap_user_topics');
if (savedTopics) {
    try {
    const parsedTopics = JSON.parse(savedTopics);
    if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
        // Clear current topics first
        topics.length = 0;
        topicList.innerHTML = '';
        
        // Add saved topics back (ensure they're lowercase)
        parsedTopics.forEach(topic => {
        if (typeof topic === 'string' && topic.trim() !== '' && topics.length < 10) {
            const lowercaseTopic = topic.toLowerCase();
            topics.push(lowercaseTopic);
            
            // Check if we have the popularity in cache to avoid redundant API call
            const cachedPopularity = topicPopularityCache.get(lowercaseTopic);
            const badge = createTopicElement(lowercaseTopic, cachedPopularity, true);
            topicList.appendChild(badge);
        }
        });
        
        updatePlaceholder();
    }
    } catch (error) {
    console.error('Error loading topics from cookie:', error);
    }
}
}
// Reusable function to create topic elements with popularity indicators
function createTopicElement(topicName, popularity = null, isUserTopic = false) {
const badge = document.createElement('span');
badge.className = isUserTopic ? 'topic-bubble topic-bubble-user' : 'topic-bubble topic-bubble-popular';
badge.style.display = 'inline-flex';
badge.style.alignItems = 'center';

// Add appear animation
badge.classList.add('topic-bubble-appear');

// Create the content structure
const iconSpan = document.createElement('span');
iconSpan.className = 'popularity-icon';

const topicText = document.createElement('span');
topicText.className = 'topic-text';
topicText.textContent = topicName;

// Set initial loading state if popularity is not provided
if (popularity === null) {
    iconSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    badge.appendChild(iconSpan);
    badge.appendChild(topicText);
    
    // Fetch popularity asynchronously
    fetchTopicPopularity(topicName).then(pop => {
    updatePopularityIcon(iconSpan, pop);
    // Update badge styling based on popularity
    updateBadgeStyleForPopularity(badge, pop, isUserTopic);
    });
} else {
    updatePopularityIcon(iconSpan, popularity);
    badge.appendChild(iconSpan);
    badge.appendChild(topicText);
    // Update badge styling based on popularity
    updateBadgeStyleForPopularity(badge, popularity, isUserTopic);
}

if (isUserTopic) {
    // Add remove "×" button for user-added topics
    const removeBtn = document.createElement('span');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Remove topic';

    removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Add disappear animation
    badge.classList.add('topic-bubble-remove');
    
    setTimeout(() => {
        const index = topics.findIndex(existingTopic => existingTopic.toLowerCase() === topicName.toLowerCase());
        if (index > -1) {
        topics.splice(index, 1);
        }
        badge.remove();
        updatePlaceholder();
        saveTopicsToCookie(); // Save to cookie when topic is removed
    }, 200);
    });
    
    badge.appendChild(removeBtn);
} else {
    // Add click functionality for popular topics (only on the text, not the whole badge)
    topicText.addEventListener('click', (e) => {
    e.stopPropagation();
    const lowercaseTopicName = topicName.toLowerCase();
    
    if (topics.length < 10 && !topics.some(existingTopic => existingTopic.toLowerCase() === lowercaseTopicName)) {
        const newBadge = createTopicElement(lowercaseTopicName, popularity, true);
        topicList.appendChild(newBadge);
        topics.push(lowercaseTopicName);
        updatePlaceholder();
        saveTopicsToCookie(); // Save to cookie when topic is added from popular topics
    }
    });
}

return badge;
}
// Function to update popularity icon based on score  
function updatePopularityIcon(iconElement, popularity) {
let iconClass = '';

if (popularity === 0) {
    iconClass = 'fas fa-plus-circle text-muted popularity-icon';
    iconElement.title = 'New topic - be the first to discuss';
} else if (popularity < 10) {
    iconClass = 'fas fa-seedling text-success popularity-icon';
    iconElement.title = `Growing topic (${popularity} users discussing)`;
} else if (popularity < 25) {
    iconClass = 'fas fa-chart-line text-info popularity-icon';
    iconElement.title = `Trending topic (${popularity} users)`;
} else if (popularity < 50) {
    iconClass = 'fas fa-users text-primary popularity-icon';
    iconElement.title = `Popular topic (${popularity} users)`;
} else {
    iconClass = 'fas fa-crown text-warning popularity-icon';
    iconElement.title = `Hot topic (${popularity}+ users)`;
}

iconElement.innerHTML = `<i class="${iconClass}"></i>`;
}

// Function to fetch individual topic popularity (uses cache first)
async function fetchTopicPopularity(topicName) {
// Check cache first - if we have it, return immediately
if (topicPopularityCache.has(topicName)) {
    return topicPopularityCache.get(topicName);
}

try {
    const response = await fetch('/api/topic-popularity/get-topic-popularity', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic: topicName })
    });
    
    if (response.ok) {
    const data = await response.json();
    const popularity = data.popularity || 0;
    
    // Cache the result for future use
    topicPopularityCache.set(topicName, popularity);
    return popularity;
    }
    
    // Cache zero popularity for failed requests to avoid repeated failures
    topicPopularityCache.set(topicName, 0);
    return 0;
} catch (error) {
    console.error('Error fetching topic popularity:', error);
    // Cache zero popularity for failed requests
    topicPopularityCache.set(topicName, 0);
    return 0;
}
}
// Function to update the input field tag icon with popularity indicator
async function updateInputIcon(topicName) {
const tagIcon = document.querySelector('#basic-addon1 i');

if (!topicName || topicName.trim() === '') {
    // Reset to default tag icon
    tagIcon.className = 'fas fa-tag';
    tagIcon.parentElement.title = '';
    return;
}

// Check cache first - if we have it, update immediately
if (topicPopularityCache.has(topicName)) {
    const popularity = topicPopularityCache.get(topicName);
    updateTagIconBasedOnPopularity(tagIcon, popularity);
    return;
}

// Show loading spinner only if we need to fetch
tagIcon.className = 'fas fa-spinner fa-spin';
tagIcon.parentElement.title = 'Checking popularity...';

// Fetch popularity and update icon
const popularity = await fetchTopicPopularity(topicName);
updateTagIconBasedOnPopularity(tagIcon, popularity);
}

// Function to update the tag icon based on popularity  
function updateTagIconBasedOnPopularity(iconElement, popularity) {
if (popularity === 0) {
    iconElement.className = 'fas fa-plus-circle text-muted';
    iconElement.parentElement.title = 'New topic - be the first to discuss';
} else if (popularity < 10) {
    iconElement.className = 'fas fa-seedling text-success';
    iconElement.parentElement.title = `Growing topic (${popularity} users discussing)`;
} else if (popularity < 25) {
    iconElement.className = 'fas fa-chart-line text-info';
    iconElement.parentElement.title = `Trending topic (${popularity} users)`;
} else if (popularity < 50) {
    iconElement.className = 'fas fa-users text-primary';
    iconElement.parentElement.title = `Popular topic (${popularity} users)`;
} else {
    iconElement.className = 'fas fa-crown text-warning';
    iconElement.parentElement.title = `Hot topic (${popularity}+ users)`;
}
}
function addTopic() {
if (topicInput.value.trim() !== '' && topics.length < 10) {
    const originalTopic = topicInput.value.trim();
    const topic = originalTopic.toLowerCase(); // Force to lowercase
    
    // Check if topic already exists (case-insensitive)
    if (topics.some(existingTopic => existingTopic.toLowerCase() === topic)) {
    topicInput.value = '';
    addTopicBtn.classList.add('d-none');
    // Reset icon
    updateInputIcon('');
    return;
    }    // Always check spelling since spell checking is now always enabled
    if (window.freeYapSpellChecker && window.freeYapSpellChecker.isInitialized) {
        const spellCheckResult = checkTopicSpelling(topic);
        if (spellCheckResult.hasErrors && spellCheckResult.suggestions.length > 0) {
            showSpellCheckDialog(originalTopic, topic, spellCheckResult.suggestions);
            return;
        }
    }

    // Add the topic (using lowercase version)
    addTopicToList(topic);
}
}

// Function to actually add topic to the list
function addTopicToList(topic) {
topics.push(topic);

// Check if we have the popularity in cache to avoid redundant API call
const cachedPopularity = topicPopularityCache.get(topic);
const badge = createTopicElement(topic, cachedPopularity, true);
topicList.appendChild(badge);

topicInput.value = '';
addTopicBtn.classList.add('d-none');
updatePlaceholder();
saveTopicsToCookie(); // Save to cookie when topic is added manually

// Reset icon
updateInputIcon('');
}

// Function to show spell check dialog
function showSpellCheckDialog(originalTopic, lowercaseTopic, suggestions) {
// Create modal backdrop
const backdrop = document.createElement('div');
backdrop.className = 'modal-backdrop';
backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
`;

// Create modal dialog
const modal = document.createElement('div');
modal.className = 'spell-check-modal';
modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    animation: modalFadeIn 0.2s ease-out;
`;

// Add animation keyframes if not already present
if (!document.querySelector('#spellCheckModalStyles')) {
    const style = document.createElement('style');
    style.id = 'spellCheckModalStyles';
    style.textContent = `
    @keyframes modalFadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .spell-check-btn {
        padding: 8px 16px;
        margin: 4px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .spell-check-btn:hover {
        background: #f8f9fa;
        border-color: #adb5bd;
    }
    .spell-check-btn.primary {
        background: #007bff;
        color: white;
        border-color: #007bff;
    }
    .spell-check-btn.primary:hover {
        background: #0056b3;
        border-color: #004085;
    }
    .spell-check-btn.secondary {
        background: #6c757d;
        color: white;
        border-color: #6c757d;
    }
    .spell-check-btn.secondary:hover {
        background: #545b62;
        border-color: #4e555b;
    }
    `;
    document.head.appendChild(style);
}

let modalContent = `
    <h5 style="margin-bottom: 16px; color: #333;">Possible Spelling Error</h5>
    <p style="margin-bottom: 16px; color: #666;">
    The topic "<strong>${originalTopic}</strong>" might be misspelled.
    </p>
`;

if (suggestions.length > 0) {
    modalContent += `
    <p style="margin-bottom: 12px; color: #666; font-size: 14px;">Did you mean:</p>
    <div style="margin-bottom: 20px;">
    `;
    
    suggestions.slice(0, 3).forEach(suggestion => {
    modalContent += `
        <button class="spell-check-btn suggestion-btn" data-suggestion="${suggestion}" style="display: block; width: 100%; text-align: left; margin-bottom: 4px;">
        ${suggestion}
        </button>
    `;
    });
    
    modalContent += `</div>`;
}

modalContent += `
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
    <button class="spell-check-btn cancel-btn">Cancel</button>
    <button class="spell-check-btn secondary use-original-btn">Use "${lowercaseTopic}"</button>
    </div>
`;

modal.innerHTML = modalContent;
backdrop.appendChild(modal);
document.body.appendChild(backdrop);

// Add event listeners
modal.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (e.target.classList.contains('suggestion-btn')) {
    const suggestion = e.target.dataset.suggestion;
    addTopicToList(suggestion);
    document.body.removeChild(backdrop);
    } else if (e.target.classList.contains('use-original-btn')) {
    addTopicToList(lowercaseTopic);
    document.body.removeChild(backdrop);
    } else if (e.target.classList.contains('cancel-btn')) {
    document.body.removeChild(backdrop);
    }
});

// Close on backdrop click
backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
    document.body.removeChild(backdrop);
    }
});

// Close on Escape key
const escapeHandler = (e) => {
    if (e.key === 'Escape') {
    document.body.removeChild(backdrop);
    document.removeEventListener('keydown', escapeHandler);
    }
};
document.addEventListener('keydown', escapeHandler);
}
// Show/hide "Add" button based on input content and check popularity  
topicInput.addEventListener('input', () => {
const inputValue = topicInput.value.trim();

if (inputValue !== '' && topics.length < 10) {
    addTopicBtn.classList.remove('d-none');
} else {
    addTopicBtn.classList.add('d-none');
}

// Clear existing debounce timer
if (inputDebounceTimer) {
    clearTimeout(inputDebounceTimer);
}

// If input is empty, immediately reset to default tag icon
if (inputValue === '') {
    updateInputIcon('');
} else {
    // Set new debounce timer to check popularity after user stops typing
    inputDebounceTimer = setTimeout(() => {
    updateInputIcon(inputValue.toLowerCase()); // Use lowercase for consistency
    }, 500); // Wait 500ms after user stops typing
}
});

// Update placeholder text when max topics reached
function updatePlaceholder() {
if (topics.length >= 10) {
    topicInput.placeholder = "Maximum 10 topics reached";
    topicInput.disabled = true;
} else {
    topicInput.placeholder = "Add up to 10 topics (optional)";
    topicInput.disabled = false;
}
}
// Add topic when Enter key is pressed
topicInput.addEventListener('keydown', (event) => {
if (event.key === 'Enter') {
    addTopic();
}
});

// Reset icon when input loses focus if empty
topicInput.addEventListener('blur', () => {
if (topicInput.value.trim() === '') {
    updateInputIcon('');
}
});

// Add topic when Add button is clicked
addTopicBtn.addEventListener('click', addTopic);
document.querySelectorAll('.main-btn').forEach(button => {
button.addEventListener('click', (event) => {
    event.preventDefault();
    const chatMode = button.getAttribute('href');
    const queryParams = new URLSearchParams({ topics: JSON.stringify(topics) });
    window.location.href = `${chatMode}?${queryParams}`;
});
});
// Fetch and display popular topics
async function fetchPopularTopics() {
try {
    const response = await fetch('/api/topic-popularity/get-popular-topics', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
    });
    
    if (!response.ok) {
    throw new Error('Failed to fetch popular topics');
    }
    
    const data = await response.json();
    const popularTopicsElement = document.getElementById('popularTopics');
      if (Array.isArray(data) && data.length > 0) {
    popularTopicsElement.innerHTML = '';
    
    const topicsContainer = document.createElement('div');
    topicsContainer.className = 'popular-topics-container';
    
    data.forEach(topicData => {
        // Cache the popularity data to avoid redundant API calls
        topicPopularityCache.set(topicData.topic, topicData.popularity_score);
        
        const badge = createTopicElement(topicData.topic, topicData.popularity_score, false);
        topicsContainer.appendChild(badge);
    });
    
    popularTopicsElement.appendChild(topicsContainer);
    
    const hint = document.createElement('div');
    hint.className = 'popular-topics-hint';
    hint.textContent = 'Click a topic to add it to your list';
    popularTopicsElement.appendChild(hint);
    } else {
    popularTopicsElement.textContent = 'No active discussions on popular topics right now. Start one!';
    }
} catch (error) {
    console.error('Error fetching popular topics:', error);
    document.getElementById('popularTopics').textContent = 
    'No active discussions on popular topics right now. Start one!';
}  }
// Load saved topics from cookie on page load
loadTopicsFromCookie();

// Fetch popular topics on page load
fetchPopularTopics();

// Always enable spell checking on topic input
console.log('SpellCheckUtils available:', !!window.SpellCheckUtils);
console.log('freeYapSpellChecker available:', !!window.freeYapSpellChecker);
console.log('freeYapSpellChecker initialized:', window.freeYapSpellChecker?.isInitialized);

if (window.SpellCheckUtils) {
window.SpellCheckUtils.enableSpellCheck(topicInput, {
    showUnderlines: true,
    showSuggestions: false
});

// Enable word suggestions dropdown
console.log('Enabling word suggestions...');
window.SpellCheckUtils.enableWordSuggestions(topicInput, {
    maxSuggestions: 6,
    minInputLength: 2
});
console.log('Word suggestions enabled');
} else {
console.error('SpellCheckUtils not available');
}

// Listen for spell check events to show status
topicInput.addEventListener('spellcheckComplete', (event) => {
const { errors } = event.detail;

if (errors.length > 0) {
    console.log(`Spell check found ${errors.length} potential errors:`, errors);
}
});

// Function to update badge styling based on popularity score
function updateBadgeStyleForPopularity(badge, popularity, isUserTopic) {
if (isUserTopic) {
    // User topics keep their consistent styling
    return;
}

// Remove existing popularity classes
badge.classList.remove('topic-bubble-hot', 'topic-bubble-trending');

// Add special styling based on popularity
if (popularity >= 50) {
    badge.classList.add('topic-bubble-hot');
} else if (popularity >= 25) {
    badge.classList.add('topic-bubble-trending');
}
}

// Helper function to check spelling of multi-word topics
function checkTopicSpelling(topic) {
    if (!window.freeYapSpellChecker || !window.freeYapSpellChecker.isInitialized) {
        return { hasErrors: false, suggestions: [] };
    }

    // Split the topic into individual words
    const words = topic.split(/\s+/).filter(word => word.trim().length > 0);
    const misspelledWords = [];
    const allSuggestions = [];

    // Check each word individually
    for (const word of words) {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 1 && !window.freeYapSpellChecker.isCorrect(cleanWord)) {
            misspelledWords.push(cleanWord);
            const wordSuggestions = window.freeYapSpellChecker.getSuggestions(cleanWord);
            
            // Only add suggestions if they exist
            if (wordSuggestions && wordSuggestions.length > 0) {
                // Create suggestions for the full topic with this word corrected
                wordSuggestions.slice(0, 3).forEach(suggestion => {
                    const correctedTopic = topic.replace(new RegExp(`\\b${cleanWord}\\b`, 'gi'), suggestion);
                    if (!allSuggestions.includes(correctedTopic)) {
                        allSuggestions.push(correctedTopic);
                    }
                });
            }
        }
    }

    return {
        hasErrors: misspelledWords.length > 0,
        misspelledWords: misspelledWords,
        suggestions: allSuggestions.slice(0, 5) // Limit to 5 suggestions max
    };
}
