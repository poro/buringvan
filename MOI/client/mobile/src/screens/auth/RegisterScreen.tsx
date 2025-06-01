import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Divider,
  Checkbox,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../utils/theme';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register, loading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      clearError();
      if (!data.agreeToTerms) {
        Alert.alert('Error', 'Please agree to the terms and conditions');
        return;
      }
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      // Error is handled by context
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Title style={styles.title}>Create Account</Title>
          <Text style={styles.subtitle}>Join us to get started</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="name"
              rules={{
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Full Name"
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.name}
                  autoCapitalize="words"
                  style={styles.input}
                  left={<TextInput.Icon icon="account" />}
                />
              )}
            />
            {errors.name && (
              <Text style={styles.fieldError}>{errors.name.message}</Text>
            )}

            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                />
              )}
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            )}

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Password must contain uppercase, lowercase, and number',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password"
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.password}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              )}
            />
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}

            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: 'Please confirm your password',
                validate: value =>
                  value === password || 'Passwords do not match',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Confirm Password"
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
              )}
            />
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
            )}

            <Controller
              control={control}
              name="agreeToTerms"
              rules={{
                required: 'You must agree to the terms and conditions',
              }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    onPress={() => onChange(!value)}
                  />
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text style={styles.linkText}>Terms and Conditions</Text>
                  </Text>
                </View>
              )}
            />
            {errors.agreeToTerms && (
              <Text style={styles.fieldError}>{errors.agreeToTerms.message}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
              contentStyle={styles.buttonContent}
            >
              Create Account
            </Button>

            <Divider style={styles.divider} />

            <View style={styles.socialButtons}>
              <Button
                mode="outlined"
                icon="google"
                style={styles.socialButton}
                onPress={() => Alert.alert('Info', 'Google signup coming soon')}
              >
                Google
              </Button>
              <Button
                mode="outlined"
                icon="github"
                style={styles.socialButton}
                onPress={() => Alert.alert('Info', 'GitHub signup coming soon')}
              >
                GitHub
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Button
            mode="text"
            onPress={navigateToLogin}
            style={styles.loginButton}
          >
            Sign In
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    elevation: 4,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
  },
  fieldError: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 8,
    color: '#666',
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  registerButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
  },
  loginButton: {
    marginLeft: 8,
  },
});

export default RegisterScreen;
