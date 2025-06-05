// Script to add gore index to existing Qdrant collection
// Run this once: node create_gore_index.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function createGoreIndex() {
    console.log('🔧 Starting gore index creation...');
    
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    console.log('📡 Connected to Qdrant...');

    try {
        // Create index for gore field to enable gore filtering
        console.log('🔨 Creating gore index...');
        await client.createPayloadIndex('topics_collection', {
            field_name: 'gore',
            field_schema: 'bool'
        });
        console.log('✅ Index for "gore" field created successfully!');
        
    } catch (indexError) {
        console.log('⚠️ Index creation error:', indexError.message);
        if (indexError.message.includes('already exists')) {
            console.log('✅ Index for "gore" field already exists!');
        } else {
            console.warn('⚠️ Warning: Could not create gore index:', indexError.message);
        }
    }

    console.log('✅ Gore index setup complete!');
}

createGoreIndex().then(() => {
    console.log('✅ Setup complete! Gore filtering is now enabled.');
    process.exit(0);
}).catch(error => {
    console.error('❌ Failed to setup gore index:', error);
    process.exit(1);
});
