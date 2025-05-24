/**
 * WebRTC AI UI Integration Module
 * Connects UI controls to AI functionality for WebRTC demo
 * including age estimation, content moderation, emotion detection, and virtual backgrounds
 */

// Initialize AI UI controls
function initializeAIUI() 
{
    // Initialize core UI components
    if (window.initializeAIUICore) 
    {
        window.initializeAIUICore();
    }
    
    // Initialize feature-specific UI components
    if (window.initializeAgeEstimationUI) 
    {
        window.initializeAgeEstimationUI();
    }
    
    if (window.initializeContentModerationUI) 
    {
        window.initializeContentModerationUI();
    }
    
    if (window.initializeEmotionDetectionUI) 
    {
        window.initializeEmotionDetectionUI();
    }
    
    if (window.initializeVirtualBackgroundUI) 
    {
        window.initializeVirtualBackgroundUI();
    }
    
    addLogEntry('AI UI controls initialized', 'info');
}

// Export function to window
window.initializeAIUI = initializeAIUI;
