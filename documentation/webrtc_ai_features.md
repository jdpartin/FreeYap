# WebRTC AI Features Documentation

## Overview

This document outlines the AI features integrated into the WebRTC demo of the FreeYap application. These features enhance the video chat experience with real-time analysis capabilities including age estimation, content moderation, emotion detection, and virtual backgrounds.

## AI Features

### 1. Age Estimation

The age estimation feature uses face-api.js to analyze video frames and estimate the age of detected faces.

**Technical Details:**
- **Models Used**: TinyFaceDetector, FaceLandmark68Net, AgeGenderNet
- **Update Frequency**: Every 2 seconds by default
- **Confidence Control**: Adjustable threshold to filter out low-confidence predictions
- **Results**: Displays estimated age in years with confidence percentage

**Usage:**
1. Click "Start Age Estimation" button
2. The system will load required face-api.js models
3. Age estimation results appear in real-time next to the button
4. Adjust confidence threshold slider if needed for more accurate results

### 2. Content Moderation

The content moderation feature detects potentially inappropriate visual content in real-time video streams, providing a safety layer for anonymous communication.

**Technical Details:**
- **Model Used**: NSFWJS (TensorFlow.js based)
- **Update Frequency**: Every 3 seconds by default
- **Categories Detected**: 
  - Pornography
  - Suggestive content
  - Drawings/cartoons
  - Neutral content
- **Response**: Non-blocking warnings for potentially inappropriate content

**Usage:**
1. Click "Enable Content Moderation" button
2. The system loads the NSFW detection model
3. Content status appears with color-coding:
   - Green: Safe content
   - Yellow: Questionable content
   - Red: Potentially inappropriate content
4. The feature is privacy-focused - no images are sent to external servers

### 3. Emotion Detection

The emotion detection feature analyzes facial expressions to identify the emotional state of the user in real-time.

**Technical Details:**
- **Models Used**: FaceExpressionNet (part of face-api.js)
- **Update Frequency**: Every 2 seconds by default
- **Emotions Detected**: Happy, Sad, Angry, Surprised, Fearful, Disgusted, Neutral
- **Results**: Displays the primary emotion with an emoji and confidence percentage

**Usage:**
1. Click "Start Emotion Detection" button
2. The system loads the emotion recognition model
3. Detected emotions appear in real-time with corresponding emoji
4. Confidence score indicates the reliability of the detection

### 4. Virtual Background

The virtual background feature allows users to apply background effects to their video stream, enhancing privacy and visual appeal.

**Technical Details:**
- **Model Used**: BodyPix (TensorFlow.js based)
- **Effect Types**:
  - Blur: Blurs the background while keeping the person in focus
  - Default Image: Replaces the background with a selected image
  - Custom Image: Allows users to upload their own background image
  - None: Disables the effect, returning to normal video
- **Performance**: Optimized for real-time processing with minimal latency
- **Custom Image Support**:
  - Accepts common image formats (JPEG, PNG, WebP)
  - Size limit: 5MB
  - Recommended aspect ratio: 16:9 (landscape)

**Usage:**
1. Click "Enable Virtual Background" button
2. Select the desired effect from the dropdown menu:
   - Blur: Applies a gaussian blur to the background
   - Default Image: Uses a pre-configured background image
   - Custom Image: Opens file upload option to select your own image
   - None: Returns to normal video
3. For custom images:
   - Click "Browse" to select an image from your device
   - A preview of the selected image appears below
   - The effect is applied immediately upon selection

**Troubleshooting:**
1. **cropSize Error** - If you encounter a "cropSize must be atleast [1,1], but was 0,0" error:
   - This is a known issue with TensorFlow.js and BodyPix related to GPU texture dimensions
   - The application includes multiple fallback implementations that should automatically handle this error
   - If you still encounter this issue:
     - Wait for your video to fully initialize before enabling virtual backgrounds
     - Try using a browser with better WebGL support (Chrome or Edge recommended)
     - Lower your video resolution to 640x480 for best compatibility
     - Disable hardware acceleration in your browser if problems persist

2. **Performance Issues**:
   - Lower the resolution of your video feed if background processing is slow
   - Try the "Blur" option instead of image background for better performance
   - Close other resource-intensive applications and browser tabs
   - Disable other AI features (age/emotion detection) to free up resources

3. **Image Background Not Showing**:
   - Ensure your custom image is under the 5MB limit
   - Try a different image format (JPEG recommended for better compatibility)
   - Verify your browser supports the BodyPix segmentation model
4. The effect is applied in real-time to the video stream with minimal latency

## Implementation Architecture

The AI features follow a modular architecture:

1. **AI Core Module** (`webrtcAI.js`):
   - Handles model loading and initialization
   - Implements processing algorithms for all AI features
   - Manages processing frequency and resource utilization

2. **AI UI Module** (`webrtcAIUI.js`):
   - Connects UI controls to AI functionality
   - Manages UI updates based on AI results
   - Handles user interactions with AI features

3. **WebRTC Integration**:
   - Processes video frames locally for privacy
   - Seamlessly integrates with WebRTC media streams
   - Ensures AI features don't interfere with call quality

## Setup and Configuration

### Model Download

Before using the AI features, ensure the required models are downloaded:

```
node download-face-models.js
```

**Important Note for Windows PowerShell Users**:  
When running commands that need to be chained, use the semicolon (`;`) operator instead of ampersand-ampersand (`&&`).

Example:
- PowerShell (correct): `cd models_directory; node download-face-models.js`
- Bash/CMD (won't work in PowerShell): `cd models_directory && node download-face-models.js`

### Configuration Options

The AI features can be configured through the UI:

- **Confidence Threshold**: Controls the sensitivity of detections across all AI features
- **Background Effect Selection**: Choose the type of virtual background to apply
- **Processing Frequency**: Each feature has an optimized default frequency, but can be adjusted in the code

## Privacy Considerations

All AI processing occurs entirely in the user's browser:

- No video frames or processed data leave the local machine
- No external API calls are made for analysis
- No data is stored or logged beyond the immediate application needs
- Models are loaded from local storage after initial download

## Performance Optimization

The AI features are designed to run efficiently even on lower-powered devices:

### Resource Management Techniques

1. **Throttled Processing**: 
   - AI analysis runs at specified intervals rather than on every frame
   - Adjustable frequency based on device performance
   - Default intervals are tuned for balanced performance

2. **Model Optimization**:
   - TinyFaceDetector used for faster face detection
   - Quantized TensorFlow models for reduced memory footprint
   - Automatic model unloading when features are inactive

3. **Background Processing**:
   - Processing occurs on hidden canvas elements
   - Offscreen rendering reduces UI impact
   - Efficient canvas buffer reuse

### Performance Tips

1. **Selective Feature Usage**:
   - Enable only the AI features you need
   - Each active feature adds CPU/GPU load
   - Virtual background is the most resource-intensive feature

2. **Video Resolution Impact**:
   - Lower resolutions significantly improve AI performance
   - 640x480 recommended for optimal balance
   - Consider reducing frame rate for smoother AI features

3. **Browser Compatibility**:
   - Chrome and Edge provide best performance with WebGL acceleration
   - Firefox may have reduced performance for some features
   - Safari has limited support for some TensorFlow.js operations

## Error Handling Improvements

The virtual background feature includes several error handling improvements to enhance reliability:

### Virtual Background Robustness

1. **Dimension Validation**:
   - Automatic validation of video dimensions before processing
   - Enforces minimum dimensions (16x16) to prevent cropSize errors
   - Waits for valid video dimensions before attempting segmentation

2. **Dynamic Resizing**:
   - Canvas is automatically resized if video dimensions change
   - Preserves aspect ratio during resizing operations
   - Handles resolution changes without requiring feature restart

3. **Graceful Fallbacks**:
   - Falls back to original video when segmentation fails
   - Implements multi-stage error recovery for transient issues
   - Provides visual feedback when video isn't ready

4. **Resource Management**:
   - Properly cleans up resources when stopping background effects
   - Releases memory from unused background images
   - Implements proper animation frame handling

5. **TensorFlow Version Compatibility**:
   - Uses compatible versions of TensorFlow.js (1.7.4) and Body-Pix (2.0.5)
   - Validates model loading before attempting segmentation
   - Configures TensorFlow environment settings to prevent cropSize errors
   - Implements multiple fallback methods when TensorFlow operations fail:
     - Canvas-based mask generation as fallback for BodyPix toMask
     - CSS-based blur as fallback for BodyPix drawBokehEffect
     - Direct pixel manipulation as final fallback method

4. **Background Effects**:
   - Blur effect is less demanding than image replacement
   - Complex backgrounds in video increase processing time
   - Static backgrounds improve segmentation accuracy

### Troubleshooting Performance Issues

- If features run slowly, try:
  - Disabling other AI features temporarily
  - Reducing video resolution in settings
  - Closing other browser tabs and applications
  - Updating your browser to the latest version
  - Using a device with dedicated GPU if available

## Troubleshooting

Common issues and solutions:

1. **Models Not Loading**:
   - Ensure the download script has been run
   - Check browser console for specific error messages
   - Verify network connectivity for initial model downloads

2. **High CPU Usage**:
   - Disable AI features not in use
   - Reduce video resolution in the video controls
   - Increase the interval between AI processing frames

3. **Detection Inaccuracies**:
   - Improve lighting conditions
   - Face the camera directly
   - Adjust the confidence threshold slider
   - Ensure the face is clearly visible and not obscured
