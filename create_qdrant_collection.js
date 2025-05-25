// One-time script to create permanent Qdrant collection
// Run this once: node create_qdrant_collection.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function createTopicsCollection() {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    try {
        // Create the collection with OpenAI ada-002 embedding size (1536 dimensions)
        await client.createCollection('topics_collection', {
            vectors: {
                size: 1536,
                distance: 'Cosine' // Best for semantic similarity
            }
        });
          console.log('✅ Collection "topics_collection" created successfully!');
        
        // Create index for socketId field to enable filtered deletions
        try {
            await client.createPayloadIndex('topics_collection', {
                field_name: 'socketId',
                field_schema: 'keyword'
            });
            console.log('✅ Index for "socketId" field created successfully!');
        } catch (indexError) {
            if (indexError.message.includes('already exists')) {
                console.log('✅ Index for "socketId" field already exists!');
            } else {
                console.warn('⚠️ Warning: Could not create socketId index:', indexError.message);
            }
        }

        // Create index for mode field to enable mode filtering
        try {
            await client.createPayloadIndex('topics_collection', {
                field_name: 'mode',
                field_schema: 'keyword'
            });
            console.log('✅ Index for "mode" field created successfully!');
        } catch (indexError) {
            if (indexError.message.includes('already exists')) {
                console.log('✅ Index for "mode" field already exists!');
            } else {
                console.warn('⚠️ Warning: Could not create mode index:', indexError.message);
            }
        }
        
        console.log('Your permanent collection is now ready on Qdrant Cloud.');
          } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Collection "topics_collection" already exists!');
            
            // Try to create the socketId index even if collection exists
            try {
                await client.createPayloadIndex('topics_collection', {
                    field_name: 'socketId',
                    field_schema: 'keyword'
                });
                console.log('✅ Index for "socketId" field created successfully!');
            } catch (indexError) {
                if (indexError.message.includes('already exists')) {
                    console.log('✅ Index for "socketId" field already exists!');
                } else {
                    console.warn('⚠️ Warning: Could not create socketId index:', indexError.message);
                }
            }

            // Try to create the mode index even if collection exists
            try {
                await client.createPayloadIndex('topics_collection', {
                    field_name: 'mode',
                    field_schema: 'keyword'
                });
                console.log('✅ Index for "mode" field created successfully!');
            } catch (indexError) {
                if (indexError.message.includes('already exists')) {
                    console.log('✅ Index for "mode" field already exists!');
                } else {
                    console.warn('⚠️ Warning: Could not create mode index:', indexError.message);
                }
            }
        } else {
            console.error('❌ Error creating collection:', error);
        }
    }
}

createTopicsCollection();
