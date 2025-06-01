const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'content_approved',
      'content_rejected', 
      'content_published',
      'content_failed',
      'campaign_completed',
      'campaign_started',
      'analytics_report',
      'account_connected',
      'account_disconnected',
      'subscription_updated',
      'subscription_expired',
      'quota_warning',
      'quota_exceeded',
      'system_announcement',
      'security_alert'
    ],
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  templates: {
    in_app: {
      title: {
        type: String,
        required: true,
        maxlength: 200
      },
      message: {
        type: String,
        required: true,
        maxlength: 1000
      }
    },
    email: {
      subject: {
        type: String,
        required: true,
        maxlength: 200
      },
      htmlTemplate: {
        type: String,
        required: true
      },
      textTemplate: {
        type: String,
        required: true
      },
      fromName: {
        type: String,
        default: 'Social Media Manager'
      }
    },
    push: {
      title: {
        type: String,
        required: true,
        maxlength: 100
      },
      body: {
        type: String,
        required: true,
        maxlength: 200
      },
      icon: {
        type: String,
        default: '/icons/notification.png'
      },
      badge: {
        type: String,
        default: '/icons/badge.png'
      },
      sound: {
        type: String,
        default: 'default'
      }
    },
    sms: {
      message: {
        type: String,
        required: true,
        maxlength: 160
      }
    }
  },
  variables: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'url', 'object'],
      default: 'string'
    },
    description: {
      type: String,
      maxlength: 200
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: mongoose.Schema.Types.Mixed
  }],
  defaultChannels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms']
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    throttle: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxPerHour: {
        type: Number,
        default: 10
      },
      maxPerDay: {
        type: Number,
        default: 50
      }
    },
    retry: {
      enabled: {
        type: Boolean,
        default: true
      },
      maxAttempts: {
        type: Number,
        default: 3
      },
      backoffMultiplier: {
        type: Number,
        default: 2
      }
    },
    expiry: {
      enabled: {
        type: Boolean,
        default: false
      },
      expiryHours: {
        type: Number,
        default: 24
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationTemplateSchema.index({ type: 1 });
notificationTemplateSchema.index({ isActive: 1 });

// Methods
notificationTemplateSchema.methods.renderTemplate = function(channel, variables = {}) {
  const template = this.templates[channel];
  if (!template) {
    throw new Error(`Template not found for channel: ${channel}`);
  }

  const rendered = {};
  
  // Helper function to replace variables in text
  const replaceVariables = (text) => {
    if (!text) return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      if (variables.hasOwnProperty(variableName)) {
        return variables[variableName];
      }
      
      // Check for default value
      const variable = this.variables.find(v => v.name === variableName);
      if (variable && variable.defaultValue !== undefined) {
        return variable.defaultValue;
      }
      
      return match; // Return original if no replacement found
    });
  };

  // Render based on channel type
  switch (channel) {
    case 'in_app':
      rendered.title = replaceVariables(template.title);
      rendered.message = replaceVariables(template.message);
      break;
      
    case 'email':
      rendered.subject = replaceVariables(template.subject);
      rendered.html = replaceVariables(template.htmlTemplate);
      rendered.text = replaceVariables(template.textTemplate);
      rendered.fromName = template.fromName;
      break;
      
    case 'push':
      rendered.title = replaceVariables(template.title);
      rendered.body = replaceVariables(template.body);
      rendered.icon = template.icon;
      rendered.badge = template.badge;
      rendered.sound = template.sound;
      break;
      
    case 'sms':
      rendered.message = replaceVariables(template.message);
      break;
      
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }

  return rendered;
};

notificationTemplateSchema.methods.validateVariables = function(variables = {}) {
  const errors = [];
  
  this.variables.forEach(variable => {
    if (variable.required && !variables.hasOwnProperty(variable.name)) {
      errors.push(`Required variable '${variable.name}' is missing`);
    }
    
    if (variables.hasOwnProperty(variable.name)) {
      const value = variables[variable.name];
      
      // Type validation
      switch (variable.type) {
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`Variable '${variable.name}' must be a number`);
          }
          break;
        case 'date':
          if (!(value instanceof Date) && !Date.parse(value)) {
            errors.push(`Variable '${variable.name}' must be a valid date`);
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(`Variable '${variable.name}' must be a valid URL`);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Variable '${variable.name}' must be a string`);
          }
          break;
      }
    }
  });
  
  return errors;
};

// Static methods
notificationTemplateSchema.statics.getTemplate = function(type) {
  return this.findOne({ type, isActive: true });
};

notificationTemplateSchema.statics.seedDefaultTemplates = async function() {
  const defaultTemplates = [
    {
      type: 'content_approved',
      name: 'Content Approved',
      description: 'Notification when content is approved for posting',
      templates: {
        in_app: {
          title: 'Content Approved ✅',
          message: 'Your content "{{contentTitle}}" has been approved and will be posted on {{scheduledDate}}.'
        },
        email: {
          subject: 'Your content has been approved',
          htmlTemplate: '<h2>Content Approved</h2><p>Your content "<strong>{{contentTitle}}</strong>" has been approved and will be posted on {{scheduledDate}}.</p>',
          textTemplate: 'Your content "{{contentTitle}}" has been approved and will be posted on {{scheduledDate}}.'
        },
        push: {
          title: 'Content Approved',
          body: 'Your content "{{contentTitle}}" is ready to post!'
        }
      },
      variables: [
        { name: 'contentTitle', type: 'string', required: true },
        { name: 'scheduledDate', type: 'date', required: true }
      ],
      defaultChannels: ['in_app', 'push']
    },
    {
      type: 'content_rejected',
      name: 'Content Rejected',
      description: 'Notification when content is rejected',
      templates: {
        in_app: {
          title: 'Content Rejected ❌',
          message: 'Your content "{{contentTitle}}" was rejected. Reason: {{rejectionReason}}'
        },
        email: {
          subject: 'Content needs revision',
          htmlTemplate: '<h2>Content Rejected</h2><p>Your content "<strong>{{contentTitle}}</strong>" was rejected.</p><p><strong>Reason:</strong> {{rejectionReason}}</p>',
          textTemplate: 'Your content "{{contentTitle}}" was rejected. Reason: {{rejectionReason}}'
        },
        push: {
          title: 'Content Rejected',
          body: 'Your content needs revision'
        }
      },
      variables: [
        { name: 'contentTitle', type: 'string', required: true },
        { name: 'rejectionReason', type: 'string', required: true }
      ],
      defaultChannels: ['in_app', 'email', 'push']
    },
    {
      type: 'content_published',
      name: 'Content Published',
      description: 'Notification when content is successfully published',
      templates: {
        in_app: {
          title: 'Content Published 🚀',
          message: 'Your content "{{contentTitle}}" has been successfully published on {{platform}}!'
        },
        email: {
          subject: 'Your content is now live!',
          htmlTemplate: '<h2>Content Published</h2><p>Your content "<strong>{{contentTitle}}</strong>" has been successfully published on {{platform}}!</p>',
          textTemplate: 'Your content "{{contentTitle}}" has been successfully published on {{platform}}!'
        },
        push: {
          title: 'Content Published',
          body: 'Your content is now live on {{platform}}!'
        }
      },
      variables: [
        { name: 'contentTitle', type: 'string', required: true },
        { name: 'platform', type: 'string', required: true }
      ],
      defaultChannels: ['in_app', 'push']
    }
  ];

  for (const template of defaultTemplates) {
    await this.findOneAndUpdate(
      { type: template.type },
      template,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
