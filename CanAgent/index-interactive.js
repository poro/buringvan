/**
 * Interactive version of the Notion Agent System
 * Asks which agents to run at startup
 */

require('dotenv').config();
const readline = require('readline');
const NotionClient = require('./client');
const NotionHelper = require('./helper');
const { TaskParser, TaskScheduler } = require('./parser');
const ConferenceTracker = require('./conference');
const GrantTracker = require('./grants');
const ResearchMonitor = require('./research-monitor');
const IndustryIntelligence = require('./industry-intelligence');
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
const grantTracker = new GrantTracker(notionHelper);
const researchMonitor = new ResearchMonitor(notionHelper);
const industryIntelligence = new IndustryIntelligence(notionHelper);
const researchParser = new ResearchArticleParser(notionHelper);
const projectTracker = new ProjectTracker(notionHelper);
const stakeholderMonitor = new StakeholderMonitoring(notionHelper);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask user which agents to run
 */
async function selectAgentsToRun() {
  console.log('\n🤖 CanAgent - Notion Automation System');
  console.log('=====================================');
  console.log('Select which agents to run:');
  console.log('1. Conference Discovery (searches for new conferences)');
  console.log('2. Grant Opportunity Tracker (finds funding opportunities)');
  console.log('3. Research Paper Monitor (tracks academic papers)');
  console.log('4. Industry Intelligence (monitors EdTech & gaming trends)');
  console.log('5. Research Article Parser (finds research articles)');
  console.log('6. Project Tracker (updates project status)');
  console.log('7. Stakeholder Monitor (tracks engagement)');
  console.log('8. All agents');
  console.log('9. Exit');

  return new Promise((resolve) => {
    rl.question('\nEnter your choice (1-9): ', (answer) => {
      const choice = parseInt(answer);
      let selectedAgents = [];

      switch (choice) {
        case 1:
          selectedAgents = ['conference'];
          break;
        case 2:
          selectedAgents = ['grant'];
          break;
        case 3:
          selectedAgents = ['research-monitor'];
          break;
        case 4:
          selectedAgents = ['industry'];
          break;
        case 5:
          selectedAgents = ['research'];
          break;
        case 6:
          selectedAgents = ['project'];
          break;
        case 7:
          selectedAgents = ['stakeholder'];
          break;
        case 8:
          selectedAgents = ['conference', 'grant', 'research-monitor', 'industry', 'research', 'project', 'stakeholder'];
          break;
        case 9:
          console.log('Goodbye! 👋');
          process.exit(0);
        default:
          console.log('Invalid choice. Please try again.');
          return selectAgentsToRun().then(resolve);
      }

      resolve(selectedAgents);
    });
  });
}

/**
 * Run selected agents
 */
async function runSelectedAgents(selectedAgents) {
  console.log(`\n🚀 Running agents: ${selectedAgents.join(', ')}`);
  console.log('==================================================');
  
  try {
    // Test Notion API connection
    const connected = await notionClient.testConnection();
    if (!connected) {
      console.error('Failed to connect to Notion API. Check your API key.');
      return;
    }
    
    console.log('✅ Successfully connected to Notion API');
    
    // Get tasks from agent todo database (or fall back to main todo database)
    const agentTodoDbId = config.databases.agentTodo;
    const todoDbId = agentTodoDbId || config.databases.todo;
    
    if (!todoDbId) {
      console.error('❌ Agent TODO database ID not configured');
      return;
    }
    
    const databaseType = agentTodoDbId ? 'agent TODO' : 'main TODO';
    console.log(`📋 Fetching tasks from ${databaseType} database...`);
    const tasks = await taskScheduler.getTasksFromDatabase(todoDbId);
    console.log(`📊 Found ${tasks.length} tasks`);
    
    // Filter tasks to only include selected agent types
    const filteredTasks = tasks.filter(task => selectedAgents.includes(task.type));
    
    // Get tasks due for execution
    const dueTasks = taskScheduler.getDueTasks(filteredTasks);
    console.log(`⏰ ${dueTasks.length} tasks due for execution (filtered by selected agents)`);
    
    // If no tasks but agents are selected, run proactive searches
    if (dueTasks.length === 0) {
      if (selectedAgents.includes('conference')) {
        console.log('🔍 No conference tasks found, running proactive conference discovery...');
        await runProactiveConferenceSearch();
      }
      if (selectedAgents.includes('grant')) {
        console.log('🔍 No grant tasks found, running proactive grant discovery...');
        await runProactiveGrantSearch();
      }
      if (selectedAgents.includes('research-monitor')) {
        console.log('🔍 No research tasks found, running proactive research monitoring...');
        await runProactiveResearchMonitor();
      }
      if (selectedAgents.includes('industry')) {
        console.log('🔍 No industry tasks found, running proactive industry intelligence...');
        await runProactiveIndustryIntelligence();
      }
      if (!selectedAgents.some(agent => ['conference', 'grant', 'research-monitor', 'industry'].includes(agent))) {
        console.log('🎉 No tasks due for execution. Everything is up to date!');
      }
      return;
    }

    // Execute each due task
    for (const task of dueTasks) {
      console.log(`\n🔄 Processing task: ${task.name} (${task.type})`);
      
      try {
        // Update task status to In Progress
        console.log('   Updating task status to: In Progress');
        await taskScheduler.updateTaskStatus(task.id, 'In Progress');
        
        // Execute task based on type
        let result = null;
        let resultPageId = null;
        
        if (task.type === 'conference') {
          result = await executeConferenceTask(task);
          resultPageId = result.pageId;
        } else if (task.type === 'grant') {
          result = await executeGrantTask(task);
          resultPageId = result.pageId;
        } else if (task.type === 'research-monitor') {
          result = await executeResearchMonitorTask(task);
          resultPageId = result.pageId;
        } else if (task.type === 'industry') {
          result = await executeIndustryTask(task);
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
        }
        
        // Update task status to Complete
        if (result && !result.error) {
          console.log('   Updating task status to: Complete');
          await taskScheduler.updateTaskStatus(task.id, 'Complete', resultPageId, result.details);
          console.log(`✅ Task completed successfully: ${task.name}`);
        } else {
          console.log('   Updating task status to: Error');
          await taskScheduler.updateTaskStatus(task.id, 'Error', null, result?.error || 'Unknown error');
          console.error(`❌ Task failed: ${task.name}`, result?.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`❌ Error executing task ${task.name}: ${error.message}`);
        await taskScheduler.updateTaskStatus(task.id, 'Error');
      }
    }
    
    console.log('\n🎉 Agent run completed successfully!');
  } catch (error) {
    console.error('❌ Error running agents:', error);
  }
}

/**
 * Run proactive conference search when no tasks are found
 */
async function runProactiveConferenceSearch() {
  try {
    console.log('🎯 Starting proactive conference discovery...');
    
    // Define default search topics based on common interests
    const defaultTopics = [
      'AI', 'Machine Learning', 'Technology', 'Games', 'Education', 
      'Hackathon', 'Innovation', 'Startup', 'Research'
    ];
    
    console.log(`🔍 Searching for conferences on topics: ${defaultTopics.join(', ')}`);
    const conferences = await conferenceTracker.searchConferences(defaultTopics, 'upcoming');
    console.log(`📊 Found ${conferences.length} real conferences`);
    
    if (conferences.length === 0) {
      console.log('ℹ️  No real conferences found from external sources');
      console.log('💡 External conference APIs (WikiCFP, AI Deadlines) may be down');
      console.log('🔧 Consider checking these sources manually:');
      console.log('   - https://wikicfp.com');
      console.log('   - https://aideadlin.es');
      console.log('   - https://conferencealerts.com');
      console.log('   - https://eventbrite.com');
    }
    
    // Update conference database
    const conferenceDbId = config.databases.conference;
    if (!conferenceDbId) {
      console.error('❌ Conference database ID not configured');
      return;
    }
    
    console.log('💾 Adding conferences to your database...');
    const updatedIds = await conferenceTracker.updateConferenceDatabase(conferenceDbId, conferences);
    console.log(`✅ Successfully added ${updatedIds.length} conferences to your database!`);
    console.log(`📍 View them at: https://notion.so/${conferenceDbId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error during proactive conference search:', error.message);
  }
}

/**
 * Run proactive grant search when no tasks are found
 */
async function runProactiveGrantSearch() {
  try {
    console.log('🎯 Starting proactive grant discovery...');
    
    // Define search topics for games and learning research lab
    const researchTopics = [
      'AI', 'Games', 'Learning', 'Education', 'Technology', 
      'Research', 'Innovation'
    ];
    
    console.log(`🔍 Searching for grant opportunities on topics: ${researchTopics.join(', ')}`);
    const grants = await grantTracker.searchGrants(researchTopics, 'upcoming');
    console.log(`📊 Found ${grants.length} grant opportunities`);
    
    if (grants.length === 0) {
      console.log('ℹ️  No grant opportunities found - external sources may be temporarily unavailable');
      console.log('💡 Try checking funding agency websites manually');
    }
    
    // Update grant database
    const grantDbId = config.databases.grant;
    if (!grantDbId) {
      console.error('❌ Grant database ID not configured');
      return;
    }
    
    console.log('💾 Adding grant opportunities to your database...');
    const updatedIds = await grantTracker.updateGrantDatabase(grantDbId, grants);
    console.log(`✅ Successfully added ${updatedIds.length} grant opportunities to your database!`);
    console.log(`📍 View them at: https://notion.so/${grantDbId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error during proactive grant search:', error.message);
  }
}

/**
 * Execute a grant tracking task
 */
async function executeGrantTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'upcoming';
    
    console.log(`   🔍 Searching for grant opportunities on topics: ${topics.join(', ')}`);
    const grants = await grantTracker.searchGrants(topics, timeframe);
    console.log(`   📊 Found ${grants.length} grant opportunities`);
    
    if (grants.length === 0) {
      return { message: 'No grant opportunities found', pageId: null };
    }
    
    // Update grant database
    const grantDbId = config.databases.grant;
    if (!grantDbId) {
      return { error: 'Grant database ID not configured' };
    }
    
    const updatedIds = await grantTracker.updateGrantDatabase(grantDbId, grants);
    console.log(`   💾 Updated ${updatedIds.length} grant opportunity entries`);
    
    // Create detailed results summary
    let details = `Found ${grants.length} grant opportunities from funding agencies.\n`;
    details += `Added ${updatedIds.length} entries to the grant database.\n\n`;
    
    if (grants.length > 0) {
      details += `Grant highlights:\n`;
      grants.slice(0, 5).forEach(grant => {
        details += `• ${grant.title} - ${grant.agency} (${grant.amount || 'Amount TBD'})\n`;
      });
      
      if (grants.length > 5) {
        details += `... and ${grants.length - 5} more grant opportunities\n`;
      }
    }
    
    return { 
      message: `Updated ${updatedIds.length} grant opportunity entries`, 
      pageId: grantDbId,
      details: details
    };
  } catch (error) {
    console.error(`   ❌ Error executing grant task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Run proactive research monitoring when no tasks are found
 */
async function runProactiveResearchMonitor() {
  try {
    console.log('🎯 Starting proactive research paper monitoring...');
    
    // Define search topics for games and learning research lab
    const researchTopics = [
      'AI', 'Games', 'Learning', 'Education', 'Technology', 
      'Human-Computer Interaction', 'Educational Technology'
    ];
    
    console.log(`🔍 Searching for research papers on topics: ${researchTopics.join(', ')}`);
    const papers = await researchMonitor.searchResearchPapers(researchTopics, 'recent');
    console.log(`📊 Found ${papers.length} research papers`);
    
    if (papers.length === 0) {
      console.log('ℹ️  No research papers found - academic databases may be temporarily unavailable');
      console.log('💡 Try checking ArXiv, ACM, and IEEE manually');
    }
    
    // Update research database
    const researchDbId = config.databases.research;
    if (!researchDbId) {
      console.error('❌ Research database ID not configured');
      return;
    }
    
    console.log('💾 Adding research papers to your database...');
    const updatedIds = await researchMonitor.updateResearchDatabase(researchDbId, papers);
    console.log(`✅ Successfully added ${updatedIds.length} research papers to your database!`);
    console.log(`📍 View them at: https://notion.so/${researchDbId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error during proactive research monitoring:', error.message);
  }
}

/**
 * Run proactive industry intelligence when no tasks are found
 */
async function runProactiveIndustryIntelligence() {
  try {
    console.log('🎯 Starting proactive industry intelligence gathering...');
    
    // Define search topics for games and learning research lab
    const industryTopics = [
      'AI', 'Games', 'EdTech', 'Education', 'Technology', 
      'Policy', 'Market Trends'
    ];
    
    console.log(`🔍 Searching for industry intelligence on topics: ${industryTopics.join(', ')}`);
    const intelligence = await industryIntelligence.searchIndustryIntelligence(industryTopics, 'recent');
    console.log(`📊 Found ${intelligence.length} industry intelligence items`);
    
    if (intelligence.length === 0) {
      console.log('ℹ️  No industry intelligence found - news sources may be temporarily unavailable');
      console.log('💡 Try checking EdSurge, TechCrunch, and industry blogs manually');
    }
    
    // Update industry database
    const industryDbId = config.databases.industry;
    if (!industryDbId) {
      console.error('❌ Industry database ID not configured');
      return;
    }
    
    console.log('💾 Adding industry intelligence to your database...');
    const updatedIds = await industryIntelligence.updateIntelligenceDatabase(industryDbId, intelligence);
    console.log(`✅ Successfully added ${updatedIds.length} industry intelligence items to your database!`);
    console.log(`📍 View them at: https://notion.so/${industryDbId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error during proactive industry intelligence:', error.message);
  }
}

/**
 * Execute a research monitoring task
 */
async function executeResearchMonitorTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'recent';
    
    console.log(`   🔍 Searching for research papers on topics: ${topics.join(', ')}`);
    const papers = await researchMonitor.searchResearchPapers(topics, timeframe);
    console.log(`   📊 Found ${papers.length} research papers`);
    
    if (papers.length === 0) {
      return { message: 'No research papers found', pageId: null };
    }
    
    // Update research database
    const researchDbId = config.databases.research;
    if (!researchDbId) {
      return { error: 'Research database ID not configured' };
    }
    
    const updatedIds = await researchMonitor.updateResearchDatabase(researchDbId, papers);
    console.log(`   💾 Updated ${updatedIds.length} research paper entries`);
    
    // Create detailed results summary
    let details = `Found ${papers.length} research papers from academic sources.\n`;
    details += `Added ${updatedIds.length} entries to the research database.\n\n`;
    
    if (papers.length > 0) {
      details += `Paper highlights:\n`;
      papers.slice(0, 5).forEach(paper => {
        details += `• ${paper.title} - ${paper.authors} (${paper.venue})\n`;
      });
      
      if (papers.length > 5) {
        details += `... and ${papers.length - 5} more papers\n`;
      }
    }
    
    return { 
      message: `Updated ${updatedIds.length} research paper entries`, 
      pageId: researchDbId,
      details: details
    };
  } catch (error) {
    console.error(`   ❌ Error executing research monitor task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute an industry intelligence task
 */
async function executeIndustryTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'recent';
    
    console.log(`   🔍 Searching for industry intelligence on topics: ${topics.join(', ')}`);
    const intelligence = await industryIntelligence.searchIndustryIntelligence(topics, timeframe);
    console.log(`   📊 Found ${intelligence.length} industry intelligence items`);
    
    if (intelligence.length === 0) {
      return { message: 'No industry intelligence found', pageId: null };
    }
    
    // Update industry database
    const industryDbId = config.databases.industry;
    if (!industryDbId) {
      return { error: 'Industry database ID not configured' };
    }
    
    const updatedIds = await industryIntelligence.updateIntelligenceDatabase(industryDbId, intelligence);
    console.log(`   💾 Updated ${updatedIds.length} industry intelligence entries`);
    
    // Create detailed results summary
    let details = `Found ${intelligence.length} industry intelligence items from news sources.\n`;
    details += `Added ${updatedIds.length} entries to the industry database.\n\n`;
    
    if (intelligence.length > 0) {
      details += `Intelligence highlights:\n`;
      intelligence.slice(0, 5).forEach(item => {
        details += `• ${item.title} - ${item.source} (${item.impact} impact)\n`;
      });
      
      if (intelligence.length > 5) {
        details += `... and ${intelligence.length - 5} more items\n`;
      }
    }
    
    return { 
      message: `Updated ${updatedIds.length} industry intelligence entries`, 
      pageId: industryDbId,
      details: details
    };
  } catch (error) {
    console.error(`   ❌ Error executing industry task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a conference tracking task
 */
async function executeConferenceTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'upcoming';
    
    console.log(`   🔍 Searching for conferences on topics: ${topics.join(', ')}`);
    const conferences = await conferenceTracker.searchConferences(topics, timeframe);
    console.log(`   📊 Found ${conferences.length} conferences`);
    
    if (conferences.length === 0) {
      return { message: 'No conferences found', pageId: null };
    }
    
    // Update conference database
    const conferenceDbId = config.databases.conference;
    if (!conferenceDbId) {
      return { error: 'Conference database ID not configured' };
    }
    
    const updatedIds = await conferenceTracker.updateConferenceDatabase(conferenceDbId, conferences);
    console.log(`   💾 Updated ${updatedIds.length} conference entries`);
    
    // Create detailed results summary
    let details = `Found ${conferences.length} conferences from external sources.\n`;
    details += `Added ${updatedIds.length} entries to the conference database.\n\n`;
    
    if (conferences.length > 0) {
      details += `Conference highlights:\n`;
      conferences.slice(0, 5).forEach(conf => {
        details += `• ${conf.name} (${conf.location || 'Location TBD'})\n`;
      });
      
      if (conferences.length > 5) {
        details += `... and ${conferences.length - 5} more conferences\n`;
      }
    }
    
    return { 
      message: `Updated ${updatedIds.length} conference entries`, 
      pageId: conferenceDbId,
      details: details
    };
  } catch (error) {
    console.error(`   ❌ Error executing conference task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a research article parsing task
 */
async function executeResearchTask(task) {
  try {
    const topics = task.parameters.topics || [];
    const timeframe = task.parameters.timeframe || 'recent';
    
    console.log(`   🔍 Searching for research articles on topics: ${topics.join(', ')}`);
    const articles = await researchParser.searchResearchArticles(topics, timeframe);
    console.log(`   📊 Found ${articles.length} articles`);
    
    if (articles.length === 0) {
      return { message: 'No articles found', pageId: null };
    }
    
    // Update research database
    const researchDbId = config.databases.research;
    if (!researchDbId) {
      return { error: 'Research database ID not configured' };
    }
    
    const updatedIds = await researchParser.updateArticleDatabase(researchDbId, articles);
    console.log(`   💾 Updated ${updatedIds.length} article entries`);
    
    return { message: `Updated ${updatedIds.length} article entries`, pageId: researchDbId };
  } catch (error) {
    console.error(`   ❌ Error executing research task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a project tracking task
 */
async function executeProjectTask(task) {
  try {
    const projectId = task.parameters.projectId || task.name;
    
    console.log(`   🔄 Updating project status for: ${projectId}`);
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
    console.log(`   💾 Updated project: ${projectId}`);
    
    return { message: `Updated project: ${projectId}`, pageId };
  } catch (error) {
    console.error(`   ❌ Error executing project task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Execute a stakeholder monitoring task
 */
async function executeStakeholderTask(task) {
  try {
    const stakeholderId = task.parameters.stakeholderId || task.name;
    
    console.log(`   👥 Tracking stakeholder engagement for: ${stakeholderId}`);
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
    console.log(`   💾 Updated stakeholder: ${stakeholderId}`);
    
    return { message: `Updated stakeholder: ${stakeholderId}`, pageId: updatedIds[0] };
  } catch (error) {
    console.error(`   ❌ Error executing stakeholder task: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Main interactive function
 */
async function main() {
  try {
    const selectedAgents = await selectAgentsToRun();
    await runSelectedAgents(selectedAgents);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };