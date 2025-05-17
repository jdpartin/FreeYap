const express = require('express');
const router = express.Router();
const Matchmaking = require('../managers/matchmaking');

// Endpoint to join the matchmaking queue
router.post('/joinQueue', async (req, res) =>
{
    const { sessionId, webrtcId } = req.body;

    try
    {
        await Matchmaking.JoinQueue(sessionId, webrtcId);
        res.status(200).json({ success: true, message: 'Successfully joined the queue.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to join the queue.', error: error.message });
    }
});

// Endpoint to leave the matchmaking queue
router.post('/leaveQueue', async (req, res) =>
{
    const { sessionId } = req.body;

    try
    {
        await Matchmaking.LeaveQueue(sessionId);
        res.status(200).json({ success: true, message: 'Successfully left the queue.' });
    }
    catch (error)
    {
        res.status(500).json({ success: false, message: 'Failed to leave the queue.', error: error.message });
    }
});

module.exports = router;
