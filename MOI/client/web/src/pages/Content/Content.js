import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tab,
  Tabs,
  Avatar,
  Fab
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Schedule,
  Publish,
  Draft,
  AutoAwesome,
  FilterList,
  Search
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import aiService from '../../services/aiService';

export default function Content() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Mock data - replace with actual API calls
  const mockContent = [
    {
      id: 1,
      title: "AI in Healthcare: Revolutionary Changes",
      text: "Artificial Intelligence is transforming healthcare with predictive analytics, personalized treatment plans, and automated diagnostics. Here's how...",
      platform: "linkedin",
      status: "published",
      createdAt: "2024-01-15T10:00:00Z",
      scheduledAt: "2024-01-15T14:00:00Z",
      engagement: { likes: 45, comments: 12, shares: 8 },
      hashtags: ["#AI", "#Healthcare", "#Innovation"]
    },
    {
      id: 2,
      title: "Remote Work Best Practices",
      text: "Working remotely effectively requires the right tools, mindset, and processes. Here are 5 key strategies...",
      platform: "twitter",
      status: "scheduled",
      createdAt: "2024-01-14T09:00:00Z",
      scheduledAt: "2024-01-16T11:00:00Z",
      hashtags: ["#RemoteWork", "#Productivity"]
    },
    {
      id: 3,
      title: "Social Media Marketing Trends 2024",
      text: "The social media landscape continues to evolve. Here are the top trends to watch...",
      platform: "instagram",
      status: "draft",
      createdAt: "2024-01-13T15:30:00Z",
      hashtags: ["#SocialMedia", "#Marketing", "#Trends2024"]
    }
  ];

  const handleMenuClick = (event, content) => {
    setAnchorEl(event.currentTarget);
    setSelectedContent(content);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContent(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'warning';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getPlatformIcon = (platform) => {
    // Return platform-specific colors/icons
    const platformColors = {
      linkedin: '#0077B5',
      twitter: '#1DA1F2',
      instagram: '#E4405F',
      tiktok: '#000000'
    };
    return platformColors[platform] || '#666';
  };

  const filteredContent = mockContent.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         content.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || content.platform === filterPlatform;
    const matchesTab = tabValue === 0 || 
                      (tabValue === 1 && content.status === 'published') ||
                      (tabValue === 2 && content.status === 'scheduled') ||
                      (tabValue === 3 && content.status === 'draft');
    
    return matchesSearch && matchesPlatform && matchesTab;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Content Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={() => setAiDialogOpen(true)}
          >
            AI Generate
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Content
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search content..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={filterPlatform}
                label="Platform"
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <MenuItem value="all">All Platforms</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="tiktok">TikTok</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label={`All Content (${mockContent.length})`} />
        <Tab label={`Published (${mockContent.filter(c => c.status === 'published').length})`} />
        <Tab label={`Scheduled (${mockContent.filter(c => c.status === 'scheduled').length})`} />
        <Tab label={`Drafts (${mockContent.filter(c => c.status === 'draft').length})`} />
      </Tabs>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {filteredContent.map((content) => (
          <Grid item xs={12} md={6} lg={4} key={content.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        bgcolor: getPlatformIcon(content.platform),
                        fontSize: 12
                      }}
                    >
                      {content.platform[0].toUpperCase()}
                    </Avatar>
                    <Chip
                      label={content.status}
                      size="small"
                      color={getStatusColor(content.status)}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, content)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                {/* Content */}
                <Typography variant="h6" gutterBottom noWrap>
                  {content.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {content.text}
                </Typography>

                {/* Hashtags */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {content.hashtags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                {/* Engagement */}
                {content.engagement && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, color: 'text.secondary' }}>
                    <Typography variant="caption">
                      {content.engagement.likes} likes
                    </Typography>
                    <Typography variant="caption">
                      {content.engagement.comments} comments
                    </Typography>
                    <Typography variant="caption">
                      {content.engagement.shares} shares
                    </Typography>
                  </Box>
                )}

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                  <Typography variant="caption" color="text.secondary">
                    {content.status === 'scheduled' 
                      ? `Scheduled: ${new Date(content.scheduledAt).toLocaleDateString()}`
                      : `Created: ${new Date(content.createdAt).toLocaleDateString()}`
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); /* Edit action */ }}>
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Schedule action */ }}>
          <Schedule sx={{ mr: 1 }} /> Schedule
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Publish action */ }}>
          <Publish sx={{ mr: 1 }} /> Publish Now
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Delete action */ }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Create Content Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Content</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              margin="normal"
              placeholder="Enter content title..."
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={6}
              margin="normal"
              placeholder="Write your content here..."
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Platform</InputLabel>
                <Select label="Platform" defaultValue="linkedin">
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" defaultValue="draft">
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="scheduled">Schedule</MenuItem>
                  <MenuItem value="published">Publish Now</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate AI Content</DialogTitle>
        <DialogContent>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              setAiDialogOpen(false);
              navigate('/ai/generator');
            }}
            sx={{ mt: 2 }}
          >
            Go to AI Generator
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
}
