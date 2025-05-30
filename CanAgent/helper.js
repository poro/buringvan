/**
 * src/notion/helper.js
 * Helper functions for common Notion operations
 */

const NotionClient = require('./client');
const blocks = require('./blocks');

class NotionHelper {
  /**
   * Initialize the helper with a NotionClient instance
   * @param {NotionClient} client - NotionClient instance
   */
  constructor(client) {
    this.client = client || new NotionClient();
  }

  /**
   * Get all items from a database, handling pagination
   * @param {string} databaseId - Notion database ID
   * @param {Object} [filterParams] - Filter criteria
   * @param {Array} [sorts] - Sort criteria
   * @returns {Promise<Array>} - List of all database items
   */
  async getAllDatabaseItems(databaseId, filterParams, sorts) {
    const allItems = [];
    let hasMore = true;
    let startCursor = null;

    while (hasMore) {
      try {
        const response = await this.client.queryDatabase(
          databaseId,
          filterParams,
          sorts,
          startCursor
        );

        if (response.results) {
          allItems.push(...response.results);
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor;

        if (!hasMore || !startCursor) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching database items: ${error.message}`);
        break;
      }
    }

    return allItems;
  }

  /**
   * Get all children blocks, handling pagination
   * @param {string} blockId - Notion block ID (can be a page ID)
   * @returns {Promise<Array>} - List of all child blocks
   */
  async getAllBlockChildren(blockId) {
    const allBlocks = [];
    let hasMore = true;
    let startCursor = null;

    while (hasMore) {
      try {
        const response = await this.client.getBlockChildren(blockId, startCursor);

        if (response.results) {
          allBlocks.push(...response.results);
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor;

        if (!hasMore || !startCursor) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching block children: ${error.message}`);
        break;
      }
    }

    return allBlocks;
  }

  /**
   * Create page properties for a new page
   * @param {string} title - Page title
   * @param {Object} properties - Additional properties
   * @returns {Object} - Complete properties dictionary
   */
  createPageProperties(title, properties = {}) {
    // Start with the title property
    const allProperties = {
      Name: {
        title: [
          {
            text: {
              content: title
            }
          }
        ]
      }
    };

    // Add additional properties
    return { ...allProperties, ...properties };
  }

  /**
   * Format a date for Notion properties
   * @param {string|Date} dateValue - Date string (YYYY-MM-DD) or Date object
   * @param {boolean} [includeTime=false] - Whether to include time information
   * @returns {Object} - Formatted date property
   */
  formatDateProperty(dateValue, includeTime = false) {
    let dateStr;

    if (typeof dateValue === 'string') {
      // Assume YYYY-MM-DD format
      dateStr = dateValue;
      if (includeTime) {
        dateStr += 'T00:00:00Z';
      }
    } else {
      // Date object
      if (includeTime) {
        dateStr = dateValue.toISOString();
      } else {
        dateStr = dateValue.toISOString().split('T')[0];
      }
    }

    return {
      start: dateStr
    };
  }

  /**
   * Extract property value from a Notion page
   * @param {Object} page - Notion page object
   * @param {string} propertyName - Name of the property
   * @param {string} propertyType - Type of the property (title, rich_text, etc.)
   * @returns {*} - Property value or null if not found
   */
  getPropertyValue(page, propertyName, propertyType) {
    try {
      const properties = page.properties || {};
      const propertyData = properties[propertyName] || {};

      switch (propertyType) {
        case 'title':
        case 'rich_text':
          const textItems = propertyData[propertyType] || [];
          if (textItems.length > 0) {
            return textItems[0].text?.content;
          }
          break;
        case 'select':
          return propertyData.select?.name;
        case 'status':
          return propertyData.status?.name;
        case 'multi_select':
          return (propertyData.multi_select || []).map(item => item.name);
        case 'date':
          return propertyData.date?.start;
        case 'url':
          return propertyData.url;
        case 'checkbox':
          return propertyData.checkbox;
        case 'number':
          return propertyData.number;
        case 'relation':
          const relationItems = propertyData.relation || [];
          if (relationItems.length > 0) {
            return relationItems[0].id;
          }
          break;
        case 'people':
          const peopleItems = propertyData.people || [];
          return peopleItems.map(person => person.name || person.id);
      }

      return null;
    } catch (error) {
      console.error(`Error getting property value: ${error.message}`);
      return null;
    }
  }
}

module.exports = NotionHelper;
