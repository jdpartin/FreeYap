/**
 * WebRTC AI UI Core Module
 * Provides core functionality for AI feature UI integration
 */

// Set the confidence threshold for AI models
function setupConfidenceThresholdUI(sliderElement, valueElement) 
{
    if (!sliderElement || !valueElement) return;
    
    sliderElement.addEventListener('input', function() 
    {
        valueElement.textContent = this.value;
        
        if (window.setConfidenceThreshold) 
        {
            window.setConfidenceThreshold(parseFloat(this.value));
        }
    });
}

// Update the AI model status display
function updateAIModelStatus(message, type = 'info') 
{
    const aiModelStatus = document.getElementById('aiModelStatus');
    if (!aiModelStatus) return;
    
    let icon = '<i class="fas fa-info-circle"></i>';
    
    switch (type) 
    {
        case 'loading':
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
        case 'success':
            icon = '<i class="fas fa-check-circle text-success"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-triangle text-danger"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle text-warning"></i>';
            break;
    }
    
    aiModelStatus.innerHTML = `${icon} ${message}`;
}

// Check if a local video stream is available
function checkVideoStream(onError) 
{
    const localVideo = document.getElementById('localVideo');
    const localCanvas = document.getElementById('localVideoCanvas');
    
    if (!localVideo || !localVideo.srcObject) 
    {
        if (typeof onError === 'function') 
        {
            onError('No video stream available');
        }
        updateAIModelStatus('No video stream available', 'warning');
        return null;
    }
    
    // For debugging
    console.log('[AI] Video stream check: dimensions =', 
                localVideo.videoWidth, 'x', localVideo.videoHeight,
                'readyState =', localVideo.readyState,
                'canvas visible =', localCanvas ? getComputedStyle(localCanvas).display !== 'none' : false);
    
    // Return the video element since that's what has the stream, even though we're displaying via canvas
    return localVideo;
}

// Initialize the core AI UI controls
function initializeAIUICore() 
{
    const confidenceThresholdSlider = document.getElementById('confidenceThresholdSlider');
    const confidenceThresholdValue = document.getElementById('confidenceThresholdValue');
    
    // Initialize confidence threshold slider
    setupConfidenceThresholdUI(confidenceThresholdSlider, confidenceThresholdValue);
    
    // Initialize default AI model status
    updateAIModelStatus('AI models will be loaded when you start AI features');
    
    return {
        updateStatus: updateAIModelStatus,
        checkVideoStream: checkVideoStream,
        canvasUtility: {
            drawCanvas: drawCanvasToCanvas
        }
    };
}

/**
 * Utility function to draw one canvas onto another
 * @param {HTMLCanvasElement} sourceCanvas - The source canvas to draw from
 * @param {HTMLCanvasElement} targetCanvas - The target canvas to draw to
 * @param {boolean} [maintainAspectRatio=true] - Whether to maintain aspect ratio
 */
function drawCanvasToCanvas(sourceCanvas, targetCanvas, maintainAspectRatio = true) 
{
    if (!sourceCanvas || !targetCanvas) return false;
    
    try {
        const sourceCtx = sourceCanvas.getContext('2d');
        const targetCtx = targetCanvas.getContext('2d');
        
        if (!sourceCtx || !targetCtx) return false;
        
        // Clear the target canvas
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        
        if (maintainAspectRatio) {
            // Calculate aspect ratios
            const sourceRatio = sourceCanvas.width / sourceCanvas.height;
            const targetRatio = targetCanvas.width / targetCanvas.height;
            
            let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
            
            // Calculate dimensions to maintain aspect ratio
            if (sourceRatio > targetRatio) {
                // Source is wider - fit width
                drawWidth = targetCanvas.width;
                drawHeight = targetCanvas.width / sourceRatio;
                offsetY = (targetCanvas.height - drawHeight) / 2;
            } else {
                // Source is taller - fit height
                drawHeight = targetCanvas.height;
                drawWidth = targetCanvas.height * sourceRatio;
                offsetX = (targetCanvas.width - drawWidth) / 2;
            }
            
            // Draw with aspect ratio preserved
            targetCtx.drawImage(sourceCanvas, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            // Draw without preserving aspect ratio (stretch to fit)
            targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
        }
        
        return true;
    } catch (error) {
        console.error('[AI] Error drawing canvas to canvas:', error);
        return false;
    }
}

// Export functions to global scope
window.initializeAIUICore = initializeAIUICore;
window.updateAIModelStatus = updateAIModelStatus;
window.checkVideoStream = checkVideoStream;
window.drawCanvasToCanvas = drawCanvasToCanvas;
