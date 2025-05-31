import express, { Request, Response } from 'express';
import EmailService from '../services/emailService';

const router = express.Router();

// Contact form submission endpoint
router.post('/send', async (req: Request, res: Response): Promise<void> => {
    try {
        const { subject, message, email } = req.body;        // Validate required fields
        if (!subject || !message) {
            res.status(400).json({ 
                success: false, 
                error: 'Subject and message are required' 
            });
            return;
        }

        // Validate subject is one of the allowed values
        const allowedSubjects = ['technical', 'feedback', 'question', 'privacy', 'other'];
        if (!allowedSubjects.includes(subject)) {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid subject category' 
            });
            return;
        }

        // Validate message length
        if (message.length > 2000) {
            res.status(400).json({ 
                success: false, 
                error: 'Message too long (max 2000 characters)' 
            });
            return;
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
            return;
        }

        // Send email
        const result = await EmailService.sendContactEmail({
            subject,
            message: message.trim(),
            userEmail: email || undefined
        });

        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: 'Your message has been sent successfully!' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to send message. Please try again later.' 
            });
        }

    } catch (error) {
        console.error('Error in contact form submission:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Test email service endpoint (for development)
router.get('/test', async (req: Request, res: Response): Promise<void> => {
    try {
        const isConnected = await EmailService.testConnection();
        res.status(200).json({ 
            success: isConnected, 
            message: isConnected ? 'Email service is working' : 'Email service is not configured' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to test email service' 
        });
    }
});

export default router;
