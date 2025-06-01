import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Layout Components
import MainLayout from './components/Layout/MainLayout';
import AuthLayout from './components/Layout/AuthLayout';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

// Main Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Content from './pages/Content/Content';
import ContentEditor from './pages/Content/ContentEditor';
import Campaigns from './pages/Campaigns/Campaigns';
import CampaignEditor from './pages/Campaigns/CampaignEditor';
import SocialAccounts from './pages/Social/SocialAccounts';
import OAuthCallback from './pages/Social/OAuthCallback';
import Analytics from './pages/Analytics/Analytics';
import Reports from './pages/Analytics/Reports';
import Notifications from './pages/Notifications/Notifications';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';

// AI Pages
import AIGenerator from './pages/AI/AIGenerator';
import AITemplates from './pages/AI/AITemplates';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        Loading...
      </Box>
    );
  }

  return user ? children : <Navigate to="/auth/login" replace />;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        Loading...
      </Box>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/auth/*"
        element={
          <PublicRoute>
            <AuthLayout>
              <Routes>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </Routes>
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Content Management */}
                <Route path="content" element={<Content />} />
                <Route path="content/new" element={<ContentEditor />} />
                <Route path="content/:id/edit" element={<ContentEditor />} />
                
                {/* Campaign Management */}
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/new" element={<CampaignEditor />} />
                <Route path="campaigns/:id/edit" element={<CampaignEditor />} />
                
                {/* AI Features */}
                <Route path="ai/generator" element={<AIGenerator />} />
                <Route path="ai/templates" element={<AITemplates />} />
                
                {/* Social Media */}
                <Route path="social/accounts" element={<SocialAccounts />} />
                <Route path="social/callback" element={<OAuthCallback />} />
                
                {/* Analytics */}
                <Route path="analytics" element={<Analytics />} />
                <Route path="analytics/reports" element={<Reports />} />
                
                {/* User Management */}
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
