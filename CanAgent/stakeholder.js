/**
 * src/tasks/stakeholder.js
 * Stakeholder monitoring module for tracking stakeholder engagement
 */

class StakeholderMonitoring {
  /**
   * Initialize the stakeholder monitoring module
   * @param {Object} notionHelper - NotionHelper instance for Notion interactions
   */
  constructor(notionHelper) {
    this.notionHelper = notionHelper;
  }

  /**
   * Track stakeholder engagement and communication
   * @param {string} stakeholderId - Stakeholder identifier or name
   * @param {Object} parameters - Additional parameters for tracking
   * @returns {Promise<Object>} - Stakeholder engagement data
   */
  async trackStakeholderEngagement(stakeholderId, parameters = {}) {
    try {
      // This is a placeholder implementation
      // In a real implementation, this would interact with CRM tools
      // or fetch data from communication platforms
      
      const stakeholderName = parameters.stakeholderName || stakeholderId;
      
      // Mock stakeholder data for demonstration
      const stakeholderData = {
        name: stakeholderName,
        role: parameters.role || 'Project Stakeholder',
        organization: parameters.organization || 'Unknown Organization',
        contactInfo: {
          email: `${stakeholderName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: '+1-555-123-4567'
        },
        interactions: [
          {
            type: 'Meeting',
            date: this._getRelativeDate(-30), // 30 days ago
            summary: 'Initial project kickoff meeting',
            sentiment: 'Positive'
          },
          {
            type: 'Email',
            date: this._getRelativeDate(-14), // 14 days ago
            summary: 'Progress update on milestone 1',
            sentiment: 'Neutral'
          },
          {
            type: 'Call',
            date: this._getRelativeDate(-7), // 7 days ago
            summary: 'Discussion about project timeline adjustments',
            sentiment: 'Concerned'
          }
        ],
        projects: [
          'Main Project Alpha',
          'Secondary Initiative Beta'
        ],
        lastContact: this._getRelativeDate(-7), // 7 days ago
        nextScheduledContact: this._getRelativeDate(7) // 7 days from now
      };
      
      return stakeholderData;
    } catch (error) {
      console.error(`Error tracking stakeholder engagement: ${error.message}`);
      throw error;
    }
  }

  /**
   * Identify stakeholders requiring follow-up
   * @param {Array} stakeholders - List of stakeholder data objects
   * @returns {Promise<Array>} - List of stakeholders needing follow-up
   */
  async identifyFollowupNeeded(stakeholders) {
    try {
      const now = new Date();
      const followupNeeded = [];
      
      for (const stakeholder of stakeholders) {
        // Check if last contact was more than 14 days ago
        const lastContactDate = new Date(stakeholder.lastContact);
        const daysSinceLastContact = Math.floor((now - lastContactDate) / (1000 * 60 * 60 * 24));
        
        // Check if next scheduled contact is in the past or within next 7 days
        const nextContactDate = stakeholder.nextScheduledContact ? new Date(stakeholder.nextScheduledContact) : null;
        const isContactDueSoon = nextContactDate && nextContactDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const isContactOverdue = nextContactDate && nextContactDate < now;
        
        // Check for negative sentiment in recent interactions
        const recentInteractions = stakeholder.interactions
          .filter(i => new Date(i.date) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        const hasNegativeSentiment = recentInteractions.some(i => 
          ['Concerned', 'Negative', 'Upset', 'Dissatisfied'].includes(i.sentiment)
        );
        
        // Determine if follow-up is needed
        if (daysSinceLastContact > 14 || isContactDueSoon || isContactOverdue || hasNegativeSentiment) {
          followupNeeded.push({
            stakeholder: stakeholder.name,
            reason: this._determineFollowupReason(daysSinceLastContact, isContactDueSoon, isContactOverdue, hasNegativeSentiment),
            priority: this._determineFollowupPriority(daysSinceLastContact, isContactDueSoon, isContactOverdue, hasNegativeSentiment),
            lastContact: stakeholder.lastContact,
            nextContact: stakeholder.nextScheduledContact
          });
        }
      }
      
      // Sort by priority (High, Medium, Low)
      followupNeeded.sort((a, b) => {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      return followupNeeded;
    } catch (error) {
      console.error(`Error identifying follow-up needs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate stakeholder engagement report
   * @param {Array} stakeholders - List of stakeholder data objects
   * @param {Array} followupNeeded - List of stakeholders needing follow-up
   * @returns {Promise<Object>} - Engagement report data
   */
  async generateEngagementReport(stakeholders, followupNeeded) {
    try {
      // Calculate engagement metrics
      const totalStakeholders = stakeholders.length;
      const stakeholdersNeedingFollowup = followupNeeded.length;
      const followupPercentage = Math.round((stakeholdersNeedingFollowup / totalStakeholders) * 100);
      
      // Count interaction types
      const interactionTypes = {};
      let totalInteractions = 0;
      
      for (const stakeholder of stakeholders) {
        for (const interaction of stakeholder.interactions || []) {
          totalInteractions++;
          interactionTypes[interaction.type] = (interactionTypes[interaction.type] || 0) + 1;
        }
      }
      
      // Calculate average interactions per stakeholder
      const avgInteractionsPerStakeholder = totalInteractions / totalStakeholders;
      
      // Generate report data
      const reportData = {
        generatedDate: new Date().toISOString(),
        metrics: {
          totalStakeholders,
          stakeholdersNeedingFollowup,
          followupPercentage,
          totalInteractions,
          avgInteractionsPerStakeholder: avgInteractionsPerStakeholder.toFixed(1),
          interactionTypes
        },
        followupNeeded,
        stakeholders: stakeholders.map(s => ({
          name: s.name,
          role: s.role,
          organization: s.organization,
          lastContact: s.lastContact,
          nextContact: s.nextScheduledContact,
          interactionCount: (s.interactions || []).length
        }))
      };
      
      return reportData;
    } catch (error) {
      console.error(`Error generating engagement report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update stakeholder database in Notion
   * @param {string} databaseId - Notion database ID
   * @param {Array} stakeholders - List of stakeholder data objects
   * @param {Object} reportData - Engagement report data
   * @returns {Promise<Array>} - List of updated/created page IDs
   */
  async updateStakeholderDatabase(databaseId, stakeholders, reportData) {
    const updatedIds = [];
    
    try {
      // Get existing stakeholders from database
      const existingStakeholders = await this.notionHelper.getAllDatabaseItems(databaseId);
      const existingMap = {};
      
      // Create a map of existing stakeholders by name
      for (const stakeholder of existingStakeholders) {
        const name = this.notionHelper.getPropertyValue(stakeholder, 'Name', 'title');
        if (name) {
          existingMap[name] = stakeholder;
        }
      }
      
      // Update or create stakeholders
      for (const stakeholder of stakeholders) {
        const stakeholderName = stakeholder.name;
        if (!stakeholderName) {
          continue;
        }
        
        try {
          // Check if stakeholder already exists
          if (stakeholderName in existingMap) {
            // Update existing stakeholder
            const pageId = existingMap[stakeholderName].id;
            const result = await this._updateStakeholderPage(pageId, stakeholder, reportData);
            if (!result.error) {
              updatedIds.push(pageId);
            }
          } else {
            // Create new stakeholder
            const result = await this._createStakeholderPage(databaseId, stakeholder, reportData);
            if (!result.error && result.id) {
              updatedIds.push(result.id);
            }
          }
        } catch (error) {
          console.error(`Error updating stakeholder ${stakeholderName}: ${error.message}`);
        }
      }
      
      return updatedIds;
    } catch (error) {
      console.error(`Error updating stakeholder database: ${error.message}`);
      return updatedIds;
    }
  }

  /**
   * Create a new stakeholder page in Notion
   * @private
   * @param {string} databaseId - Notion database ID
   * @param {Object} stakeholder - Stakeholder data
   * @param {Object} reportData - Engagement report data
   * @returns {Promise<Object>} - Result of page creation
   */
  async _createStakeholderPage(databaseId, stakeholder, reportData) {
    // Create properties
    const properties = this._createStakeholderProperties(stakeholder);
    
    // Create content blocks
    const blocks = this._createStakeholderContentBlocks(stakeholder, reportData);
    
    // Create the page
    return this.notionHelper.client.createPage(databaseId, true, properties, blocks);
  }

  /**
   * Update an existing stakeholder page in Notion
   * @private
   * @param {string} pageId - Notion page ID
   * @param {Object} stakeholder - Stakeholder data
   * @param {Object} reportData - Engagement report data
   * @returns {Promise<Object>} - Result of page update
   */
  async _updateStakeholderPage(pageId, stakeholder, reportData) {
    try {
      // Create properties
      const properties = this._createStakeholderProperties(stakeholder);
      
      // Update the page properties
      const result = await this.notionHelper.client.updatePage(pageId, properties);
      
      // Update content blocks
      if (!result.error) {
        const blocks = this._createStakeholderContentBlocks(stakeholder, reportData);
        
        // Get existing blocks
        const existingBlocks = await this.notionHelper.getAllBlockChildren(pageId);
        
        // Delete existing blocks
        for (const block of existingBlocks) {
          await this.notionHelper.client.deleteBlock(block.id);
        }
        
        // Add new blocks
        await this.notionHelper.client.appendBlocks(pageId, blocks);
      }
      
      return result;
    } catch (error) {
      console.error(`Error updating stakeholder page: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Create Notion properties for a stakeholder
   * @private
   * @param {Object} stakeholder - Stakeholder data
   * @returns {Object} - Notion properties dictionary
   */
  _createStakeholderProperties(stakeholder) {
    const properties = {
      Name: {
        title: [
          {
            text: {
              content: stakeholder.name || ''
            }
          }
        ]
      }
    };
    
    // Add role
    if (stakeholder.role) {
      properties.Role = {
        rich_text: [
          {
            text: {
              content: stakeholder.role
            }
          }
        ]
      };
    }
    
    // Add organization
    if (stakeholder.organization) {
      properties.Organization = {
        rich_text: [
          {
            text: {
              content: stakeholder.organization
            }
          }
        ]
      };
    }
    
    // Add last contact
    if (stakeholder.lastContact) {
      properties['Last Contact'] = {
        date: {
          start: new Date(stakeholder.lastContact).toISOString().split('T')[0]
        }
      };
    }
    
    // Add next contact
    if (stakeholder.nextScheduledContact) {
      properties['Next Contact'] = {
        date: {
          start: new Date(stakeholder.nextScheduledContact).toISOString().split('T')[0]
        }
      };
    }
    
    // Add projects as multi-select
    if (stakeholder.projects && stakeholder.projects.length > 0) {
      properties.Projects = {
        multi_select: stakeholder.projects.map(project => ({ name: project }))
      };
    }
    
    // Add last updated
    properties['Last Updated'] = {
      date: {
        start: new Date().toISOString().split('T')[0]
      }
    };
    
    return properties;
  }

  /**
   * Create content blocks for a stakeholder page
   * @private
   * @param {Object} stakeholder - Stakeholder data
   * @param {Object} reportData - Engagement report data
   * @returns {Array} - List of content blocks
   */
  _createStakeholderContentBlocks(stakeholder, reportData) {
    const blocks = require('./blocks');
    const contentBlocks = [];
    
    // Add header
    contentBlocks.push(blocks.createHeadingBlock('Stakeholder Profile'));
    
    // Add contact information
    if (stakeholder.contactInfo) {
      contentBlocks.push(blocks.createHeadingBlock('Contact Information', 2));
      
      let contactText = '';
      if (stakeholder.contactInfo.email) {
        contactText += `Email: ${stakeholder.contactInfo.email}\n`;
      }
      if (stakeholder.contactInfo.phone) {
        contactText += `Phone: ${stakeholder.contactInfo.phone}\n`;
      }
      
      contentBlocks.push(blocks.createTextBlock(contactText));
    }
    
    // Add projects section
    if (stakeholder.projects && stakeholder.projects.length > 0) {
      contentBlocks.push(blocks.createHeadingBlock('Projects', 2));
      for (const project of stakeholder.projects) {
        contentBlocks.push(blocks.createBulletedListItem(project));
      }
    }
    
    // Add divider
    contentBlocks.push(blocks.createDividerBlock());
    
    // Add engagement history
    contentBlocks.push(blocks.createHeadingBlock('Engagement History', 2));
    
    if (stakeholder.interactions && stakeholder.interactions.length > 0) {
      // Sort interactions by date (newest first)
      const sortedInteractions = [...stakeholder.interactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      for (const interaction of sortedInteractions) {
        const date = new Date(interaction.date).toLocaleDateString();
        const emoji = this._getSentimentEmoji(interaction.sentiment);
        
        contentBlocks.push(blocks.createCalloutBlock(
          `${date} - ${interaction.type}: ${interaction.summary}`,
          emoji
        ));
      }
    } else {
      contentBlocks.push(blocks.createTextBlock('No interaction history recorded.'));
    }
    
    // Add follow-up section
    contentBlocks.push(blocks.createHeadingBlock('Follow-up Status', 2));
    
    // Check if this stakeholder needs follow-up
    const followup = reportData?.followupNeeded?.find(f => f.stakeholder === stakeholder.name);
    
    if (followup) {
      contentBlocks.push(blocks.createCalloutBlock(
        `Follow-up needed: ${followup.reason}\nPriority: ${followup.priority}`,
        '⚠️'
      ));
    } else {
      contentBlocks.push(blocks.createCalloutBlock(
        'No immediate follow-up needed',
        '✅'
      ));
    }
    
    // Add notes section
    contentBlocks.push(blocks.createHeadingBlock('Notes', 2));
    contentBlocks.push(blocks.createTextBlock('Add your notes here...'));
    
    // Add last updated note
    contentBlocks.push(blocks.createDividerBlock());
    contentBlocks.push(blocks.createTextBlock(
      `Last updated: ${new Date().toLocaleString()}`
    ));
    
    return contentBlocks;
  }

  /**
   * Determine reason for follow-up
   * @private
   * @param {number} daysSinceLastContact - Days since last contact
   * @param {boolean} isContactDueSoon - Whether next contact is due soon
   * @returns {string} - Follow-up reason
   */
  _determineFollowUpReason(daysSinceLastContact, isContactDueSoon) {
    if (isContactDueSoon) {
      return 'Scheduled follow-up due';
    } else if (daysSinceLastContact > 30) {
      return 'Extended period without contact';
    } else if (daysSinceLastContact > 14) {
      return 'Regular check-in required';
    } else {
      return 'Proactive outreach';
    }
  }
}

module.exports = StakeholderMonitoring;