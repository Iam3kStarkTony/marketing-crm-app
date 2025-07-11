import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordScreenProps {
  navigation: any
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { resetPassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true)
    try {
      const { error } = await resetPassword(data.email)
      
      if (error) {
        Alert.alert(
          'Reset Failed',
          error.message || 'An error occurred while sending the reset email. Please try again.',
          [{ text: 'OK' }]
        )
      } else {
        setEmailSent(true)
        Alert.alert(
          'Reset Email Sent',
          `A password reset link has been sent to ${data.email}. Please check your email and follow the instructions to reset your password.`,
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      console.error('Password reset error:', error)
      Alert.alert(
        'Reset Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const navigateToLogin = () => {
    navigation.navigate('Login')
  }

  const resendEmail = async () => {
    const email = getValues('email')
    if (email) {
      await onSubmit({ email })
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Reset Password</Title>
              <Paragraph style={styles.subtitle}>
                {emailSent
                  ? 'Check your email for reset instructions'
                  : 'Enter your email address and we\'ll send you a link to reset your password'}
              </Paragraph>

              {!emailSent ? (
                <View style={styles.form}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={styles.inputContainer}>
                        <TextInput
                          label="Email"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          mode="outlined"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          error={!!errors.email}
                          disabled={loading}
                          left={<TextInput.Icon icon="email" />}
                        />
                        <HelperText type="error" visible={!!errors.email}>
                          {errors.email?.message}
                        </HelperText>
                      </View>
                    )}
                  />

                  <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={loading}
                    disabled={loading}
                    style={styles.resetButton}
                    contentStyle={styles.buttonContent}
                  >
                    Send Reset Link
                  </Button>
                </View>
              ) : (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>
                    If an account with that email exists, you'll receive a password reset link shortly.
                  </Text>
                  
                  <Button
                    mode="outlined"
                    onPress={resendEmail}
                    loading={loading}
                    disabled={loading}
                    style={styles.resendButton}
                    contentStyle={styles.buttonContent}
                  >
                    Resend Email
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password?</Text>
            <Button
              mode="text"
              onPress={navigateToLogin}
              disabled={loading}
              compact
            >
              Back to Sign In
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  resetButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  successContainer: {
    alignItems: 'center',
    gap: 20,
  },
  successText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  resendButton: {
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
  },
})

export default ForgotPasswordScreen