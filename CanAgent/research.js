/**
 * src/tasks/research.js
 * Research article parser module for finding and parsing research articles
 */

const axios = require('axios');
const cheerio = require('cheerio');

class ResearchArticleParser {
  /**
   * Initialize the research article parser
   * @param {Object} notionHelper - NotionHelper instance for Notion interactions
   */
  constructor(notionHelper) {
    this.notionHelper = notionHelper;
    this.sources = [
      'https://arxiv.org/',
      'https://scholar.google.com/',
      'https://www.semanticscholar.org/',
      'https://www.researchgate.net/',
      'https://dl.acm.org/',
      'https://ieeexplore.ieee.org/'
    ];
  }

  /**
   * Search for research articles on specified topics
   * @param {Array<string>} topics - List of topics to search for
   * @param {string} [timeframe='recent'] - Time range to search
   * @returns {Promise<Array>} - List of article information dictionaries
   */
  async searchResearchArticles(topics, timeframe = 'recent') {
    const allArticles = [];
    
    for (const topic of topics) {
      try {
        // Search arXiv
        const arxivArticles = await this._searchArxiv(topic, timeframe);
        allArticles.push(...arxivArticles);
        
        // Search Semantic Scholar
        const semanticArticles = await this._searchSemanticScholar(topic, timeframe);
        allArticles.push(...semanticArticles);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching articles for topic ${topic}: ${error.message}`);
      }
    }
    
    // Remove duplicates based on title and URL
    const uniqueArticles = this._removeDuplicates(allArticles);
    
    return uniqueArticles;
  }

  /**
   * Search arXiv for research articles
   * @private
   * @param {string} topic - Topic to search for
   * @param {string} timeframe - Time range to search
   * @returns {Promise<Array>} - List of article information dictionaries
   */
  async _searchArxiv(topic, timeframe) {
    const articles = [];
    
    try {
      // Format the search URL
      let searchQuery = encodeURIComponent(topic);
      if (!searchQuery.toLowerCase().includes('game') && !searchQuery.toLowerCase().includes('ai')) {
        searchQuery += `+AND+(game+OR+AI)`;
      }
      
      // Set sorting based on timeframe
      const sortBy = 'submittedDate';
      let maxResults;
      if (timeframe === 'recent') {
        maxResults = 20;
      } else if (timeframe === 'this_month') {
        maxResults = 50;
      } else {
        maxResults = 100;
      }
      
      const searchUrl = `http://export.arxiv.org/api/query?search_query=all:${searchQuery}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=descending`;
      
      // Send request
      const response = await axios.get(searchUrl);
      if (response.status !== 200) {
        console.error(`Error searching arXiv: ${response.status}`);
        return articles;
      }
      
      // Parse XML
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      // Find entries
      const entries = $('entry');
      
      entries.each((index, entry) => {
        // Extract article details
        const titleElem = $(entry).find('title');
        const title = titleElem.text().trim();
        
        // Skip if title doesn't contain relevant keywords
        if (!this._isRelevant(title, topic)) {
          return;
        }
        
        // Extract other details
        const urlElem = $(entry).find('id');
        const url = urlElem.text().trim();
        
        const publishedElem = $(entry).find('published');
        const published = publishedElem.text().trim();
        
        const summaryElem = $(entry).find('summary');
        const summary = summaryElem.text().trim();
        
        // Extract authors
        const authorElems = $(entry).find('author');
        const authors = [];
        authorElems.each((i, author) => {
          const name = $(author).find('name').text().trim();
          if (name) {
            authors.push(name);
          }
        });
        
        // Parse date
        const pubDate = this._parseDate(published);
        
        // Filter by timeframe if needed
        if (timeframe !== 'all' && !this._isInTimeframe(pubDate, timeframe)) {
          return;
        }
        
        // Create article entry
        const article = {
          title,
          url,
          authors: authors.join(', '), // Convert array to string for Notion API
          publicationDate: pubDate,
          summary,
          source: 'arXiv',
          topics: [topic],
          publication: 'arXiv'
        };
        
        articles.push(article);
      });
      
      return articles;
    } catch (error) {
      console.error(`Error searching arXiv: ${error.message}`);
      return articles;
    }
  }

  /**
   * Search Semantic Scholar for research articles
   * @private
   * @param {string} topic - Topic to search for
   * @param {string} timeframe - Time range to search
   * @returns {Promise<Array>} - List of article information dictionaries
   */
  async _searchSemanticScholar(topic, timeframe) {
    const articles = [];
    
    try {
      // Format the search URL
      let searchQuery = encodeURIComponent(topic);
      if (!searchQuery.toLowerCase().includes('game') && !searchQuery.toLowerCase().includes('ai')) {
        searchQuery += `+game+AI`;
      }
      
      // Set year filter based on timeframe
      let yearFilter = '';
      const currentYear = new Date().getFullYear();
      if (timeframe === 'this_year') {
        yearFilter = `&year=${currentYear}`;
      }
      
      const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${searchQuery}&limit=20&fields=title,url,abstract,authors,year,venue${yearFilter}`;
      
      // Send request
      const headers = {
        'Accept': 'application/json'
      };
      const response = await axios.get(searchUrl, { headers });
      if (response.status !== 200) {
        console.error(`Error searching Semantic Scholar: ${response.status}`);
        return articles;
      }
      
      // Parse JSON
      const data = response.data;
      
      for (const paper of data.data || []) {
        // Extract article details
        const title = paper.title || '';
        
        // Skip if title doesn't contain relevant keywords
        if (!this._isRelevant(title, topic)) {
          continue;
        }
        
        // Extract other details
        const url = paper.url || '';
        const abstract = paper.abstract || '';
        const year = paper.year;
        const venue = paper.venue || '';
        
        // Extract authors
        const authors = (paper.authors || []).map(author => author.name || '').filter(name => name);
        
        // Create publication date
        const pubDate = year ? `${year}-01-01` : null;
        
        // Filter by timeframe if needed
        if (timeframe !== 'all' && !this._isInTimeframe(pubDate, timeframe)) {
          continue;
        }
        
        // Create article entry
        const article = {
          title,
          url,
          authors,
          publicationDate: pubDate,
          summary: abstract,
          source: 'Semantic Scholar',
          topics: [topic],
          publication: venue
        };
        
        articles.push(article);
      }
      
      return articles;
    } catch (error) {
      console.error(`Error searching Semantic Scholar: ${error.message}`);
      return articles;
    }
  }

  /**
   * Check if an article title is relevant to the search topic
   * @private
   * @param {string} title - Article title
   * @param {string} topic - Search topic
   * @returns {boolean} - True if relevant, False otherwise
   */
  _isRelevant(title, topic) {
    // Convert to lowercase for case-insensitive matching
    const titleLower = title.toLowerCase();
    const topicLower = topic.toLowerCase();
    
    // Check if topic keywords are in the title
    const topicKeywords = topicLower.split(' ');
    
    // Check if any topic keyword is in the title
    for (const keyword of topicKeywords) {
      if (titleLower.includes(keyword)) {
        return true;
      }
    }
    
    // Check if title contains "game" or "AI" related terms
    const gameTerms = ['game', 'gaming', 'gameplay', 'player', 'ludology'];
    const aiTerms = ['ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning'];
    
    const hasGameTerm = gameTerms.some(term => titleLower.includes(term));
    const hasAiTerm = aiTerms.some(term => titleLower.includes(term));
    
    // If topic is about games, require game term
    if (gameTerms.some(term => topicLower.includes(term))) {
      return hasGameTerm;
    }
    
    // If topic is about AI, require AI term
    if (aiTerms.some(term => topicLower.includes(term))) {
      return hasAiTerm;
    }
    
    // Otherwise, require either game or AI term
    return hasGameTerm || hasAiTerm;
  }

  /**
   * Parse a date string into ISO format
   * @private
   * @param {string} dateStr - Date string to parse
   * @returns {string|null} - ISO format date string or null if parsing fails
   */
  _parseDate(dateStr) {
    if (!dateStr) {
      return null;
    }
    
    try {
      // Try common formats
      const formats = [
        { regex: /(\d{4})-(\d{2})-(\d{2})T/, fn: (m) => `${m[1]}-${m[2]}-${m[3]}` }, // YYYY-MM-DDT...
        { regex: /(\d{4})-(\d{2})-(\d{2})/, fn: (m) => `${m[1]}-${m[2]}-${m[3]}` }, // YYYY-MM-DD
        { regex: /(\w{3}) (\d{1,2}), (\d{4})/, fn: (m) => {
          const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', 
                          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
          const month = months[m[1]];
          const day = m[2].padStart(2, '0');
          return `${m[3]}-${month}-${day}`;
        }}, // MMM DD, YYYY
        { regex: /(\d{1,2}) (\w{3}) (\d{4})/, fn: (m) => {
          const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', 
                          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
          const month = months[m[2]];
          const day = m[1].padStart(2, '0');
          return `${m[3]}-${month}-${day}`;
        }} // DD MMM YYYY
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format.regex);
        if (match) {
          return format.fn(match);
        }
      }
      
      // Try to extract year
      const yearPattern = /\b(19|20)\d{2}\b/;
      const match = dateStr.match(yearPattern);
      if (match) {
        const year = match[0];
        return `${year}-01-01`;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a date is within the specified timeframe
   * @private
   * @param {string} dateStr - Date string in ISO format
   * @param {string} timeframe - Time range to check (recent, this_month, this_year)
   * @returns {boolean} - True if date is in timeframe, False otherwise
   */
  _isInTimeframe(dateStr, timeframe) {
    if (!dateStr) {
      return false;
    }
    
    try {
      const dateObj = new Date(dateStr);
      const now = new Date();
      
      if (timeframe === 'recent') {
        // Last 30 days
        const delta = now - dateObj;
        return delta <= 30 * 24 * 60 * 60 * 1000;
      } else if (timeframe === 'this_month') {
        return dateObj.getFullYear() === now.getFullYear() && 
               dateObj.getMonth() === now.getMonth();
      } else if (timeframe === 'this_year') {
        return dateObj.getFullYear() === now.getFullYear();
      } else {
        return true; // 'all' timeframe
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove duplicate articles based on title and URL
   * @private
   * @param {Array} articles - List of article dictionaries
   * @returns {Array} - Deduplicated list of articles
   */
  _removeDuplicates(articles) {
    const uniqueArticles = {};
    
    for (const article of articles) {
      // Create a key based on title
      const title = (article.title || '').toLowerCase();
      if (!title) {
        continue;
      }
      
      const key = title;
      
      // If this is a new article or has more complete information, keep it
      if (!(key in uniqueArticles) || this._isMoreComplete(article, uniqueArticles[key])) {
        uniqueArticles[key] = article;
      } else {
        // Merge topics if this is a duplicate with different topics
        const existingTopics = new Set(uniqueArticles[key].topics || []);
        const newTopics = new Set(article.topics || []);
        uniqueArticles[key].topics = [...new Set([...existingTopics, ...newTopics])];
      }
    }
    
    return Object.values(uniqueArticles);
  }

  /**
   * Check if article1 has more complete information than article2
   * @private
   * @param {Object} article1 - First article dictionary
   * @param {Object} article2 - Second article dictionary
   * @returns {boolean} - True if article1 is more complete, False otherwise
   */
  _isMoreComplete(article1, article2) {
    // Count non-empty values in each article
    const count1 = Object.values(article1).filter(v => v !== null && v !== '' && v !== undefined).length;
    const count2 = Object.values(article2).filter(v => v !== null && v !== '' && v !== undefined).length;
    
    // Check if article1 has a summary and article2 doesn't
    const hasSummary1 = article1.summary !== null && article1.summary !== '' && article1.summary !== undefined;
    const hasSummary2 = article2.summary !== null && article2.summary !== '' && article2.summary !== undefined;
    
    if (hasSummary1 && !hasSummary2) {
      return true;
    } else if (!hasSummary1 && hasSummary2) {
      return false;
    }
    
    return count1 > count2;
  }

  /**
   * Generate a concise summary of the article
   * @param {Object} articleData - Article information dictionary
   * @returns {string} - Concise summary
   */
  generateSummary(articleData) {
    // If article already has a summary, use it
    if (articleData.summary) {
      // Truncate if too long
      const summary = articleData.summary;
      if (summary.length > 500) {
        return summary.substring(0, 497) + '...';
      }
      return summary;
    }
    
    // Otherwise, create a basic summary from available information
    const title = articleData.title || '';
    const authors = articleData.authors || [];
    const publication = articleData.publication || '';
    const date = articleData.publicationDate || '';
    
    let summary = `This article titled '${title}' `;
    
    if (authors.length > 0) {
      if (authors.length === 1) {
        summary += `by ${authors[0]} `;
      } else if (authors.length === 2) {
        summary += `by ${authors[0]} and ${authors[1]} `;
      } else {
        summary += `by ${authors[0]} et al. `;
      }
    }
    
    if (publication) {
      summary += `published in ${publication} `;
    }
    
    if (date) {
      summary += `on ${date} `;
    }
    
    summary += 'discusses topics related to ';
    
    const topics = articleData.topics || [];
    if (topics.length > 0) {
      summary += topics.join(', ');
    } else {
      summary += 'games and AI research';
    }
    
    summary += '.';
    
    return summary;
  }

  /**
   * Update Notion database with article information
   * @param {string} databaseId - Notion database ID
   * @param {Array} articles - List of article dictionaries
   * @returns {Promise<Array>} - List of updated/created page IDs
   */
  async updateArticleDatabase(databaseId, articles) {
    const updatedIds = [];
    
    try {
      // Get existing articles from database
      const existingArticles = await this.notionHelper.getAllDatabaseItems(databaseId);
      const existingMap = {};
      
      // Create a map of existing articles by title
      for (const article of existingArticles) {
        const title = this.notionHelper.getPropertyValue(article, 'Title', 'title');
        if (title) {
          existingMap[title] = article;
        }
      }
      
      // Update or create articles
      for (const article of articles) {
        const articleTitle = article.title;
        if (!articleTitle) {
          continue;
        }
        
        try {
          // Check if article already exists
          if (articleTitle in existingMap) {
            // Update existing article
            const pageId = existingMap[articleTitle].id;
            const result = await this._updateArticlePage(pageId, article);
            if (!result.error) {
              updatedIds.push(pageId);
            }
          } else {
            // Create new article
            const result = await this._createArticlePage(databaseId, article);
            if (!result.error && result.id) {
              updatedIds.push(result.id);
            }
          }
        } catch (error) {
          console.error(`Error updating article ${articleTitle}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error updating article database: ${error.message}`);
    }
    
    return updatedIds;
  }

  async _createArticlePage(databaseId, article) {
    const properties = {
      Title: {
        title: [{ text: { content: article.title || 'Untitled Article' } }]
      }
    };
    
    if (article.authors) {
      properties.Authors = {
        rich_text: [{ text: { content: article.authors } }]
      };
    }
    
    if (article.url) {
      properties.URL = { url: article.url };
    }
    
    if (article.summary) {
      properties.Abstract = {
        rich_text: [{ text: { content: article.summary.substring(0, 2000) } }] // Notion field limit
      };
    }
    
    return this.notionHelper.client.createPage(databaseId, true, properties);
  }

  async _updateArticlePage(pageId, article) {
    const properties = {};
    
    if (article.authors) {
      properties.Authors = {
        rich_text: [{ text: { content: article.authors } }]
      };
    }
    
    if (article.url) {
      properties.URL = { url: article.url };
    }
    
    if (article.summary) {
      properties.Abstract = {
        rich_text: [{ text: { content: article.summary.substring(0, 2000) } }] // Notion field limit
      };
    }
    
    return this.notionHelper.client.updatePage(pageId, properties);
  }
}

module.exports = ResearchArticleParser;