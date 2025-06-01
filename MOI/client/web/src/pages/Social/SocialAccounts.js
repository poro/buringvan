import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Switch,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Add,
  Settings,
  Delete,
  Refresh,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  LinkedIn,
  Twitter,
  Instagram,
  Schedule,
  TrendingUp
} from '@mui/icons-material';

export default function SocialAccounts() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  // Mock social accounts data
  const mockAccounts = [
    {
      id: 1,
      platform: 'linkedin',
      name: 'TechCorp Inc.',
      username: '@techcorp-inc',
      status: 'connected',
      followers: 12500,
      following: 890,
      posts: 245,
      engagement: 8.5,
      lastSync: '2024-01-15T10:30:00Z',
      permissions: ['read', 'write', 'publish'],
      avatar: '/avatars/techcorp.jpg',
      isActive: true,
      metrics: {
        reach: 45600,
        impressions: 78900,
        clicks: 2340
      }
    },
    {
      id: 2,
      platform: 'twitter',
      name: 'TechCorp',
      username: '@techcorp',
      status: 'connected',
      followers: 8900,
      following: 1200,
      posts: 1240,
      engagement: 6.2,
      lastSync: '2024-01-15T09:45:00Z',
      permissions: ['read', 'write', 'publish'],
      avatar: '/avatars/techcorp-twitter.jpg',
      isActive: true,
      metrics: {
        reach: 32100,
        impressions: 56700,
        clicks: 1890
      }
    },
    {
      id: 3,
      platform: 'instagram',
      name: 'techcorp_official',
      username: '@techcorp_official',
      status: 'error',
      followers: 15600,
      following: 450,
      posts: 156,
      engagement: 9.8,
      lastSync: '2024-01-14T16:20:00Z',
      permissions: ['read'],
      avatar: '/avatars/techcorp-ig.jpg',
      isActive: false,
      error: 'Token expired. Please reconnect.',
      metrics: {
        reach: 28900,
        impressions: 42300,
        clicks: 3120
      }
    },
    {
      id: 4,
      platform: 'tiktok',
      name: 'TechCorpTikTok',
      username: '@techcorptiktok',
      status: 'pending',
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      lastSync: null,
      permissions: [],
      avatar: '/avatars/techcorp-tiktok.jpg',
      isActive: false,
      metrics: {
        reach: 0,
        impressions: 0,
        clicks: 0
      }
    }
  ];

  const handleMenuClick = (event, account) => {
    setAnchorEl(event.currentTarget);
    setSelectedAccount(account);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAccount(null);
  };

  const handleConnectPlatform = async (platform) => {
    setConnecting(true);
    setConnectingPlatform(platform);
    
    try {
      // Step 1: Get OAuth authorization URL from backend
      const response = await fetch(`http://localhost:3004/api/social/auth/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming JWT token storage
        },
        body: JSON.stringify({
          redirectUri: `${window.location.origin}/social/callback`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Step 2: Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || 'Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert(`Failed to connect to ${platform}: ${error.message}`);
    } finally {
      setConnecting(false);
      setConnectingPlatform(null);
      setConnectDialogOpen(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'pending': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle color="success" />;
      case 'pending': return <Warning color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return null;
    }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      linkedin: { icon: LinkedIn, color: '#0077B5' },
      twitter: { icon: Twitter, color: '#1DA1F2' },
      instagram: { icon: Instagram, color: '#E4405F' },
      tiktok: { icon: () => <span style={{ fontSize: 24, fontWeight: 'bold' }}>T</span>, color: '#000000' }
    };
    return icons[platform] || { icon: () => null, color: '#666' };
  };

  const getPlatformColor = (platform) => {
    const colors = {
      linkedin: '#0077B5',
      twitter: '#1DA1F2',
      instagram: '#E4405F',
      tiktok: '#000000'
    };
    return colors[platform] || '#666';
  };

  const connectedAccounts = mockAccounts.filter(account => account.status === 'connected');
  const totalReach = connectedAccounts.reduce((sum, account) => sum + account.metrics.reach, 0);
  const avgEngagement = connectedAccounts.reduce((sum, account) => sum + account.engagement, 0) / (connectedAccounts.length || 1);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Social Media Accounts
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setConnectDialogOpen(true)}
        >
          Connect Account
        </Button>
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Connected Accounts
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {connectedAccounts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Followers
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {connectedAccounts.reduce((sum, account) => sum + account.followers, 0).toLocaleString()}
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
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {totalReach.toLocaleString()}
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
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {avgEngagement.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Accounts Grid */}
      <Grid container spacing={3}>
        {mockAccounts.map((account) => {
          const platformInfo = getPlatformIcon(account.platform);
          const IconComponent = platformInfo.icon;
          
          return (
            <Grid item xs={12} md={6} lg={4} key={account.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: platformInfo.color,
                          width: 48,
                          height: 48
                        }}
                      >
                        <IconComponent />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {account.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.username}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(account.status)}
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, account)}
                      >
                        <Settings />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Status */}
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={account.status}
                      size="small"
                      color={getStatusColor(account.status)}
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {/* Error Message */}
                  {account.error && (
                    <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
                      {account.error}
                    </Alert>
                  )}

                  {/* Stats */}
                  {account.status === 'connected' && (
                    <>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight="bold">
                              {account.followers.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Followers
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight="bold">
                              {account.posts.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Posts
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight="bold">
                              {account.engagement}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Engagement
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      {/* Metrics */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Recent Performance
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Reach: {account.metrics.reach.toLocaleString()}</Typography>
                          <Typography variant="body2">Clicks: {account.metrics.clicks.toLocaleString()}</Typography>
                        </Box>
                      </Box>
                    </>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    <Typography variant="caption" color="text.secondary">
                      {account.lastSync 
                        ? `Last sync: ${new Date(account.lastSync).toLocaleDateString()}`
                        : 'Not synced'
                      }
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">Active</Typography>
                      <Switch
                        checked={account.isActive}
                        size="small"
                        disabled={account.status !== 'connected'}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {/* Add New Account Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px dashed',
              borderColor: 'grey.300',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'grey.50'
              }
            }}
            onClick={() => setConnectDialogOpen(true)}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Add sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                Connect New Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add LinkedIn, Twitter, Instagram or TikTok
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Account Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); /* Refresh action */ }}>
          <Refresh sx={{ mr: 1 }} /> Refresh Account
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* View analytics */ }}>
          <TrendingUp sx={{ mr: 1 }} /> View Analytics
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Schedule content */ }}>
          <Schedule sx={{ mr: 1 }} /> Schedule Content
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Settings */ }}>
          <Settings sx={{ mr: 1 }} /> Account Settings
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); /* Disconnect */ }}>
          <Delete sx={{ mr: 1 }} /> Disconnect
        </MenuItem>
      </Menu>

      {/* Connect Account Dialog */}
      <Dialog open={connectDialogOpen} onClose={() => setConnectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect Social Media Account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a platform to connect your social media account
          </Typography>
          
          <Grid container spacing={2}>
            {[
              { platform: 'linkedin', name: 'LinkedIn', available: true },
              { platform: 'twitter', name: 'Twitter', available: true },
              { platform: 'instagram', name: 'Instagram', available: true },
              { platform: 'tiktok', name: 'TikTok', available: false }
            ].map((platform) => {
              const platformInfo = getPlatformIcon(platform.platform);
              const IconComponent = platformInfo.icon;
              
              return (
                <Grid item xs={6} key={platform.platform}>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!platform.available || (connecting && connectingPlatform === platform.platform)}
                    sx={{
                      height: 80,
                      flexDirection: 'column',
                      gap: 1,
                      borderColor: platformInfo.color,
                      '&:hover': {
                        borderColor: platformInfo.color,
                        bgcolor: `${platformInfo.color}10`
                      }
                    }}
                    onClick={() => handleConnectPlatform(platform.platform)}
                  >
                    <Avatar sx={{ bgcolor: platformInfo.color, width: 32, height: 32 }}>
                      <IconComponent style={{ fontSize: 20 }} />
                    </Avatar>
                    <Typography variant="body2">
                      {connecting && connectingPlatform === platform.platform ? 'Connecting...' : (
                        <>
                          {platform.name}
                          {!platform.available && ' (Soon)'}
                        </>
                      )}
                    </Typography>
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
