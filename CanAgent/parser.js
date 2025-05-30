/**
 * src/tasks/parser.js
 * Task parser and scheduler for Notion todo items
 */

const NotionHelper = require('./helper');

class TaskParser {
  /**
   * Initialize the task parser
   * @param {NotionHelper} notionHelper - NotionHelper instance for Notion interactions
   */
  constructor(notionHelper) {
    this.notionHelper = notionHelper;
    this.taskTypes = {
      conference: ['conference', 'conf', 'event', 'workshop', 'symposium'],
      research: ['research', 'article', 'paper', 'publication', 'study'],
      project: ['project', 'milestone', 'development', 'progress'],
      stakeholder: ['stakeholder', 'contact', 'follow-up', 'meeting', 'client']
    };
  }

  /**
   * Parse a todo item and identify its type and parameters
   * @param {Object} item - Todo item from Notion
   * @returns {Object} - Dictionary with task type and parameters
   */
  parseTodoItem(item) {
    // Extract basic properties - matching your database structure
    const taskName = this.notionHelper.getPropertyValue(item, 'Task name', 'title');
    const taskStatus = this.notionHelper.getPropertyValue(item, 'Status', 'status');
    const taskSummary = this.notionHelper.getPropertyValue(item, 'Summary', 'rich_text');
    const taskDue = this.notionHelper.getPropertyValue(item, 'Due', 'date');
    const taskPriority = this.notionHelper.getPropertyValue(item, 'Priority', 'select');
    const taskAssignee = this.notionHelper.getPropertyValue(item, 'Assignee', 'people');
    
    // Infer task type from task name since Type field doesn't exist
    const taskType = this._inferTaskType(taskName);
    
    // Parse parameters from summary field since Parameters field doesn't exist
    const parameters = this._parseParameters(taskSummary, taskName, taskType);
    
    // Create task object
    const task = {
      id: item.id,
      name: taskName,
      type: taskType,
      parameters: parameters,
      status: taskStatus || 'Not Started',
      lastRun: null, // No Last Run field in your database
      nextRun: taskDue, // Use Due date as next run
      frequency: 'Once', // Default since no Frequency field
      resultPage: null, // No Result Page field
      priority: taskPriority,
      assignee: taskAssignee
    };
    
    return task;
  }

  /**
   * Infer task type from task name
   * @private
   * @param {string} taskName - Name of the task
   * @returns {string} - Inferred task type
   */
  _inferTaskType(taskName) {
    if (!taskName) {
      return 'unknown';
    }
    
    const taskNameLower = taskName.toLowerCase();
    
    for (const [taskType, keywords] of Object.entries(this.taskTypes)) {
      for (const keyword of keywords) {
        if (taskNameLower.includes(keyword)) {
          return taskType;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * Parse parameters from string or infer from task name
   * @private
   * @param {string} paramsStr - Parameters string (JSON or text)
   * @param {string} taskName - Name of the task
   * @param {string} taskType - Type of the task
   * @returns {Object} - Parameters dictionary
   */
  _parseParameters(paramsStr, taskName, taskType) {
    // Try to parse as JSON
    if (paramsStr) {
      try {
        return JSON.parse(paramsStr);
      } catch (error) {
        // Not valid JSON, treat as text
      }
    }
    
    // Infer parameters from task name and type
    const parameters = {};
    
    if (taskType === 'conference') {
      // Extract topics from task name
      const topics = this._extractTopics(taskName);
      parameters.topics = topics;
      parameters.timeframe = 'upcoming';
    } else if (taskType === 'research') {
      // Extract topics from task name
      const topics = this._extractTopics(taskName);
      parameters.topics = topics;
      parameters.timeframe = 'recent';
    } else if (taskType === 'project') {
      // Extract project name from task name
      const projectName = taskName
        .replace('Track', '')
        .replace('Monitor', '')
        .trim();
      parameters.projectName = projectName;
    } else if (taskType === 'stakeholder') {
      // Extract stakeholder info from task name
      const stakeholderName = taskName
        .replace('Contact', '')
        .replace('Follow up with', '')
        .trim();
      parameters.stakeholderName = stakeholderName;
    }
    
    return parameters;
  }

  /**
   * Extract topics from text
   * @private
   * @param {string} text - Text to extract topics from
   * @returns {Array<string>} - List of topics
   */
  _extractTopics(text) {
    // Remove common words
    const commonWords = [
      'track', 'monitor', 'update', 'find', 'search', 'get', 'list',
      'of', 'on', 'for', 'about', 'the', 'and', 'in'
    ];
    
    // Split text into words
    const words = text.split(' ');
    
    // Remove common words and create topics
    const topics = [];
    let currentTopic = [];
    
    for (const word of words) {
      const wordLower = word.toLowerCase().replace(/[,.;:()\[\]{}'"]/g, '');
      
      if (!commonWords.includes(wordLower) && wordLower) {
        currentTopic.push(word);
      } else if (currentTopic.length > 0) {
        topics.push(currentTopic.join(' '));
        currentTopic = [];
      }
    }
    
    // Add last topic if exists
    if (currentTopic.length > 0) {
      topics.push(currentTopic.join(' '));
    }
    
    // If no topics found, use default
    if (topics.length === 0) {
      if (text.includes('AI') || text.toLowerCase().includes('ai')) {
        topics.push('AI');
      }
      if (text.toLowerCase().includes('game')) {
        topics.push('Game');
      }
    }
    
    return topics;
  }
}

class TaskScheduler {
  /**
   * Initialize the task scheduler
   * @param {NotionHelper} notionHelper - NotionHelper instance for Notion interactions
   * @param {TaskParser} taskParser - TaskParser instance for parsing tasks
   */
  constructor(notionHelper, taskParser) {
    this.notionHelper = notionHelper;
    this.taskParser = taskParser;
  }

  /**
   * Get all tasks from a Notion database
   * @param {string} databaseId - Notion database ID
   * @returns {Promise<Array>} - List of parsed tasks
   */
  async getTasksFromDatabase(databaseId) {
    // Get all items from database
    const items = await this.notionHelper.getAllDatabaseItems(databaseId);
    
    // Parse each item
    const tasks = [];
    for (const item of items) {
      const task = this.taskParser.parseTodoItem(item);
      tasks.push(task);
    }
    
    return tasks;
  }

  /**
   * Get tasks that are due for execution
   * @param {Array} tasks - List of tasks
   * @returns {Array} - List of due tasks
   */
  getDueTasks(tasks) {
    const dueTasks = [];
    const now = new Date();
    
    for (const task of tasks) {
      // Skip completed tasks
      if (task.status === 'Done' || task.status === 'Archived') {
        continue;
      }
      
      // Check if task is due
      const nextRun = task.nextRun;
      if (!nextRun) {
        // Task has never been run
        dueTasks.push(task);
        continue;
      }
      
      // Parse next run date
      try {
        const nextRunDate = new Date(nextRun);
        if (nextRunDate <= now) {
          dueTasks.push(task);
        }
      } catch (error) {
        // Invalid date format, consider due
        dueTasks.push(task);
      }
    }
    
    return dueTasks;
  }

  /**
   * Update task status and schedule next run
   * @param {string} taskId - Notion page ID of the task
   * @param {string} status - New status (In Progress, Complete, Error)
   * @param {string} [resultPageId] - ID of the result page
   * @param {string} [details] - Detailed results to add to summary
   * @returns {Promise<Object>} - Result of update operation
   */
  async updateTaskStatus(taskId, status, resultPageId, details) {
    // Get task details
    const taskPage = await this.notionHelper.client.readPage(taskId);
    const task = this.taskParser.parseTodoItem(taskPage);
    
    const now = new Date();
    let nextRun = null;
    
    if (status !== 'Complete' || task.frequency !== 'Once') {
      const frequency = task.frequency || 'Once';
      
      if (frequency === 'Daily') {
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (frequency === 'Weekly') {
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (frequency === 'Monthly') {
        nextRun = new Date(now);
        nextRun.setMonth(nextRun.getMonth() + 1);
      } else if (frequency === 'Quarterly') {
        nextRun = new Date(now);
        nextRun.setMonth(nextRun.getMonth() + 3);
      } else if (frequency === 'Yearly') {
        nextRun = new Date(now);
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      }
    }
    
    // Create properties to update - matching your database structure
    console.log(`Updating task status to: ${status}`);
    
    // Map our status values to the database's status options
    const statusMap = {
      'Not Started': 'Not started',
      'In Progress': 'In progress',
      'Complete': 'Done',
      'Error': 'Done'  // Map Error to Done since there's no Error status
    };
    
    const mappedStatus = statusMap[status] || status;
    
    const properties = {
      Status: {
        status: {
          name: mappedStatus
        }
      }
    };
    
    // Update Due date if there's a next run (for recurring tasks)
    if (nextRun) {
      properties['Due'] = {
        date: {
          start: nextRun.toISOString().split('T')[0]
        }
      };
    }
    
    // Update Summary to include completion information and detailed results
    if (status === 'Complete' || status === 'Error') {
      const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
      let summaryText = status === 'Complete' ? 
        `✅ Completed on ${timestamp}` : 
        `❌ Failed on ${timestamp}`;
      
      if (details) {
        summaryText += `\n\n📋 Results:\n${details}`;
      }
      
      if (resultPageId) {
        summaryText += `\n\n🔗 View detailed results: https://notion.so/${resultPageId.replace(/-/g, '')}`;
      }
      
      const existingSummary = this.notionHelper.getPropertyValue(taskPage, 'Summary', 'rich_text') || '';
      properties['Summary'] = {
        rich_text: [
          {
            text: {
              content: existingSummary ? `${existingSummary}\n\n${summaryText}` : summaryText
            }
          }
        ]
      };
    }
    
    // Update the task
    return this.notionHelper.client.updatePage(taskId, properties);
  }
}

module.exports = {
  TaskParser,
  TaskScheduler
};
