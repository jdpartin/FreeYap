import nodemailer from 'nodemailer';

interface EmailData {
    subject: string;
    message: string;
    userEmail?: string;
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
    }

    async sendContactEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
        try {
            const { subject, message, userEmail } = emailData;
            
            // Determine subject line
            const subjectMap: { [key: string]: string } = {
                'technical': 'Technical Issue',
                'feedback': 'Feedback/Suggestion', 
                'question': 'General Question',
                'privacy': 'Privacy Concern',
                'other': 'Other Inquiry'
            };

            const emailSubject = `FreeYap Help: ${subjectMap[subject] || subject}`;
            
            // Create email content
            const htmlContent = `
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

            // Send email
            const info = await this.transporter.sendMail({
                from: `"FreeYap Contact Form" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER, // Send to yourself
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
