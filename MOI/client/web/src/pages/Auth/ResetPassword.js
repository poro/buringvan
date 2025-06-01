import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Lock,
  Visibility,
  VisibilityOff,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword } = useAuth();
  const [isReset, setIsReset] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setError('');
    const result = await resetPassword(token, data.password);
    
    if (result.success) {
      setIsReset(true);
    } else {
      setError(result.message);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (!token) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="h2"
          variant="h4"
          sx={{ mb: 3, fontWeight: 600 }}
        >
          Invalid Reset Link
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This password reset link is invalid or has expired.
          Please request a new password reset.
        </Typography>

        <Button
          component={RouterLink}
          to="/auth/forgot-password"
          variant="contained"
          sx={{ mt: 2 }}
        >
          Request New Reset Link
        </Button>
      </Box>
    );
  }

  if (isReset) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <CheckCircle
          sx={{
            fontSize: 64,
            color: 'success.main',
            mb: 2,
          }}
        />
        
        <Typography
          component="h2"
          variant="h4"
          sx={{ mb: 3, fontWeight: 600 }}
        >
          Password Reset Successfully
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your password has been reset successfully.
          You can now sign in with your new password.
        </Typography>

        <Button
          component={RouterLink}
          to="/auth/login"
          variant="contained"
          size="large"
          sx={{ mt: 2 }}
        >
          Sign In
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
        Set New Password
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Enter your new password below.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
          },
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            message: 'Password must contain uppercase, lowercase, number and special character',
          },
        })}
        margin="normal"
        fullWidth
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        autoFocus
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleTogglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: (value) =>
            value === password || 'Passwords do not match',
        })}
        margin="normal"
        fullWidth
        label="Confirm New Password"
        type={showConfirmPassword ? 'text' : 'password'}
        autoComplete="new-password"
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={handleToggleConfirmPasswordVisibility}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
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
          'Reset Password'
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

export default ResetPassword;
