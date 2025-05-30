/**
 * src/api/run.js
 * API endpoint to trigger agent run
 */

const { runAgent } = require('./index');

module.exports = async (req, res) => {
  try {
    console.log('Agent run triggered via API');
    
    // Start agent run
    await runAgent();
    
    return res.status(200).json({
      success: true,
      message: 'Agent run completed successfully'
    });
  } catch (error) {
    console.error('Error running agent via API:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error running agent',
      error: error.message
    });
  }
};
