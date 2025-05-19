const express = require('express');
const router = express.Router();
const Matchmaking = require('../managers/matchmakingManager');


router.post('/joinQueue', async (req, res) =>
{
    try
    {
        const { sessionId } = req.body;

        if (!sessionId)
        {
            return res.status(400).json({ 
                success: false,
                error: 'sessionId is required.' 
            });
        }

        // Directly use sessionId as WebRTC ID since they are the same
        await Matchmaking.JoinQueue(sessionId, sessionId);

        res.status(200).json({ 
            success: true
        });
    }
    catch (error)
    {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
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
