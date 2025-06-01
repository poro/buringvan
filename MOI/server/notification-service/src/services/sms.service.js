const twilio = require('twilio');
const { setCache, getCache } = require('../config/redis');

class SmsService {
  constructor() {
    this.client = null;
    this.initializeTwilio();
  }

  initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        this.client = twilio(accountSid, authToken);
        console.log('Twilio SMS service initialized');
      } else {
        console.warn('Twilio credentials not provided, SMS service disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Twilio SMS service:', error);
    }
  }

  async sendSms(options) {
    try {
      if (!this.client) {
        console.log('SMS service not initialized');
        return { success: false, reason: 'SMS service not available' };
      }

      const {
        userId,
        to,
        message,
        fromNumber = process.env.TWILIO_PHONE_NUMBER
      } = options;

      // Get user phone number if not provided
      let phoneNumber = to;
      if (!phoneNumber && userId) {
        phoneNumber = await this.getUserPhoneNumber(userId);
      }

      if (!phoneNumber) {
        console.log(`No phone number found for user ${userId}`);
        return { success: false, reason: 'No phone number' };
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        console.log(`Invalid phone number format: ${phoneNumber}`);
        return { success: false, reason: 'Invalid phone number format' };
      }

      // Check if user has opted out of SMS
      const isOptedOut = await this.isUserOptedOut(phoneNumber);
      if (isOptedOut) {
        console.log(`User ${phoneNumber} has opted out of SMS`);
        return { success: false, reason: 'User opted out' };
      }

      // Rate limiting check
      const rateLimitKey = `sms_rate_limit:${phoneNumber}:${new Date().getHours()}`;
      const smsCount = await this.getSmsCount(rateLimitKey);
      const maxSmsPerHour = parseInt(process.env.MAX_SMS_PER_HOUR) || 5;
      
      if (smsCount >= maxSmsPerHour) {
        console.log(`SMS rate limit exceeded for ${phoneNumber}`);
        return { success: false, reason: 'Rate limit exceeded' };
      }

      // Check message length
      if (message.length > 1600) { // Twilio's limit for long messages
        console.log(`SMS message too long: ${message.length} characters`);
        return { success: false, reason: 'Message too long' };
      }

      // Add opt-out instructions to message
      const finalMessage = this.addOptOutInstructions(message);

      // Send SMS
      const twilioMessage = await this.client.messages.create({
        body: finalMessage,
        from: fromNumber,
        to: phoneNumber,
        statusCallback: `${process.env.BASE_URL}/api/notifications/sms/webhook`,
        statusCallbackMethod: 'POST'
      });

      // Update rate limit counter
      await this.incrementSmsCount(rateLimitKey);

      console.log(`SMS sent successfully to ${phoneNumber}: ${twilioMessage.sid}`);

      return {
        success: true,
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        segments: twilioMessage.numSegments,
        price: twilioMessage.price,
        priceUnit: twilioMessage.priceUnit
      };

    } catch (error) {
      console.error('Failed to send SMS:', error);
      
      // Handle specific Twilio errors
      if (error.code === 21614) {
        // Invalid phone number
        return { success: false, reason: 'Invalid phone number' };
      } else if (error.code === 21610) {
        // Unsubscribed number
        await this.optOutUser(phoneNumber);
        return { success: false, reason: 'Number unsubscribed' };
      } else if (error.code === 21408) {
        // Permission to send denied
        return { success: false, reason: 'Permission denied' };
      }

      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getUserPhoneNumber(userId) {
    try {
      // Try to get from cache first
      const cacheKey = `user_phone:${userId}`;
      let phoneNumber = await getCache(cacheKey);
      
      if (!phoneNumber) {
        // Make API call to auth service to get user phone
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
        const response = await fetch(`${authServiceUrl}/api/users/${userId}/phone`, {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          phoneNumber = data.phoneNumber;
          // Cache for 1 hour
          await setCache(cacheKey, phoneNumber, 3600);
        }
      }

      return phoneNumber;
    } catch (error) {
      console.error('Error getting user phone number:', error);
      return null;
    }
  }

  isValidPhoneNumber(phoneNumber) {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  async isUserOptedOut(phoneNumber) {
    try {
      const cacheKey = `sms_opted_out:${phoneNumber}`;
      const optedOut = await getCache(cacheKey);
      return optedOut === true;
    } catch (error) {
      console.error('Error checking SMS opt-out status:', error);
      return false;
    }
  }

  async optOutUser(phoneNumber) {
    try {
      const cacheKey = `sms_opted_out:${phoneNumber}`;
      await setCache(cacheKey, true, 365 * 24 * 3600); // Cache for 1 year
      console.log(`User ${phoneNumber} opted out of SMS`);
      return true;
    } catch (error) {
      console.error('Error opting out user from SMS:', error);
      return false;
    }
  }

  async optInUser(phoneNumber) {
    try {
      const cacheKey = `sms_opted_out:${phoneNumber}`;
      await setCache(cacheKey, false, 365 * 24 * 3600);
      console.log(`User ${phoneNumber} opted in to SMS`);
      return true;
    } catch (error) {
      console.error('Error opting in user to SMS:', error);
      return false;
    }
  }

  addOptOutInstructions(message) {
    // Add opt-out instructions as required by regulations
    const optOutText = '\n\nReply STOP to opt out.';
    
    // Check if message already contains opt-out instructions
    if (message.toLowerCase().includes('stop') && message.toLowerCase().includes('opt')) {
      return message;
    }
    
    // Ensure total message length doesn't exceed limits
    if (message.length + optOutText.length > 1600) {
      const maxMessageLength = 1600 - optOutText.length;
      return message.substring(0, maxMessageLength) + '...' + optOutText;
    }
    
    return message + optOutText;
  }

  async getSmsCount(rateLimitKey) {
    try {
      const count = await getCache(rateLimitKey);
      return count || 0;
    } catch (error) {
      console.error('Error getting SMS count:', error);
      return 0;
    }
  }

  async incrementSmsCount(rateLimitKey) {
    try {
      const currentCount = await this.getSmsCount(rateLimitKey);
      await setCache(rateLimitKey, currentCount + 1, 3600); // 1 hour expiry
      return currentCount + 1;
    } catch (error) {
      console.error('Error incrementing SMS count:', error);
      return 0;
    }
  }

  async handleWebhook(body) {
    try {
      const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = body;
      
      console.log(`SMS webhook received: ${MessageSid} - ${MessageStatus}`);
      
      // Handle different message statuses
      switch (MessageStatus) {
        case 'delivered':
          console.log(`SMS ${MessageSid} delivered to ${To}`);
          break;
          
        case 'failed':
        case 'undelivered':
          console.error(`SMS ${MessageSid} failed: ${ErrorCode} - ${ErrorMessage}`);
          
          // Handle specific error codes
          if (ErrorCode === '30001' || ErrorCode === '30002') {
            // Queue full or message timeout - could retry
            console.log(`SMS delivery failed due to queue/timeout: ${MessageSid}`);
          } else if (ErrorCode === '30003' || ErrorCode === '30004') {
            // Unreachable destination or blocked - don't retry
            console.log(`SMS delivery blocked: ${MessageSid}`);
          }
          break;
          
        case 'sent':
          console.log(`SMS ${MessageSid} sent from ${From} to ${To}`);
          break;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error handling SMS webhook:', error);
      return { success: false, error: error.message };
    }
  }

  async handleIncomingMessage(body) {
    try {
      const { From, To, Body, MessageSid } = body;
      
      console.log(`Incoming SMS from ${From}: ${Body}`);
      
      // Handle opt-out keywords
      const bodyLower = Body.toLowerCase().trim();
      if (bodyLower === 'stop' || bodyLower === 'unsubscribe' || bodyLower === 'opt out') {
        await this.optOutUser(From);
        
        // Send confirmation message
        try {
          await this.client.messages.create({
            body: 'You have been unsubscribed from SMS notifications. Reply START to opt back in.',
            from: To,
            to: From
          });
        } catch (error) {
          console.error('Failed to send opt-out confirmation:', error);
        }
        
        return { success: true, action: 'opted_out' };
      }
      
      // Handle opt-in keywords
      if (bodyLower === 'start' || bodyLower === 'subscribe' || bodyLower === 'opt in') {
        await this.optInUser(From);
        
        // Send confirmation message
        try {
          await this.client.messages.create({
            body: 'You have been subscribed to SMS notifications. Reply STOP to opt out.',
            from: To,
            to: From
          });
        } catch (error) {
          console.error('Failed to send opt-in confirmation:', error);
        }
        
        return { success: true, action: 'opted_in' };
      }
      
      // Log other incoming messages for potential customer service
      console.log(`Unhandled incoming SMS from ${From}: ${Body}`);
      
      return { success: true, action: 'logged' };
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkSms(messages, options = {}) {
    try {
      const { batchSize = 5, delayBetweenBatches = 2000 } = options;
      const results = [];

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(smsOptions => 
          this.sendSms(smsOptions).catch(error => ({ 
            success: false, 
            error: error.message,
            phoneNumber: smsOptions.to 
          }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Longer delay for SMS to respect carrier limits
        if (i + batchSize < messages.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      throw error;
    }
  }

  async getAccountInfo() {
    try {
      if (!this.client) {
        return { success: false, reason: 'SMS service not available' };
      }

      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        success: true,
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      };
    } catch (error) {
      console.error('Error getting Twilio account info:', error);
      return { success: false, error: error.message };
    }
  }

  async validatePhoneNumber(phoneNumber) {
    try {
      if (!this.client) {
        return { success: false, reason: 'SMS service not available' };
      }

      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      
      return {
        success: true,
        phoneNumber: lookup.phoneNumber,
        nationalFormat: lookup.nationalFormat,
        countryCode: lookup.countryCode,
        carrier: lookup.carrier
      };
    } catch (error) {
      console.error('Error validating phone number:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SmsService;
