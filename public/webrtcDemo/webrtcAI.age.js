/**
 * WebRTC AI UI Age Estimation Module
 * Handles UI controls for age estimation features
 */

// Initialize age estimation UI controls
function initializeAgeEstimationUI() 
{
    const toggleAgeEstimationButton = document.getElementById('toggleAgeEstimation');
    const estimatedAgeValue = document.getElementById('estimatedAgeValue');
    
    if (!toggleAgeEstimationButton || !estimatedAgeValue) return;
    
    toggleAgeEstimationButton.addEventListener('click', function() 
    {
        const isRunning = window.isAgeEstimationRunning ? window.isAgeEstimationRunning() : false;
        
        if (isRunning) 
        {
            // Stop age estimation
            if (window.stopAgeEstimation) 
            {
                window.stopAgeEstimation();
                this.innerHTML = '<i class="fas fa-user-clock"></i> Start Age Estimation';
                this.classList.replace('btn-danger', 'btn-outline-primary');
                estimatedAgeValue.textContent = 'Not available';
                window.updateAIModelStatus('AI models will be loaded when you start AI features');
            }
        } 
        else 
        {
            // Start age estimation
            if (window.startAgeEstimation && window.initializeAgeEstimator && window.checkAgeEstimatorModels) 
            {
                const localVideo = window.checkVideoStream(() => {
                    addLogEntry('Cannot start age estimation - no video stream available', 'error');
                });
                
                if (!localVideo) return;
                
                window.updateAIModelStatus('Checking AI models...', 'loading');
                
                // Check if models are available first
                window.checkAgeEstimatorModels().then(modelsAvailable => 
                {
                    if (!modelsAvailable) 
                    {
                        window.updateAIModelStatus('AI models not found. Please run the download script', 'error');
                        return;
                    }
                    
                    window.updateAIModelStatus('Loading AI models...', 'loading');
                    
                    // Handle age estimation results
                    const onEstimation = (result) => 
                    {
                        if (result && result.age !== null) 
                        {
                            estimatedAgeValue.textContent = `${result.age} years (confidence: ${(result.confidence * 100).toFixed(0)}%)`;
                            window.updateAIModelStatus('AI models loaded and running', 'success');
                        } 
                        else 
                        {
                            estimatedAgeValue.textContent = 'No face detected';
                        }
                    };
                    
                    // Start continuous age estimation
                    const frequency = 2000; // 2 seconds
                    window.startAgeEstimation(localVideo, onEstimation, frequency);
                    
                    this.innerHTML = '<i class="fas fa-user-clock"></i> Stop Age Estimation';
                    this.classList.replace('btn-outline-primary', 'btn-danger');
                });
            }
        }
    });
}

// Export function to global scope
window.initializeAgeEstimationUI = initializeAgeEstimationUI;