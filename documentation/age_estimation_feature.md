# Age Estimation Feature Documentation

## Overview
The age estimation feature uses face-api.js to provide real-time age estimation from video streams in the WebRTC demo. This feature processes video frames locally in the browser, ensuring privacy by not sending facial data to any external servers.

## Components

### 1. AI Module (`webrtcAI.js`)
- Core functionality for age estimation using face-api.js
- Model loading and management
- Face detection and age estimation algorithms
- Confidence threshold handling

### 2. AI UI Integration (`webrtcAIUI.js`)
- Connects UI controls with AI functionality
- Handles user interactions for the age estimation feature
- Updates UI elements with estimation results

### 3. Model Downloader (`download-face-models.js`)
- Downloads required face-api.js models for age estimation
- Places models in the public/models directory for client-side access

## Setup Instructions

### Install Required Models
Before using the age estimation feature, you must download the face-api.js models:

```bash
node download-face-models.js
```

This will download the following models to the `public/models` directory:
- TinyFaceDetector model - for fast face detection
- FaceLandmark68 model - for facial landmark detection
- AgeGender model - for age and gender estimation

### Usage
1. Open the WebRTC demo page
2. Start a call between two peers
3. Click the "Start Age Estimation" button to begin analyzing the local video stream
4. The estimated age will display next to the button
5. Adjust the confidence threshold slider to control detection sensitivity

## Technical Details

### Age Estimation Process
1. Face detection: Identifies faces in the video frame using TinyFaceDetector
2. Landmark detection: Locates 68 facial landmarks for improved accuracy
3. Age estimation: Analyzes facial features to estimate age
4. Confidence filtering: Only displays results above the specified confidence threshold

### Performance Considerations
- Age estimation runs at intervals (default: 2 seconds) to reduce CPU usage
- The confidence threshold can be adjusted to balance accuracy and detection rate
- Processing is done entirely in the client browser using WebGL acceleration when available

## Privacy and Security
- All processing occurs locally in the user's browser
- No facial data or images are transmitted to any server
- No data is stored permanently

## Troubleshooting
- If age estimation doesn't start, check browser console for errors
- Ensure the models are properly downloaded to the `/public/models` directory
- If age estimation is slow, try reducing the resolution or frame rate of the video stream
