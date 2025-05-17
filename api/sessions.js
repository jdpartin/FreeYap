const express = require('express');
const router = express.Router();
const SessionManager = require('../managers/sessionManager');

// Endpoint to initialize a session
router.post('/initialize', async (req, res) =>
{
    const { webrtcId, topics } = req.body;

    try
    {
        await SessionManager.InitializeSession(webrtcId, topics);
        res.status(200).json({ success: true, message: 'Session initialized successfully.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to initialize session.', error: error.message });
    }
});

// Endpoint to end a session
router.post('/end', async (req, res) =>
{
    try
    {
        await SessionManager.EndSession();
        res.status(200).json({ success: true, message: 'Session ended successfully.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to end session.', error: error.message });
    }
});

// Endpoint to update session topics
router.post('/update-topics', async (req, res) =>
{
    const { sessionId, newTopics } = req.body;

    try
    {
        await SessionManager.UpdateSessionTopics(sessionId, newTopics);
        res.status(200).json({ success: true, message: 'Session topics updated successfully.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to update session topics.', error: error.message });
    }
});

module.exports = router;
