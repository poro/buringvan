/**
 * src/tasks/project.js
 * Project tracking module for monitoring project milestones and progress
 */

class ProjectTracker {
  /**
   * Initialize the project tracker
   * @param {Object} notionHelper - NotionHelper instance for Notion interactions
   */
  constructor(notionHelper) {
    this.notionHelper = notionHelper;
  }

  /**
   * Update project status information
   * @param {string} projectId - Project identifier or name
   * @param {Object} parameters - Additional parameters for tracking
   * @returns {Promise<Object>} - Updated project information
   */
  async updateProjectStatus(projectId, parameters = {}) {
    try {
      // This is a placeholder implementation
      // In a real implementation, this would interact with project management tools
      // or fetch data from other sources
      
      const projectName = parameters.projectName || projectId;
      
      // Mock project data for demonstration
      const projectData = {
        name: projectName,
        status: 'In Progress',
        lastUpdated: new Date().toISOString(),
        milestones: [
          {
            name: 'Planning',
            status: 'Complete',
            dueDate: this._getRelativeDate(-30) // 30 days ago
          },
          {
            name: 'Development',
            status: 'In Progress',
            dueDate: this._getRelativeDate(15) // 15 days from now
          },
          {
            name: 'Testing',
            status: 'Not Started',
            dueDate: this._getRelativeDate(30) // 30 days from now
          },
          {
            name: 'Deployment',
            status: 'Not Started',
            dueDate: this._getRelativeDate(45) // 45 days from now
          }
        ],
        team: [
          { name: 'John Doe', role: 'Project Manager' },
          { name: 'Jane Smith', role: 'Lead Developer' },
          { name: 'Bob Johnson', role: 'QA Engineer' }
        ],
        blockers: [
          { description: 'Waiting for API access from third-party vendor', severity: 'Medium' }
        ]
      };
      
      return projectData;
    } catch (error) {
      console.error(`Error updating project status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check project milestones and their completion status
   * @param {string} projectId - Project identifier or name
   * @param {Object} projectData - Project data from updateProjectStatus
   * @returns {Promise<Array>} - List of milestone status information
   */
  async checkMilestones(projectId, projectData) {
    try {
      // Extract milestones from project data
      const milestones = projectData.milestones || [];
      
      // Calculate progress percentage
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter(m => m.status === 'Complete').length;
      const progressPercentage = totalMilestones > 0 
        ? Math.round((completedMilestones / totalMilestones) * 100) 
        : 0;
      
      // Check for overdue milestones
      const now = new Date();
      const overdueMilestones = milestones.filter(m => {
        const dueDate = new Date(m.dueDate);
        return m.status !== 'Complete' && dueDate < now;
      });
      
      // Check for upcoming milestones (due in the next 7 days)
      const upcomingMilestones = milestones.filter(m => {
        const dueDate = new Date(m.dueDate);
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        return m.status !== 'Complete' && dueDate >= now && dueDate <= sevenDaysFromNow;
      });
      
      return {
        totalMilestones,
        completedMilestones,
        progressPercentage,
        overdueMilestones,
        upcomingMilestones
      };
    } catch (error) {
      console.error(`Error checking milestones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a project status report
   * @param {string} projectId - Project identifier or name
   * @param {Object} projectData - Project data from updateProjectStatus
   * @param {Object} milestoneData - Milestone data from checkMilestones
   * @returns {Promise<Object>} - Project report data
   */
  async generateProjectReport(projectId, projectData, milestoneData) {
    try {
      // Create report data
      const reportData = {
        projectName: projectData.name,
        status: projectData.status,
        lastUpdated: projectData.lastUpdated,
        progress: `${milestoneData.progressPercentage}%`,
        summary: this._generateSummary(projectData, milestoneData),
        milestones: projectData.milestones,
        team: projectData.team,
        blockers: projectData.blockers,
        recommendations: this._generateRecommendations(projectData, milestoneData)
      };
      
      return reportData;
    } catch (error) {
      console.error(`Error generating project report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update project database in Notion
   * @param {string} databaseId - Notion database ID
   * @param {Object} reportData - Project report data
   * @returns {Promise<string>} - ID of created/updated page
   */
  async updateProjectDatabase(databaseId, reportData) {
    try {
      // Get existing projects from database
      const existingProjects = await this.notionHelper.getAllDatabaseItems(databaseId);
      const existingMap = {};
      
      // Create a map of existing projects by name
      for (const project of existingProjects) {
        const name = this.notionHelper.getPropertyValue(project, 'Name', 'title');
        if (name) {
          existingMap[name] = project;
        }
      }
      
      let pageId;
      
      // Check if project already exists
      if (reportData.projectName in existingMap) {
        // Update existing project
        pageId = existingMap[reportData.projectName].id;
        await this._updateProjectPage(pageId, reportData);
      } else {
        // Create new project
        const result = await this._createProjectPage(databaseId, reportData);
        if (!result.error && result.id) {
          pageId = result.id;
        }
      }
      
      return pageId;
    } catch (error) {
      console.error(`Error updating project database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new project page in Notion
   * @private
   * @param {string} databaseId - Notion database ID
   * @param {Object} reportData - Project report data
   * @returns {Promise<Object>} - Result of page creation
   */
  async _createProjectPage(databaseId, reportData) {
    // Create properties
    const properties = this._createProjectProperties(reportData);
    
    // Create content blocks
    const blocks = this._createProjectContentBlocks(reportData);
    
    // Create the page
    return this.notionHelper.client.createPage(databaseId, true, properties, blocks);
  }

  /**
   * Update an existing project page in Notion
   * @private
   * @param {string} pageId - Notion page ID
   * @param {Object} reportData - Project report data
   * @returns {Promise<Object>} - Result of page update
   */
  async _updateProjectPage(pageId, reportData) {
    try {
      // Create properties
      const properties = this._createProjectProperties(reportData);
      
      // Update the page properties
      const result = await this.notionHelper.client.updatePage(pageId, properties);
      
      // Update content blocks
      if (!result.error) {
        const blocks = this._createProjectContentBlocks(reportData);
        
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
      console.error(`Error updating project page: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Create Notion properties for a project
   * @private
   * @param {Object} reportData - Project report data
   * @returns {Object} - Notion properties dictionary
   */
  _createProjectProperties(reportData) {
    const properties = {
      Name: {
        title: [
          {
            text: {
              content: reportData.projectName || ''
            }
          }
        ]
      }
    };
    
    // Add status
    if (reportData.status) {
      properties.Status = {
        select: {
          name: reportData.status
        }
      };
    }
    
    // Add progress
    if (reportData.progress) {
      properties.Progress = {
        rich_text: [
          {
            text: {
              content: reportData.progress
            }
          }
        ]
      };
    }
    
    // Add last updated
    if (reportData.lastUpdated) {
      properties['Last Updated'] = {
        date: {
          start: new Date(reportData.lastUpdated).toISOString().split('T')[0]
        }
      };
    }
    
    // Add blockers count
    if (reportData.blockers) {
      properties['Blockers'] = {
        number: reportData.blockers.length
      };
    }
    
    return properties;
  }

  /**
   * Create content blocks for a project page
   * @private
   * @param {Object} reportData - Project report data
   * @returns {Array} - List of content blocks
   */
  _createProjectContentBlocks(reportData) {
    const blocks = require('./blocks');
    const contentBlocks = [];
    
    // Add header
    contentBlocks.push(blocks.createHeadingBlock('Project Status Report'));
    
    // Add summary
    contentBlocks.push(blocks.createCalloutBlock(
      reportData.summary,
      this._getStatusEmoji(reportData.status)
    ));
    
    // Add divider
    contentBlocks.push(blocks.createDividerBlock());
    
    // Add milestones section
    contentBlocks.push(blocks.createHeadingBlock('Milestones', 2));
    
    if (reportData.milestones && reportData.milestones.length > 0) {
      for (const milestone of reportData.milestones) {
        const emoji = this._getStatusEmoji(milestone.status);
        const dueDate = new Date(milestone.dueDate).toLocaleDateString();
        contentBlocks.push(blocks.createCalloutBlock(
          `${milestone.name} - Due: ${dueDate}`,
          emoji
        ));
      }
    } else {
      contentBlocks.push(blocks.createTextBlock('No milestones defined.'));
    }
    
    // Add team section
    contentBlocks.push(blocks.createHeadingBlock('Team', 2));
    
    if (reportData.team && reportData.team.length > 0) {
      for (const member of reportData.team) {
        contentBlocks.push(blocks.createBulletedListItem(`${member.name} - ${member.role}`));
      }
    } else {
      contentBlocks.push(blocks.createTextBlock('No team members assigned.'));
    }
    
    // Add blockers section
    contentBlocks.push(blocks.createHeadingBlock('Blockers', 2));
    
    if (reportData.blockers && reportData.blockers.length > 0) {
      for (const blocker of reportData.blockers) {
        contentBlocks.push(blocks.createBulletedListItem(
          `${blocker.description} (Severity: ${blocker.severity})`
        ));
      }
    } else {
      contentBlocks.push(blocks.createTextBlock('No blockers identified.'));
    }
    
    // Add recommendations section
    contentBlocks.push(blocks.createHeadingBlock('Recommendations', 2));
    
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      for (const recommendation of reportData.recommendations) {
        contentBlocks.push(blocks.createBulletedListItem(recommendation));
      }
    } else {
      contentBlocks.push(blocks.createTextBlock('No recommendations at this time.'));
    }
    
    // Add last updated note
    contentBlocks.push(blocks.createDividerBlock());
    contentBlocks.push(blocks.createTextBlock(
      `Last updated: ${new Date(reportData.lastUpdated).toLocaleString()}`
    ));
    
    return contentBlocks;
  }

  /**
   * Generate a summary of the project status
   * @private
   * @param {Object} projectData - Project data
   * @param {Object} milestoneData - Milestone data
   * @returns {string} - Summary text
   */
  _generateSummary(projectData, milestoneData) {
    let summary = `Project ${projectData.name} is currently ${projectData.status.toLowerCase()}. `;
    
    summary += `Overall progress is at ${milestoneData.progressPercentage}% with `;
    summary += `${milestoneData.completedMilestones} of ${milestoneData.totalMilestones} milestones completed. `;
    
    if (milestoneData.overdueMilestones.length > 0) {
      summary += `There ${milestoneData.overdueMilestones.length === 1 ? 'is' : 'are'} `;
      summary += `${milestoneData.overdueMilestones.length} overdue milestone${milestoneData.overdueMilestones.length === 1 ? '' : 's'}. `;
    }
    
    if (milestoneData.upcomingMilestones.length > 0) {
      summary += `${milestoneData.upcomingMilestones.length} milestone${milestoneData.upcomingMilestones.length === 1 ? '' : 's'} `;
      summary += `due in the next 7 days. `;
    }
    
    if (projectData.blockers && projectData.blockers.length > 0) {
      summary += `${projectData.blockers.length} blocker${projectData.blockers.length === 1 ? '' : 's'} identified.`;
    }
    
    return summary;
  }

  /**
   * Generate recommendations based on project status
   * @private
   * @param {Object} projectData - Project data
   * @param {Object} milestoneData - Milestone data
   * @returns {Array<string>} - List of recommendations
   */
  _generateRecommendations(projectData, milestoneData) {
    const recommendations = [];
    
    // Check for overdue milestones
    if (milestoneData.overdueMilestones.length > 0) {
      recommendations.push('Address overdue milestones and update timeline if necessary.');
    }
    
    // Check for upcoming milestones
    if (milestoneData.upcomingMilestones.length > 0) {
      recommendations.push('Prepare for upcoming milestones due in the next 7 days.');
    }
    
    // Check for blockers
    if (projectData.blockers && projectData.blockers.length > 0) {
      recommendations.push('Resolve identified blockers to prevent further delays.');
    }
    
    // Check progress
    if (milestoneData.progressPercentage < 25) {
      recommendations.push('Project is in early stages. Focus on establishing clear goals and timelines.');
    } else if (milestoneData.progressPercentage >= 25 && milestoneData.progressPercentage < 50) {
      recommendations.push('Project is gaining momentum. Ensure all team members are aligned on objectives.');
    } else if (milestoneData.progressPercentage >= 50 && milestoneData.progressPercentage < 75) {
      recommendations.push('Project is at midpoint. Review progress and adjust strategy if needed.');
    } else {
      recommendations.push('Project is nearing completion. Begin preparing for handoff and documentation.');
    }
    
    return recommendations;
  }

  /**
   * Get emoji for status
   * @private
   * @param {string} status - Status text
   * @returns {string} - Emoji representing the status
   */
  _getStatusEmoji(status) {
    if (!status) return '❓';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('complete')) return '✅';
    if (statusLower.includes('progress')) return '🔄';
    if (statusLower.includes('not started')) return '⏳';
    if (statusLower.includes('blocked')) return '🚫';
    if (statusLower.includes('risk')) return '⚠️';
    
    return '📋';
  }

  /**
   * Get a date relative to today
   * @private
   * @param {number} days - Number of days (negative for past, positive for future)
   * @returns {string} - ISO date string
   */
  _getRelativeDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

module.exports = ProjectTracker;