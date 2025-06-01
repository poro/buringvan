const axios = require('axios');
const { setCache, getCache } = require('../../config/redis');

class InstagramService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.authURL = 'https://api.instagram.com/oauth';
  }

  // Generate OAuth URL for authorization
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const scope = 'user_profile,user_media';
    
    return `${this.authURL}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code, redirectUri) {
    try {
      // First, get short-lived token
      const shortTokenResponse = await axios.post(`${this.authURL}/access_token`, {
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const shortToken = shortTokenResponse.data.access_token;

      // Exchange for long-lived token
      const longTokenResponse = await axios.get(`${this.baseURL}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
          access_token: shortToken
        }
      });

      return {
        access_token: longTokenResponse.data.access_token,
        token_type: 'bearer',
        expires_in: longTokenResponse.data.expires_in
      };
    } catch (error) {
      console.error('Instagram token exchange error:', error.response?.data);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  // Get user profile information
  async getUserProfile(accessToken) {
    try {
      const cacheKey = `instagram:profile:${accessToken.substring(0, 10)}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseURL}/me`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count,follows_count',
          access_token: accessToken
        }
      });

      const profile = {
        id: response.data.id,
        username: response.data.username,
        accountType: response.data.account_type,
        mediaCount: response.data.media_count,
        followers: response.data.followers_count,
        following: response.data.follows_count
      };

      await setCache(cacheKey, profile, 3600); // Cache for 1 hour
      return profile;
    } catch (error) {
      console.error('Instagram profile fetch error:', error.response?.data);
      throw new Error('Failed to fetch Instagram profile');
    }
  }

  // Post content to Instagram
  async postContent(accessToken, content, userId) {
    try {
      if (!content.media || content.media.length === 0) {
        throw new Error('Instagram posts require at least one media file');
      }

      let containerId;

      if (content.media.length === 1) {
        // Single media post
        containerId = await this.createSingleMediaContainer(accessToken, content, userId);
      } else {
        // Carousel post
        containerId = await this.createCarouselContainer(accessToken, content, userId);
      }

      // Publish the media container
      const publishResponse = await axios.post(`${this.baseURL}/${userId}/media_publish`, {
        creation_id: containerId,
        access_token: accessToken
      });

      return {
        id: publishResponse.data.id,
        url: `https://www.instagram.com/p/${this.getInstagramPostCode(publishResponse.data.id)}/`
      };
    } catch (error) {
      console.error('Instagram post error:', error.response?.data);
      throw new Error(`Failed to post to Instagram: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Create single media container
  async createSingleMediaContainer(accessToken, content, userId) {
    const media = content.media[0];
    const isVideo = media.type === 'video';

    const params = {
      [isVideo ? 'video_url' : 'image_url']: media.url,
      caption: content.text,
      access_token: accessToken
    };

    if (isVideo) {
      params.media_type = 'REELS';
    }

    const response = await axios.post(`${this.baseURL}/${userId}/media`, params);
    return response.data.id;
  }

  // Create carousel container
  async createCarouselContainer(accessToken, content, userId) {
    const childrenIds = [];

    // Create children containers
    for (const media of content.media) {
      const isVideo = media.type === 'video';
      const childResponse = await axios.post(`${this.baseURL}/${userId}/media`, {
        [isVideo ? 'video_url' : 'image_url']: media.url,
        is_carousel_item: true,
        access_token: accessToken
      });
      childrenIds.push(childResponse.data.id);
    }

    // Create carousel container
    const carouselResponse = await axios.post(`${this.baseURL}/${userId}/media`, {
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      caption: content.text,
      access_token: accessToken
    });

    return carouselResponse.data.id;
  }

  // Get Instagram post code from ID
  getInstagramPostCode(postId) {
    // Instagram uses a specific encoding for post URLs
    // This is a simplified version - actual implementation would need proper base conversion
    return Buffer.from(postId).toString('base64').replace(/[=+/]/g, '').substring(0, 11);
  }

  // Get post analytics
  async getPostAnalytics(accessToken, postId) {
    try {
      const cacheKey = `instagram:analytics:${postId}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseURL}/${postId}/insights`, {
        params: {
          metric: 'engagement,impressions,reach,likes,comments,shares,saves',
          access_token: accessToken
        }
      });

      const analytics = {};
      response.data.data.forEach(metric => {
        analytics[metric.name] = metric.values[0]?.value || 0;
      });

      const result = {
        views: analytics.impressions || 0,
        likes: analytics.likes || 0,
        comments: analytics.comments || 0,
        shares: analytics.shares || 0,
        saves: analytics.saves || 0,
        reach: analytics.reach || 0,
        engagement: analytics.engagement || 0
      };

      await setCache(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    } catch (error) {
      console.error('Instagram analytics error:', error.response?.data);
      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        engagement: 0
      };
    }
  }

  // Delete a post (Instagram doesn't support deleting posts via API)
  async deletePost(accessToken, postId) {
    throw new Error('Instagram does not support deleting posts via API');
  }

  // Get user's posts
  async getUserPosts(accessToken, userId, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/${userId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp',
          limit,
          access_token: accessToken
        }
      });

      return response.data.data.map(post => ({
        id: post.id,
        caption: post.caption,
        mediaType: post.media_type,
        mediaUrl: post.media_url,
        permalink: post.permalink,
        createdAt: new Date(post.timestamp)
      }));
    } catch (error) {
      console.error('Instagram posts fetch error:', error.response?.data);
      throw new Error('Failed to fetch Instagram posts');
    }
  }

  // Refresh access token
  async refreshToken(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: accessToken
        }
      });

      return {
        access_token: response.data.access_token,
        token_type: 'bearer',
        expires_in: response.data.expires_in
      };
    } catch (error) {
      console.error('Instagram token refresh error:', error.response?.data);
      throw new Error('Failed to refresh Instagram token');
    }
  }

  // Validate access token
  async validateToken(accessToken) {
    try {
      await this.getUserProfile(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get user's stories
  async getUserStories(accessToken, userId) {
    try {
      const response = await axios.get(`${this.baseURL}/${userId}/stories`, {
        params: {
          fields: 'id,media_type,media_url,timestamp',
          access_token: accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Instagram stories fetch error:', error.response?.data);
      return [];
    }
  }

  // Post story to Instagram
  async postStory(accessToken, content, userId) {
    try {
      if (!content.media || content.media.length === 0) {
        throw new Error('Instagram stories require media');
      }

      const media = content.media[0];
      const isVideo = media.type === 'video';

      const response = await axios.post(`${this.baseURL}/${userId}/media`, {
        [isVideo ? 'video_url' : 'image_url']: media.url,
        media_type: 'STORIES',
        access_token: accessToken
      });

      const publishResponse = await axios.post(`${this.baseURL}/${userId}/media_publish`, {
        creation_id: response.data.id,
        access_token: accessToken
      });

      return {
        id: publishResponse.data.id,
        url: `https://www.instagram.com/stories/${userId}/`
      };
    } catch (error) {
      console.error('Instagram story post error:', error.response?.data);
      throw new Error(`Failed to post Instagram story: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get hashtag insights
  async getHashtagInsights(accessToken, hashtag) {
    try {
      const response = await axios.get(`${this.baseURL}/ig_hashtag_search`, {
        params: {
          user_id: accessToken, // This would need the user ID
          q: hashtag,
          access_token: accessToken
        }
      });

      return response.data.data[0] || null;
    } catch (error) {
      console.error('Instagram hashtag insights error:', error.response?.data);
      return null;
    }
  }
}

module.exports = InstagramService;
