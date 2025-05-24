/**
 * WebRTC AI Module
 * Handles AI-based analysis of video streams including age estimation,
 * nudity/inappropriate content detection, emotion recognition,
 * gesture control, and virtual backgrounds
 */

// Store the models paths
const FACE_API_MODELS_PATH = '/models';
const TENSORFLOW_MODELS_PATH = '/models/tensorflow';

// Age estimation variables
let ageEstimatorInitialized = false;
let ageEstimationRunning = false;
let lastEstimatedAge = null;
let ageEstimationInterval = null;

// Content moderation variables
let contentModeratorInitialized = false;
let contentModerationRunning = false;
let contentModerationInterval = null;
let lastContentModerationResult = null;

// Emotion detection variables
let emotionDetectorInitialized = false;
let emotionDetectionRunning = false;
let emotionDetectionInterval = null;
let lastDetectedEmotion = null;

// Gesture recognition variables
let gestureRecognizerInitialized = false;
let gestureRecognitionRunning = false;
let gestureRecognitionInterval = null;
let lastRecognizedGesture = null;

// Virtual background variables
let virtualBackgroundActive = false;
let backgroundCanvasContext = null;
let virtualBackgroundEffect = 'blur'; // 'blur', 'image', 'none'
let backgroundImage = null; // Global background image reference

// Shared configuration
let confidenceThreshold = 0.7;
let estimationFrequency = 3000; // milliseconds between estimations
let modelLoadTimeout = 15000; // 15 seconds timeout for model loading

// Add logging to help with debugging
function logAIMessage(message, level = 'info') {
    // Use the global function if available
    if (window.addLogEntry && typeof window.addLogEntry === 'function') {
        window.addLogEntry(`[AI] ${message}`, level);
    }
    
    // Always log to console
    switch (level) {
        case 'error':
            console.error(`[AI] ${message}`);
            break;
        case 'warning':
            console.warn(`[AI] ${message}`);
            break;
        default:
            console.log(`[AI] ${message}`);
    }
}

/**
 * Initialize the face-api.js models required for age estimation
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initializeAgeEstimator() {
    if (ageEstimatorInitialized) {
        return true;
    }
    
    try {
        // Check if face-api is loaded
        if (typeof faceapi === 'undefined') {
            console.error('[AI] face-api.js is not loaded');
            logAIMessage('AI module error: Required libraries not found', 'error');
            return false;
        }
        
        logAIMessage('Loading AI models for age estimation...', 'info');
        
        // Create a promise with timeout for model loading
        const loadModelsWithTimeout = Promise.race([
            Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS_PATH),
                faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS_PATH),
                faceapi.nets.ageGenderNet.loadFromUri(FACE_API_MODELS_PATH)
            ]),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Model loading timed out')), modelLoadTimeout)
            )
        ]);
        
        // Wait for models to load or timeout
        await loadModelsWithTimeout;
        
        ageEstimatorInitialized = true;
        logAIMessage('AI models for age estimation loaded successfully', 'info');
        return true;
    } catch (error) {
        console.error('[AI] Error initializing age estimator:', error);
        logAIMessage(`Failed to initialize age estimator: ${error.message}. Please check your internet connection and try again.`, 'error');
        return false;
    }
}

/**
 * Estimate age from a video element or canvas
 * @param {HTMLVideoElement|HTMLCanvasElement} inputElement - Video or canvas element to analyze
 * @returns {Promise<Object|null>} Age estimation result or null if failed
 */
async function estimateAgeFromVideo(inputElement) {
    if (!ageEstimatorInitialized) {
        console.error('[AI] Age estimator not initialized');
        return null;
    }
    
    try {
        // For video elements, check if it's ready
        if (inputElement instanceof HTMLVideoElement && inputElement.readyState < 2) {
            return null; // Video not ready yet
        }
        
        // If it's a canvas, check if it has valid dimensions
        if (inputElement instanceof HTMLCanvasElement && 
            (inputElement.width <= 0 || inputElement.height <= 0)) {
            return null; // Canvas not valid
        }
        
        // Detect faces
        const detections = await faceapi.detectAllFaces(inputElement, new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 320,
            scoreThreshold: confidenceThreshold
        }))
        .withFaceLandmarks()
        .withAgeAndGender();
        
        if (!detections || !detections.length) {
            return null;  // No faces detected
        }
        
        // Sort by detection box size (largest face first)
        detections.sort((a, b) => {
            const aSize = a.detection.box.width * a.detection.box.height;
            const bSize = b.detection.box.width * b.detection.box.height;
            return bSize - aSize;
        });
        
        // Return age information for the largest face
        const mainFace = detections[0];
        return {
            age: Math.round(mainFace.age),
            confidence: mainFace.detection.score,
            gender: mainFace.gender,
            genderConfidence: mainFace.genderProbability,
            box: mainFace.detection.box
        };
    } catch (error) {
        console.error('[AI] Error estimating age:', error);
        return null;
    }
}

/**
 * Start continuous age estimation on a video element
 * @param {HTMLVideoElement} videoElement - Video element to analyze
 * @param {Function|null} onEstimation - Callback to receive age results
 * @param {number} frequency - How often to run estimation (ms)
 * @returns {Promise<boolean>} Whether age estimation was successfully started
 */
async function startAgeEstimation(videoElement, onEstimation = null, frequency = estimationFrequency) {
    if (!videoElement) {
        logAIMessage('Cannot start age estimation - no video element provided', 'error');
        return false;
    }
    
    // Initialize age estimator if not already initialized
    if (!ageEstimatorInitialized) {
        const initialized = await initializeAgeEstimator();
        if (!initialized) {
            logAIMessage('Age estimation not started - initialization failed', 'error');
            return false;
        }
    }
    
    logAIMessage('Starting age estimation...', 'info');
    ageEstimationRunning = true;
    
    return new Promise((resolve) => {
        ageEstimationInterval = setInterval(async () => {
            if (!ageEstimationRunning) {
                clearInterval(ageEstimationInterval);
                resolve(false);
                return;
            }
            
            const result = await estimateAgeFromVideo(videoElement);
            if (result) {
                lastEstimatedAge = result;
                if (onEstimation) onEstimation(result);
            }
        }, frequency);
        
        resolve(true);
    });
}

/**
 * Stop continuous age estimation
 */
function stopAgeEstimation() {
    if (ageEstimationInterval) {
        clearInterval(ageEstimationInterval);
        ageEstimationInterval = null;
    }
    ageEstimationRunning = false;
    logAIMessage('Age estimation stopped', 'info');
}

/**
 * Set the confidence threshold for detections
 */
function setConfidenceThreshold(threshold) {
    confidenceThreshold = threshold;
    logAIMessage(`Age estimation confidence threshold set to ${confidenceThreshold}`, 'info');
}

/**
 * Get the last estimated age
 * @returns {Object|null} Last age estimation result
 */
function getLastEstimatedAge() {
    return lastEstimatedAge;
}

/**
 * Check if age estimation is currently running
 * @returns {boolean} Whether age estimation is running
 */
function isAgeEstimationRunning() {
    return ageEstimationRunning;
}

/**
 * Check if the required AI models are available
 * @returns {Promise<boolean>} Whether the models are available
 */
async function checkAgeEstimatorModels() {
    try {
        const fs = await fetch(`${FACE_API_MODELS_PATH}/face_landmark_68_model-weights_manifest.json`, {
            method: 'HEAD'
        });
        
        if (!fs.ok) {
            logAIMessage('AI models not found. Please run the download script', 'error');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('[AI] Error checking for models:', error);
        logAIMessage('Failed to check AI models: ' + error.message, 'error');
        return false;
    }
}

/**
 * Initialize the NSFW content detector using TensorFlow.js
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initializeContentModerator() {
    if (contentModeratorInitialized) {
        return true;
    }
    
    try {
        // Check if TensorFlow.js is loaded
        if (typeof tf === 'undefined') {
            console.error('[AI] TensorFlow.js is not loaded');
            logAIMessage('Content moderation error: TensorFlow.js not found', 'error');
            return false;
        }
        
        logAIMessage('Loading AI models for content moderation...', 'info');
        
        // Load the NSFW detection model with timeout
        const loadModelWithTimeout = Promise.race([
            tf.loadGraphModel(`${TENSORFLOW_MODELS_PATH}/nsfw_model/model.json`),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('NSFW model loading timed out')), modelLoadTimeout)
            )
        ]);
        
        // Wait for model to load or timeout
        window.nsfwModel = await loadModelWithTimeout;
        
        contentModeratorInitialized = true;
        logAIMessage('Content moderation models loaded successfully', 'info');
        return true;
    } catch (error) {
        console.error('[AI] Error initializing content moderator:', error);
        logAIMessage('Failed to initialize content moderator: ' + error.message, 'error');
        return false;
    }
}

/**
 * Check a video frame for inappropriate content
 * @param {HTMLVideoElement} videoElement - The video element to analyze
 * @returns {Promise<Object|null>} Content moderation result or null on error
 */
async function detectInappropriateContent(videoElement) {
    if (!contentModeratorInitialized || !window.nsfwModel) {
        console.error('[AI] Content moderator not initialized');
        return null;
    }
      try {
        if (!videoElement || videoElement.readyState < 2) {
            console.log('[AI] Video not ready for content moderation. ReadyState:', videoElement ? videoElement.readyState : 'No video element');
            return null; // Video not ready
        }
        
        // Make sure we have a video with a valid size
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            console.log('[AI] Video has zero width or height for content moderation');
            return null;
        }
        
        console.log('[AI] Checking content - video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        
        // Prepare the video frame for analysis
        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = videoElement.videoWidth;
        hiddenCanvas.height = videoElement.videoHeight;
        const ctx = hiddenCanvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
        
        // Process the image using the NSFW model
        const imgData = ctx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
        const tfImg = tf.browser.fromPixels(imgData);
        
        // Normalize and resize the image to match the model's expected input
        const normalized = tfImg.toFloat().div(255);
        const resized = tf.image.resizeBilinear(normalized, [224, 224]);
        const batched = resized.expandDims(0);
        
        // Run the prediction
        const prediction = await window.nsfwModel.predict(batched);
        const scores = await prediction.data();
        
        // Clean up tensors
        tfImg.dispose();
        normalized.dispose();
        resized.dispose();
        batched.dispose();
        prediction.dispose();
        
        // Format the results
        // The NSFW model typically outputs 5 scores: [Drawing, Hentai, Neutral, Porn, Sexy]
        const categories = ['drawing', 'hentai', 'neutral', 'pornographic', 'suggestive'];
        const scoredCategories = categories.map((category, i) => ({
            category,
            score: scores[i]
        }));
        
        // Sort by score in descending order
        scoredCategories.sort((a, b) => b.score - a.score);
        
        const topCategory = scoredCategories[0];
        const isSafe = topCategory.category === 'neutral' || topCategory.category === 'drawing';
        
        return {
            topCategory: topCategory.category,
            topScore: topCategory.score,
            allScores: scoredCategories,
            isSafe,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('[AI] Error detecting inappropriate content:', error);
        return null;
    }
}

/**
 * Start continuous content moderation on a video element
 * @param {HTMLVideoElement} videoElement - Video element to analyze
 * @param {Function|null} onDetection - Callback to receive content moderation results
 * @param {number} frequency - How often to run detection (ms)
 * @returns {Promise<boolean>} Whether content moderation was successfully started
 */
async function startContentModeration(videoElement, onDetection = null, frequency = estimationFrequency) {
    if (!videoElement) {
        logAIMessage('Cannot start content moderation - no video element provided', 'error');
        return false;
    }
    
    // Initialize content moderator if not already initialized
    if (!contentModeratorInitialized) {
        const initialized = await initializeContentModerator();
        if (!initialized) {
            logAIMessage('Content moderation not started - initialization failed', 'error');
            return false;
        }
    }
    
    contentModerationRunning = true;
    
    return new Promise((resolve) => {
        contentModerationInterval = setInterval(async () => {
            if (!contentModerationRunning) {
                clearInterval(contentModerationInterval);
                resolve(false);
                return;
            }
            
            const result = await detectInappropriateContent(videoElement);
            if (result) {
                lastContentModerationResult = result;
                if (onDetection) onDetection(result);
            }
        }, frequency);
        
        resolve(true);
    });
}

/**
 * Stop continuous content moderation
 */
function stopContentModeration() {
    if (contentModerationInterval) {
        clearInterval(contentModerationInterval);
        contentModerationInterval = null;
    }
    contentModerationRunning = false;
    logAIMessage('Content moderation stopped', 'info');
}

/**
 * Get the last content moderation result
 * @returns {Object|null} Last content moderation result
 */
function getLastContentModerationResult() {
    return lastContentModerationResult;
}

/**
 * Check if content moderation is running
 * @returns {boolean} Whether content moderation is running
 */
function isContentModerationRunning() {
    return contentModerationRunning;
}

/**
 * Initialize the emotion detector using face-api.js
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initializeEmotionDetector() {
    if (emotionDetectorInitialized) {
        return true;
    }
    
    try {
        // Check if face-api is loaded
        if (typeof faceapi === 'undefined') {
            console.error('[AI] face-api.js is not loaded');
            logAIMessage('AI module error: Required libraries not found', 'error');
            return false;
        }
        
        logAIMessage('Loading AI models for emotion detection...', 'info');
        
        // Create a promise with timeout for model loading
        const loadModelsWithTimeout = Promise.race([
            Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS_PATH),
                faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS_PATH),
                faceapi.nets.faceExpressionNet.loadFromUri(FACE_API_MODELS_PATH)
            ]),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Emotion detection model loading timed out')), modelLoadTimeout)
            )
        ]);
        
        // Wait for models to load or timeout
        await loadModelsWithTimeout;
        
        emotionDetectorInitialized = true;
        logAIMessage('Emotion detection models loaded successfully', 'info');
        return true;
    } catch (error) {
        console.error('[AI] Error initializing emotion detector:', error);
        logAIMessage(`Failed to initialize emotion detector: ${error.message}. Please check your connection and try again.`, 'error');
        return false;
    }
}

/**
 * Detect emotions from a video element
 * @param {HTMLVideoElement} videoElement - The video element to analyze
 * @returns {Promise<Object|null>} Emotion detection result or null on error
 */
async function detectEmotion(videoElement) {
    if (!emotionDetectorInitialized) {
        console.error('[AI] Emotion detector not initialized');
        return null;
    }
      try {
        if (!videoElement || videoElement.readyState < 2) {
            console.log('[AI] Video not ready for emotion detection. ReadyState:', videoElement ? videoElement.readyState : 'No video element');
            return null; // Video not ready
        }
        
        // Make sure we have a video with a valid size
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            console.log('[AI] Video has zero width or height');
            return null;
        }
        
        console.log('[AI] Detecting emotions - video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        
        // Detect faces and expressions
        const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 320,
            scoreThreshold: confidenceThreshold
        }))
        .withFaceLandmarks()
        .withFaceExpressions();
        
        if (!detections || !detections.length) {
            return null;  // No faces detected
        }
        
        // Sort by detection box size (largest face first)
        detections.sort((a, b) => {
            const aSize = a.detection.box.width * a.detection.box.height;
            const bSize = b.detection.box.width * b.detection.box.height;
            return bSize - aSize;
        });
        
        // Get emotion data for the largest face
        const mainFace = detections[0];
        const expressions = mainFace.expressions;
        
        // Find the dominant emotion
        let dominantEmotion = 'neutral';
        let highestScore = 0;
        
        Object.keys(expressions).forEach(emotion => {
            if (expressions[emotion] > highestScore) {
                highestScore = expressions[emotion];
                dominantEmotion = emotion;
            }
        });
        
        return {
            dominantEmotion,
            confidence: highestScore,
            allEmotions: expressions,
            box: mainFace.detection.box,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('[AI] Error detecting emotion:', error);
        return null;
    }
}

/**
 * Start continuous emotion detection on a video element
 * @param {HTMLVideoElement} videoElement - Video element to analyze
 * @param {Function|null} onDetection - Callback for detection results
 * @param {number} frequency - How often to perform detection (ms)
 * @returns {Promise<boolean>} Whether emotion detection was successfully started
 */
async function startEmotionDetection(videoElement, onDetection = null, frequency = estimationFrequency) {
    // Initialize emotion detector if not already initialized
    if (!emotionDetectorInitialized) {
        const initialized = await initializeEmotionDetector();
        if (!initialized) {
            return false;
        }
    }
    
    emotionDetectionRunning = true;
    
    return new Promise((resolve) => {
        emotionDetectionInterval = setInterval(async () => {
            if (!emotionDetectionRunning) {
                clearInterval(emotionDetectionInterval);
                return;
            }
            
            const result = await detectEmotion(videoElement);
            if (result) {
                lastDetectedEmotion = result;
                if (onDetection) onDetection(result);
            }
        }, frequency);
    });
}

/**
 * Stop continuous emotion detection
 */
function stopEmotionDetection() {
    if (emotionDetectionInterval) {
        clearInterval(emotionDetectionInterval);
        emotionDetectionInterval = null;
    }
    emotionDetectionRunning = false;
    logAIMessage('Emotion detection stopped', 'info');
}

/**
 * Get the last detected emotion
 * @returns {Object|null} Last emotion detection result
 */
function getLastDetectedEmotion() {
    return lastDetectedEmotion;
}

/**
 * Check if emotion detection is running
 * @returns {boolean} Whether emotion detection is running
 */
function isEmotionDetectionRunning() {
    return emotionDetectionRunning;
}

/**
 * Initialize the virtual background processor using TensorFlow.js
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initializeVirtualBackground() {
    try {
        // Check if TensorFlow.js is loaded with more detailed validation
        if (typeof tf === 'undefined') {
            console.error('[AI] TensorFlow.js library not found');
            logAIMessage('Virtual background error: TensorFlow.js library not found', 'error');
            return false;
        }
        
        // Check TensorFlow.js version for compatibility with body-pix
        console.log('[AI] TensorFlow.js version:', tf.version.tfjs);
        
        // Configure TensorFlow.js to prevent cropSize errors by setting 
        // an appropriate default for crop operations
        if (tf.ENV && typeof tf.ENV.set === 'function') {
            try {
                // Attempt to set a config that might help with cropSize issues
                tf.ENV.set('WEBGL_FORCE_F16_TEXTURES', false);
                tf.ENV.set('WEBGL_PACK', false);
                tf.ENV.set('WEBGL_CPU_FORWARD', true);
                console.log('[AI] Applied TensorFlow.js configuration to prevent cropSize errors');
            } catch (configError) {
                console.warn('[AI] Could not configure TensorFlow.js environment:', configError);
            }
        }
        
        // Check if BodyPix is loaded
        if (typeof bodyPix === 'undefined') {
            console.error('[AI] BodyPix library not found');
            logAIMessage('Virtual background error: BodyPix library not found', 'error');
            return false;
        }
        
        // Log that we're going to load the model
        logAIMessage('Loading AI models for virtual background...', 'info');
        console.log('[AI] Starting BodyPix model loading with MobileNetV1 architecture');        // Set up a controlled timeout mechanism
        let timeoutId;
        let modelLoadingPromise;
        
        // Create a promise with timeout for model loading
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('BodyPix model loading timed out after ' + 
                          (modelLoadTimeout/1000) + ' seconds'));
            }, modelLoadTimeout);
        });
        
        // Create the model loading promise
        modelLoadingPromise = bodyPix.load({
            architecture: 'MobileNetV1',  // More compatible architecture
            outputStride: 16,             // Balance between performance and accuracy
            multiplier: 0.75,             // Model size multiplier
            quantBytes: 2,                // Model quantization
            modelUrl: null                // Use default hosted model
        });
        
        // Race the promises
        const model = await Promise.race([modelLoadingPromise, timeoutPromise])
            .finally(() => {
                // Always clear the timeout to avoid memory leaks
                clearTimeout(timeoutId);
            });
        
        // Validate the model object
        if (!model || typeof model.segmentPerson !== 'function') {
            throw new Error('Invalid BodyPix model loaded - segmentPerson method not found');
        }
        
        // Store model in global scope for later use
        window.bodyPixModel = model;
        
        // Warm up the model with a small tensor to ensure it's ready to process frames
        try {
            const dummyTensor = tf.zeros([64, 64, 3]);
            await model.segmentPerson(dummyTensor);
            dummyTensor.dispose();
            console.log('[AI] BodyPix model successfully warmed up');
        } catch (warmupError) {
            // If warmup fails, don't fail initialization but log the error
            console.warn('[AI] BodyPix model warmup failed:', warmupError);
        }
        
        logAIMessage('Virtual background models loaded successfully', 'info');
        return true;
    } catch (error) {
        console.error('[AI] Error initializing virtual background:', error);
        
        // Provide more helpful error messages based on error type
        let errorMsg = `Failed to initialize virtual background: ${error.message}.`;
        
        if (error.message.includes('timed out')) {
            errorMsg += ' Model loading timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('memory')) {
            errorMsg += ' Your device may not have enough memory to run this feature.';
        } else {
            errorMsg += ' Please check your connection and try again.';
        }
        
        logAIMessage(errorMsg, 'error');
        return false;
    }
}

/**
 * Apply virtual background effect to a video stream
 * @param {HTMLVideoElement} inputVideo - Source video element
 * @param {HTMLCanvasElement} outputCanvas - Output canvas for the processed video
 * @param {string} effect - Effect to apply ('blur', 'image', 'none')
 * @param {string|null} backgroundImageUrl - URL of the background image (if effect is 'image')
 * @returns {Promise<boolean>} Whether the effect was successfully applied
 */
async function applyVirtualBackground(inputVideo, outputCanvas, effect = 'blur', backgroundImageUrl = null) {
    // Enhanced check for valid video dimensions with more detailed logging
    if (!inputVideo) {
        console.error('[AI] Cannot apply virtual background: Input video element is null or undefined');
        logAIMessage('Cannot apply virtual background: Video element not found', 'error');
        return false;
    }
    
    // Wait for video to have valid dimensions before proceeding
    if (inputVideo.videoWidth <= 0 || inputVideo.videoHeight <= 0) {
        console.error('[AI] Cannot apply virtual background: Invalid video dimensions', 
                     `${inputVideo.videoWidth}x${inputVideo.videoHeight}`);
        logAIMessage('Cannot apply virtual background: Video not ready or has invalid dimensions', 'error');
        
        // Wait for the video to have dimensions before proceeding
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for video dimensions'));
                }, 5000); // 5 second timeout
                
                // Function to check if video has valid dimensions
                const checkDimensions = () => {
                    if (inputVideo.videoWidth > 0 && inputVideo.videoHeight > 0) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        setTimeout(checkDimensions, 100);
                    }
                };
                
                checkDimensions();
            });
        } catch (error) {
            console.error('[AI] Timeout waiting for video dimensions:', error);
            logAIMessage('Cannot apply virtual background: Timed out waiting for video to be ready', 'error');
            return false;
        }
    }
      // Log actual dimensions after validation
    console.log('[AI] Applying virtual background with dimensions:', inputVideo.videoWidth, 'x', inputVideo.videoHeight);
    
    // Get the main canvas that's being displayed
    const mainDisplayCanvas = document.getElementById('localVideoCanvas');
    
    // Make sure the output canvas matches the video dimensions
    outputCanvas.width = Math.max(inputVideo.videoWidth, 16); // Ensure minimum width
    outputCanvas.height = Math.max(inputVideo.videoHeight, 16); // Ensure minimum height
    
    // Store the context for later use
    backgroundCanvasContext = outputCanvas.getContext('2d');
    
    // Set active and effect type
    virtualBackgroundActive = true;
    virtualBackgroundEffect = effect;
    
    // When background processing is active, hide the normal canvas and show the backgroundOutputCanvas
    if (mainDisplayCanvas) {
        mainDisplayCanvas.style.display = 'none';
    }
    outputCanvas.style.display = 'block';
    outputCanvas.className = 'video'; // Apply the same styling as the main video
    
    // Clean up existing background image if any
    if (backgroundImage) {
        if (backgroundImage.src) {
            URL.revokeObjectURL(backgroundImage.src);
        }
        backgroundImage = null;
    }
    
    // Prepare background image if needed
    if (effect === 'image' && backgroundImageUrl) {
        backgroundImage = new Image();
        backgroundImage.crossOrigin = 'anonymous';
        backgroundImage.src = backgroundImageUrl;
        await new Promise((resolve) => {
            backgroundImage.onload = resolve;
        });
    }    // Animation frame processor function
    async function processFrame() {
        if (!virtualBackgroundActive) return;
        
        if (inputVideo && inputVideo.readyState >= 2) {
            try {
                // Enhanced validation for video dimensions
                if (inputVideo.videoWidth <= 0 || inputVideo.videoHeight <= 0) {
                    console.log('[AI] Skipping virtual background frame: invalid dimensions');
                    requestAnimationFrame(processFrame);
                    return;
                }
                  // Make sure output canvas dimensions match the video (they may have changed)
                if (outputCanvas.width !== inputVideo.videoWidth || outputCanvas.height !== inputVideo.videoHeight) {
                    // Only resize if the difference is significant to avoid constant micro-adjustments
                    const widthDiff = Math.abs(outputCanvas.width - inputVideo.videoWidth);
                    const heightDiff = Math.abs(outputCanvas.height - inputVideo.videoHeight);
                    
                    if (widthDiff > 2 || heightDiff > 2) {
                        console.log('[AI] Updating canvas dimensions to match video:', 
                                    inputVideo.videoWidth, 'x', inputVideo.videoHeight);
                        outputCanvas.width = Math.max(inputVideo.videoWidth, 16);  // Ensure minimum width
                        outputCanvas.height = Math.max(inputVideo.videoHeight, 16); // Ensure minimum height
                        
                        // Update the context reference since canvas was resized
                        backgroundCanvasContext = outputCanvas.getContext('2d');
                    }
                }
                  // Process the frame with BodyPix with enhanced error handling
                let segmentation;
                try {
                    // Additional safeguard for cropSize error - ensure dimensions are valid
                    const videoWidth = inputVideo.videoWidth;
                    const videoHeight = inputVideo.videoHeight;
                    
                    // Double-check video dimensions again right before segmentation
                    if (videoWidth <= 0 || videoHeight <= 0) {
                        throw new Error(`Video dimensions invalid: ${videoWidth}x${videoHeight}`);
                    }
                    
                    // Reset canvas size if needed one more time
                    if (outputCanvas.width <= 0 || outputCanvas.height <= 0 || 
                        outputCanvas.width !== videoWidth || outputCanvas.height !== videoHeight) {
                        console.log('[AI] Resetting canvas dimensions:', videoWidth, 'x', videoHeight);
                        outputCanvas.width = Math.max(videoWidth, 16);
                        outputCanvas.height = Math.max(videoHeight, 16);
                    }
                      // Create a temporary canvas to draw the video frame to avoid cropSize issues
                    // This works around a potential issue in TensorFlow's cropAndResize operation
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = videoWidth;
                    tempCanvas.height = videoHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(inputVideo, 0, 0, videoWidth, videoHeight);
                    
                    // Use segmentPerson with the canvas element instead of the video element
                    // This prevents the cropSize error by ensuring consistent dimensions
                    segmentation = await window.bodyPixModel.segmentPerson(tempCanvas, {
                        flipHorizontal: false,      // Don't flip the segmentation
                        internalResolution: 0.75,   // Use higher resolution for better results with canvas input
                        segmentationThreshold: 0.6, // Slightly lower threshold for more reliable person detection
                        maxDetections: 1,           // Limit to one person for better performance
                        scoreThreshold: 0.4         // Lower score threshold to ensure we get a result
                    });
                    
                    // Validate segmentation result to prevent errors
                    if (!segmentation || typeof segmentation.allPoses === 'undefined') {
                        throw new Error('Invalid segmentation result');
                    }
                    
                    // Check for zero dimensions in segmentation
                    if (segmentation.width <= 0 || segmentation.height <= 0) {
                        throw new Error(`Segmentation has invalid dimensions: ${segmentation.width}x${segmentation.height}`);
                    }
                    
                } catch (segError) {
                    console.error('[AI] Error in body segmentation:', segError);
                    // Log detailed information for debugging
                    console.log('[AI] Video readyState:', inputVideo.readyState);
                    console.log('[AI] Video dimensions:', inputVideo.videoWidth, 'x', inputVideo.videoHeight);
                    console.log('[AI] Canvas dimensions:', outputCanvas.width, 'x', outputCanvas.height);
                    
                    // Fall back to just showing the video
                    backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                    requestAnimationFrame(processFrame);
                    return;
                }
                
                // Apply the selected effect
                switch (effect) {
                    case 'blur':                        try {
                            // Double-check that input video and canvas sizes are valid
                            const validVideoWidth = inputVideo.videoWidth || 640;
                            const validVideoHeight = inputVideo.videoHeight || 480;
                            
                            // Re-check and ensure output canvas has valid dimensions
                            if (outputCanvas.width <= 0 || outputCanvas.height <= 0) {
                                outputCanvas.width = validVideoWidth;
                                outputCanvas.height = validVideoHeight;
                                console.log('[AI] Fixed invalid output canvas dimensions, now:', 
                                           outputCanvas.width, 'x', outputCanvas.height);
                            }
                            
                            // First draw the video frame
                            backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                              // Try to apply blur to the background with safe parameter checks
                            try {
                                // Create an intermediate canvas to avoid direct drawImage issues
                                const intermediateCanvas = document.createElement('canvas');
                                intermediateCanvas.width = validVideoWidth;
                                intermediateCanvas.height = validVideoHeight;
                                const intermediateCtx = intermediateCanvas.getContext('2d');
                                intermediateCtx.drawImage(inputVideo, 0, 0);
                                
                                bodyPix.drawBokehEffect(
                                    outputCanvas, intermediateCanvas, segmentation, 
                                    15, // Blur amount
                                    7,  // Edge blur amount
                                    false // Don't flip horizontally
                                );
                            } catch (bokehError) {
                                console.error('[AI] Error applying bokeh effect:', bokehError);
                                console.log('[AI] Using fallback blur implementation');
                                
                                // Check error type to handle appropriately
                                if (bokehError.message && bokehError.message.includes('cropSize')) {
                                    console.log('[AI] Handling cropSize error in bokeh effect');
                                    
                                    // Create a person mask manually from segmentation data
                                    const personCanvas = document.createElement('canvas');
                                    personCanvas.width = validVideoWidth;
                                    personCanvas.height = validVideoHeight;
                                    const personCtx = personCanvas.getContext('2d');
                                    
                                    // Draw the original image
                                    personCtx.drawImage(inputVideo, 0, 0);
                                    
                                    // Create a blurred version of the background
                                    const blurredCanvas = document.createElement('canvas');
                                    blurredCanvas.width = outputCanvas.width;
                                    blurredCanvas.height = outputCanvas.height;
                                    const blurredCtx = blurredCanvas.getContext('2d');
                                    
                                    // Draw the video and apply CSS blur
                                    blurredCtx.filter = 'blur(10px)';
                                    blurredCtx.drawImage(inputVideo, 0, 0);
                                    blurredCtx.filter = 'none';
                                    
                                    // Now composite the person over the blurred background using canvas compositing
                                    backgroundCanvasContext.drawImage(blurredCanvas, 0, 0);
                                    
                                    // Use segmentation data to create a clipping path for the person
                                    backgroundCanvasContext.globalCompositeOperation = 'source-over';
                                    
                                    // Direct drawing of segmentation data for person
                                    const imageData = backgroundCanvasContext.getImageData(
                                        0, 0, outputCanvas.width, outputCanvas.height
                                    );
                                    
                                    // Get the original video pixels
                                    personCtx.drawImage(inputVideo, 0, 0);
                                    const personImageData = personCtx.getImageData(
                                        0, 0, personCanvas.width, personCanvas.height
                                    );
                                    
                                    // Apply segmentation mask - copy original pixels only where person is detected
                                    for (let y = 0; y < segmentation.height; y++) {
                                        for (let x = 0; x < segmentation.width; x++) {
                                            const i = y * segmentation.width + x;
                                            
                                            // If this pixel is part of a person
                                            if (segmentation.data[i]) {
                                                // Calculate the position in the image data array (4 bytes per pixel)
                                                const j = (y * outputCanvas.width + x) * 4;
                                                
                                                // Copy the original video pixel to the output
                                                imageData.data[j] = personImageData.data[j]; // R
                                                imageData.data[j+1] = personImageData.data[j+1]; // G
                                                imageData.data[j+2] = personImageData.data[j+2]; // B
                                                imageData.data[j+3] = 255; // Alpha
                                            }
                                        }
                                    }
                                      // Put the composited image back onto the canvas
                                    backgroundCanvasContext.putImageData(imageData, 0, 0);
                                }
                            }
                        } catch (blurError) {
                            console.error('[AI] Error applying blur effect:', blurError);
                            // Final fallback - just display the original video
                            backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                        }
                        break;
                        
                    case 'image':
                        if (backgroundImage) {
                            try {
                                // Draw the background image first, ensuring it fills the canvas
                                backgroundCanvasContext.drawImage(
                                    backgroundImage, 0, 0, 
                                    outputCanvas.width, outputCanvas.height
                                );                                try {
                                    // Create a mask with proper foreground/background configuration
                                    const foregroundColor = {r: 255, g: 255, b: 255, a: 255};
                                    const backgroundColor = {r: 0, g: 0, b: 0, a: 0};
                                    
                                    // Extra check before creating the mask to avoid cropSize errors
                                    if (!segmentation || !segmentation.data || !segmentation.width || !segmentation.height) {
                                        throw new Error(`Cannot create mask: Invalid segmentation data: ${
                                            JSON.stringify({
                                                hasData: !!segmentation.data,
                                                width: segmentation.width,
                                                height: segmentation.height
                                            })
                                        }`);
                                    }
                                    
                                    // Verify dimensions are valid to avoid cropSize error
                                    if (segmentation.width < 1 || segmentation.height < 1) {
                                        throw new Error(`Cannot create mask: Segmentation dimensions too small: ${
                                            segmentation.width}x${segmentation.height}`);
                                    }
                                    
                                    // Use our own implementation of toMask to avoid TensorFlow cropSize errors
                                    // by creating a mask directly in browser canvas instead of using TensorFlow ops
                                    let mask;
                                    try {
                                        // Try the built-in implementation first
                                        mask = bodyPix.toMask(
                                            segmentation,
                                            foregroundColor,
                                            backgroundColor,
                                            false // Don't flip horizontally
                                        );
                                    } catch (maskError) {
                                        // If that fails with cropSize error, use our fallback implementation
                                        if (maskError.message && maskError.message.includes('cropSize')) {
                                            console.log('[AI] Using fallback mask implementation to avoid cropSize error');
                                            
                                            // Create our own mask canvas
                                            const maskCanvas = document.createElement('canvas');
                                            maskCanvas.width = segmentation.width;
                                            maskCanvas.height = segmentation.height;
                                            const maskCtx = maskCanvas.getContext('2d');
                                            
                                            // Create an ImageData object to draw the mask
                                            const maskImgData = maskCtx.createImageData(segmentation.width, segmentation.height);
                                            
                                            // Loop through segmentation data and create mask manually
                                            for (let i = 0; i < segmentation.data.length; i++) {
                                                const j = i * 4;
                                                if (segmentation.data[i]) {
                                                    // Foreground (person)
                                                    maskImgData.data[j] = foregroundColor.r;
                                                    maskImgData.data[j+1] = foregroundColor.g;
                                                    maskImgData.data[j+2] = foregroundColor.b;
                                                    maskImgData.data[j+3] = foregroundColor.a;
                                                } else {
                                                    // Background
                                                    maskImgData.data[j] = backgroundColor.r;
                                                    maskImgData.data[j+1] = backgroundColor.g;
                                                    maskImgData.data[j+2] = backgroundColor.b;
                                                    maskImgData.data[j+3] = backgroundColor.a;
                                                }
                                            }
                                            
                                            // Put the image data onto the canvas
                                            maskCtx.putImageData(maskImgData, 0, 0);
                                            
                                            // Use the canvas as our mask
                                            mask = maskCanvas;
                                        } else {
                                            // If it's not a cropSize error, rethrow it
                                            throw maskError;
                                        }
                                    }
                                    
                                    // Check mask validity with detailed logging
                                    if (!mask) {
                                        throw new Error('Mask creation failed - no mask returned');
                                    }
                                    
                                    if (mask.width <= 0 || mask.height <= 0) {
                                        throw new Error(`Invalid mask dimensions: ${mask.width}x${mask.height}`);
                                    }
                                    
                                    // Log successful mask creation for debugging
                                    console.log('[AI] Mask created successfully with dimensions:', 
                                                mask.width, 'x', mask.height);
                                    
                                    // Draw the person on top of the background with the mask
                                    bodyPix.drawMask(
                                        outputCanvas, 
                                        inputVideo, 
                                        mask,
                                        1.0, // Full opacity for person
                                        0,   // No additional blur at edges
                                        false // Don't flip horizontally
                                    );
                                } catch (maskError) {
                                    console.error('[AI] Error creating or applying mask:', maskError);
                                    
                                    // Use a simpler compositing method as fallback
                                    logAIMessage('Using fallback method for virtual background', 'warning');
                                    
                                    // Just draw the video directly (clear fallback)
                                    backgroundCanvasContext.globalCompositeOperation = 'source-over';
                                    backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                                }
                            } catch (innerError) {
                                console.error('[AI] Error applying background image:', innerError);
                                // Fall back to original video
                                backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                            }
                        }
                        break;
                        
                    case 'none':
                    default:
                        // Just draw the original video
                        backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                        break;
                }
            } catch (error) {
                console.error('[AI] Error processing virtual background frame:', error);
                
                // Log detailed error information for debugging
                if (error.stack) {
                    console.debug('[AI] Error stack:', error.stack);
                }
                
                // On error, just show the original video
                try {
                    if (inputVideo.videoWidth > 0 && inputVideo.videoHeight > 0) {
                        backgroundCanvasContext.drawImage(inputVideo, 0, 0);
                    }
                } catch (fallbackError) {
                    console.error('[AI] Error drawing fallback video:', fallbackError);
                }
            }        } else {
            // If video is not ready, draw a black frame with helpful message
            if (backgroundCanvasContext) {
                backgroundCanvasContext.fillStyle = '#000000';
                backgroundCanvasContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
                
                // Add a message for debugging purposes
                backgroundCanvasContext.fillStyle = '#ffffff';
                backgroundCanvasContext.font = '14px Arial';
                backgroundCanvasContext.textAlign = 'center';
                backgroundCanvasContext.fillText('Waiting for video...', 
                                               outputCanvas.width / 2, 
                                               outputCanvas.height / 2);
                console.log('[AI] Virtual background waiting for video to be ready');
            }
        }
        
        // Schedule the next frame with error handling
        if (virtualBackgroundActive) {
            try {
                requestAnimationFrame(processFrame);
            } catch (rafError) {
                console.error('[AI] Error scheduling next animation frame:', rafError);
                // Try once more after a short delay
                setTimeout(() => {
                    if (virtualBackgroundActive) {
                        requestAnimationFrame(processFrame);
                    }
                }, 1000);
            }
        }
    }
      // Start the processing loop
    processFrame();    // Add a small delay before attempting to replace the video track to ensure the canvas has time to initialize
    setTimeout(async () => {
        // Replace the WebRTC video track with our processed canvas
        try {
            const success = await replaceVideoTrackWithCanvas(outputCanvas);
            if (success) {
                logAIMessage('Virtual background is now active in the remote video feed', 'success');
            } else {
                logAIMessage('Virtual background visible locally but could not be sent to remote peer', 'warning');
            }
        } catch (error) {
            console.error('[AI] Error replacing video track:', error);
            logAIMessage('Virtual background visible locally but could not be sent to remote peer', 'warning');
        }
    }, 1000);

    return true;
}

/**
 * Stop virtual background processing and clean up resources
 */
function stopVirtualBackground() {
    // Flag to stop the animation frame loop
    virtualBackgroundActive = false;
    
    // Clean up any background image resources
    if (backgroundImage) {
        if (backgroundImage.src) {
            URL.revokeObjectURL(backgroundImage.src);
        }
        backgroundImage = null;
    }
      // Clean up the canvas context if needed
    if (backgroundCanvasContext) {
        try {
            // Clear any drawing
            backgroundCanvasContext.clearRect(0, 0, 
                backgroundCanvasContext.canvas.width, 
                backgroundCanvasContext.canvas.height);
        } catch (clearError) {
            console.error('[AI] Error clearing canvas:', clearError);
        }
    }
      // Restore the original video track if we have a peer connection
    if (window.peerConnection) {
        // Find the local video element
        const localVideo = document.getElementById('localVideo');
        if (localVideo && localVideo.srcObject) {
            // Get the original video track
            const originalVideoTrack = localVideo.srcObject.getVideoTracks()[0];
            if (originalVideoTrack) {
                // Find the sender and replace the track
                const sender = window.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                
                if (sender) {
                    sender.replaceTrack(originalVideoTrack)
                        .then(() => {
                            console.log('[AI] Restored original video track');
                            logAIMessage('Original video stream restored', 'info');
                        })
                        .catch(error => {
                            console.error('[AI] Error restoring original track:', error);
                            logAIMessage('Failed to restore original video stream', 'error');
                        });
                }
            }
        }
    }
    // Hide the output canvas
    const backgroundOutputCanvas = document.getElementById('backgroundOutputCanvas');
    if (backgroundOutputCanvas) {
        backgroundOutputCanvas.style.display = 'none';
    }
    
    // Show the main display canvas again
    const mainDisplayCanvas = document.getElementById('localVideoCanvas');
    if (mainDisplayCanvas) {
        mainDisplayCanvas.style.display = 'block';
    }
    
    // Reset effect
    virtualBackgroundEffect = 'none';
    
    // Log status
    console.log('[AI] Virtual background processing stopped and resources cleaned up');
    logAIMessage('Virtual background processing stopped', 'info');
}

/**
 * Change the virtual background effect
 * @param {string} effect - New effect to apply ('blur', 'image', 'custom', 'none')
 * @param {string|null} backgroundImageUrl - URL of the background image (if effect is 'image' or 'custom')
 */
function setVirtualBackgroundEffect(effect, backgroundImageUrl = null) {
    // Validate effect type
    const validEffects = ['blur', 'image', 'custom', 'none'];
    if (!validEffects.includes(effect)) {
        console.error('[AI] Invalid virtual background effect:', effect);
        logAIMessage(`Invalid virtual background effect: ${effect}. Using 'none' instead.`, 'error');
        effect = 'none';
    }
    
    // Log the effect change
    console.log('[AI] Changing virtual background effect to:', effect, 
                backgroundImageUrl ? '(with custom image)' : '');
    
    // Clean up previous background image if exists
    if (backgroundImage && backgroundImage.src) {
        URL.revokeObjectURL(backgroundImage.src);
        backgroundImage = null;
    }
    
    // Update the effect type
    virtualBackgroundEffect = effect;
    
    // If the effect is active, re-apply with new settings
    if (virtualBackgroundActive) {
        // Get the required elements
        const inputVideo = document.getElementById('localVideo');
        const outputCanvas = document.getElementById('backgroundOutputCanvas');
        
        if (!inputVideo || !outputCanvas) {
            console.error('[AI] Cannot change effect: Missing video or canvas element');
            logAIMessage('Cannot change virtual background: Missing required elements', 'error');
            return;
        }
        
        // Validate video is ready
        if (inputVideo.readyState < 2 || inputVideo.videoWidth <= 0 || inputVideo.videoHeight <= 0) {
            console.warn('[AI] Video not ready for effect change, will apply when ready');
            logAIMessage('Virtual background effect will change when video is ready', 'info');
        }
        
        // Apply the new effect
        applyVirtualBackground(inputVideo, outputCanvas, effect, backgroundImageUrl)
            .then(success => {
                if (success) {
                    logAIMessage(`Virtual background changed to: ${effect}`, 'info');
                } else {
                    logAIMessage(`Failed to change virtual background to: ${effect}`, 'error');
                }
            });
    }
}

/**
 * Check if virtual background is currently active
 * @returns {boolean} Whether virtual background is active
 */
function isVirtualBackgroundActive() {
    return virtualBackgroundActive;
}

/**
 * Get the current virtual background effect type
 * @returns {string} The current effect type ('blur', 'image', 'custom', 'none')
 */
function getVirtualBackgroundEffect() {
    return virtualBackgroundEffect;
}

/**
 * Get a MediaStream from the processed canvas to use with WebRTC
 * @param {HTMLCanvasElement} canvas - The canvas element with processed video
 * @param {number} [frameRate=30] - The desired frame rate for the canvas capture
 * @returns {MediaStream|null} A MediaStream from the canvas, or null if failed
 */
function getProcessedCanvasStream(canvas, frameRate = 30) {
    try {
        // Check if canvas is valid
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
            console.error('[AI] Cannot get canvas stream: Invalid canvas dimensions');
            return null;
        }
        
        // Create a stream from the canvas with specified frame rate
        // Use a consistent frame rate that matches typical webcam rates
        const stream = canvas.captureStream(frameRate);
        
        if (!stream || stream.getVideoTracks().length === 0) {
            console.error('[AI] Failed to capture stream from canvas');
            return null;
        }
        
        // Configure the video track for better WebRTC compatibility
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            // Apply constraints to ensure stable streaming
            videoTrack.applyConstraints({
                frameRate: { ideal: frameRate, max: frameRate },
                width: { ideal: canvas.width },
                height: { ideal: canvas.height }
            }).catch(error => {
                console.warn('[AI] Could not apply track constraints:', error);
            });
        }
        
        console.log('[AI] Successfully created MediaStream from processed canvas with frame rate:', frameRate);
        return stream;
    } catch (error) {
        console.error('[AI] Error creating canvas stream:', error);
        return null;
    }
}

/**
 * Replace the WebRTC video track with the processed canvas stream
 * @param {HTMLCanvasElement} canvas - The canvas with the processed video
 * @returns {boolean} Whether the track was successfully replaced
 */
function replaceVideoTrackWithCanvas(canvas) {
    try {
        // Create stream from canvas
        const canvasStream = getProcessedCanvasStream(canvas);
        if (!canvasStream) {
            logAIMessage('Failed to create stream from canvas', 'error');
            return false;
        }
        
        // Get the video track from the canvas stream
        const canvasVideoTrack = canvasStream.getVideoTracks()[0];
        if (!canvasVideoTrack) {
            console.error('[AI] No video track in canvas stream');
            logAIMessage('Failed to get video track from canvas stream', 'error');
            return false;
        }        // Find the WebRTC connection and replace the track
        let peerConnection = null;
        
        // First try the connection module's getter function
        if (typeof window.getPeerConnection === 'function') {
            try {
                peerConnection = window.getPeerConnection();
                console.log('[AI] Got peer connection from getPeerConnection()', peerConnection ? 'successfully' : 'but it was null');
            } catch (e) {
                console.error('[AI] Error calling getPeerConnection():', e);
            }
        }
        
        // Fallback to direct window reference
        if (!peerConnection && window.peerConnection) {
            peerConnection = window.peerConnection;
            console.log('[AI] Got peer connection from window.peerConnection');
        }
        
        if (!peerConnection) {
            console.error('[AI] No peer connection found');
            logAIMessage('Could not find WebRTC peer connection. Make sure you are connected to a peer.', 'error');
            return false;
        }
        
        // Check if the peer connection is in a valid state
        if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
            console.error('[AI] Peer connection is in an invalid state:', peerConnection.connectionState);
            logAIMessage('Cannot replace video track: peer connection is not active', 'error');
            return false;
        }
        
        // Find the video sender in the peer connection
        const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
        );
        
        if (!sender) {
            console.error('[AI] No video sender found in peer connection');
            logAIMessage('Could not find video track in WebRTC connection', 'error');
            return false;
        }
          // Replace the track and handle result
        return sender.replaceTrack(canvasVideoTrack)
            .then(() => {
                console.log('[AI] Successfully replaced WebRTC video track with canvas stream');
                logAIMessage('Virtual background is now being sent to the remote peer', 'success');
                return true;
            })
            .catch(error => {
                console.error('[AI] Error replacing track:', error);
                logAIMessage('Failed to apply virtual background to the remote video: ' + error.message, 'error');
                return false;
            });
        
    } catch (error) {
        console.error('[AI] Error replacing video track:', error);
        logAIMessage('Unexpected error applying virtual background: ' + error.message, 'error');
        return false;
    }
}

// Export functions to window for other modules
window.initializeAgeEstimator = initializeAgeEstimator;
window.estimateAgeFromVideo = estimateAgeFromVideo;
window.startAgeEstimation = startAgeEstimation;
window.stopAgeEstimation = stopAgeEstimation;
window.setConfidenceThreshold = setConfidenceThreshold;
window.getLastEstimatedAge = getLastEstimatedAge;
window.isAgeEstimationRunning = isAgeEstimationRunning;
window.checkAgeEstimatorModels = checkAgeEstimatorModels;
window.initializeContentModerator = initializeContentModerator;
window.detectInappropriateContent = detectInappropriateContent;
window.startContentModeration = startContentModeration;
window.stopContentModeration = stopContentModeration;
window.getLastContentModerationResult = getLastContentModerationResult;
window.isContentModerationRunning = isContentModerationRunning;
window.initializeEmotionDetector = initializeEmotionDetector;
window.detectEmotion = detectEmotion;
window.startEmotionDetection = startEmotionDetection;
window.stopEmotionDetection = stopEmotionDetection;
window.getLastDetectedEmotion = getLastDetectedEmotion;
window.isEmotionDetectionRunning = isEmotionDetectionRunning;
window.initializeVirtualBackground = initializeVirtualBackground;
window.applyVirtualBackground = applyVirtualBackground;
window.stopVirtualBackground = stopVirtualBackground;
window.setVirtualBackgroundEffect = setVirtualBackgroundEffect;
window.isVirtualBackgroundActive = isVirtualBackgroundActive;
window.getVirtualBackgroundEffect = getVirtualBackgroundEffect;
window.getProcessedCanvasStream = getProcessedCanvasStream;
window.replaceVideoTrackWithCanvas = replaceVideoTrackWithCanvas;
window.getProcessedCanvasStream = getProcessedCanvasStream;
window.replaceVideoTrackWithCanvas = replaceVideoTrackWithCanvas;
