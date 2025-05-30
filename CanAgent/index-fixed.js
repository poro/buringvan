/**
 * Fixed index.js with correct imports
 * Main entry point for the Notion Agent System
 */

require('dotenv').config();
const cron = require('node-cron');
const NotionClient = require('./client');
const NotionHelper = require('./helper');
const { TaskParser, TaskScheduler } = require('./parser');
const ConferenceTracker = require('./conference');
const ResearchArticleParser = require('./research');
const ProjectTracker = require('./project');
const StakeholderMonitoring = require('./stakeholder');
const config = require('./config');

// Initialize Notion client and helper
const notionClient = new NotionClient();
const notionHelper = new NotionHelper(notionClient);

// Initialize task modules
const taskParser = new TaskParser(notionHelper);
const taskScheduler = new TaskScheduler(notionHelper, taskParser);
const conferenceTracker = new ConferenceTracker(notionHelper);
const researchParser = new ResearchArticleParser(notionHelper);
const projectTracker = new ProjectTracker(notionHelper);
const stakeholderMonitor = new StakeholderMonitoring(notionHelper);

/**
 * Main function to run the agent
 */
async function runAgent() {
  console.log('Starting Notion Agent run...');
  
  try {
    // Test Notion API connection
    const connected = await notionClient.testConnection();
    if (!connected) {
      console.error('Failed to connect to Notion API. Check your API key.');
      return;
    }
    
    console.log('Successfully connected to Notion API');
    
    // Get tasks from todo database
    const todoDbId = config.databases.todo;
    if (!todoDbId) {
      console.error('Todo database ID not configured');
      return;
    }
    
    console.log('Fetching tasks from todo database...');
    const tasks = await taskScheduler.getTasksFromDatabase(todoDbId);
    console.log(`Found ${tasks.length} tasks`);
    
    // Get tasks due for execution
    const dueTasks = taskScheduler.getDueTasks(tasks);
    console.log(`${dueTasks.length} tasks due for execution`);
    
    // Execute each due task
    for (const task of dueTasks) {
      console.log(`Processing task: ${task.name} (${task.type})`);
      
      try {
        // Update task status to In Progress
        await taskScheduler.updateTaskStatus(task.id, 'In Progress');
        
        // Execute task based on type
        let result = null;
        let resultPageId = null;
        
        if (task.type === 'conference') {
          result = await executeConferenceTask(task);
          resultPageId = result.pageId;
        } else if (task.type === 'research') {
          result = await executeResearchTask(task);
          resultPageId = result.pageId;
        } else if (task.type === 'project') {
          result = await executeProjectTask(task);
          resultPageId = result.pageId;
        } else if (task.type === 'stakeholder') {
          result = await executeStakeholderTask(task);
          resultPageId = result.pageId;
        } else {
          console.log(`Unknown task type: ${task.type}`);
        }
        
        // Update task status to Complete
        if (result && !result.error) {
          await taskScheduler.updateTaskStatus(task.id, 'Complete', resultPageId);
          console.log(`Task completed successfully: ${task.name}`);
        } else {
          await taskScheduler.updateTaskStatus(task.id, 'Error');
          console.error(`Task failed: ${task.name}`, result?.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error executing task ${task.name}: ${error.message}`);
        await taskScheduler.updateTaskStatus(task.id, 'Error');
      }
    }
    
    console.log('Agent run completed');
  } catch (error) {
    console.error('Error running agent:', error);
  }
}

/**
 * Execute a conference tracking task
 * @param {Object} task - Task object
 * @returns {Promise<Object>} - Result of task execution
 */
async function executeConferenceTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'upcoming';
    
    console.log(`Searching for conferences on topics: ${topics.join(', ')}`);
    const conferences = await conferenceTracker.searchConferences(topics, timeframe);
    console.log(`Found ${conferences.length} conferences`);
    
    if (conferences.length === 0) {
      return { message: 'No conferences found', pageId: null };
    }
    
    // Update conference database
    const conferenceDbId = config.databases.conference;
    if (!conferenceDbId) {
      return { error: 'Conference database ID not configured' };
    }
    
    const updatedIds = await conferenceTracker.updateConferenceDatabase(conferenceDbId, conferences);
    console.log(`Updated ${updatedIds.length} conference entries`);
    
    return { message: `Updated ${updatedIds.length} conference entries`, pageId: conferenceDbId };
  } catch (error) {
    console.error(`Error executing conference task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a research article parsing task
 * @param {Object} task - Task object
 * @returns {Promise<Object>} - Result of task execution
 */
async function executeResearchTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'recent';
    
    console.log(`Searching for research articles on topics: ${topics.join(', ')}`);
    const articles = await researchParser.searchResearchArticles(topics, timeframe);
    console.log(`Found ${articles.length} articles`);
    
    if (articles.length === 0) {
      return { message: 'No articles found', pageId: null };
    }
    
    // Update research database
    const researchDbId = config.databases.research;
    if (!researchDbId) {
      return { error: 'Research database ID not configured' };
    }
    
    const updatedIds = await researchParser.updateArticleDatabase(researchDbId, articles);
    console.log(`Updated ${updatedIds.length} article entries`);
    
    return { message: `Updated ${updatedIds.length} article entries`, pageId: researchDbId };
  } catch (error) {
    console.error(`Error executing research task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a project tracking task
 * @param {Object} task - Task object
 * @returns {Promise<Object>} - Result of task execution
 */
async function executeProjectTask(task) {
  try {
    const projectId = task.parameters.projectId || task.name;
    
    console.log(`Updating project status for: ${projectId}`);
    const projectData = await projectTracker.updateProjectStatus(projectId, task.parameters);
    
    // Check milestones
    const milestoneData = await projectTracker.checkMilestones(projectId, projectData);
    
    // Generate report
    const reportData = await projectTracker.generateProjectReport(projectId, projectData, milestoneData);
    
    // Update project database
    const projectDbId = config.databases.project;
    if (!projectDbId) {
      return { error: 'Project database ID not configured' };
    }
    
    const pageId = await projectTracker.updateProjectDatabase(projectDbId, reportData);
    console.log(`Updated project: ${projectId}`);
    
    return { message: `Updated project: ${projectId}`, pageId };
  } catch (error) {
    console.error(`Error executing project task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a stakeholder monitoring task
 * @param {Object} task - Task object
 * @returns {Promise<Object>} - Result of task execution
 */
async function executeStakeholderTask(task) {
  try {
    const stakeholderId = task.parameters.stakeholderId || task.name;
    
    console.log(`Tracking stakeholder engagement for: ${stakeholderId}`);
    const stakeholderData = await stakeholderMonitor.trackStakeholderEngagement(stakeholderId, task.parameters);
    
    // For demonstration, we'll create an array with just this stakeholder
    const stakeholders = [stakeholderData];
    
    // Identify follow-up needs
    const followupNeeded = await stakeholderMonitor.identifyFollowupNeeded(stakeholders);
    
    // Generate report
    const reportData = await stakeholderMonitor.generateEngagementReport(stakeholders, followupNeeded);
    
    // Update stakeholder database
    const stakeholderDbId = config.databases.stakeholder;
    if (!stakeholderDbId) {
      return { error: 'Stakeholder database ID not configured' };
    }
    
    const updatedIds = await stakeholderMonitor.updateStakeholderDatabase(stakeholderDbId, stakeholders, reportData);
    console.log(`Updated stakeholder: ${stakeholderId}`);
    
    return { message: `Updated stakeholder: ${stakeholderId}`, pageId: updatedIds[0] };
  } catch (error) {
    console.error(`Error executing stakeholder task: ${error.message}`);
    return { error: error.message };
  }
}

// Schedule agent to run based on cron schedule
if (config.cronSchedule) {
  console.log(`Scheduling agent to run with cron: ${config.cronSchedule}`);
  cron.schedule(config.cronSchedule, runAgent);
}

// Export for use in API routes
module.exports = { runAgent };

// Run agent directly if this file is executed directly
if (require.main === module) {
  runAgent().catch(console.error);
}