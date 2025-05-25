// Script to add mode index to existing Qdrant collection
// Run this once: node create_mode_index.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function createModeIndex() {
    console.log('🔧 Starting mode index creation...');
    
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    console.log('📡 Connected to Qdrant...');

    try {
        // Create index for mode field to enable mode filtering
        console.log('🔨 Creating mode index...');
        await client.createPayloadIndex('topics_collection', {
            field_name: 'mode',
            field_schema: 'keyword'
        });
        console.log('✅ Index for "mode" field created successfully!');
        
    } catch (indexError) {
        console.log('⚠️ Index creation error:', indexError.message);
        if (indexError.message.includes('already exists')) {
            console.log('✅ Index for "mode" field already exists!');
        } else {
            console.warn('⚠️ Warning: Could not create mode index:', indexError.message);
        }
    }

    console.log('✅ Mode index setup complete!');
}

createModeIndex().then(() => {
    console.log('✅ Setup complete! Mode filtering is now enabled.');
    process.exit(0);
}).catch(error => {
    console.error('❌ Failed to setup mode index:', error);
    process.exit(1);
});
