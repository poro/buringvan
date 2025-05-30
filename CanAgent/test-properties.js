const config = require('./config');
const NotionClient = require('./client');
const NotionHelper = require('./helper');

async function testProperties() {
  try {
    const client = new NotionClient();
    const helper = new NotionHelper(client);
    
    console.log('Fetching one item from database...');
    const response = await client.queryDatabase(config.databases.todo, null, null, null, 1);
    
    if (response.results && response.results.length > 0) {
      const item = response.results[0];
      console.log('\nDatabase item properties:');
      console.log(JSON.stringify(item.properties, null, 2));
      
      console.log('\nProperty types:');
      for (const [propName, propData] of Object.entries(item.properties)) {
        console.log(`- ${propName}: ${propData.type}`);
        if (propData.type === 'select' && propData.select) {
          console.log(`  Current value: ${propData.select.name}`);
        }
      }
    } else {
      console.log('No items found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testProperties();