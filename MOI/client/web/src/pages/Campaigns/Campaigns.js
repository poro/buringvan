import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
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
  DatePicker,
  Fab,
  Avatar,
  AvatarGroup,
  Divider
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Stop,
  TrendingUp,
  People,
  Schedule,
  Assignment
} from '@mui/icons-material';

export default function Campaigns() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Mock campaign data
  const mockCampaigns = [
    {
      id: 1,
      name: "AI Healthcare Revolution",
      description: "Educational campaign about AI's impact on healthcare industry",
      status: "active",
      startDate: "2024-01-01",
      endDate: "2024-03-31",
      platforms: ["linkedin", "twitter", "instagram"],
      contentCount: 12,
      publishedCount: 8,
      scheduledCount: 4,
      engagement: {
        totalReach: 15420,
        totalEngagement: 1256,
        avgEngagementRate: 8.1
      },
      budget: 2500,
      spent: 1680,
      team: [
        { name: "John Doe", avatar: "/avatars/john.jpg" },
        { name: "Jane Smith", avatar: "/avatars/jane.jpg" },
        { name: "Mike Wilson", avatar: "/avatars/mike.jpg" }
      ]
    },
    {
      id: 2,
      name: "Remote Work Best Practices",
      description: "Tips and strategies for effective remote work",
      status: "scheduled",
      startDate: "2024-02-01",
      endDate: "2024-04-30",
      platforms: ["linkedin", "twitter"],
      contentCount: 8,
      publishedCount: 0,
      scheduledCount: 8,
      engagement: {
        totalReach: 0,
        totalEngagement: 0,
        avgEngagementRate: 0
      },
      budget: 1500,
      spent: 0,
      team: [
        { name: "Sarah Connor", avatar: "/avatars/sarah.jpg" },
        { name: "Alex Johnson", avatar: "/avatars/alex.jpg" }
      ]
    },
    {
      id: 3,
      name: "Social Media Trends 2024",
      description: "Exploring the latest trends in social media marketing",
      status: "completed",
      startDate: "2023-11-01",
      endDate: "2023-12-31",
      platforms: ["instagram", "tiktok", "twitter"],
      contentCount: 20,
      publishedCount: 20,
      scheduledCount: 0,
      engagement: {
        totalReach: 45680,
        totalEngagement: 3240,
        avgEngagementRate: 7.1
      },
      budget: 3000,
      spent: 2890,
      team: [
        { name: "Emma Brown", avatar: "/avatars/emma.jpg" }
      ]
    }
  ];

  const handleMenuClick = (event, campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'scheduled': return 'warning';
      case 'paused': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getProgress = (campaign) => {
    if (campaign.contentCount === 0) return 0;
    return (campaign.publishedCount / campaign.contentCount) * 100;
  };

  const getBudgetProgress = (campaign) => {
    if (campaign.budget === 0) return 0;
    return (campaign.spent / campaign.budget) * 100;
  };

  const getPlatformIcons = (platforms) => {
    const icons = {
      linkedin: { color: '#0077B5', letter: 'L' },
      twitter: { color: '#1DA1F2', letter: 'T' },
      instagram: { color: '#E4405F', letter: 'I' },
      tiktok: { color: '#000000', letter: 'T' }
    };
    
    return platforms.map(platform => icons[platform] || { color: '#666', letter: platform[0].toUpperCase() });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Campaign Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Campaign
        </Button>
      </Box>

      {/* Campaign Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Campaigns
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {mockCampaigns.filter(c => c.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Reach
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {mockCampaigns.reduce((sum, c) => sum + c.engagement.totalReach, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Budget
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                ${mockCampaigns.reduce((sum, c) => sum + c.budget, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg. Engagement
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {(mockCampaigns.reduce((sum, c) => sum + c.engagement.avgEngagementRate, 0) / mockCampaigns.length).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Campaigns Grid */}
      <Grid container spacing={3}>
        {mockCampaigns.map((campaign) => (
          <Grid item xs={12} lg={6} key={campaign.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {campaign.name}
                      </Typography>
                      <Chip
                        label={campaign.status}
                        size="small"
                        color={getStatusColor(campaign.status)}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {campaign.description}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, campaign)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                {/* Platforms */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {getPlatformIcons(campaign.platforms).map((platform, index) => (
                    <Avatar
                      key={index}
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: platform.color,
                        fontSize: 12
                      }}
                    >
                      {platform.letter}
                    </Avatar>
                  ))}
                </Box>

                {/* Progress */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Content Progress</Typography>
                    <Typography variant="body2">
                      {campaign.publishedCount}/{campaign.contentCount}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgress(campaign)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Budget */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Budget</Typography>
                    <Typography variant="body2">
                      ${campaign.spent.toLocaleString()}/${campaign.budget.toLocaleString()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getBudgetProgress(campaign)}
                    color={getBudgetProgress(campaign) > 90 ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Metrics */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {campaign.engagement.totalReach.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Reach
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {campaign.engagement.totalEngagement.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Engagement
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {campaign.engagement.avgEngagementRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Team & Dates */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Team
                    </Typography>
                    <AvatarGroup max={3} sx={{ mt: 0.5 }}>
                      {campaign.team.map((member, index) => (
                        <Avatar key={index} sx={{ width: 24, height: 24 }}>
                          {member.name[0]}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Duration
                    </Typography>
                    <Typography variant="body2">
                      {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); /* Edit action */ }}>
          <Edit sx={{ mr: 1 }} /> Edit Campaign
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* View content */ }}>
          <Assignment sx={{ mr: 1 }} /> View Content
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Analytics */ }}>
          <TrendingUp sx={{ mr: 1 }} /> Analytics
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Pause/Play */ }}>
          {selectedCampaign?.status === 'active' ? <Pause sx={{ mr: 1 }} /> : <PlayArrow sx={{ mr: 1 }} />}
          {selectedCampaign?.status === 'active' ? 'Pause' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Delete */ }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Create Campaign Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Campaign Name"
              fullWidth
              margin="normal"
              placeholder="Enter campaign name..."
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              placeholder="Describe your campaign..."
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Platforms</InputLabel>
                <Select label="Platforms" multiple defaultValue={[]}>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Budget ($)"
                type="number"
                sx={{ flex: 1 }}
                placeholder="0"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Create Campaign</Button>
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
