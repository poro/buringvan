const OpenAI = require('openai');
const Redis = require('redis');
const { createClient } = require('redis');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize Redis for caching
    this.redis = createClient({
      url: process.env.REDIS_URL
    });
    
    this.redis.connect().catch(console.error);
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  getSystemPrompt(platform) {
    const prompts = {
      linkedin: 'You are a professional LinkedIn content creator. Generate engaging, professional content that includes relevant hashtags and mentions.',
      twitter: 'You are a Twitter content creator. Generate concise, engaging tweets with relevant hashtags and mentions.',
      instagram: 'You are an Instagram content creator. Generate visually descriptive captions with relevant hashtags and mentions.'
    };
    return prompts[platform] || prompts.linkedin;
  }

  // Generate content based on parameters (for controller)
  async generateContent(userId, generationParams, campaignId = null) {
    const { topic, platform, contentType, tone, style, targetAudience, keyPoints, variations = 1 } = generationParams;
    
    // Build the prompt
    let prompt = `Create ${contentType} content for ${platform} about: ${topic}`;
    if (tone) prompt += `\nTone: ${tone}`;
    if (style) prompt += `\nStyle: ${style}`;
    if (targetAudience) prompt += `\nTarget audience: ${targetAudience}`;
    if (keyPoints && keyPoints.length > 0) {
      prompt += `\nKey points to include: ${keyPoints.join(', ')}`;
    }
    prompt += '\n\nGenerate engaging content with relevant hashtags.';
    
    return await this.generateContentFromPrompt(prompt, { platform, contentType, tone, style });
  }

  // Generate content based on prompt and preferences  
  async generateContentFromPrompt(prompt, options = {}) {
    try {
      const cacheKey = `content:${prompt}:${JSON.stringify(options)}`;
      let cachedResult;

      try {
        cachedResult = await this.redis.get(cacheKey);
      } catch (error) {
        console.error('Redis error:', error);
        // Fallback: continue without cache
      }

      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      const platform = options.platform || 'linkedin';
      const systemPrompt = this.getSystemPrompt(platform);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const content = response.choices[0].message.content;
      let parsedContent;

      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        // If not valid JSON, try to parse as text format
        const lines = content.split('\n');
        parsedContent = {
          text: lines.find(line => line.trim() && !line.startsWith('#') && !line.startsWith('@'))?.trim() || '',
          hashtags: lines.filter(line => line.startsWith('#')).map(tag => tag.trim()),
          mentions: lines.filter(line => line.startsWith('@')).map(mention => mention.trim())
        };

        if (!parsedContent.text) {
          throw new Error('Invalid response format: No text content found');
        }
      }

      const result = {
        text: parsedContent.text,
        hashtags: parsedContent.hashtags || [],
        mentions: parsedContent.mentions || [],
        generatedAt: new Date().toISOString()
      };

      try {
        await this.redis.setEx(cacheKey, 3600, JSON.stringify(result));
      } catch (error) {
        console.error('Redis error:', error);
        // Continue without caching
      }

      return result;
    } catch (error) {
      console.error('AI content generation error:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  // Generate multiple content variations
  async generateContentVariations(prompt, options = {}, count = 3) {
    try {
      const variations = await Promise.all(
        Array.from({ length: count }, (_, i) => 
          this.generateContentFromPrompt(prompt, {
            ...options,
            temperature: options.temperature || (0.7 + (i * 0.1)) // Vary temperature for diversity
          })
        )
      );

      return variations;
    } catch (error) {
      throw new Error(`Failed to generate content variations: ${error.message}`);
    }
  }

  // Generate content for multiple platforms
  async generateMultiPlatformContent(prompt, platforms, baseOptions = {}) {
    try {
      const contentMap = {};
      
      for (const platform of platforms) {
        const platformOptions = {
          ...baseOptions,
          platform,
          ...this.getPlatformSpecificOptions(platform)
        };
        
        contentMap[platform] = await this.generateContentFromPrompt(prompt, platformOptions);
      }

      return contentMap;
    } catch (error) {
      throw new Error(`Failed to generate multi-platform content: ${error.message}`);
    }
  }

  // Improve existing content based on feedback
  async improveContent(originalContent, feedback, userPreferences = {}) {
    try {
      const improvementPrompt = this.buildImprovementPrompt(originalContent, feedback, userPreferences);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert social media content optimizer. Improve the given content based on the feedback while maintaining its core message and style." },
          { role: "user", content: improvementPrompt }
        ],
        temperature: 0.3, // Lower temperature for more focused improvements
        max_tokens: 1000
      });

      const improvedText = completion.choices[0].message.content.trim();
      const parsedContent = this.parseGeneratedContent(improvedText, originalContent.platform);

      return {
        ...parsedContent,
        metadata: {
          model: "gpt-4",
          temperature: 0.3,
          tokens: completion.usage.total_tokens,
          generatedAt: new Date().toISOString(),
          improvementType: 'user_feedback',
          originalContent: originalContent.text,
          feedback
        }
      };
    } catch (error) {
      throw new Error(`Failed to improve content: ${error.message}`);
    }
  }

  // Generate hashtags for content
  async generateHashtags(content, platform, count = 5) {
    try {
      const prompt = `Generate ${count} relevant and trending hashtags for this ${platform} content. Return only the hashtags, one per line, with the # symbol:

Content: ${content}

Requirements:
- Relevant to the content topic
- Platform-appropriate (${platform})
- Mix of popular and niche hashtags
- No spaces in hashtags
- Maximum 2-3 words per hashtag`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 200
      });

      const hashtagText = completion.choices[0].message.content.trim();
      const hashtags = hashtagText
        .split('\n')
        .map(tag => tag.trim())
        .filter(tag => tag.startsWith('#'))
        .slice(0, count);

      return hashtags;
    } catch (error) {
      throw new Error(`Failed to generate hashtags: ${error.message}`);
    }
  }

  // Analyze content performance and suggest improvements
  async analyzeContentPerformance(contentData, analyticsData) {
    try {
      const analysisPrompt = `Analyze this social media content performance and provide improvement suggestions:

Content: ${contentData.text}
Platform: ${contentData.platform}
Type: ${contentData.type}

Performance Metrics:
- Views: ${analyticsData.views}
- Likes: ${analyticsData.likes}
- Comments: ${analyticsData.comments}
- Shares: ${analyticsData.shares}
- Engagement Rate: ${analyticsData.engagementRate}%

Provide specific, actionable suggestions for improving future content based on this performance data.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a social media analytics expert. Provide specific, actionable insights based on content performance data." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return {
        analysis: completion.choices[0].message.content.trim(),
        performanceScore: this.calculatePerformanceScore(analyticsData),
        suggestions: this.extractSuggestions(completion.choices[0].message.content),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to analyze content performance: ${error.message}`);
    }
  }

  // Helper methods
  buildSystemPrompt(platform, contentType, tone, style, userPreferences) {
    const platformGuidelines = this.getPlatformGuidelines(platform);
    const toneDescription = this.getToneDescription(tone);
    const styleDescription = this.getStyleDescription(style);

    return `You are an expert social media content creator specializing in ${platform}. 

Platform Guidelines: ${platformGuidelines}
Tone: ${toneDescription}
Style: ${styleDescription}

User Preferences:
${userPreferences.themes ? `- Preferred themes: ${userPreferences.themes.join(', ')}` : ''}
${userPreferences.topics ? `- Topics to focus on: ${userPreferences.topics.join(', ')}` : ''}
${userPreferences.doNotUse ? `- Avoid these words/phrases: ${userPreferences.doNotUse.join(', ')}` : ''}

Create engaging, platform-appropriate content that follows best practices and aligns with the specified tone and style.`;
  }

  buildUserPrompt(prompt, platform, includeHashtags, maxLength) {
    let userPrompt = `Create a ${platform} post about: ${prompt}

Requirements:
- Platform: ${platform}
${maxLength ? `- Maximum length: ${maxLength} characters` : ''}
${includeHashtags ? '- Include relevant hashtags' : '- Do not include hashtags'}
- Make it engaging and shareable
- Follow platform best practices

Format your response as:
TEXT: [the main content]
${includeHashtags ? 'HASHTAGS: [comma-separated hashtags]' : ''}
${platform === 'linkedin' ? 'MENTIONS: [any relevant mentions if applicable]' : ''}`;

    return userPrompt;
  }

  buildImprovementPrompt(originalContent, feedback, userPreferences) {
    return `Improve this social media content based on the feedback:

Original Content: ${originalContent.text}
Platform: ${originalContent.platform}

Feedback: ${feedback}

User Preferences:
${userPreferences.tone ? `- Preferred tone: ${userPreferences.tone}` : ''}
${userPreferences.style ? `- Preferred style: ${userPreferences.style}` : ''}

Provide an improved version that addresses the feedback while maintaining the core message.`;
  }

  parseGeneratedContent(text, platform) {
    // Only allow JSON parsing for OpenAI responses
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          text: parsed.text || text,
          hashtags: parsed.hashtags || [],
          mentions: parsed.mentions || [],
          platform
        };
      }
      throw new Error('Invalid response format: Not an object');
    } catch (error) {
      throw new Error('Invalid response format: Not valid JSON');
    }
  }

  getPlatformGuidelines(platform) {
    const guidelines = {
      linkedin: 'Professional network focused on business content. Posts can be longer (up to 3000 chars). Use professional tone, industry insights, and thought leadership.',
      twitter: 'Microblogging platform with 280 character limit. Be concise, use trending hashtags, engage in conversations.',
      instagram: 'Visual platform with captions up to 2200 chars. Focus on visual storytelling, lifestyle content, use emojis and hashtags.',
      tiktok: 'Short-form video platform. Captions should be catchy, use trending sounds/hashtags, appeal to younger audience.',
      youtube: 'Video platform. Create compelling titles and descriptions that encourage views and engagement.'
    };
    return guidelines[platform] || 'General social media best practices apply.';
  }

  getToneDescription(tone) {
    const tones = {
      professional: 'Formal, authoritative, industry-focused',
      casual: 'Conversational, friendly, approachable',
      creative: 'Innovative, artistic, out-of-the-box thinking',
      educational: 'Informative, helpful, knowledge-sharing',
      inspirational: 'Motivating, uplifting, encouraging'
    };
    return tones[tone] || 'Balanced and appropriate for the context';
  }

  getStyleDescription(style) {
    const styles = {
      funny: 'Use humor and wit to engage audience',
      serious: 'Straightforward, factual, no-nonsense approach',
      informative: 'Focus on providing valuable information and insights',
      story: 'Use narrative structure and storytelling techniques',
      question: 'Engage audience with thought-provoking questions'
    };
    return styles[style] || 'Adapt style to content and audience';
  }

  getPlatformSpecificOptions(platform) {
    const options = {
      linkedin: { maxLength: 3000, tone: 'professional' },
      twitter: { maxLength: 280, tone: 'casual' },
      instagram: { maxLength: 2200, hashtags: true },
      tiktok: { maxLength: 300, tone: 'casual' },
      youtube: { maxLength: 5000, tone: 'educational' }
    };
    return options[platform] || {};
  }

  getTemperature(style) {
    const temperatures = {
      professional: 0.3,
      casual: 0.7,
      creative: 0.9,
      educational: 0.4,
      inspirational: 0.6
    };
    return temperatures[style] || 0.7;
  }

  getMaxTokens(platform, contentType) {
    const tokens = {
      linkedin: 800,
      twitter: 100,
      instagram: 600,
      tiktok: 200,
      youtube: 1000
    };
    return tokens[platform] || 500;
  }

  calculatePerformanceScore(analytics) {
    const { views, likes, comments, shares, engagementRate } = analytics;
    
    // Weighted scoring system
    const engagementScore = (likes * 1 + comments * 2 + shares * 3) / Math.max(views, 1);
    const performanceScore = Math.min(100, (engagementScore * 100 + engagementRate) / 2);
    
    return Math.round(performanceScore);
  }

  extractSuggestions(analysisText) {
    // Extract actionable suggestions from the analysis
    const lines = analysisText.split('\n');
    const suggestions = lines
      .filter(line => line.includes('suggest') || line.includes('recommend') || line.includes('try'))
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  hashPrompt(prompt) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

module.exports = new AIService();
