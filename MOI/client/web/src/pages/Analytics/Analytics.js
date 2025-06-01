import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Visibility,
  ThumbUp,
  Share,
  Comment,
  Download,
  DateRange
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [platform, setPlatform] = useState('all');

  // Mock analytics data
  const mockData = {
    overview: {
      totalReach: 156780,
      totalEngagement: 12456,
      totalClicks: 3890,
      engagementRate: 7.9,
      growthRate: 15.2
    },
    chartData: [
      { date: '2024-01-01', reach: 12000, engagement: 980, clicks: 234 },
      { date: '2024-01-02', reach: 15200, engagement: 1120, clicks: 289 },
      { date: '2024-01-03', reach: 18900, engagement: 1456, clicks: 356 },
      { date: '2024-01-04', reach: 16700, engagement: 1289, clicks: 298 },
      { date: '2024-01-05', reach: 21300, engagement: 1678, clicks: 423 },
      { date: '2024-01-06', reach: 19800, engagement: 1534, clicks: 387 },
      { date: '2024-01-07', reach: 23400, engagement: 1890, clicks: 456 }
    ],
    platformData: [
      { name: 'LinkedIn', value: 45, color: '#0077B5', engagement: 8.5, followers: 12500 },
      { name: 'Twitter', value: 30, color: '#1DA1F2', engagement: 6.2, followers: 8900 },
      { name: 'Instagram', value: 20, color: '#E4405F', engagement: 9.8, followers: 15600 },
      { name: 'TikTok', value: 5, color: '#000000', engagement: 12.1, followers: 3200 }
    ],
    topContent: [
      {
        id: 1,
        title: "AI in Healthcare: Revolutionary Changes",
        platform: "linkedin",
        reach: 23400,
        engagement: 1890,
        clicks: 456,
        engagementRate: 8.1,
        publishedAt: "2024-01-15"
      },
      {
        id: 2,
        title: "Remote Work Best Practices",
        platform: "twitter",
        reach: 18900,
        engagement: 1456,
        clicks: 356,
        engagementRate: 7.7,
        publishedAt: "2024-01-14"
      },
      {
        id: 3,
        title: "Social Media Trends 2024",
        platform: "instagram",
        reach: 21300,
        engagement: 1678,
        clicks: 423,
        engagementRate: 7.9,
        publishedAt: "2024-01-13"
      }
    ]
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getGrowthIcon = (growth) => {
    return growth > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />;
  };

  const getPlatformIcon = (platform) => {
    const platformColors = {
      linkedin: '#0077B5',
      twitter: '#1DA1F2',
      instagram: '#E4405F',
      tiktok: '#000000'
    };
    return platformColors[platform] || '#666';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={platform}
              label="Platform"
              onChange={(e) => setPlatform(e.target.value)}
            >
              <MenuItem value="all">All Platforms</MenuItem>
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="twitter">Twitter</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="tiktok">TikTok</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<Download />}>
            Export
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Reach
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatNumber(mockData.overview.totalReach)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    {getGrowthIcon(mockData.overview.growthRate)}
                    <Typography variant="body2" color="success.main">
                      +{mockData.overview.growthRate}%
                    </Typography>
                  </Box>
                </Box>
                <Visibility sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Engagement
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatNumber(mockData.overview.totalEngagement)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TrendingUp color="success" />
                    <Typography variant="body2" color="success.main">
                      +12.3%
                    </Typography>
                  </Box>
                </Box>
                <ThumbUp sx={{ fontSize: 40, color: 'secondary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Clicks
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatNumber(mockData.overview.totalClicks)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TrendingUp color="success" />
                    <Typography variant="body2" color="success.main">
                      +8.7%
                    </Typography>
                  </Box>
                </Box>
                <Share sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Engagement Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {mockData.overview.engagementRate}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TrendingUp color="success" />
                    <Typography variant="body2" color="success.main">
                      +2.1%
                    </Typography>
                  </Box>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Performance Over Time
              </Typography>
              <Box sx={{ height: 400, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="reach"
                      stackId="1"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.6}
                      name="Reach"
                    />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stackId="2"
                      stroke="#dc004e"
                      fill="#dc004e"
                      fillOpacity={0.6}
                      name="Engagement"
                    />
                  </AreaChart>
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
                Platform Performance
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockData.platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockData.platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {mockData.platformData.map((platform, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: platform.color,
                          borderRadius: '50%'
                        }}
                      />
                      <Typography variant="body2">{platform.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {platform.engagement}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performing Content */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top Performing Content
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Content</TableCell>
                      <TableCell>Platform</TableCell>
                      <TableCell align="right">Reach</TableCell>
                      <TableCell align="right">Engagement</TableCell>
                      <TableCell align="right">Clicks</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Published</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockData.topContent.map((content) => (
                      <TableRow key={content.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {content.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
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
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {content.platform}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatNumber(content.reach)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatNumber(content.engagement)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatNumber(content.clicks)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${content.engagementRate}%`}
                            size="small"
                            color={content.engagementRate > 8 ? 'success' : content.engagementRate > 6 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {new Date(content.publishedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
