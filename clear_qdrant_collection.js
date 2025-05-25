// Clear All Vectors from Qdrant Collection
// This script deletes ALL vectors from the topics_collection
// ⚠️ WARNING: This is irreversible! Use with caution.
// Run this with: node clear_qdrant_collection.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

async function clearAllVectors() {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    const collectionName = 'topics_collection';

    try {
        console.log('🔍 Checking collection status...');
        
        // First, check if collection exists and get info
        try {
            const collectionInfo = await client.getCollection(collectionName);
            console.log(`📊 Collection "${collectionName}" found!`);
            console.log(`   Vectors count: ${collectionInfo.points_count || 0}`);
            console.log(`   Vector size: ${collectionInfo.config?.params?.vectors?.size || 'unknown'}`);
            
            if (collectionInfo.points_count === 0) {
                console.log('✅ Collection is already empty. Nothing to delete.');
                return;
            }
        } catch (error) {
            if (error.message.includes('Not found') || error.status === 404) {
                console.log('❌ Collection "topics_collection" does not exist.');
                console.log('💡 Run "node create_qdrant_collection.js" first to create the collection.');
                return;
            }
            throw error;
        }

        console.log('\n⚠️  WARNING: You are about to delete ALL vectors from the collection!');
        console.log('This action cannot be undone.');
        
        // In a real scenario, you might want to add a confirmation prompt here
        // For automation purposes, we'll proceed directly

        console.log('\n🗑️  Deleting all vectors...');
        
        // Method 1: Delete all points using scroll and delete in batches
        // This is more reliable than trying to delete the entire collection
        let hasMore = true;
        let deletedCount = 0;
        const batchSize = 1000;

        while (hasMore) {
            try {
                // Scroll through points to get their IDs
                const scrollResult = await client.scroll(collectionName, {
                    limit: batchSize,
                    with_payload: false, // We only need IDs
                    with_vector: false   // We only need IDs
                });

                if (!scrollResult.points || scrollResult.points.length === 0) {
                    hasMore = false;
                    break;
                }

                // Extract point IDs
                const pointIds = scrollResult.points.map(point => point.id);
                
                if (pointIds.length > 0) {
                    // Delete this batch of points
                    const deleteResponse = await client.delete(collectionName, {
                        points: pointIds
                    });

                    if (deleteResponse.status === 'acknowledged' || deleteResponse.status === 'completed') {
                        deletedCount += pointIds.length;
                        console.log(`   Deleted batch: ${pointIds.length} vectors (Total: ${deletedCount})`);
                    } else {
                        console.warn(`   Warning: Batch deletion status: ${deleteResponse.status}`);
                    }
                }

                // Check if there are more points
                hasMore = scrollResult.next_page_offset !== null && scrollResult.points.length === batchSize;
                
            } catch (batchError) {
                console.error('Error in batch deletion:', batchError.message);
                // Continue with next batch if possible
                break;
            }
        }

        console.log(`\n✅ Successfully deleted ${deletedCount} vectors from "${collectionName}"`);
        
        // Verify the collection is empty
        console.log('\n🔍 Verifying deletion...');
        const finalInfo = await client.getCollection(collectionName);
        console.log(`   Final vector count: ${finalInfo.points_count || 0}`);
        
        if (finalInfo.points_count === 0) {
            console.log('✅ Collection is now completely empty!');
        } else {
            console.log(`⚠️  Warning: ${finalInfo.points_count} vectors still remain. You may need to run the script again.`);
        }

    } catch (error) {
        console.error('❌ Error clearing vectors:', error);
        console.error('Error details:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('Unauthorized') || error.status === 401) {
            console.log('\n💡 Troubleshooting:');
            console.log('   - Check your QDRANT_API_KEY in .env file');
            console.log('   - Verify your Qdrant Cloud credentials');
        } else if (error.message.includes('Not found') || error.status === 404) {
            console.log('\n💡 Troubleshooting:');
            console.log('   - Check your QDRANT_URL in .env file');
            console.log('   - Verify the collection name is correct');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 Troubleshooting:');
            console.log('   - The collection might be very large. Try running the script again.');
            console.log('   - Check your internet connection');
        }
        
        process.exit(1);
    }
}

// Alternative method: Complete collection recreation (faster but more destructive)
async function recreateCollection() {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    const collectionName = 'topics_collection';

    try {
        console.log('🔄 Recreating collection (deletes everything and recreates)...');
        
        // Delete the entire collection
        try {
            await client.deleteCollection(collectionName);
            console.log('✅ Old collection deleted.');
        } catch (error) {
            if (!error.message.includes('Not found')) {
                throw error;
            }
            console.log('ℹ️  Collection did not exist.');
        }

        // Recreate the collection with the same settings
        await client.createCollection(collectionName, {
            vectors: {
                size: 1536, // OpenAI ada-002 embedding size
                distance: 'Cosine'
            }
        });

        console.log('✅ New empty collection created.');

        // Recreate the socketId index
        try {
            await client.createPayloadIndex(collectionName, {
                field_name: 'socketId',
                field_schema: 'keyword'
            });
            console.log('✅ SocketId index recreated.');
        } catch (indexError) {
            console.warn('⚠️ Warning: Could not recreate socketId index:', indexError.message);
        }

        console.log('✅ Collection successfully recreated and is now empty!');

    } catch (error) {
        console.error('❌ Error recreating collection:', error);
        throw error;
    }
}

// Main execution
async function main() {
    console.log('🚀 FreeYap Qdrant Collection Cleaner');
    console.log('=====================================\n');

    // Check command line arguments for method selection
    const args = process.argv.slice(2);
    const useRecreate = args.includes('--recreate') || args.includes('-r');

    if (useRecreate) {
        console.log('🔄 Using RECREATE method (faster, completely rebuilds collection)');
        await recreateCollection();
    } else {
        console.log('🗑️  Using DELETE method (safer, preserves collection structure)');
        console.log('💡 Use --recreate flag for faster but more destructive clearing');
        await clearAllVectors();
    }

    console.log('\n🎉 Operation completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   - Your Qdrant collection is now empty');
    console.log('   - New vectors will be added when users join the queue');
    console.log('   - All embeddings in PostgreSQL remain intact');
}

// Run the script
main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
