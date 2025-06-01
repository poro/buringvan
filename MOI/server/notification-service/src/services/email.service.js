const nodemailer = require('nodemailer');
const { setCache, getCache } = require('../config/redis');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Configure based on email provider
      const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
      
      switch (emailProvider) {
        case 'sendgrid':
          this.transporter = nodemailer.createTransporter({
            service: 'SendGrid',
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY
            }
          });
          break;
          
        case 'gmail':
          this.transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD
            }
          });
          break;
          
        case 'mailgun':
          this.transporter = nodemailer.createTransporter({
            host: 'smtp.mailgun.org',
            port: 587,
            secure: false,
            auth: {
              user: process.env.MAILGUN_SMTP_USER,
              pass: process.env.MAILGUN_SMTP_PASSWORD
            }
          });
          break;
          
        case 'ses':
          this.transporter = nodemailer.createTransporter({
            host: 'email-smtp.us-east-1.amazonaws.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.AWS_SES_ACCESS_KEY,
              pass: process.env.AWS_SES_SECRET_KEY
            }
          });
          break;
          
        default: // SMTP
          this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD
            }
          });
      }

      console.log(`Email service initialized with provider: ${emailProvider}`);
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(options) {
    try {
      const {
        userId,
        to,
        subject,
        html,
        text,
        fromName = 'Social Media Manager',
        attachments = []
      } = options;

      // Get user email if not provided
      let emailAddress = to;
      if (!emailAddress && userId) {
        emailAddress = await this.getUserEmail(userId);
      }

      if (!emailAddress) {
        throw new Error('No email address provided');
      }

      // Check if user has unsubscribed
      const isUnsubscribed = await this.isUserUnsubscribed(emailAddress);
      if (isUnsubscribed) {
        console.log(`User ${emailAddress} has unsubscribed, skipping email`);
        return { success: false, reason: 'User unsubscribed' };
      }

      // Rate limiting check
      const rateLimitKey = `email_rate_limit:${emailAddress}:${new Date().getHours()}`;
      const emailCount = await this.getEmailCount(rateLimitKey);
      const maxEmailsPerHour = parseInt(process.env.MAX_EMAILS_PER_HOUR) || 10;
      
      if (emailCount >= maxEmailsPerHour) {
        console.log(`Rate limit exceeded for ${emailAddress}`);
        return { success: false, reason: 'Rate limit exceeded' };
      }

      // Prepare email options
      const fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: emailAddress,
        subject,
        html: this.addUnsubscribeLink(html, emailAddress),
        text: this.addUnsubscribeLink(text, emailAddress, true),
        attachments,
        headers: {
          'List-Unsubscribe': `<${this.getUnsubscribeUrl(emailAddress)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Update rate limit counter
      await this.incrementEmailCount(rateLimitKey);

      // Log successful send
      console.log(`Email sent successfully to ${emailAddress}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };

    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserEmail(userId) {
    try {
      // Try to get from cache first
      const cacheKey = `user_email:${userId}`;
      let email = await getCache(cacheKey);
      
      if (!email) {
        // Make API call to auth service to get user email
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
        const response = await fetch(`${authServiceUrl}/api/users/${userId}/email`, {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          email = data.email;
          // Cache for 1 hour
          await setCache(cacheKey, email, 3600);
        }
      }

      return email;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }

  async isUserUnsubscribed(email) {
    try {
      const cacheKey = `unsubscribed:${email}`;
      const unsubscribed = await getCache(cacheKey);
      return unsubscribed === true;
    } catch (error) {
      console.error('Error checking unsubscribe status:', error);
      return false;
    }
  }

  async unsubscribeUser(email) {
    try {
      const cacheKey = `unsubscribed:${email}`;
      await setCache(cacheKey, true, 365 * 24 * 3600); // Cache for 1 year
      console.log(`User ${email} unsubscribed from emails`);
      return true;
    } catch (error) {
      console.error('Error unsubscribing user:', error);
      return false;
    }
  }

  async resubscribeUser(email) {
    try {
      const cacheKey = `unsubscribed:${email}`;
      await setCache(cacheKey, false, 365 * 24 * 3600);
      console.log(`User ${email} resubscribed to emails`);
      return true;
    } catch (error) {
      console.error('Error resubscribing user:', error);
      return false;
    }
  }

  async getEmailCount(rateLimitKey) {
    try {
      const count = await getCache(rateLimitKey);
      return count || 0;
    } catch (error) {
      console.error('Error getting email count:', error);
      return 0;
    }
  }

  async incrementEmailCount(rateLimitKey) {
    try {
      const currentCount = await this.getEmailCount(rateLimitKey);
      await setCache(rateLimitKey, currentCount + 1, 3600); // 1 hour expiry
      return currentCount + 1;
    } catch (error) {
      console.error('Error incrementing email count:', error);
      return 0;
    }
  }

  getUnsubscribeUrl(email) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const token = Buffer.from(email).toString('base64');
    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  addUnsubscribeLink(content, email, isText = false) {
    if (!content) return content;

    const unsubscribeUrl = this.getUnsubscribeUrl(email);
    
    if (isText) {
      return content + `\n\nTo unsubscribe from these emails, visit: ${unsubscribeUrl}`;
    } else {
      const unsubscribeHtml = `
        <br><br>
        <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666;">unsubscribe here</a>.</p>
        </div>
      `;
      return content + unsubscribeHtml;
    }
  }

  async sendBulkEmails(emails, options = {}) {
    try {
      const { batchSize = 10, delayBetweenBatches = 1000 } = options;
      const results = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const batchPromises = batch.map(emailOptions => 
          this.sendEmail(emailOptions).catch(error => ({ 
            success: false, 
            error: error.message,
            email: emailOptions.to 
          }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Delay between batches to avoid rate limiting
        if (i + batchSize < emails.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      throw error;
    }
  }

  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }

  async sendTestEmail(to) {
    try {
      const testEmail = {
        to,
        subject: 'Test Email from Social Media Manager',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email to verify that the email service is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
        text: `Test Email\n\nThis is a test email to verify that the email service is working correctly.\n\nSent at: ${new Date().toISOString()}`
      };

      return await this.sendEmail(testEmail);
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
}

module.exports = EmailService;
