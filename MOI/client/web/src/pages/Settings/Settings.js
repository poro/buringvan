import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Switch,
  TextField,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Slider,
  Badge
} from '@mui/material';
import {
  Edit,
  PhotoCamera,
  Save,
  Security,
  Notifications,
  Language,
  Palette,
  AccountCircle,
  Business,
  Key,
  CloudSync,
  Delete,
  Warning,
  CheckCircle,
  ErrorOutline
} from '@mui/icons-material';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'TechCorp Inc.',
    bio: 'Digital marketing enthusiast and AI advocate',
    timezone: 'America/Los_Angeles',
    language: 'en'
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: true,
    weeklyReports: true,
    contentApproval: false,
    autoPublish: false,
    darkMode: false,
    compactView: false,
    aiSuggestions: true,
    dataBackup: true
  });

  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: 'OpenAI API', status: 'connected', masked: 'sk-...z_cqknadZS2bD6lGT3BlbkFJ' },
    { id: 2, name: 'Google OAuth', status: 'connected', masked: '837890852811-...g.apps.googleusercontent.com' },
    { id: 3, name: 'LinkedIn API', status: 'disconnected', masked: null },
    { id: 4, name: 'Twitter API', status: 'error', masked: 'tw-...error' }
  ]);

  const [billingInfo, setBillingInfo] = useState({
    plan: 'Professional',
    billingCycle: 'monthly',
    nextBilling: '2024-02-15',
    usage: {
      aiGenerations: 245,
      aiLimit: 1000,
      posts: 67,
      postLimit: 500,
      accounts: 3,
      accountLimit: 10
    }
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'disconnected': return 'default';
      default: return 'default';
    }
  };

  const getUsagePercentage = (used, limit) => {
    return (used / limit) * 100;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      {/* Save Status Alert */}
      {saveStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {[
              { id: 'profile', label: 'Profile', icon: AccountCircle },
              { id: 'preferences', label: 'Preferences', icon: Palette },
              { id: 'notifications', label: 'Notifications', icon: Notifications },
              { id: 'security', label: 'Security', icon: Security },
              { id: 'integrations', label: 'Integrations', icon: CloudSync },
              { id: 'billing', label: 'Billing', icon: Business }
            ].map(({ id, label, icon: Icon }) => (
              <Grid item xs={12} sm={6} md={2} key={id}>
                <Button
                  fullWidth
                  variant={activeTab === id ? 'contained' : 'outlined'}
                  startIcon={<Icon />}
                  onClick={() => setActiveTab(id)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <IconButton
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'primary.dark' }
                      }}
                    >
                      <PhotoCamera sx={{ fontSize: 16 }} />
                    </IconButton>
                  }
                >
                  <Avatar
                    sx={{ width: 120, height: 120, fontSize: 48, mb: 2 }}
                  >
                    {profileData.firstName[0]}{profileData.lastName[0]}
                  </Avatar>
                </Badge>
                <Typography variant="h6" fontWeight="bold">
                  {profileData.firstName} {profileData.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profileData.company}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="First Name"
                      fullWidth
                      value={profileData.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Last Name"
                      fullWidth
                      value={profileData.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Email"
                      fullWidth
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Company"
                      fullWidth
                      value={profileData.company}
                      onChange={(e) => handleProfileChange('company', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bio"
                      fullWidth
                      multiline
                      rows={3}
                      value={profileData.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={profileData.timezone}
                        label="Timezone"
                        onChange={(e) => handleProfileChange('timezone', e.target.value)}
                      >
                        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                        <MenuItem value="America/Denver">Mountain Time</MenuItem>
                        <MenuItem value="America/Chicago">Central Time</MenuItem>
                        <MenuItem value="America/New_York">Eastern Time</MenuItem>
                        <MenuItem value="Europe/London">London</MenuItem>
                        <MenuItem value="Europe/Berlin">Berlin</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={profileData.language}
                        label="Language"
                        onChange={(e) => handleProfileChange('language', e.target.value)}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                        <MenuItem value="de">German</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Preferences */}
      {activeTab === 'preferences' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  General Preferences
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Dark Mode"
                      secondary="Switch to dark theme"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.darkMode}
                        onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Compact View"
                      secondary="Show more content in less space"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.compactView}
                        onChange={(e) => handlePreferenceChange('compactView', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="AI Suggestions"
                      secondary="Show AI-powered content suggestions"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.aiSuggestions}
                        onChange={(e) => handlePreferenceChange('aiSuggestions', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Content Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Content Approval"
                      secondary="Require approval before publishing"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.contentApproval}
                        onChange={(e) => handlePreferenceChange('contentApproval', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Auto Publish"
                      secondary="Automatically publish scheduled content"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.autoPublish}
                        onChange={(e) => handlePreferenceChange('autoPublish', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Data Backup"
                      secondary="Automatically backup your content"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={preferences.dataBackup}
                        onChange={(e) => handlePreferenceChange('dataBackup', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Notification Preferences
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive important updates via email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Push Notifications"
                  secondary="Receive push notifications in browser"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.pushNotifications}
                    onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Marketing Emails"
                  secondary="Receive tips and feature updates"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.marketingEmails}
                    onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Weekly Reports"
                  secondary="Get weekly performance summaries"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.weeklyReports}
                    onChange={(e) => handlePreferenceChange('weeklyReports', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Password & Authentication
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Change Password
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Enable Two-Factor Authentication
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Last login: January 15, 2024 at 2:30 PM
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Account Actions
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Download Account Data
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Account
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Account created: December 1, 2023
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              API Keys & Integrations
            </Typography>
            <List>
              {apiKeys.map((api) => (
                <ListItem key={api.id}>
                  <ListItemText
                    primary={api.name}
                    secondary={api.masked || 'Not configured'}
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={api.status}
                        size="small"
                        color={getStatusColor(api.status)}
                        icon={
                          api.status === 'connected' ? <CheckCircle /> :
                          api.status === 'error' ? <ErrorOutline /> : null
                        }
                      />
                      <IconButton>
                        <Edit />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Billing */}
      {activeTab === 'billing' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Current Plan
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {billingInfo.plan}
                  </Typography>
                  <Chip label="Active" color="success" />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Billing Cycle: {billingInfo.billingCycle}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Next Billing: {new Date(billingInfo.nextBilling).toLocaleDateString()}
                </Typography>
                <Button variant="outlined" sx={{ mt: 2 }}>
                  Change Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Usage This Month
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">AI Generations</Typography>
                    <Typography variant="body2">
                      {billingInfo.usage.aiGenerations}/{billingInfo.usage.aiLimit}
                    </Typography>
                  </Box>
                  <Slider
                    value={getUsagePercentage(billingInfo.usage.aiGenerations, billingInfo.usage.aiLimit)}
                    disabled
                    sx={{ mb: 2 }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Posts Published</Typography>
                    <Typography variant="body2">
                      {billingInfo.usage.posts}/{billingInfo.usage.postLimit}
                    </Typography>
                  </Box>
                  <Slider
                    value={getUsagePercentage(billingInfo.usage.posts, billingInfo.usage.postLimit)}
                    disabled
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            Delete Account
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete your account? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All your data, including content, campaigns, and analytics will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
