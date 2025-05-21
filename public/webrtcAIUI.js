/**
 * WebRTC AI UI Integration Module
 * Connects UI controls to AI functionality for WebRTC demo
 * including age estimation, content moderation, emotion detection, and virtual backgrounds
 */

// Initialize AI UI controls
function initializeAIUI() {
    // Get references to UI elements
    const toggleAgeEstimationButton = document.getElementById('toggleAgeEstimation');
    const estimatedAgeValue = document.getElementById('estimatedAgeValue');
    const toggleContentModerationButton = document.getElementById('toggleContentModeration');
    const contentModerationValue = document.getElementById('contentModerationValue');
    const toggleEmotionDetectionButton = document.getElementById('toggleEmotionDetection');
    const emotionDetectionValue = document.getElementById('emotionDetectionValue');
    const toggleVirtualBackgroundButton = document.getElementById('toggleVirtualBackground');
    const backgroundEffectSelect = document.getElementById('backgroundEffectSelect');
    const confidenceThresholdSlider = document.getElementById('confidenceThresholdSlider');
    const confidenceThresholdValue = document.getElementById('confidenceThresholdValue');
    const aiModelStatus = document.getElementById('aiModelStatus');
    
    // Initialize confidence threshold slider
    if (confidenceThresholdSlider && confidenceThresholdValue) {
        confidenceThresholdSlider.addEventListener('input', function() {
            confidenceThresholdValue.textContent = this.value;
            
            if (window.setConfidenceThreshold) {
                window.setConfidenceThreshold(parseFloat(this.value));
            }
        });
    }
    
    // Initialize age estimation toggle button
    if (toggleAgeEstimationButton && estimatedAgeValue) {
        toggleAgeEstimationButton.addEventListener('click', function() {
            const isRunning = window.isAgeEstimationRunning ? window.isAgeEstimationRunning() : false;
            
            if (isRunning) {
                // Stop age estimation
                if (window.stopAgeEstimation) {
                    window.stopAgeEstimation();
                    this.innerHTML = '<i class="fas fa-user-clock"></i> Start Age Estimation';
                    this.classList.replace('btn-danger', 'btn-outline-primary');
                    estimatedAgeValue.textContent = 'Not available';
                    aiModelStatus.innerHTML = '<i class="fas fa-info-circle"></i> AI models will be loaded when you start AI features';
                }            } else {
                // Start age estimation
                if (window.startAgeEstimation && window.initializeAgeEstimator && window.checkAgeEstimatorModels) {
                    const localVideo = document.getElementById('localVideo');
                    
                    if (localVideo && localVideo.srcObject) {
                        aiModelStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking AI models...';
                        
                        // Check if models are available first
                        window.checkAgeEstimatorModels().then(modelsAvailable => {
                            if (!modelsAvailable) {
                                aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> AI models not found. Please run the download script';
                                return;
                            }
                            
                            aiModelStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading AI models...';
                            
                            // Handle age estimation results
                            const onEstimation = (result) => {
                                if (result && result.age !== null) {
                                    estimatedAgeValue.textContent = `${result.age} years (confidence: ${(result.confidence * 100).toFixed(0)}%)`;
                                    aiModelStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> AI models loaded and running';
                                } else {
                                    estimatedAgeValue.textContent = 'No face detected';
                                }
                            };
                            
                            // Start continuous age estimation
                            const frequency = 2000; // 2 seconds
                            window.startAgeEstimation(localVideo, onEstimation, frequency);
                            
                            this.innerHTML = '<i class="fas fa-user-clock"></i> Stop Age Estimation';
                            this.classList.replace('btn-outline-primary', 'btn-danger');
                        });
                    } else {
                        addLogEntry('Cannot start age estimation - no video stream available', 'error');
                        aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> No video stream available';
                    }
                }
            }
        });
    }
    
    // Initialize content moderation toggle button
    if (toggleContentModerationButton && contentModerationValue) {
        toggleContentModerationButton.addEventListener('click', function() {
            const isRunning = window.isContentModerationRunning ? window.isContentModerationRunning() : false;
            
            if (isRunning) {
                // Stop content moderation
                if (window.stopContentModeration) {
                    window.stopContentModeration();
                    this.innerHTML = '<i class="fas fa-shield-alt"></i> Enable Content Moderation';
                    this.classList.replace('btn-danger', 'btn-outline-danger');
                    contentModerationValue.textContent = 'Not monitoring';
                }
            } else {
                // Start content moderation
                if (window.startContentModeration && window.initializeContentModerator) {
                    const localVideo = document.getElementById('localVideo');
                    
                    if (localVideo && localVideo.srcObject) {
                        aiModelStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading content moderation model...';
                        
                        // Initialize content moderation
                        window.initializeContentModerator().then(initialized => {
                            if (!initialized) {
                                aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Content moderation model initialization failed';
                                return;
                            }
                              // Handle content moderation results
                            const onDetection = (result) => {
                                if (result) {
                                    console.log('Content moderation result:', result);
                                    let status = result.isSafe ? 'Safe' : 'Potentially inappropriate';
                                    let statusClass = result.isSafe ? 'text-success' : 'text-danger';
                                    
                                    // Display more detailed information about the detected content
                                    const category = result.topCategory;
                                    const score = (result.topScore * 100).toFixed(0);
                                    
                                    contentModerationValue.innerHTML = `<span class="${statusClass}">${status} - ${category} (${score}%)</span>`;
                                    aiModelStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Content moderation active';
                                } else {
                                    contentModerationValue.textContent = 'No detection';
                                }
                            };
                            
                            // Start continuous content moderation
                            const frequency = 3000; // 3 seconds
                            window.startContentModeration(localVideo, onDetection, frequency);
                            
                            this.innerHTML = '<i class="fas fa-shield-alt"></i> Disable Content Moderation';
                            this.classList.replace('btn-outline-danger', 'btn-danger');
                        });
                    } else {
                        addLogEntry('Cannot start content moderation - no video stream available', 'error');
                        aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> No video stream available';
                    }
                }
            }
        });
    }
    
    // Initialize emotion detection toggle button
    if (toggleEmotionDetectionButton && emotionDetectionValue) {
        toggleEmotionDetectionButton.addEventListener('click', function() {
            const isRunning = window.isEmotionDetectionRunning ? window.isEmotionDetectionRunning() : false;
            
            if (isRunning) {
                // Stop emotion detection
                if (window.stopEmotionDetection) {
                    window.stopEmotionDetection();
                    this.innerHTML = '<i class="fas fa-smile"></i> Start Emotion Detection';
                    this.classList.replace('btn-danger', 'btn-outline-info');
                    emotionDetectionValue.textContent = 'Not detecting';
                }
            } else {
                // Start emotion detection
                if (window.startEmotionDetection && window.initializeEmotionDetector) {
                    const localVideo = document.getElementById('localVideo');
                    
                    if (localVideo && localVideo.srcObject) {
                        aiModelStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading emotion detection model...';
                        
                        // Initialize emotion detector
                        window.initializeEmotionDetector().then(initialized => {
                            if (!initialized) {
                                aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Emotion detection model initialization failed';
                                return;
                            }
                              // Handle emotion detection results
                            const onDetection = (result) => {
                                if (result && result.dominantEmotion) {
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
                                    aiModelStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Emotion detection active';
                                    console.log('Emotion detection result:', result);
                                } else {
                                    emotionDetectionValue.textContent = 'No face detected';
                                }
                            };
                            
                            // Start continuous emotion detection
                            const frequency = 2000; // 2 seconds
                            window.startEmotionDetection(localVideo, onDetection, frequency);
                            
                            this.innerHTML = '<i class="fas fa-smile"></i> Stop Emotion Detection';
                            this.classList.replace('btn-outline-info', 'btn-danger');
                        });
                    } else {
                        addLogEntry('Cannot start emotion detection - no video stream available', 'error');
                        aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> No video stream available';
                    }
                }
            }
        });
    }
    
    // Initialize virtual background toggle button and effect dropdown
    if (toggleVirtualBackgroundButton && backgroundEffectSelect) {
        const customBackgroundOptions = document.getElementById('customBackgroundOptions');
        const customBackgroundImage = document.getElementById('customBackgroundImage');
        const backgroundPreview = document.getElementById('backgroundPreview');
        const bgImagePreview = document.querySelector('.bg-image-preview');
        
        let customImageUrl = null;
        
        // Initialize custom background options
        if (customBackgroundImage) {
            // Hide/show custom options based on effect selection
            backgroundEffectSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customBackgroundOptions.style.display = 'block';
                    if (customImageUrl) {
                        bgImagePreview.style.display = 'block';
                    }
                } else {
                    customBackgroundOptions.style.display = 'none';
                    bgImagePreview.style.display = 'none';
                }
                
                // Apply effect if background is active
                if (window.setVirtualBackgroundEffect && window.isVirtualBackgroundActive && window.isVirtualBackgroundActive()) {
                    const effect = this.value;
                    const imageUrl = effect === 'custom' ? customImageUrl : null;
                    window.setVirtualBackgroundEffect(effect, imageUrl);
                }
            });
            
            // Handle custom image upload
            customBackgroundImage.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    
                    // Validate file is an image and not too large (max 5MB)
                    if (!file.type.match('image.*')) {
                        addLogEntry('Please select an image file', 'warning');
                        return;
                    }
                    
                    if (file.size > 5 * 1024 * 1024) {
                        addLogEntry('Image is too large (max 5MB)', 'warning');
                        return;
                    }
                    
                    // Create object URL for the image
                    customImageUrl = URL.createObjectURL(file);
                    
                    // Update preview
                    backgroundPreview.src = customImageUrl;
                    bgImagePreview.style.display = 'block';
                    
                    // Apply immediately if virtual background is active
                    if (window.setVirtualBackgroundEffect && window.isVirtualBackgroundActive && window.isVirtualBackgroundActive()) {
                        window.setVirtualBackgroundEffect('custom', customImageUrl);
                    }
                    
                    addLogEntry('Custom background image loaded', 'info');
                }
            });
        }
        
        // Handle toggle button click
        toggleVirtualBackgroundButton.addEventListener('click', function() {
            const isActive = window.isVirtualBackgroundActive ? window.isVirtualBackgroundActive() : false;
            
            if (isActive) {
                // Disable virtual background
                if (window.stopVirtualBackground) {
                    window.stopVirtualBackground();
                    this.innerHTML = '<i class="fas fa-image"></i> Enable Virtual Background';
                    this.classList.replace('btn-success', 'btn-outline-success');
                    backgroundEffectSelect.disabled = true;
                    if (customBackgroundOptions) {
                        customBackgroundOptions.style.display = 'none';
                    }
                    if (bgImagePreview) {
                        bgImagePreview.style.display = 'none';
                    }
                }
            } else {
                // Enable virtual background
                if (window.initializeVirtualBackground && window.applyVirtualBackground) {
                    const localVideo = document.getElementById('localVideo');
                    const backgroundOutputCanvas = document.getElementById('backgroundOutputCanvas');
                    
                    if (localVideo && localVideo.srcObject && backgroundOutputCanvas) {
                        aiModelStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading virtual background model...';
                        
                        // Initialize virtual background
                        window.initializeVirtualBackground().then(initialized => {
                            if (!initialized) {
                                aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Virtual background initialization failed';
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
                            if (customBackgroundOptions && effect === 'custom') {
                                customBackgroundOptions.style.display = 'block';
                                if (customImageUrl && bgImagePreview) {
                                    bgImagePreview.style.display = 'block';
                                }
                            }
                            
                            aiModelStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Virtual background active';
                        });
                    } else {
                        addLogEntry('Cannot apply virtual background - no video stream available', 'error');
                        aiModelStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> No video stream available';
                    }
                }
            }
        });
        
        // Initially disable the background effect select
        backgroundEffectSelect.disabled = true;
    }
    
    addLogEntry('AI UI controls initialized', 'info');
}

// Export function to window
window.initializeAIUI = initializeAIUI;
