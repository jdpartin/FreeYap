# AI Validation System

This document outlines the AI validation system for FreeYap, which provides automated verification of user reports and vibe check submissions to enhance platform safety and reduce false reports.

## Overview

The AI validation system operates in two primary contexts:
1. **Vibe Check Widget** - Validates gore and nudity reports in video modes
2. **Report Button** - Validates age estimation for minor reporting across all modes

All AI validations result in a boolean `verified` field that indicates whether the AI could confirm the reported content/behavior.

## System Architecture

### Core Components

1. **AI Validation Service** - Central service handling all AI validation requests
2. **Age Estimation Module** - Validates reported minors using facial analysis
3. **Content Detection Module** - Validates gore and nudity in video streams
4. **Chat Analysis Module** - Analyzes chat history for child-like language patterns
5. **Validation Result Storage** - Stores verification results with reports

### Technology Stack

- **Face-api.js** - Client-side age estimation and facial analysis
- **TensorFlow.js** - Local content classification models (NSFW.js, custom models)
- **Browser IndexedDB** - Local temporary storage for video buffers
- **WebWorkers** - Background processing for AI analysis
- **Natural Language Processing** - Local chat content analysis
- **Client-side Vector Search** - Pattern matching without external databases

## Validation Scenarios

### 1. Vibe Check Widget - Gore/Nudity Validation

**Trigger**: User submits vibe check report for gore or nudity
**Scope**: Video chat modes only
**Process**:
1. Retrieve frames from local video buffer
2. Run content detection AI model in WebWorker
3. Classify content as gore/nudity/safe locally
4. Set `verified: true/false` based on classification confidence
5. Send only boolean result to server with vibe check submission
6. Delete processed frames immediately

**Expected Outcomes**:
- Reduces false gore/nudity reports
- Provides evidence for moderation decisions
- Maintains user privacy through local processing

### 2. Report Button - Minor Age Validation

**Trigger**: User reports another user as a minor
**Scope**: All chat modes (text, voice, video)
**Process**:
1. **Video Modes**: Retrieve frames from local video buffer and run age estimation
2. **All Modes**: Analyze recent chat messages locally for child-like language patterns
3. Combine results if both available (processed locally)
4. Set `verified: true/false` based on confidence threshold
5. Send only boolean result and confidence score to server with report
6. Delete all processed data immediately

**Expected Outcomes**:
- Identifies potential minors for priority review
- Reduces false minor reports
- Enables rapid response to legitimate child safety concerns

## Implementation Details

### Age Estimation Process

```
1. Capture Video Frame
   └── Extract face region using face-api.js
   └── Run age estimation model
   └── Calculate confidence score

2. Chat History Analysis
   └── Extract recent messages from reported user
   └── Analyze language patterns, vocabulary, topics
   └── Score likelihood of minor language use

3. Combined Scoring
   └── Weight video analysis (70%) + chat analysis (30%)
   └── Threshold: verified = true if confidence > 80%
```

### Local Video Buffer System

**Buffer Configuration**:
- **Resolution**: 320x240 pixels (low resolution for privacy)
- **Frame Rate**: 3 frames per second (sufficient for AI analysis)
- **Duration**: 30 seconds rolling buffer per session
- **Storage**: Browser IndexedDB, memory-only option available
- **Compression**: WebP format with 60% quality
- **Size**: ~5-10MB per session buffer

**Buffer Management**:
```javascript
const VIDEO_BUFFER_CONFIG = {
    maxDuration: 30000, // 30 seconds
    resolution: { width: 320, height: 240 },
    frameRate: 3,
    compressionQuality: 0.6,
    maxStoredSessions: 3,
    autoCleanup: true
};
```

**Privacy Features**:
- Automatic deletion on tab close
- Manual clear option in UI
- User can disable buffering entirely
- No network transmission of video data
- Frames deleted immediately after AI analysis

### Chat Analysis Patterns

**Child Language Indicators**:
- Simple vocabulary and sentence structure
- School-related topics and schedules
- Age-specific interests and references
- Parental supervision mentions
- Homework, bedtime, allowance discussions

**Analysis Method**:
- Tokenize and analyze last 50 messages locally
- Compare against local child language patterns database
- Use client-side vector similarity matching
- Weight recent messages more heavily
- Process entirely in browser WebWorker
- No message content sent to server

## Data Privacy & Security

### Privacy Protections

1. **Local Processing**: All AI analysis runs client-side exclusively
2. **Temporary Buffering**: Low-resolution video frames stored locally for 30 seconds maximum
3. **No Server Storage**: Video data never leaves user's device
4. **Automatic Cleanup**: Buffers cleared on tab close or user request
5. **User Control**: Optional buffering with full disable capability
6. **Anonymized Results**: Only verification boolean and confidence scores are transmitted
7. **No Facial Recognition**: Age estimation does not store or compare facial features

### Security Measures

1. **Model Integrity**: AI models are verified on load using checksums
2. **Local Processing**: No sensitive data transmitted to servers
3. **Automatic Cleanup**: All temporary data deleted after processing
4. **User Consent**: Clear notification of AI analysis usage
5. **Rate Limiting**: Client-side throttling of validation requests
6. **Human Oversight**: AI results supplement, not replace, human moderation

## Database Schema Changes

### New Tables

```sql
-- AI validation results (only stores boolean results, no sensitive data)
CREATE TABLE ai_validations (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    vibe_check_id INTEGER REFERENCES vibe_checks(id),
    validation_type VARCHAR(50) NOT NULL, -- 'age_estimation', 'gore_detection', 'nudity_detection'
    verified BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- No chat analysis cache table needed - all processing is local
```

### Modified Tables

```sql
-- Add AI validation reference to reports
ALTER TABLE reports ADD COLUMN ai_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN ai_confidence DECIMAL(3,2);

-- Add AI validation reference to vibe checks
ALTER TABLE vibe_checks ADD COLUMN ai_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE vibe_checks ADD COLUMN ai_confidence DECIMAL(3,2);
```

## API Endpoints

### Validation Endpoints

```typescript
// Validate vibe check content (only receives boolean result)
POST /api/validation/vibe-check
Body: {
    vibeCheckId: number,
    verified: boolean,
    confidence: number,
    reportType: 'gore' | 'nudity'
}
Response: {
    success: boolean,
    validationId: number
}

// Validate age estimation (only receives boolean result)
POST /api/validation/age-estimation
Body: {
    reportId: number,
    verified: boolean,
    confidence: number,
    estimatedAge?: number // Optional, only age range (child/adult)
}
Response: {
    success: boolean,
    validationId: number
}
```

## Configuration

### AI Model Configuration

```javascript
const AI_CONFIG = {
    ageEstimation: {
        confidenceThreshold: 0.8,
        maxAge: 17, // Consider as minor if estimated age <= 17
        modelPath: '/models/age_gender_model',
        localProcessing: true
    },
    contentDetection: {
        confidenceThreshold: 0.75,
        goreModelPath: '/models/gore_detection_model',
        nudityModelPath: '/models/nudity_detection_model',
        localProcessing: true
    },
    chatAnalysis: {
        confidenceThreshold: 0.7,
        maxMessagesToAnalyze: 50,
        localPatternDatabase: '/models/child_language_patterns.json',
        localProcessing: true
    },
    videoBuffer: {
        maxDuration: 30000, // 30 seconds
        resolution: { width: 320, height: 240 },
        frameRate: 3,
        compressionQuality: 0.6,
        maxStoredSessions: 3,
        autoCleanup: true
    }
};
```

### Feature Flags

```javascript
const FEATURE_FLAGS = {
    aiValidationEnabled: true,
    vibeCheckValidation: true,
    ageEstimationValidation: true,
    chatAnalysisEnabled: true,
    debugMode: false
};
```

## Performance Considerations

### Optimization Strategies

1. **Model Loading**: Load AI models once on application start
2. **Local Buffer Management**: Efficient IndexedDB storage and cleanup
3. **WebWorker Processing**: Non-blocking AI analysis in background threads
4. **Memory Management**: Automatic cleanup of processed frames and data
5. **Progressive Loading**: Load models as needed to reduce initial load time

### Resource Management

- **Memory Usage**: Monitor AI model memory consumption and local buffer usage
- **CPU Usage**: Limit concurrent validation processes using WebWorker pools
- **Storage Impact**: Automatic cleanup of IndexedDB temporary data
- **Battery Impact**: Optimize processing frequency to preserve device battery
- **Network Impact**: Minimize data transfer (only boolean results sent to server)

## Testing Strategy

### Unit Tests

1. **Age Estimation Accuracy**: Test with known age images (using test datasets)
2. **Content Detection Precision**: Test with labeled gore/nudity content
3. **Chat Analysis Effectiveness**: Test with simulated child/adult conversations
4. **False Positive Rates**: Ensure low false positive rates
5. **Local Buffer Management**: Test IndexedDB storage and cleanup
6. **Privacy Compliance**: Verify no sensitive data transmission

### Integration Tests

1. **End-to-End Validation Flow**: Complete local analysis → boolean result → server storage
2. **Performance Under Load**: Multiple simultaneous local validations
3. **Error Handling**: Model loading failures, buffer overflow scenarios
4. **Privacy Compliance**: Ensure no sensitive data leakage to server
5. **Cross-browser Compatibility**: Test WebWorker and IndexedDB across browsers

## Monitoring & Analytics

### Key Metrics

1. **Validation Accuracy**: Percentage of correct validations
2. **Processing Time**: Average time per validation
3. **Confidence Distribution**: Distribution of confidence scores
4. **False Positive/Negative Rates**: Track validation accuracy over time

### Dashboard Metrics

- Daily validation requests
- Verification success rates by type
- Average confidence scores
- Processing performance metrics

## Future Enhancements

### Planned Improvements

1. **Message Content Validation**: Extend to text/image messages
2. **Advanced NLP**: Improved chat analysis with transformer models
3. **Real-time Processing**: Live content monitoring during video chats
4. **Federated Learning**: Improve models while preserving privacy
5. **Multi-language Support**: Extend chat analysis to multiple languages

### Research Areas

1. **Adversarial Robustness**: Protect against attempts to fool AI
2. **Bias Mitigation**: Ensure fair validation across demographics
3. **Edge Computing**: Move more processing to client devices
4. **Behavioral Analysis**: Detect concerning patterns beyond static content

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- Set up local video buffer system (IndexedDB)
- Implement client-side AI model loading
- Create WebWorker infrastructure for background processing
- Update database schema for boolean validation results

### Phase 2: Content Detection (Weeks 3-4)
- Implement local gore/nudity detection
- Integrate with vibe check widget
- Add local chat analysis capabilities
- Create privacy-focused UI notifications

### Phase 3: Integration (Weeks 5-6)
- Connect local validation to report system
- Implement buffer management and cleanup
- Add user controls for buffer preferences
- Create monitoring for local processing performance

### Phase 4: Testing & Refinement (Weeks 7-8)
- Comprehensive testing suite for local processing
- Cross-browser compatibility testing
- Performance optimization for various devices
- Privacy audit and compliance verification

## Compliance & Legal

### Regulatory Considerations

1. **COPPA Compliance**: Enhanced protection for children
2. **GDPR Compliance**: Data minimization and user consent
3. **Platform Liability**: Reduced liability through proactive monitoring
4. **Age Verification**: Improved age verification processes

### Documentation Requirements

1. **Privacy Policy Updates**: Describe local AI validation usage and data handling
2. **Terms of Service**: User consent for local AI analysis and temporary buffering
3. **Moderation Guidelines**: How AI results inform human moderation decisions
4. **Data Retention**: Policies for local buffer management and automatic cleanup
5. **Transparency Report**: How local processing protects user privacy

---

*This document will be updated as the AI validation system evolves and new requirements emerge.*
