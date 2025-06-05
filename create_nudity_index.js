// Script to add nudity index to existing Qdrant collection
// Run this once: node create_nudity_index.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function createNudityIndex() {
    console.log('🔧 Starting nudity index creation...');
    
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    console.log('📡 Connected to Qdrant...');

    try {
        // Create index for nudity field to enable nudity filtering
        console.log('🔨 Creating nudity index...');
        await client.createPayloadIndex('topics_collection', {
            field_name: 'nudity',
            field_schema: 'bool'
        });
        console.log('✅ Index for "nudity" field created successfully!');
        
    } catch (indexError) {
        console.log('⚠️ Index creation error:', indexError.message);
        if (indexError.message.includes('already exists')) {
            console.log('✅ Index for "nudity" field already exists!');
        } else {
            console.warn('⚠️ Warning: Could not create nudity index:', indexError.message);
        }
    }

    console.log('✅ Nudity index setup complete!');
}

createNudityIndex().then(() => {
    console.log('✅ Setup complete! Nudity filtering is now enabled.');
    process.exit(0);
}).catch(error => {
    console.error('❌ Failed to setup nudity index:', error);
    process.exit(1);
});
