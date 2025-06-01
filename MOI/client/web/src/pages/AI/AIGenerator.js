import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  CircularProgress, 
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import aiService from '../../services/aiService';

export default function AIGenerator() {
  const [formData, setFormData] = useState({
    topic: '',
    platform: 'linkedin',
    contentType: 'text',
    tone: 'professional',
    style: 'conversational'
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const result = await aiService.generateContent(formData);
      setGeneratedContent(result.data.content);
    } catch (error) {
      console.error('Error generating content:', error);
      setGeneratedContent({ 
        text: 'Error generating content. Please try again.',
        hashtags: [],
        mentions: []
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        AI Content Generator
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Topic"
              placeholder="e.g., AI in healthcare, Remote work tips, Social media strategy"
              variant="outlined"
              fullWidth
              value={formData.topic}
              onChange={handleInputChange('topic')}
            />
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Platform</InputLabel>
                <Select
                  value={formData.platform}
                  label="Platform"
                  onChange={handleInputChange('platform')}
                >
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={formData.contentType}
                  label="Content Type"
                  onChange={handleInputChange('contentType')}
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="image">Image</MenuItem>
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="carousel">Carousel</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Tone</InputLabel>
                <Select
                  value={formData.tone}
                  label="Tone"
                  onChange={handleInputChange('tone')}
                >
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="casual">Casual</MenuItem>
                  <MenuItem value="humorous">Humorous</MenuItem>
                  <MenuItem value="inspirational">Inspirational</MenuItem>
                  <MenuItem value="educational">Educational</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Style</InputLabel>
                <Select
                  value={formData.style}
                  label="Style"
                  onChange={handleInputChange('style')}
                >
                  <MenuItem value="conversational">Conversational</MenuItem>
                  <MenuItem value="formal">Formal</MenuItem>
                  <MenuItem value="storytelling">Storytelling</MenuItem>
                  <MenuItem value="listicle">Listicle</MenuItem>
                  <MenuItem value="question">Question</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button 
              variant="contained" 
              size="large"
              onClick={handleSubmit} 
              disabled={loading || !formData.topic.trim()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Content'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {generatedContent && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Content
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {generatedContent.text}
            </Typography>
            
            {generatedContent.hashtags?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Hashtags:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {generatedContent.hashtags.map((hashtag, index) => (
                    <Chip key={index} label={hashtag} variant="outlined" size="small" />
                  ))}
                </Box>
              </Box>
            )}

            {generatedContent.mentions?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Mentions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {generatedContent.mentions.map((mention, index) => (
                    <Chip key={index} label={mention} variant="outlined" size="small" color="primary" />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
