const NotionClient = require('./client.js');
const NotionHelper = require('./helper.js');

async function addSampleAgentTasks() {
  try {
    const client = new NotionClient();
    const helper = new NotionHelper(client);
    
    console.log('📝 Adding sample conference discovery tasks to agent TODO database...');
    
    const agentTodoDbId = process.env.AGENT_TODO_ID;
    if (!agentTodoDbId) {
      console.error('❌ AGENT_TODO_ID not found in .env file');
      return;
    }
    
    const sampleTasks = [
      {
        name: 'Find AI and Machine Learning conferences for 2025',
        type: 'conference',
        status: 'Not started',
        dueDate: new Date().toISOString().split('T')[0], // Today
        topics: ['AI', 'Machine Learning']
      },
      {
        name: 'Search for Game Development conferences',
        type: 'conference', 
        status: 'Not started',
        dueDate: new Date().toISOString().split('T')[0], // Today
        topics: ['Games', 'Technology']
      },
      {
        name: 'Find Education Technology conferences',
        type: 'conference',
        status: 'Not started', 
        dueDate: new Date().toISOString().split('T')[0], // Today
        topics: ['Education', 'Technology']
      }
    ];
    
    for (const task of sampleTasks) {
      const properties = {
        'Task name': {
          title: [{ text: { content: task.name } }]
        },
        'Task type': {
          multi_select: [{ name: task.type }]
        },
        'Status': {
          status: { name: task.status }
        },
        'Due date': {
          date: { start: task.dueDate }
        },
        'Priority': {
          select: { name: 'Medium' }
        },
        'Description': {
          rich_text: [{ text: { content: `Search for ${task.topics.join(', ')} conferences` } }]
        }
      };
      
      const result = await client.client.pages.create({
        parent: { database_id: agentTodoDbId },
        properties: properties
      });
      
      console.log('✅ Added task:', task.name);
    }
    
    console.log('🎉 Sample conference discovery tasks added!');
    console.log('📍 View them at: https://notion.so/' + agentTodoDbId.replace(/-/g, ''));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addSampleAgentTasks();