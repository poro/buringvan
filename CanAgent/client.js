/**
 * src/notion/client.js
 * Notion API client with rate limiting and error handling
 */

const { Client } = require('@notionhq/client');
const config = require('./config');

class NotionClient {
  constructor(apiKey = config.notionApiKey) {
    this.client = new Client({ auth: apiKey });
    this.rateLimitRemaining = 1000; // Default rate limit
    this.rateLimitReset = Date.now() + 60000; // Default reset time (1 minute)
  }

  /**
   * Handle API rate limits by waiting if necessary
   * @private
   */
  async _handleRateLimits() {
    const currentTime = Date.now();
    if (this.rateLimitRemaining <= 1 && currentTime < this.rateLimitReset) {
      const sleepTime = this.rateLimitReset - currentTime + 1000; // Add 1 second buffer
      console.log(`Rate limit reached. Waiting for ${sleepTime / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
  }

  /**
   * Update rate limit information from response headers
   * @private
   * @param {Object} headers - Response headers
   */
  _updateRateLimits(headers) {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitRemaining = parseInt(headers['x-ratelimit-remaining'], 10);
    }
    if (headers['x-ratelimit-reset-time']) {
      this.rateLimitReset = parseInt(headers['x-ratelimit-reset-time'], 10);
    }
  }

  /**
   * Make a request to the Notion API with rate limit handling and retries
   * @private
   * @param {Function} apiMethod - Notion API method to call
   * @param {Object} params - Parameters for the API method
   * @returns {Promise<Object>} - API response
   */
  async _makeRequest(apiMethod, params) {
    await this._handleRateLimits();
    
    let retries = 0;
    while (retries <= config.rateLimits.maxRetries) {
      try {
        const response = await apiMethod(params);
        
        // Update rate limits if headers are available
        if (response?.headers) {
          this._updateRateLimits(response.headers);
        }
        
        return response;
      } catch (error) {
        // Handle rate limiting errors
        if (error.code === 'rate_limited') {
          retries++;
          if (retries <= config.rateLimits.maxRetries) {
            const delay = config.rateLimits.retryDelay * Math.pow(2, retries - 1);
            console.log(`Rate limited. Retrying in ${delay / 1000} seconds... (${retries}/${config.rateLimits.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw new Error(`Rate limit exceeded after ${config.rateLimits.maxRetries} retries`);
          }
        } else {
          // Log and rethrow other errors
          console.error('Notion API error:', error);
          throw error;
        }
      }
    }
  }

  /**
   * Test the API connection and authentication
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection() {
    try {
      await this._makeRequest(params => this.client.users.me(params), {});
      return true;
    } catch (error) {
      console.error('Failed to connect to Notion API:', error);
      return false;
    }
  }

  /**
   * Retrieve database metadata
   * @param {string} databaseId - Notion database ID
   * @returns {Promise<Object>} - Database metadata
   */
  async readDatabase(databaseId) {
    return this._makeRequest(params => this.client.databases.retrieve(params), {
      database_id: databaseId
    });
  }

  /**
   * Query a database with optional filters and sorting
   * @param {string} databaseId - Notion database ID
   * @param {Object} [filterParams] - Filter criteria
   * @param {Array} [sorts] - Sort criteria
   * @param {string} [startCursor] - Pagination cursor
   * @param {number} [pageSize=100] - Number of results per page
   * @returns {Promise<Object>} - Query results
   */
  async queryDatabase(databaseId, filterParams, sorts, startCursor, pageSize = 100) {
    const params = {
      database_id: databaseId,
      page_size: pageSize
    };

    if (filterParams) {
      params.filter = filterParams;
    }

    if (sorts) {
      params.sorts = sorts;
    }

    if (startCursor) {
      params.start_cursor = startCursor;
    }

    return this._makeRequest(params => this.client.databases.query(params), params);
  }

  /**
   * Retrieve a page's content
   * @param {string} pageId - Notion page ID
   * @returns {Promise<Object>} - Page content
   */
  async readPage(pageId) {
    return this._makeRequest(params => this.client.pages.retrieve(params), {
      page_id: pageId
    });
  }

  /**
   * Retrieve a block's children blocks
   * @param {string} blockId - Notion block ID (can be a page ID)
   * @param {string} [startCursor] - Pagination cursor
   * @returns {Promise<Object>} - Block children
   */
  async getBlockChildren(blockId, startCursor) {
    const params = {
      block_id: blockId
    };

    if (startCursor) {
      params.start_cursor = startCursor;
    }

    return this._makeRequest(params => this.client.blocks.children.list(params), params);
  }

  /**
   * Create a new page
   * @param {string} parentId - Parent page or database ID
   * @param {boolean} isDatabase - True if parent is a database, False if parent is a page
   * @param {Object} properties - Page properties
   * @param {Array} [children] - Page content blocks
   * @returns {Promise<Object>} - Created page data
   */
  async createPage(parentId, isDatabase, properties, children) {
    const params = {
      parent: {
        [isDatabase ? 'database_id' : 'page_id']: parentId
      },
      properties: properties
    };

    if (children) {
      params.children = children;
    }

    return this._makeRequest(params => this.client.pages.create(params), params);
  }

  /**
   * Update page properties
   * @param {string} pageId - Notion page ID
   * @param {Object} properties - Updated properties
   * @returns {Promise<Object>} - Updated page data
   */
  async updatePage(pageId, properties) {
    return this._makeRequest(params => this.client.pages.update(params), {
      page_id: pageId,
      properties: properties
    });
  }

  /**
   * Append blocks to a page or block
   * @param {string} blockId - Parent block ID (can be a page ID)
   * @param {Array} children - Blocks to append
   * @returns {Promise<Object>} - Result of append operation
   */
  async appendBlocks(blockId, children) {
    return this._makeRequest(params => this.client.blocks.children.append(params), {
      block_id: blockId,
      children: children
    });
  }

  /**
   * Update a block's content
   * @param {string} blockId - Notion block ID
   * @param {Object} blockData - Updated block data
   * @returns {Promise<Object>} - Updated block data
   */
  async updateBlock(blockId, blockData) {
    return this._makeRequest(params => this.client.blocks.update(params), {
      block_id: blockId,
      ...blockData
    });
  }

  /**
   * Delete a block
   * @param {string} blockId - Notion block ID
   * @returns {Promise<Object>} - Result of delete operation
   */
  async deleteBlock(blockId) {
    return this._makeRequest(params => this.client.blocks.delete(params), {
      block_id: blockId
    });
  }
}

module.exports = NotionClient;
