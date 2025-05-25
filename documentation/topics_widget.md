# FreeYap Topics Widget

This documentation explains how to use the decoupled WebRTCTopicsWidget in the FreeYap platform.

## Overview

The Topics Widget is a standalone component that handles the display, sharing, and similarity analysis of user topics in FreeYap. It's now been decoupled from other widgets (like chat) to allow for more flexibility in how it's used throughout the application.

## Features

- Display user and partner topics
- Calculate semantic similarity between topics
- Visualize topic similarity with color indicators
- Generate "smart hello" messages based on topic similarities
- Highly configurable through options
- Works independently of other widgets

## Quick Start

### Basic Integration

Include the necessary scripts in your HTML:

```html
<!-- Dependencies -->
<script src="/socket.io/socket.io.js"></script>
<script src="https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js"></script>

<!-- WebRTC Modules -->
<script src="/js/WebRTCCore.js"></script>
<script src="/js/WebRTCTopicsWidget.js"></script>
```

Add the required HTML elements:

```html
<div id="topics-container" class="topics-container">
    <div class="user-topics">
        <h3>Your Topics</h3>
        <div id="user-topics-list"></div>
    </div>
    <div class="partner-topics">
        <h3 id="partner-topics-header">Partner's Topics</h3>
        <div id="partner-topics-list">
            <div class="topics-empty">Waiting for partner...</div>
        </div>
    </div>
</div>
```

Initialize the topics widget:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Wait for WebRTCCore to be available
    setTimeout(() => {
        if (window.webrtcCore) {
            window.topicsWidget = new WebRTCTopicsWidget();
        }
    }, 300);
});
```

### Dynamic Creation

If you want to add the topics widget dynamically to a page, use the `WebRTCWidgetLoader`:

```javascript
// Add topics widget to a specific part of the page
const topicsContainer = WebRTCWidgetLoader.addTopicsWidget({
    containerId: 'my-topics-widget',
    parentSelector: '#sidebar',
    widgetOptions: {
        enableSmartHello: false
    }
});
```

## Configuration Options

The `WebRTCTopicsWidget` constructor accepts the following options:

```javascript
const topicsWidget = new WebRTCTopicsWidget({
    // DOM element IDs
    userTopicsListId: 'user-topics-list',        // Element to show user topics
    partnerTopicsListId: 'partner-topics-list',  // Element to show partner topics
    partnerTopicsHeaderId: 'partner-topics-header', // Element for partner header
    topicsContainerId: 'topics-container',       // Container element
    
    // Smart hello functionality
    enableSmartHello: true,      // Whether to send smart hello messages
    smartHelloChannel: 'chat',   // Which channel to send hello messages to
    
    // Initial topics (optional - defaults to URL parameters)
    userTopics: ['Programming', 'Music', 'Travel'], 
    
    // Callback when similarity is calculated
    onTopicSimilarityCalculated: function(data) {
        console.log('Topic similarities:', data);
    }
});
```

## API Reference

### Methods

#### `setUserTopics(topics)`

Updates the user's topics and refreshes the display.

```javascript
topicsWidget.setUserTopics(['Programming', 'Music', 'Travel']);
```

#### `getTopicSimilarities()`

Gets the current topic similarity analysis.

```javascript
const similarities = await topicsWidget.getTopicSimilarities();
```

#### `generateSmartHelloMessage()`

Generates a smart hello message without sending it.

```javascript
const message = await topicsWidget.generateSmartHelloMessage();
```

#### `displayTopicsWithSimilarity(userTopics, partnerTopics)`

Displays topics with similarity analysis.

```javascript
topicsWidget.displayTopicsWithSimilarity(userTopics, partnerTopics);
```

### Events

The Topics Widget integrates with the WebRTCCore event system:

- Listens for `peerConnected` to send topics
- Listens for `data:topics` to receive topics
- Listens for `matchFound` to update partner name
- Listens for `connectionCleaned` to reset state

### Callback Data

The `onTopicSimilarityCalculated` callback receives:

```javascript
{
    similarities: [
        {
            userTopic: "Programming",
            partnerTopic: "Coding",
            similarity: 0.85,
            similarityPercentage: 85
        },
        // More similarity objects...
    ],
    topMatch: {/* Top matching similarity object */},
    secondMatch: {/* Second best matching similarity object */},
    message: "Generated smart hello message"
}
```

## Integration Examples

### With Chat Widget

To integrate the Topics Widget with the Chat Widget:

```javascript
// Example of topics-chat integration
window.topicsWidget = new WebRTCTopicsWidget({
    enableSmartHello: true,
    smartHelloChannel: 'chat',  // Send hello messages through chat channel
    onTopicSimilarityCalculated: (data) => {
        // Use similarity data to enhance chat experience
        if (data.topMatch && data.topMatch.similarity > 0.7) {
            showChatSuggestion(`I see we both like ${data.topMatch.userTopic}!`);
        }
    }
});
```

### Without Chat Widget

To use the Topics Widget independently:

```javascript
window.topicsWidget = new WebRTCTopicsWidget({
    enableSmartHello: false,  // Don't generate automatic messages
    onTopicSimilarityCalculated: (data) => {
        // Use similarity data to update UI
        document.getElementById('match-percentage').textContent = 
            `You have a ${data.topMatch.similarityPercentage}% match!`;
    }
});
```

## Customizing Appearance

Add custom CSS to style the topics widget:

```css
.topics-container {
    background-color: #f5f5f5;
    border-radius: 10px;
    padding: 20px;
}

.topic-bubble {
    background-color: #e1f5fe;
    border-left: 4px solid #29b6f6;
    border-radius: 20px;
    padding: 6px 15px;
    margin: 4px;
    display: inline-block;
    font-size: 14px;
}

.similarity-legend {
    font-size: 12px;
    margin-top: 15px;
    border-top: 1px solid #eee;
    padding-top: 10px;
}
```

## Advanced Usage

### Setting Topics Programmatically

```javascript
// Get topics from a form
document.getElementById('topic-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const topicInput = document.getElementById('topic-input').value;
    const topics = topicInput.split(',').map(t => t.trim()).filter(t => t);
    
    if (topics.length > 0 && window.topicsWidget) {
        window.topicsWidget.setUserTopics(topics);
    }
});
```

### Reacting to Similarity Analysis

```javascript
window.topicsWidget = new WebRTCTopicsWidget({
    onTopicSimilarityCalculated: (data) => {
        // Find the best matches and update UI elements
        const { similarities, topMatch } = data;
        
        // Group similarities by userTopic
        const topicGroups = {};
        similarities.forEach(sim => {
            if (!topicGroups[sim.userTopic]) {
                topicGroups[sim.userTopic] = [];
            }
            topicGroups[sim.userTopic].push(sim);
        });
        
        // For each user topic, find the best partner topic match
        Object.entries(topicGroups).forEach(([userTopic, sims]) => {
            // Sort by similarity (highest first)
            sims.sort((a, b) => b.similarity - a.similarity);
            const bestMatch = sims[0];
            
            // Update a UI element for each user topic
            const topicElement = document.querySelector(`.user-topic[data-topic="${userTopic}"]`);
            if (topicElement) {
                topicElement.setAttribute('data-match', bestMatch.partnerTopic);
                topicElement.setAttribute('data-similarity', bestMatch.similarityPercentage);
                
                // Add match information
                const matchInfo = document.createElement('span');
                matchInfo.className = 'match-info';
                matchInfo.textContent = `${bestMatch.similarityPercentage}% match`;
                topicElement.appendChild(matchInfo);
            }
        });
    }
});
```

## Troubleshooting

### Topics Not Displaying

1. Make sure the required HTML elements exist with correct IDs
2. Verify that WebRTCCore is initialized before creating the topics widget
3. Check the browser console for errors

### Topic Similarity Not Calculating

1. Ensure the semantic similarity API endpoint is working
2. Verify that both users have topics set
3. Check network requests in the browser dev tools

### Smart Hello Messages Not Sending

1. Verify `enableSmartHello` is set to true
2. Check that `smartHelloChannel` corresponds to a registered widget
3. Make sure the peer connection is established successfully

## Example Implementation

See the following example files:
- `views/topics-demo.ejs` - Full demonstration page
- `public/js/examples/topics-standalone-example.html` - Standalone example
- `views/components/add-topics-widget.ejs` - Dynamic widget addition
- `public/js/examples/topicsChatIntegration.js` - Integration with chat
