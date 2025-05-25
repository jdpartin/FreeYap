// One-time script to create index for socketId field in Qdrant collection
// Run this once: node create_qdrant_index.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function createSocketIdIndex() {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    try {
        console.log('Creating index for socketId field...');
        
        // Create an index on the socketId field in the payload
        await client.createPayloadIndex('topics_collection', {
            field_name: 'socketId',
            field_schema: 'keyword' // Use keyword type for exact matching
        });
        
        console.log('✅ Index for "socketId" field created successfully!');
        console.log('You can now perform filtered deletions by socketId.');
        
    } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Index already exists')) {
            console.log('✅ Index for "socketId" field already exists!');
        } else {
            console.error('❌ Error creating index:', error);
            console.error('Full error details:', error.message);
        }
    }
}

createSocketIdIndex();
