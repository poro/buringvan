import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  CircularProgress,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  ContentCopy,
  Campaign,
  AutoAwesome,
  Analytics,
  Schedule,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { contentAPI, analyticsAPI, socialAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);

  // Check for Google OAuth success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      setShowAuthSuccess(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch dashboard data
  const { data: contentData, isLoading: contentLoading, refetch: refetchContent } = useQuery(
    'dashboard-content',
    () => contentAPI.getContent({ limit: 5, sort: '-createdAt' }),
    { enabled: !!user }
  );

  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery(
    'dashboard-analytics',
    () => analyticsAPI.getMetrics({ timeRange: '30d' }),
    { enabled: !!user }
  );

  const { data: socialData, isLoading: socialLoading, refetch: refetchSocial } = useQuery(
    'dashboard-social',
    () => socialAPI.getAccounts(),
    { enabled: !!user }
  );

  const handleRefresh = () => {
    refetchContent();
    refetchAnalytics();
    refetchSocial();
  };

  const mockEngagementData = [
    { name: 'Mon', engagement: 85, reach: 120 },
    { name: 'Tue', engagement: 92, reach: 150 },
    { name: 'Wed', engagement: 78, reach: 110 },
    { name: 'Thu', engagement: 105, reach: 180 },
    { name: 'Fri', engagement: 98, reach: 160 },
    { name: 'Sat', engagement: 115, reach: 200 },
    { name: 'Sun', engagement: 88, reach: 140 },
  ];

  const mockPlatformData = [
    { name: 'LinkedIn', value: 35, color: '#0077B5' },
    { name: 'Twitter', value: 28, color: '#1DA1F2' },
    { name: 'Instagram', value: 25, color: '#E4405F' },
    { name: 'TikTok', value: 12, color: '#000000' },
  ];

  const isLoading = contentLoading || analyticsLoading || socialLoading;

  return (
    <Box>
      {/* Google Auth Success Notification */}
      <Snackbar 
        open={showAuthSuccess} 
        autoHideDuration={6000} 
        onClose={() => setShowAuthSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowAuthSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Successfully logged in with Google!
        </Alert>
      </Snackbar>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome back, {user?.name?.split(' ')[0]}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your social media today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/content/new')}
          >
            Create Content
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Content
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {contentData?.data?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +12% from last month
                  </Typography>
                </Box>
                <ContentCopy sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Connected Accounts
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {socialData?.data?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="info.main">
                    Across platforms
                  </Typography>
                </Box>
                <Campaign sx={{ fontSize: 40, color: 'secondary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    This Month's Reach
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    24.5K
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +28% from last month
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Engagement Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    8.2%
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +3.1% from last month
                  </Typography>
                </Box>
                <Analytics sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Engagement Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Weekly Engagement & Reach
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockEngagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#1976d2"
                      strokeWidth={2}
                      name="Engagement"
                    />
                    <Line
                      type="monotone"
                      dataKey="reach"
                      stroke="#dc004e"
                      strokeWidth={2}
                      name="Reach"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Platform Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Platform Distribution
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockPlatformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockPlatformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {mockPlatformData.map((platform, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: platform.color,
                          borderRadius: '50%',
                        }}
                      />
                      <Typography variant="body2">{platform.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {platform.value}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Content */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Content
                </Typography>
                <Button
                  variant="text"
                  onClick={() => navigate('/content')}
                  sx={{ textTransform: 'none' }}
                >
                  View All
                </Button>
              </Box>
              
              {contentLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {contentData?.data?.content?.slice(0, 5).map((content, index) => (
                    <Box
                      key={content._id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: index < 4 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium" noWrap>
                          {content.title || content.text?.substring(0, 50) + '...'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {content.platforms?.join(', ')} • {new Date(content.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={content.status}
                        size="small"
                        color={
                          content.status === 'published' ? 'success' :
                          content.status === 'scheduled' ? 'warning' : 'default'
                        }
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  )) || (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                      No content yet. Create your first post to get started!
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AutoAwesome />}
                  onClick={() => navigate('/ai/generator')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Generate AI Content
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Schedule />}
                  onClick={() => navigate('/content/new')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Schedule Post
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Campaign />}
                  onClick={() => navigate('/campaigns/new')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Create Campaign
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Analytics />}
                  onClick={() => navigate('/analytics')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  View Analytics
                </Button>
              </Box>

              {/* Subscription Status */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  {user?.subscription?.plan?.toUpperCase() || 'FREE'} Plan
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Usage this month
                  </Typography>
                  <Typography variant="caption" fontWeight="medium">
                    75 / 100 posts
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
