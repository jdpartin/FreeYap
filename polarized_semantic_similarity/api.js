const express = require('express');
const router = express.Router();

const db = require('../managers/databaseManager');
const vectorDb = require('../managers/qdrantManager'); // Assuming qdrantManager handles vector database operations

const basePath = '/semantic_polarization_api';

//We are going to set this up to be just like a vector database in function
// but we will use a relational database to store the vectors and an AI generated polarity score

// SELECT
router.post(`${basePath}/select`, async (req, res) =>
{
    // the user may provide
        // a collection id
        // a single topic
        // semantic and polarized thresholds.

    // Validate the request
    const { collectionId, topic, semanticThreshold, polarizedThreshold } = req.body;

    if (!queueId || !topic)
    {
        return res.status(400).json({ error: 'Invalid request. queueId and topic are required.' });
    }

    // ensure the word is in the semantic database
    // Query the semantic database for similar topics

    // A couple notes:
        // The collection just holds topics
        // we have a separate database that holds topicEmbeddings
        // The collections table holds a list of topics and has a collection id field that allows us to group them

    

    if (!result || result.length === 0)
    {
        // For each similar topic
        // check if we have already mapped the polarity score otherwise trigger the AI to calculate it
        // go ahead and return just the semantic similarity score with polarity score as null
        // check if the semantic and polarity scores are above the thresholds and remove them from the result set if needed
    }
    else
    {
        return res.status(200).json({
            errorExists: false,
            errorMessage: null,
            queueId: queueId,
            topic: topic,
            result: result
        });
    }

}

// INSERT
router.post(`${basePath}/insert`, async (req, res) =>
{
    // The user provides a collection id and a topic


}

// DELETE
router.post(`${basePath}/delete`, async (req, res) =>
{
    // The user provides a collection id and a topic
}

// COMPARE
// The user provides two topics to compare
router.post(`${basePath}/compare`, async (req, res) =>
{
    // Validate the request
    // We need a queue id UUID and it should also contain topics to compare
    const { queueId, topics } = req.body;
    if (!queueId || !topics || !Array.isArray(topics))
    {
        return res.status(400).json({ error: 'Invalid request. queueId and topics are required.' });
    }
});

// CREATE COLLECTION - Not needed because they can provide their own UUID


//#region Private Methods


async function triggerSemanticPolarizationCalculation(topic1, topic2)
{
    // get the embedding for each topic and save it to the database
    // ensure each topic is in the semantic database
    // calculate the cosine similarity
    // save an entry in the relational database with topic1, topic2, cosine similarity, and the polarity score as null
    // trigger the AI to calculate the polarity score
}

async function getTextEmbeddingFromAPI(text)
{
    // Call the API to get the embedding
    // make sure to save it
}

function calculateCosineSimilarity(vector1, vector2)
{
    const dotProduct = vector1.reduce((sum, val, index) => sum + val * vector2[index], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0)
    {
        return 0; // Avoid division by zero
    }

    return dotProduct / (magnitude1 * magnitude2);
}


//#endregion


module.exports = router;