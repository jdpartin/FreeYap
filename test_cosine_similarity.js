// Test file to validate cosine similarity calculations
// This will help identify if the function is working correctly

// Calculate cosine similarity between two vectors (same as in WebRTCClient.js)
function calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

// Test cases to validate the function
console.log('=== Cosine Similarity Test Cases ===\n');

// Test 1: Identical vectors should return 1.0
const vec1 = [1, 2, 3, 4, 5];
const vec2 = [1, 2, 3, 4, 5];
const sim1 = calculateCosineSimilarity(vec1, vec2);
console.log(`Test 1 - Identical vectors: ${sim1} (should be 1.0)`);
console.log(`Percentage: ${Math.round(sim1 * 10000) / 100}%\n`);

// Test 2: Opposite vectors should return -1.0
const vec3 = [1, 2, 3];
const vec4 = [-1, -2, -3];
const sim2 = calculateCosineSimilarity(vec3, vec4);
console.log(`Test 2 - Opposite vectors: ${sim2} (should be -1.0)`);
console.log(`Percentage: ${Math.round(sim2 * 10000) / 100}%\n`);

// Test 3: Orthogonal vectors should return 0.0
const vec5 = [1, 0, 0];
const vec6 = [0, 1, 0];
const sim3 = calculateCosineSimilarity(vec5, vec6);
console.log(`Test 3 - Orthogonal vectors: ${sim3} (should be 0.0)`);
console.log(`Percentage: ${Math.round(sim3 * 10000) / 100}%\n`);

// Test 4: Similar but not identical vectors
const vec7 = [1, 2, 3];
const vec8 = [1, 2, 4];
const sim4 = calculateCosineSimilarity(vec7, vec8);
console.log(`Test 4 - Similar vectors [1,2,3] vs [1,2,4]: ${sim4}`);
console.log(`Percentage: ${Math.round(sim4 * 10000) / 100}%\n`);

// Test 5: Zero vector edge case
const vec9 = [0, 0, 0];
const vec10 = [1, 2, 3];
const sim5 = calculateCosineSimilarity(vec9, vec10);
console.log(`Test 5 - Zero vector: ${sim5} (should be 0.0)`);
console.log(`Percentage: ${Math.round(sim5 * 10000) / 100}%\n`);

// Test 6: High-dimensional vectors with small differences
const vec11 = Array.from({length: 1536}, (_, i) => Math.random());
const vec12 = vec11.map(x => x + (Math.random() - 0.5) * 0.01); // Add small noise
const sim6 = calculateCosineSimilarity(vec11, vec12);
console.log(`Test 6 - High-dim vectors with small noise: ${sim6}`);
console.log(`Percentage: ${Math.round(sim6 * 10000) / 100}%\n`);

// Test 7: Realistic embedding-like vectors (normalized)
function normalizeVector(vec) {
    const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    return vec.map(x => x / norm);
}

const vec13 = normalizeVector([0.5, 0.3, -0.2, 0.8, -0.1]);
const vec14 = normalizeVector([0.4, 0.35, -0.15, 0.75, -0.05]);
const sim7 = calculateCosineSimilarity(vec13, vec14);
console.log(`Test 7 - Normalized similar vectors: ${sim7}`);
console.log(`Percentage: ${Math.round(sim7 * 10000) / 100}%\n`);

console.log('=== Analysis ===');
console.log('If you\'re seeing inflated similarity scores, the issue is likely:');
console.log('1. The embeddings themselves are too similar (check OpenAI embedding quality)');
console.log('2. The percentage calculation or display');
console.log('3. The threshold values being used for categorization');
console.log('4. The data being passed to the function');
