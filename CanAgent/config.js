// src/config.js
// Configuration settings for the Notion Agent System

require('dotenv').config();

module.exports = {
  // Notion API credentials
  notionApiKey: process.env.NOTION_API_KEY,
  
  // Database IDs
  databases: {
    todo: process.env.TODO_DATABASE_ID,
    agentTodo: process.env.AGENT_TODO_ID, // Dedicated agent tasks database
    conference: process.env.CONFERENCE_DATABASE_ID,
    grant: process.env.GRANT_DATABASE_ID,
    research: process.env.RESEARCH_DATABASE_ID,
    industry: process.env.INDUSTRY_DATABASE_ID,
    project: process.env.PROJECT_DATABASE_ID,
    stakeholder: process.env.STAKEHOLDER_DATABASE_ID
  },
  
  // Scheduling
  cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *', // Default: daily at 9 AM
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // API rate limiting
  rateLimits: {
    maxRequestsPerMinute: 3, // Notion API limit
    retryDelay: 2000, // ms
    maxRetries: 3
  }
};
