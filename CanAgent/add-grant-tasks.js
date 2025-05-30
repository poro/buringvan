const NotionClient = require('./client.js');

async function addGrantTasks() {
  try {
    const client = new NotionClient();
    
    console.log('📝 Adding grant discovery tasks to agent TODO database...');
    
    const agentTodoDbId = process.env.AGENT_TODO_ID;
    if (!agentTodoDbId) {
      console.error('❌ AGENT_TODO_ID not found in .env file');
      return;
    }
    
    const grantTasks = [
      {
        name: 'Find NSF grants for AI and games research',
        type: 'grant',
        status: 'Not started',
        dueDate: new Date().toISOString().split('T')[0],
        topics: ['AI', 'Games']
      },
      {
        name: 'Search for Education Department grants on learning technology',
        type: 'grant', 
        status: 'Not started',
        dueDate: new Date().toISOString().split('T')[0],
        topics: ['Learning', 'Education', 'Technology']
      },
      {
        name: 'Find NIH grants for health education research',
        type: 'grant',
        status: 'Not started', 
        dueDate: new Date().toISOString().split('T')[0],
        topics: ['Education', 'Health', 'Research']
      }
    ];
    
    for (const task of grantTasks) {
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
          select: { name: 'High' }
        },
        'Description': {
          rich_text: [{ text: { content: `Search for ${task.topics.join(', ')} grant opportunities` } }]
        }
      };
      
      const result = await client.client.pages.create({
        parent: { database_id: agentTodoDbId },
        properties: properties
      });
      
      console.log('✅ Added grant task:', task.name);
    }
    
    console.log('🎉 Grant discovery tasks added!');
    console.log('📍 View them at: https://notion.so/' + agentTodoDbId.replace(/-/g, ''));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addGrantTasks();