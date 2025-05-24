/**
 * WebRTC AI UI Virtual Background Module
 * Handles UI controls for virtual background features
 */

// Initialize virtual background UI controls
function initializeVirtualBackgroundUI() 
{
    const toggleVirtualBackgroundButton = document.getElementById('toggleVirtualBackground');
    const backgroundEffectSelect = document.getElementById('backgroundEffectSelect');
    
    if (!toggleVirtualBackgroundButton || !backgroundEffectSelect) return;
    
    const customBackgroundOptions = document.getElementById('customBackgroundOptions');
    const customBackgroundImage = document.getElementById('customBackgroundImage');
    const backgroundPreview = document.getElementById('backgroundPreview');
    const bgImagePreview = document.querySelector('.bg-image-preview');
    
    let customImageUrl = null;
    
    // Initialize custom background options
    if (customBackgroundImage) 
    {
        // Hide/show custom options based on effect selection
        backgroundEffectSelect.addEventListener('change', function() 
        {
            if (this.value === 'custom') 
            {
                customBackgroundOptions.style.display = 'block';
                if (customImageUrl) 
                {
                    bgImagePreview.style.display = 'block';
                }
            } 
            else 
            {
                customBackgroundOptions.style.display = 'none';
                bgImagePreview.style.display = 'none';
            }
            
            // Apply effect if background is active
            if (window.setVirtualBackgroundEffect && window.isVirtualBackgroundActive && window.isVirtualBackgroundActive()) 
            {
                const effect = this.value;
                const imageUrl = effect === 'custom' ? customImageUrl : null;
                window.setVirtualBackgroundEffect(effect, imageUrl);
            }
        });
        
        // Handle custom image upload
        customBackgroundImage.addEventListener('change', function() 
        {
            if (this.files && this.files[0]) 
            {
                const file = this.files[0];
                
                // Validate file is an image and not too large (max 5MB)
                if (!file.type.match('image.*')) 
                {
                    addLogEntry('Please select an image file', 'warning');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) 
                {
                    addLogEntry('Image is too large (max 5MB)', 'warning');
                    return;
                }
                
                // Create object URL for the image
                customImageUrl = URL.createObjectURL(file);
                
                // Update preview
                backgroundPreview.src = customImageUrl;
                bgImagePreview.style.display = 'block';
                
                // Apply immediately if virtual background is active
                if (window.setVirtualBackgroundEffect && window.isVirtualBackgroundActive && window.isVirtualBackgroundActive()) 
                {
                    window.setVirtualBackgroundEffect('custom', customImageUrl);
                }
                
                addLogEntry('Custom background image loaded', 'info');
            }
        });
    }
    
    // Handle toggle button click
    toggleVirtualBackgroundButton.addEventListener('click', function() 
    {
        const isActive = window.isVirtualBackgroundActive ? window.isVirtualBackgroundActive() : false;
        
        if (isActive) 
        {
            // Disable virtual background
            if (window.stopVirtualBackground) 
            {
                window.stopVirtualBackground();
                this.innerHTML = '<i class="fas fa-image"></i> Enable Virtual Background';
                this.classList.replace('btn-success', 'btn-outline-success');
                backgroundEffectSelect.disabled = true;
                
                if (customBackgroundOptions) 
                {
                    customBackgroundOptions.style.display = 'none';
                }
                
                if (bgImagePreview) 
                {
                    bgImagePreview.style.display = 'none';
                }
            }
        } 
        else 
        {
            // Enable virtual background
            if (window.initializeVirtualBackground && window.applyVirtualBackground) 
            {
                const localVideo = window.checkVideoStream(() => {
                    addLogEntry('Cannot apply virtual background - no video stream available', 'error');
                });
                
                const backgroundOutputCanvas = document.getElementById('backgroundOutputCanvas');
                
                if (!localVideo || !backgroundOutputCanvas) return;
                
                window.updateAIModelStatus('Loading virtual background model...', 'loading');
                
                // Initialize virtual background
                window.initializeVirtualBackground().then(initialized => 
                {
                    if (!initialized) 
                    {
                        window.updateAIModelStatus('Virtual background initialization failed', 'error');
                        return;
                    }
                    
                    const effect = backgroundEffectSelect.value;
                    const imageUrl = effect === 'custom' ? customImageUrl : null;
                    
                    // Apply virtual background
                    window.applyVirtualBackground(localVideo, backgroundOutputCanvas, effect, imageUrl);
                    
                    this.innerHTML = '<i class="fas fa-image"></i> Disable Virtual Background';
                    this.classList.replace('btn-outline-success', 'btn-success');
                    backgroundEffectSelect.disabled = false;
                    
                    // Show custom background options if needed
                    if (customBackgroundOptions && effect === 'custom') 
                    {
                        customBackgroundOptions.style.display = 'block';
                        if (customImageUrl && bgImagePreview) 
                        {
                            bgImagePreview.style.display = 'block';
                        }
                    }
                    
                    window.updateAIModelStatus('Virtual background active', 'success');
                });
            }
        }
    });
    
    // Initially disable the background effect select
    backgroundEffectSelect.disabled = true;
}

// Export function to global scope
window.initializeVirtualBackgroundUI = initializeVirtualBackgroundUI;