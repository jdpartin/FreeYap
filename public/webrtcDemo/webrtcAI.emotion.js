/**
 * WebRTC AI UI Emotion Detection Module
 * Handles UI controls for emotion detection features
 */

// Initialize emotion detection UI controls
function initializeEmotionDetectionUI() 
{
    const toggleEmotionDetectionButton = document.getElementById('toggleEmotionDetection');
    const emotionDetectionValue = document.getElementById('emotionDetectionValue');
    
    if (!toggleEmotionDetectionButton || !emotionDetectionValue) return;
    
    toggleEmotionDetectionButton.addEventListener('click', function() 
    {
        const isRunning = window.isEmotionDetectionRunning ? window.isEmotionDetectionRunning() : false;
        
        if (isRunning) 
        {
            // Stop emotion detection
            if (window.stopEmotionDetection) 
            {
                window.stopEmotionDetection();
                this.innerHTML = '<i class="fas fa-smile"></i> Start Emotion Detection';
                this.classList.replace('btn-danger', 'btn-outline-info');
                emotionDetectionValue.textContent = 'Not detecting';
            }
        } 
        else 
        {
            // Start emotion detection
            if (window.startEmotionDetection && window.initializeEmotionDetector) 
            {
                const localVideo = window.checkVideoStream(() => {
                    addLogEntry('Cannot start emotion detection - no video stream available', 'error');
                });
                
                if (!localVideo) return;
                
                window.updateAIModelStatus('Loading emotion detection model...', 'loading');
                
                // Initialize emotion detector
                window.initializeEmotionDetector().then(initialized => 
                {
                    if (!initialized) 
                    {
                        window.updateAIModelStatus('Emotion detection model initialization failed', 'error');
                        return;
                    }
                    
                    // Handle emotion detection results
                    const onDetection = (result) => 
                    {
                        if (result && result.dominantEmotion) 
                        {
                            const emotion = result.dominantEmotion;
                            let emojiMap = {
                                'happy': '😊',
                                'sad': '😢',
                                'angry': '😠',
                                'surprised': '😲',
                                'fearful': '😨',
                                'disgusted': '🤢',
                                'neutral': '😐'
                            };
                            
                            const emoji = emojiMap[emotion.toLowerCase()] || '';
                            emotionDetectionValue.textContent = `${emotion} ${emoji} (confidence: ${(result.confidence * 100).toFixed(0)}%)`;
                            window.updateAIModelStatus('Emotion detection active', 'success');
                            console.log('Emotion detection result:', result);
                        } 
                        else 
                        {
                            emotionDetectionValue.textContent = 'No face detected';
                        }
                    };
                    
                    // Start continuous emotion detection
                    const frequency = 2000; // 2 seconds
                    window.startEmotionDetection(localVideo, onDetection, frequency);
                    
                    this.innerHTML = '<i class="fas fa-smile"></i> Stop Emotion Detection';
                    this.classList.replace('btn-outline-info', 'btn-danger');
                });
            }
        }
    });
}

// Export function to global scope
window.initializeEmotionDetectionUI = initializeEmotionDetectionUI;