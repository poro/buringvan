const axios = require('axios');
const { setCache, getCache } = require('../../config/redis');

class LinkedInService {
  constructor() {
    this.baseURL = 'https://api.linkedin.com/v2';
    this.authURL = 'https://www.linkedin.com/oauth/v2';
  }

  // Generate OAuth URL for authorization
  getAuthUrl(state, redirectUri) {
    const scope = encodeURIComponent('r_liteprofile r_emailaddress w_member_social');
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    
    return `${this.authURL}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code, redirectUri) {
    try {
      const response = await axios.post(`${this.authURL}/accessToken`, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('LinkedIn token exchange error:', error.response?.data);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  // Get user profile information
  async getUserProfile(accessToken) {
    try {
      const cacheKey = `linkedin:profile:${accessToken.substring(0, 10)}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const [profileResponse, emailResponse] = await Promise.all([
        axios.get(`${this.baseURL}/people/~`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        axios.get(`${this.baseURL}/emailAddress?q=members&projection=(elements*(handle~))`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);

      const profile = {
        id: profileResponse.data.id,
        firstName: profileResponse.data.localizedFirstName,
        lastName: profileResponse.data.localizedLastName,
        email: emailResponse.data.elements?.[0]?.['handle~']?.emailAddress,
        profilePicture: profileResponse.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
        headline: profileResponse.data.localizedHeadline
      };

      await setCache(cacheKey, profile, 3600); // Cache for 1 hour
      return profile;
    } catch (error) {
      console.error('LinkedIn profile fetch error:', error.response?.data);
      throw new Error('Failed to fetch LinkedIn profile');
    }
  }

  // Post content to LinkedIn
  async postContent(accessToken, content, userId) {
    try {
      const postData = {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: content.media?.length > 0 ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Handle media attachments
      if (content.media?.length > 0) {
        const media = await this.uploadMedia(accessToken, content.media[0], userId);
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          description: {
            text: content.text
          },
          media: media.media,
          title: {
            text: content.title || 'Social Media Post'
          }
        }];
      }

      const response = await axios.post(`${this.baseURL}/ugcPosts`, postData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: response.data.id,
        url: `https://www.linkedin.com/feed/update/${response.data.id}/`
      };
    } catch (error) {
      console.error('LinkedIn post error:', error.response?.data);
      throw new Error(`Failed to post to LinkedIn: ${error.response?.data?.message || error.message}`);
    }
  }

  // Upload media for LinkedIn post
  async uploadMedia(accessToken, mediaFile, userId) {
    try {
      // Register upload
      const registerResponse = await axios.post(`${this.baseURL}/assets?action=registerUpload`, {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${userId}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Upload the actual file
      await axios.put(uploadUrl, mediaFile.buffer, {
        headers: {
          'Content-Type': mediaFile.mimetype
        }
      });

      return { media: asset };
    } catch (error) {
      console.error('LinkedIn media upload error:', error.response?.data);
      throw new Error('Failed to upload media to LinkedIn');
    }
  }

  // Get post analytics
  async getPostAnalytics(accessToken, postId) {
    try {
      const cacheKey = `linkedin:analytics:${postId}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseURL}/socialActions/${postId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const analytics = {
        likes: response.data.numLikes || 0,
        comments: response.data.numComments || 0,
        shares: response.data.numShares || 0,
        views: response.data.numViews || 0,
        clicks: response.data.numClicks || 0
      };

      await setCache(cacheKey, analytics, 300); // Cache for 5 minutes
      return analytics;
    } catch (error) {
      console.error('LinkedIn analytics error:', error.response?.data);
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        clicks: 0
      };
    }
  }

  // Delete a post
  async deletePost(accessToken, postId) {
    try {
      await axios.delete(`${this.baseURL}/ugcPosts/${postId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return true;
    } catch (error) {
      console.error('LinkedIn delete error:', error.response?.data);
      throw new Error('Failed to delete LinkedIn post');
    }
  }

  // Get user's posts
  async getUserPosts(accessToken, userId, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/ugcPosts?q=authors&authors=urn:li:person:${userId}&count=${limit}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return response.data.elements.map(post => ({
        id: post.id,
        text: post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text,
        createdAt: new Date(post.created.time),
        lastModified: new Date(post.lastModified.time)
      }));
    } catch (error) {
      console.error('LinkedIn posts fetch error:', error.response?.data);
      throw new Error('Failed to fetch LinkedIn posts');
    }
  }

  // Refresh access token (LinkedIn tokens don't expire, but this is for consistency)
  async refreshToken(refreshToken) {
    // LinkedIn access tokens are valid for 60 days and don't have refresh tokens
    // You need to re-authenticate users when tokens expire
    throw new Error('LinkedIn tokens cannot be refreshed. User must re-authenticate.');
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
}

module.exports = LinkedInService;
