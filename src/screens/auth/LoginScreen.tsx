import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native'
import {
  Text,
  IconButton,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { SignInData } from '../../types/database'
import AnimatedButton from '../../components/ui/AnimatedButton'
import AnimatedInput from '../../components/ui/AnimatedInput'
import AnimatedCard from '../../components/ui/AnimatedCard'
import { spacing, typography, shadows, borderRadius, animations } from '../../config/theme'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginScreenProps {
  navigation: any
}

const { width, height } = Dimensions.get('window')

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signIn } = useAuth()
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Animation values
  const fadeAnim = useSharedValue(0)
  const slideAnim = useSharedValue(50)
  const scaleAnim = useSharedValue(0.9)
  const logoAnim = useSharedValue(0)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Initialize animations on mount
  useEffect(() => {
    logoAnim.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 300 }))
    fadeAnim.value = withDelay(400, withTiming(1, { duration: animations.timing.slow }))
    slideAnim.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 300 }))
    scaleAnim.value = withDelay(800, withSpring(1, { damping: 15, stiffness: 300 }))
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      const { error } = await signIn(data as SignInData)
      
      if (error) {
        Alert.alert(
          'Login Failed',
          error.message || 'An error occurred during login. Please try again.',
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      console.error('Login error:', error)
      Alert.alert(
        'Login Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const navigateToRegister = () => {
    navigation.navigate('Register')
  }

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword')
  }

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoAnim.value,
      transform: [
        { scale: logoAnim.value },
        { translateY: interpolate(logoAnim.value, [0, 1], [30, 0], Extrapolate.CLAMP) },
      ],
    }
  })

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [
        { translateY: slideAnim.value },
        { scale: scaleAnim.value },
      ],
    }
  })

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
    }
  })

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Animated Background Gradient */}
      <Animated.View style={[StyleSheet.absoluteFill, backgroundAnimatedStyle]}>
        <LinearGradient
          colors={isDark 
            ? ['#000000', '#1C1C1E', '#2C2C2E']
            : ['#F2F2F7', '#FFFFFF', '#F8F9FA']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.logoText, { color: theme.colors.onPrimary }]}>CRM</Text>
            </View>
            <Text style={[styles.welcomeTitle, typography.largeTitle, { color: theme.colors.onBackground }]}>
              Welcome Back
            </Text>
            <Text style={[styles.welcomeSubtitle, typography.body, { color: theme.colors.onSurfaceVariant }]}>
              Sign in to continue to your account
            </Text>
          </Animated.View>

          {/* Login Form */}
          <Animated.View style={[styles.formSection, contentAnimatedStyle]}>
            <AnimatedCard
              style={styles.formCard}
              variant="elevated"
              shadow="large"
              padding="xl"
            >
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AnimatedInput
                      label="Email Address"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      error={!!errors.email}
                      errorMessage={errors.email?.message}
                      disabled={loading}
                      leftIcon={<IconButton icon="email" size={20} iconColor={theme.colors.onSurfaceVariant} />}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AnimatedInput
                      label="Password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      error={!!errors.password}
                      errorMessage={errors.password?.message}
                      disabled={loading}
                      leftIcon={<IconButton icon="lock" size={20} iconColor={theme.colors.onSurfaceVariant} />}
                      rightIcon={
                        <IconButton
                          icon={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          iconColor={theme.colors.onSurfaceVariant}
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                    />
                  )}
                />

                <AnimatedButton
                  title={loading ? 'Signing In...' : 'Sign In'}
                  onPress={handleSubmit(onSubmit)}
                  variant="primary"
                  size="large"
                  loading={loading}
                  disabled={loading}
                  fullWidth
                  style={styles.signInButton}
                />

                <AnimatedButton
                  title="Forgot Password?"
                  onPress={navigateToForgotPassword}
                  variant="ghost"
                  size="medium"
                  disabled={loading}
                  style={styles.forgotButton}
                />
              </View>
            </AnimatedCard>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, contentAnimatedStyle]}>
            <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
              Don't have an account?
            </Text>
            <AnimatedButton
              title="Sign Up"
              onPress={navigateToRegister}
              variant="ghost"
              size="medium"
              disabled={loading}
              style={styles.signUpButton}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.large,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  welcomeSubtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    ...shadows.xlarge,
  },
  form: {
    gap: spacing.lg,
  },
  signInButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  forgotButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    fontSize: 16,
  },
  signUpButton: {
    paddingHorizontal: 0,
  },
})

export default LoginScreen