const { TwitterApi } = require('twitter-api-v2');
const { setCache, getCache } = require('../../config/redis');

class TwitterService {
  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  }

  // Generate OAuth URL for authorization
  getAuthUrl(callbackUrl) {
    const authLink = this.client.generateAuthLink(callbackUrl, { 
      linkMode: 'authorize',
      forceLogin: true 
    });
    return authLink;
  }

  // Exchange authorization tokens for access tokens
  async getAccessToken(oauthToken, oauthVerifier) {
    try {
      const { client: loggedClient, accessToken, accessSecret } = await this.client.login(oauthVerifier);
      
      return {
        accessToken,
        accessSecret,
        client: loggedClient
      };
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      throw new Error('Failed to exchange authorization tokens for access tokens');
    }
  }

  // Get user profile information
  async getUserProfile(accessToken, accessSecret) {
    try {
      const cacheKey = `twitter:profile:${accessToken.substring(0, 10)}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      const user = await client.v2.me({
        'user.fields': ['id', 'name', 'username', 'profile_image_url', 'public_metrics', 'description']
      });

      const profile = {
        id: user.data.id,
        name: user.data.name,
        username: user.data.username,
        profileImage: user.data.profile_image_url,
        description: user.data.description,
        followers: user.data.public_metrics?.followers_count || 0,
        following: user.data.public_metrics?.following_count || 0,
        tweets: user.data.public_metrics?.tweet_count || 0
      };

      await setCache(cacheKey, profile, 3600); // Cache for 1 hour
      return profile;
    } catch (error) {
      console.error('Twitter profile fetch error:', error);
      throw new Error('Failed to fetch Twitter profile');
    }
  }

  // Post content to Twitter
  async postContent(accessToken, accessSecret, content) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      let tweetData = {
        text: content.text
      };

      // Handle media attachments
      if (content.media?.length > 0) {
        const mediaIds = [];
        
        for (const media of content.media) {
          const mediaId = await this.uploadMedia(client, media);
          mediaIds.push(mediaId);
        }
        
        tweetData.media = { media_ids: mediaIds };
      }

      // Handle thread (if text is too long)
      const tweets = this.splitIntoTweets(content.text);
      
      if (tweets.length === 1) {
        const response = await client.v2.tweet(tweetData);
        return {
          id: response.data.id,
          url: `https://twitter.com/i/status/${response.data.id}`
        };
      } else {
        // Create thread
        const threadResponses = [];
        let replyToId = null;
        
        for (let i = 0; i < tweets.length; i++) {
          const threadTweetData = {
            text: tweets[i],
            ...(replyToId && { reply: { in_reply_to_tweet_id: replyToId } }),
            ...(i === 0 && content.media?.length > 0 && { media: tweetData.media })
          };
          
          const response = await client.v2.tweet(threadTweetData);
          threadResponses.push(response.data);
          replyToId = response.data.id;
        }
        
        return {
          id: threadResponses[0].id,
          url: `https://twitter.com/i/status/${threadResponses[0].id}`,
          thread: threadResponses
        };
      }
    } catch (error) {
      console.error('Twitter post error:', error);
      throw new Error(`Failed to post to Twitter: ${error.message}`);
    }
  }

  // Upload media for Twitter post
  async uploadMedia(client, mediaFile) {
    try {
      const mediaId = await client.v1.uploadMedia(mediaFile.buffer, { 
        mimeType: mediaFile.mimetype,
        target: 'tweet'
      });
      
      return mediaId;
    } catch (error) {
      console.error('Twitter media upload error:', error);
      throw new Error('Failed to upload media to Twitter');
    }
  }

  // Split long text into tweet-sized chunks
  splitIntoTweets(text, maxLength = 280) {
    if (text.length <= maxLength) {
      return [text];
    }

    const tweets = [];
    const words = text.split(' ');
    let currentTweet = '';
    let tweetIndex = 1;

    for (const word of words) {
      const threadIndicator = tweets.length === 0 ? '' : ` (${tweetIndex + 1}/?)`;
      const testTweet = currentTweet + (currentTweet ? ' ' : '') + word + threadIndicator;
      
      if (testTweet.length <= maxLength) {
        currentTweet += (currentTweet ? ' ' : '') + word;
      } else {
        if (currentTweet) {
          const finalIndicator = ` (${tweetIndex}/?)`;
          tweets.push(currentTweet + finalIndicator);
          tweetIndex++;
        }
        currentTweet = word;
      }
    }

    if (currentTweet) {
      const finalIndicator = ` (${tweetIndex}/?)`;
      tweets.push(currentTweet + finalIndicator);
    }

    // Update thread indicators with final count
    return tweets.map((tweet, index) => 
      tweet.replace(/\(\d+\/\?\)/, `(${index + 1}/${tweets.length})`)
    );
  }

  // Get tweet analytics
  async getTweetAnalytics(accessToken, accessSecret, tweetId) {
    try {
      const cacheKey = `twitter:analytics:${tweetId}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      const tweet = await client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at'],
        expansions: ['author_id']
      });

      const analytics = {
        views: tweet.data.public_metrics?.impression_count || 0,
        likes: tweet.data.public_metrics?.like_count || 0,
        retweets: tweet.data.public_metrics?.retweet_count || 0,
        replies: tweet.data.public_metrics?.reply_count || 0,
        quotes: tweet.data.public_metrics?.quote_count || 0,
        bookmarks: tweet.data.public_metrics?.bookmark_count || 0
      };

      await setCache(cacheKey, analytics, 300); // Cache for 5 minutes
      return analytics;
    } catch (error) {
      console.error('Twitter analytics error:', error);
      return {
        views: 0,
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        bookmarks: 0
      };
    }
  }

  // Delete a tweet
  async deleteTweet(accessToken, accessSecret, tweetId) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      await client.v2.deleteTweet(tweetId);
      return true;
    } catch (error) {
      console.error('Twitter delete error:', error);
      throw new Error('Failed to delete tweet');
    }
  }

  // Get user's tweets
  async getUserTweets(accessToken, accessSecret, userId, limit = 10) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      const tweets = await client.v2.userTimeline(userId, {
        max_results: limit,
        'tweet.fields': ['created_at', 'public_metrics', 'text']
      });

      return tweets.data?.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: new Date(tweet.created_at),
        metrics: tweet.public_metrics
      })) || [];
    } catch (error) {
      console.error('Twitter tweets fetch error:', error);
      throw new Error('Failed to fetch Twitter tweets');
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      // Twitter OAuth 1.0a tokens don't expire, but OAuth 2.0 tokens do
      // This would be for OAuth 2.0 flow
      const response = await axios.post('https://api.twitter.com/2/oauth2/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.TWITTER_CLIENT_ID
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Twitter token refresh error:', error);
      throw new Error('Failed to refresh Twitter token');
    }
  }

  // Validate access token
  async validateToken(accessToken, accessSecret) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      await client.v2.me();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Search tweets (for hashtag analytics)
  async searchTweets(accessToken, accessSecret, query, limit = 100) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
      });

      const tweets = await client.v2.search(query, {
        max_results: limit,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id']
      });

      return tweets.data?.data || [];
    } catch (error) {
      console.error('Twitter search error:', error);
      throw new Error('Failed to search tweets');
    }
  }
}

module.exports = TwitterService;
