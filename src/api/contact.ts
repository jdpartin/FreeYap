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

// Feature request submission endpoint
router.post('/feature-request', async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, category, userEmail, useCase, userImpact } = req.body;
        
        // Validate required fields
        if (!title || !description) {
            res.status(400).json({ 
                success: false, 
                error: 'Title and description are required' 
            });
            return;
        }

        // Validate title length
        if (title.length > 200) {
            res.status(400).json({ 
                success: false, 
                error: 'Title too long (max 200 characters)' 
            });
            return;
        }

        // Validate description length
        if (description.length > 2000) {
            res.status(400).json({ 
                success: false, 
                error: 'Description too long (max 2000 characters)' 
            });
            return;
        }

        // Validate category if provided
        const allowedCategories = ['chat-enhancements', 'matching-improvements', 'platform-features', 'other'];
        if (category && !allowedCategories.includes(category)) {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid category' 
            });
            return;
        }

        // Validate email format if provided
        if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
            return;
        }

        // Create email content for feature request
        const categoryMap: { [key: string]: string } = {
            'chat-enhancements': 'Chat Enhancements',
            'matching-improvements': 'Matching Improvements', 
            'platform-features': 'Platform Features',
            'other': 'Other'
        };

        const emailSubject = `FreeYap Feature Request: ${title}`;
        
        // Create feature request email content
        const message = `
Feature Request Details:

Title: ${title}
Category: ${category ? categoryMap[category] : 'Not specified'}

Description:
${description}

${useCase ? `Use Case:\n${useCase}\n` : ''}
${userImpact ? `User Impact:\n${userImpact}\n` : ''}
${userEmail ? `Contact Email: ${userEmail}` : 'No contact email provided'}

---
Submitted from FreeYap Features Page on ${new Date().toLocaleString()}
        `.trim();

        // Send email to features@freeyap.com
        const result = await EmailService.sendContactEmail({
            subject: 'feature-request',
            message: message,
            userEmail: userEmail || undefined
        });

        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: 'Your feature request has been sent successfully! We\'ll review it and get back to you if we need more information.' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to send feature request. Please try again later.' 
            });
        }

    } catch (error) {
        console.error('Error in feature request submission:', error);
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
