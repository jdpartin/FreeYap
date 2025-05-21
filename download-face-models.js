// Script to download AI models for WebRTC features
const fs = require('fs');
const path = require('path');
const https = require('https');

// Target directories for saving models
const modelsDir = path.join(__dirname, 'public', 'models');
const tensorflowModelsDir = path.join(modelsDir, 'tensorflow');
const nsfwModelDir = path.join(tensorflowModelsDir, 'nsfw_model');

// Create directories if they don't exist
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log(`Created models directory: ${modelsDir}`);
}

if (!fs.existsSync(tensorflowModelsDir)) {
    fs.mkdirSync(tensorflowModelsDir, { recursive: true });
    console.log(`Created TensorFlow models directory: ${tensorflowModelsDir}`);
}

if (!fs.existsSync(nsfwModelDir)) {
    fs.mkdirSync(nsfwModelDir, { recursive: true });
    console.log(`Created NSFW model directory: ${nsfwModelDir}`);
}

// Base URL for face-api.js models
const faceApiBaseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// Base URL for NSFW model
const nsfwModelBaseUrl = 'https://github.com/infinitered/nsfwjs/raw/master/example/nsfw_demo/public/model';

// List of face-api.js models
const faceApiModels = [
    // TinyFaceDetector models
    { name: 'tiny_face_detector_model-weights_manifest.json' },
    { name: 'tiny_face_detector_model-shard1' },
    
    // Face Landmark models
    { name: 'face_landmark_68_model-weights_manifest.json' },
    { name: 'face_landmark_68_model-shard1' },
    
    // Age and Gender models
    { name: 'age_gender_model-weights_manifest.json' },
    { name: 'age_gender_model-shard1' },
    
    // Face Expression models
    { name: 'face_expression_model-weights_manifest.json' },
    { name: 'face_expression_model-shard1' },
];

// List of NSFW detection model files
const nsfwModels = [
    { name: 'model.json' },
    { name: 'group1-shard1of1.bin' },
];

// Function to download a file
function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destination, () => {
                reject(err);
            });
        });
    });
}

// Download all models
async function downloadModels() {
    // Download face-api.js models
    console.log('Starting to download face-api.js models...');
    
    for (const model of faceApiModels) {
        const url = `${faceApiBaseUrl}/${model.name}`;
        const destination = path.join(modelsDir, model.name);
        
        try {
            console.log(`Downloading face-api.js model: ${model.name}...`);
            await downloadFile(url, destination);
            console.log(`Successfully downloaded ${model.name}`);
        } catch (error) {
            console.error(`Error downloading ${model.name}:`, error);
        }
    }
    
    // Download NSFW detection models
    console.log('\nStarting to download NSFW detection models...');
    
    for (const model of nsfwModels) {
        const url = `${nsfwModelBaseUrl}/${model.name}`;
        const destination = path.join(nsfwModelDir, model.name);
        
        try {
            console.log(`Downloading NSFW model: ${model.name}...`);
            await downloadFile(url, destination);
            console.log(`Successfully downloaded ${model.name}`);
        } catch (error) {
            console.error(`Error downloading ${model.name}:`, error);
        }
    }
    
    console.log('\nAll AI models download attempts completed.');
}

// Run the download
downloadModels();
