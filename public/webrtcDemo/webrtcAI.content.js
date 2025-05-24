/**
 * WebRTC AI UI Content Moderation Module
 * Handles UI controls for content moderation features
 */

// Initialize content moderation UI controls
function initializeContentModerationUI() 
{
    const toggleContentModerationButton = document.getElementById('toggleContentModeration');
    const contentModerationValue = document.getElementById('contentModerationValue');
    
    if (!toggleContentModerationButton || !contentModerationValue) return;
    
    toggleContentModerationButton.addEventListener('click', function() 
    {
        const isRunning = window.isContentModerationRunning ? window.isContentModerationRunning() : false;
        
        if (isRunning) 
        {
            // Stop content moderation
            if (window.stopContentModeration) 
            {
                window.stopContentModeration();
                this.innerHTML = '<i class="fas fa-shield-alt"></i> Enable Content Moderation';
                this.classList.replace('btn-danger', 'btn-outline-danger');
                contentModerationValue.textContent = 'Not monitoring';
            }
        } 
        else 
        {
            // Start content moderation
            if (window.startContentModeration && window.initializeContentModerator) 
            {
                const localVideo = window.checkVideoStream(() => {
                    addLogEntry('Cannot start content moderation - no video stream available', 'error');
                });
                
                if (!localVideo) return;
                
                window.updateAIModelStatus('Loading content moderation model...', 'loading');
                
                // Initialize content moderation
                window.initializeContentModerator().then(initialized => 
                {
                    if (!initialized) 
                    {
                        window.updateAIModelStatus('Content moderation model initialization failed', 'error');
                        return;
                    }
                    
                    // Handle content moderation results
                    const onDetection = (result) => 
                    {
                        if (result) 
                        {
                            console.log('Content moderation result:', result);
                            let status = result.isSafe ? 'Safe' : 'Potentially inappropriate';
                            let statusClass = result.isSafe ? 'text-success' : 'text-danger';
                            
                            // Display more detailed information about the detected content
                            const category = result.topCategory;
                            const score = (result.topScore * 100).toFixed(0);
                            
                            contentModerationValue.innerHTML = `<span class="${statusClass}">${status} - ${category} (${score}%)</span>`;
                            window.updateAIModelStatus('Content moderation active', 'success');
                        } 
                        else 
                        {
                            contentModerationValue.textContent = 'No detection';
                        }
                    };
                    
                    // Start continuous content moderation
                    const frequency = 3000; // 3 seconds
                    window.startContentModeration(localVideo, onDetection, frequency);
                    
                    this.innerHTML = '<i class="fas fa-shield-alt"></i> Disable Content Moderation';
                    this.classList.replace('btn-outline-danger', 'btn-danger');
                });
            }
        }
    });
}

// Export function to global scope
window.initializeContentModerationUI = initializeContentModerationUI;