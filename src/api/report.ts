import express, { Request, Response } from 'express';
import EmailService from '../services/emailService';

const router = express.Router();

// Report submission endpoint
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
    try {
        const { contentType, details, userIP, timestamp } = req.body;

        // Validate required fields
        if (!contentType) {
            res.status(400).json({ 
                success: false, 
                error: 'Report type is required' 
            });
            return;
        }

        // Validate contentType is one of the allowed values
        const allowedTypes = ['illegal-content', 'minor-user', 'platform-abuse'];
        if (!allowedTypes.includes(contentType)) {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid report type' 
            });
            return;
        }

        // Validate details length if provided
        if (details && details.length > 1000) {
            res.status(400).json({ 
                success: false, 
                error: 'Details too long (max 1000 characters)' 
            });
            return;
        }

        // Prepare email data
        const typeMap: { [key: string]: string } = {
            'illegal-content': 'Illegal Content Report',
            'minor-user': 'Underage User Report',
            'platform-abuse': 'Platform Abuse Report'
        };

        const reportSubject = `URGENT: ${typeMap[contentType]} - FreeYap`;
        
        // Create detailed email content
        const emailContent = `
            <div style="border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 10px 0; background-color: #fff5f5;">
                <h2 style="color: #dc3545; margin-top: 0;">🚨 URGENT REPORT SUBMISSION</h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #495057; margin-top: 0;">Report Details</h3>
                    <p><strong>Report Type:</strong> <span style="color: #dc3545; font-weight: bold;">${typeMap[contentType]}</span></p>
                    <p><strong>Timestamp:</strong> ${timestamp || new Date().toLocaleString()}</p>
                    <p><strong>Reporter IP:</strong> ${userIP || 'Not captured'}</p>
                    <p><strong>Platform:</strong> FreeYap Anonymous Chat</p>
                </div>

                ${details ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-top: 0;">Additional Details Provided:</h4>
                    <div style="background-color: #ffffff; padding: 10px; border-radius: 3px; font-family: monospace; white-space: pre-wrap; border: 1px solid #dee2e6;">
${details.trim()}
                    </div>
                </div>
                ` : '<p style="color: #6c757d;"><em>No additional details provided by reporter.</em></p>'}

                <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #bee5eb;">
                    <h4 style="color: #0c5460; margin-top: 0;">Required Actions:</h4>
                    <ul style="color: #0c5460;">
                        <li><strong>Immediate Review:</strong> This report requires urgent attention per legal compliance requirements</li>
                        <li><strong>Evidence Preservation:</strong> Preserve any relevant logs, chat records, or connection data</li>
                        <li><strong>Legal Assessment:</strong> Determine if law enforcement notification is required</li>
                        <li><strong>User Safety:</strong> Take appropriate action to protect platform users</li>
                    </ul>
                </div>

                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f5c6cb;">
                    <h4 style="color: #721c24; margin-top: 0;">⚠️ Legal Notice:</h4>
                    <p style="color: #721c24; margin-bottom: 0;">
                        This report was submitted through FreeYap's illegal content reporting system. 
                        Immediate attention may be required for legal compliance. Please review and take 
                        appropriate action according to platform policies and applicable laws.
                    </p>
                </div>

                <hr style="border-color: #dc3545; margin: 20px 0;">
                <p style="color: #6c757d; font-size: 12px; margin-bottom: 0;">
                    Report submitted from FreeYap platform on ${new Date().toLocaleString()}
                    <br>This is an automated system message requiring urgent human review.
                </p>
            </div>
        `;

        // Send email to help@freeyap.com
        const result = await EmailService.sendReportEmail({
            subject: reportSubject,
            htmlContent: emailContent,
            reportType: contentType,
            details: details || 'No additional details provided'
        });

        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: 'Report submitted successfully. Thank you for helping keep FreeYap safe.' 
            });
        } else {
            console.error('Failed to send report email:', result.error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to submit report. Please try again later.' 
            });
        }

    } catch (error) {
        console.error('Error in report submission:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

export default router;
