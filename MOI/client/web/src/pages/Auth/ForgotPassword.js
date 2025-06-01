import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    const result = await forgotPassword(data.email);
    
    if (result.success) {
      setIsSubmitted(true);
    } else {
      setError(result.message);
    }
  };

  if (isSubmitted) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="h2"
          variant="h4"
          sx={{ mb: 3, fontWeight: 600 }}
        >
          Check Your Email
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We've sent a password reset link to your email address.
          Please check your inbox and follow the instructions to reset your password.
        </Typography>

        <Button
          component={RouterLink}
          to="/auth/login"
          variant="outlined"
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography
        component="h2"
        variant="h4"
        textAlign="center"
        sx={{ mb: 3, fontWeight: 600 }}
      >
        Reset Password
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Enter your email address and we'll send you a link to reset your password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        })}
        margin="normal"
        fullWidth
        label="Email Address"
        type="email"
        autoComplete="email"
        autoFocus
        error={!!errors.email}
        helperText={errors.email?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email />
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ mt: 3, mb: 2, py: 1.5 }}
      >
        {isSubmitting ? (
          <CircularProgress size={24} />
        ) : (
          'Send Reset Link'
        )}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/auth/login" variant="body2">
          <ArrowBack sx={{ fontSize: 16, mr: 0.5 }} />
          Back to Login
        </Link>
      </Box>
    </Box>
  );
}

export default ForgotPassword;
