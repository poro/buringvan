import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent
} from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        // Parse platform from state (assuming it's encoded in state)
        const stateData = JSON.parse(atob(state));
        const platform = stateData.platform;

        // Send callback data to backend
        const response = await fetch(`http://localhost:3004/api/social/callback/${platform}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            code,
            state,
            redirectUri: `${window.location.origin}/social/callback`
          })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(`Successfully connected your ${platform} account!`);
          setAccountInfo(data.account);
          
          // Redirect to social accounts page after 3 seconds
          setTimeout(() => {
            navigate('/social');
          }, 3000);
        } else {
          throw new Error(data.message || 'Failed to connect account');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        p: 3
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          {status === 'processing' && (
            <>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Connecting Your Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we complete the connection...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle 
                sx={{ fontSize: 60, color: 'success.main', mb: 3 }} 
              />
              <Typography variant="h6" gutterBottom color="success.main">
                Connection Successful!
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {message}
              </Typography>
              
              {accountInfo && (
                <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Account Details:
                  </Typography>
                  <Typography variant="body2">
                    <strong>Platform:</strong> {accountInfo.platform}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Username:</strong> {accountInfo.username}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Display Name:</strong> {accountInfo.displayName}
                  </Typography>
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary">
                Redirecting to your social accounts in 3 seconds...
              </Typography>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorOutline 
                sx={{ fontSize: 60, color: 'error.main', mb: 3 }} 
              />
              <Typography variant="h6" gutterBottom color="error.main">
                Connection Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {message}
              </Alert>
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/social')}
                >
                  Back to Social Accounts
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}