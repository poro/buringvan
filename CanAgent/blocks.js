/**
 * src/notion/blocks.js
 * Block creation utilities for Notion pages
 */

/**
 * Create a text block for page content
 * @param {string} content - Text content
 * @param {string} [blockType='paragraph'] - Block type (paragraph, heading_1, heading_2, etc.)
 * @returns {Object} - Block data structure
 */
function createTextBlock(content, blockType = 'paragraph') {
  return {
    object: 'block',
    type: blockType,
    [blockType]: {
      rich_text: [
        {
          type: 'text',
          text: {
            content
          }
        }
      ]
    }
  };
}

/**
 * Create a heading block
 * @param {string} content - Heading text
 * @param {number} [level=1] - Heading level (1, 2, or 3)
 * @returns {Object} - Heading block data
 */
function createHeadingBlock(content, level = 1) {
  if (![1, 2, 3].includes(level)) {
    level = 1;
  }
  
  return createTextBlock(content, `heading_${level}`);
}

/**
 * Create a bulleted list item block
 * @param {string} content - List item text
 * @returns {Object} - Bulleted list item block data
 */
function createBulletedListItem(content) {
  return createTextBlock(content, 'bulleted_list_item');
}

/**
 * Create a numbered list item block
 * @param {string} content - List item text
 * @returns {Object} - Numbered list item block data
 */
function createNumberedListItem(content) {
  return createTextBlock(content, 'numbered_list_item');
}

/**
 * Create a to-do item block
 * @param {string} content - To-do item text
 * @param {boolean} [checked=false] - Whether the item is checked
 * @returns {Object} - To-do item block data
 */
function createToDoItem(content, checked = false) {
  const block = createTextBlock(content, 'to_do');
  block.to_do.checked = checked;
  return block;
}

/**
 * Create a bookmark block with a URL
 * @param {string} url - URL to bookmark
 * @param {string} [title] - Optional title for the bookmark
 * @returns {Object} - Bookmark block data
 */
function createLinkBlock(url, title) {
  const block = {
    object: 'block',
    type: 'bookmark',
    bookmark: {
      url
    }
  };
  
  if (title) {
    block.bookmark.caption = [
      {
        type: 'text',
        text: {
          content: title
        }
      }
    ];
  }
  
  return block;
}

/**
 * Create a divider block
 * @returns {Object} - Divider block data
 */
function createDividerBlock() {
  return {
    object: 'block',
    type: 'divider',
    divider: {}
  };
}

/**
 * Create a callout block
 * @param {string} content - Callout text
 * @param {string} [icon='💡'] - Emoji for the callout
 * @returns {Object} - Callout block data
 */
function createCalloutBlock(content, icon = '💡') {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [
        {
          type: 'text',
          text: {
            content
          }
        }
      ],
      icon: {
        type: 'emoji',
        emoji: icon
      }
    }
  };
}

/**
 * Create a table with content
 * @param {Array<Array<string>>} rows - List of rows, where each row is a list of cell values
 * @returns {Array<Object>} - List of blocks representing the table
 */
function createTableBlock(rows) {
  if (!rows || !rows[0] || !rows[0].length) {
    return [];
  }
  
  const numColumns = rows[0].length;
  const tableBlock = {
    object: 'block',
    type: 'table',
    table: {
      table_width: numColumns,
      has_column_header: true,
      has_row_header: false,
      children: []
    }
  };
  
  for (const row of rows) {
    const rowBlock = {
      object: 'block',
      type: 'table_row',
      table_row: {
        cells: row.map(cell => [
          {
            type: 'text',
            text: {
              content: cell
            }
          }
        ])
      }
    };
    tableBlock.table.children.push(rowBlock);
  }
  
  return [tableBlock];
}

module.exports = {
  createTextBlock,
  createHeadingBlock,
  createBulletedListItem,
  createNumberedListItem,
  createToDoItem,
  createLinkBlock,
  createDividerBlock,
  createCalloutBlock,
  createTableBlock
};
