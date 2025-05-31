import nodemailer from 'nodemailer';

interface EmailData {
    subject: string;
    message: string;
    userEmail?: string;
}

interface ReportEmailData {
    subject: string;
    htmlContent: string;
    reportType: string;
    details: string;
}

class EmailService {
    private transporter: nodemailer.Transporter;    constructor() {
        // Create transporter using Gmail SMTP
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address
                pass: process.env.EMAIL_PASS  // Your Gmail app password
            }
        });
    }    async sendContactEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
        try {
            const { subject, message, userEmail } = emailData;
            
            // Determine subject line and recipient
            const subjectMap: { [key: string]: string } = {
                'technical': 'Technical Issue',
                'feedback': 'Feedback/Suggestion', 
                'question': 'General Question',
                'privacy': 'Privacy Concern',
                'other': 'Other Inquiry',
                'feature-request': 'Feature Request'
            };

            // Determine recipient based on type
            let recipient = process.env.EMAIL_USER; // Default to help email
            let senderName = "FreeYap Contact Form";
            
            if (subject === 'feature-request') {
                // For feature requests, we could send to a specific email or keep it the same
                // For now, keeping it the same but with different sender name
                senderName = "FreeYap Feature Request System";
            }

            const emailSubject = subject === 'feature-request' 
                ? message.split('\n')[0].replace('Feature Request Details:', '').replace('Title: ', '').trim()
                : `FreeYap Help: ${subjectMap[subject] || subject}`;
            
            // Create email content
            let htmlContent;
            
            if (subject === 'feature-request') {
                // Special formatting for feature requests
                htmlContent = `
                    <h3>🚀 New Feature Request</h3>
                    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #007bff;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    ${userEmail ? `<p><strong>Contact Email:</strong> ${userEmail}</p>` : '<p><em>No contact email provided</em></p>'}
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        Submitted from FreeYap Features Page on ${new Date().toLocaleString()}
                    </p>
                `;
            } else {
                // Standard contact form formatting
                htmlContent = `
                    <h3>New Contact Form Submission</h3>
                    <p><strong>Category:</strong> ${subjectMap[subject] || subject}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    ${userEmail ? `<p><strong>User Email:</strong> ${userEmail}</p>` : '<p><em>No reply email provided</em></p>'}
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        Sent from FreeYap Contact Form on ${new Date().toLocaleString()}
                    </p>
                `;
            }

            // Send email
            const info = await this.transporter.sendMail({
                from: `"${senderName}" <${process.env.EMAIL_USER}>`,
                to: recipient,
                subject: emailSubject,
                html: htmlContent,
                replyTo: userEmail || undefined
            });

            console.log('Contact email sent successfully:', info.messageId);
            return { success: true };

        } catch (error) {
            console.error('Failed to send contact email:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }    }

    // Send report email to help@freeyap.com
    async sendReportEmail(reportData: ReportEmailData): Promise<{ success: boolean; error?: string }> {
        try {
            const { subject, htmlContent, reportType, details } = reportData;
            
            // Send email to help@freeyap.com
            const info = await this.transporter.sendMail({
                from: `"FreeYap Report System" <${process.env.EMAIL_USER}>`,
                to: 'help@freeyap.com',
                subject: subject,
                html: htmlContent,
                priority: 'high', // Mark as high priority
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high'
                }
            });

            console.log('Report email sent successfully to help@freeyap.com:', info.messageId);
            return { success: true };

        } catch (error) {
            console.error('Failed to send report email:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    // Test email connection
    async testConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            console.log('Email service is ready');
            return true;
        } catch (error) {
            console.error('Email service connection failed:', error);
            return false;
        }
    }
}

export default new EmailService();
