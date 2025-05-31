# Email Setup Instructions for FreeYap Contact Form

## Quick Setup (5 minutes)

### 1. Create Gmail App Password
1. Go to your Gmail account settings
2. Enable 2-Factor Authentication (if not already enabled)
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Copy the 16-character password (no spaces)

### 2. Create Environment File
1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```

2. Edit `.env` file and replace with your details:
   ```
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

### 3. Test the Setup
1. Start the server:
   ```
   npm start
   ```

2. Test the email service:
   - Visit: http://localhost:3000/api/contact/test
   - Should show: `{"success":true,"message":"Email service is working"}`

3. Test the contact form:
   - Visit: http://localhost:3000/help
   - Fill out and submit the contact form
   - Check your Gmail inbox for the message

## How It Works

- **Completely FREE**: Uses Gmail's free SMTP service
- **No limits**: Perfect for contact forms (thousands of emails/day)
- **Easy setup**: Just 2 environment variables
- **Secure**: Uses app passwords, not your main Gmail password
- **Reliable**: Gmail's enterprise-grade email delivery

## Features

✅ **Professional emails** with proper formatting  
✅ **Automatic fallback** to mailto if server fails  
✅ **Form validation** (subject, message length, email format)  
✅ **User notifications** with success/error messages  
✅ **Reply-to handling** if user provides email  
✅ **Clean HTML formatting** for easy reading  

## Alternative Free Services

If you prefer not to use Gmail:

- **Outlook/Hotmail**: Similar setup with different SMTP settings
- **SendGrid**: 100 emails/day free (requires signup)
- **Mailgun**: 5,000 emails/month free for 3 months
- **AWS SES**: 62,000 emails/month free (first year)

## Troubleshooting

**"Email service is not configured"**:
- Check `.env` file exists and has correct Gmail credentials
- Verify app password (not regular password)

**"Authentication failed"**:
- Make sure 2FA is enabled on Gmail
- Generate a new app password
- Check for typos in EMAIL_USER and EMAIL_PASS

**Form submits but no email received**:
- Check Gmail spam folder
- Test with /api/contact/test endpoint first
- Check server logs for error messages
