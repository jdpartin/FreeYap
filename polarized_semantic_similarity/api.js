const express = require('express');
const router = express.Router();

const db = require('../managers/databaseManager');
const vectorDb = require('../managers/qdrantManager'); // Assuming qdrantManager handles vector database operations

const basePath = '/semantic_polarization_api';

// match
// An endpoint where they provide
// A queue id (optional) - if not provided it will compare all known words
// A single topic
// Matching criteria - Semantic similarity, and polarization thresholds
router.post(`${basePath}/match`, async (req, res) =>
{
    // Validate the request
    const { queueId, topic, criteria } = req.body;

    if (!topic || !criteria)
    {
        return res.status(400).json({ error: 'Invalid request. topic and criteria are required.' });
    }

    if (queueId) // Compare against queue only
    {

    }
    else // Compare against all known words
    {

    }
});

// bulk_match
// An endpoint where they provide
// A queue id (optional) - if not provided it will compare all known words
// A list of topics
// Matching criteria - Semantic similarity, and polarization thresholds
router.post(`${basePath}/bulk_match`, async (req, res) =>
{
    // Validate the request
    const { queueId, topics, criteria } = req.body;

    if (!topics || !Array.isArray(topics) || !criteria)
    {
        return res.status(400).json({ error: 'Invalid request. queueId, topics and criteria are required.' });
    }
});


// compare
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

// compare_bulk
// The user provides a list of topics to compare
router.post(`${basePath}/compare_bulk`, async (req, res) =>
{
    // Validate the request
    // We need a queue id UUID and it should also contain topics to compare
    const { queueId, topics } = req.body;
    if (!queueId || !topics || !Array.isArray(topics))
    {
        return res.status(400).json({ error: 'Invalid request. queueId and topics are required.' });
    }
});

// enqueue
// The user provides a queue id it can be existing or new
// The user provides a list of topics to enqueue
router.post(`${basePath}/enqueue`, async (req, res) =>
{
    // Validate the request
    const { queueId, topics } = req.body;
    if (!queueId || !topics || !Array.isArray(topics))
    {
        return res.status(400).json({ error: 'Invalid request. queueId and topics are required.' });
    }

    try
    {
        // Insert terms into the relational database
        await db.executeStoredProcedure('enqueueTerms', { queueId, topics });

        // Insert terms into the vector database
        for (const topic of topics)
        {
            await db.insertVector(queueId, topic); // Use the database manager's insertVector function
        }

        res.status(200).json({ success: true, message: 'Topics successfully enqueued.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to enqueue topics.', error: error.message });
    }
});

// dequeue
// The user provides a queue id it can be existing or new
// The user provides a list of topics to dequeue
router.post(`${basePath}/dequeue`, async (req, res) =>
{
    // Validate the request
    const { queueId, topics } = req.body;
    if (!queueId || !topics || !Array.isArray(topics))
    {
        return res.status(400).json({ error: 'Invalid request. queueId and topics are required.' });
    }

    try
    {
        // Remove terms from the relational database
        await db.executeStoredProcedure('dequeueTerms', { queueId, topics });

        // Remove terms from the vector database
        for (const topic of topics)
        {
            await db.removeVector(queueId, topic); // Use the database manager's removeVector function
        }

        res.status(200).json({ success: true, message: 'Topics successfully dequeued.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to dequeue topics.', error: error.message });
    }
});

module.exports = router;