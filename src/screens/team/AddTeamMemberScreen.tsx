import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  SegmentedButtons,
  Title,
  Divider,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing } from '../../config/theme'

// Validation schema
const teamMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['admin', 'manager', 'agent']),
  department: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type TeamMemberFormData = z.infer<typeof teamMemberSchema>

interface AddTeamMemberScreenProps {
  navigation: any
}

const AddTeamMemberScreen: React.FC<AddTeamMemberScreenProps> = ({ navigation }) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const styles = createStyles(theme)
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: 'agent',
      department: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: TeamMemberFormData) => {
    setLoading(true)
    try {
      // Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: data.role,
            department: data.department,
            phone: data.phone,
          },
        },
      })

      if (authError) {
        console.error('Error creating user:', authError)
        Alert.alert(
          'Creation Failed',
          authError.message || 'Failed to create team member. Please try again.',
          [{ text: 'OK' }]
        )
        return
      }

      if (!authData.user) {
        Alert.alert('Error', 'Failed to create user account.')
        return
      }

      // The profile will be automatically created by the handle_new_user trigger
      Alert.alert(
        'Success',
        `Team member ${data.full_name} has been created successfully! They will receive a confirmation email.`,
        [
          {
            text: 'Add Another',
            style: 'default',
            onPress: () => {
              // Reset form for adding another member
              navigation.replace('AddTeamMember')
            },
          },
          {
            text: 'Done',
            style: 'default',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      console.error('Error creating team member:', error)
      Alert.alert(
        'Creation Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full system access, can manage all users and settings'
      case 'manager':
        return 'Can manage team members and oversee projects'
      case 'agent':
        return 'Standard user access for daily tasks and client management'
      default:
        return ''
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Title style={styles.title}>Add Team Member</Title>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Create a new team member account with appropriate permissions.
            </Text>

            <Divider style={styles.divider} />

            {/* Full Name */}
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Full Name *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.full_name}
                    style={styles.input}
                    left={<TextInput.Icon icon="account" />}
                  />
                  {errors.full_name && (
                    <HelperText type="error">{errors.full_name.message}</HelperText>
                  )}
                </View>
              )}
            />

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Email Address *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    left={<TextInput.Icon icon="email" />}
                  />
                  {errors.email && (
                    <HelperText type="error">{errors.email.message}</HelperText>
                  )}
                </View>
              )}
            />

            {/* Role Selection */}
            <View style={styles.inputContainer}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Role *
              </Text>
              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <SegmentedButtons
                    value={value}
                    onValueChange={onChange}
                    buttons={[
                      {
                        value: 'agent',
                        label: 'Agent',
                        icon: 'account',
                      },
                      {
                        value: 'manager',
                        label: 'Manager',
                        icon: 'account-tie',
                      },
                      {
                        value: 'admin',
                        label: 'Admin',
                        icon: 'shield-crown',
                      },
                    ]}
                    style={styles.segmentedButtons}
                  />
                )}
              />
              <HelperText type="info">
                {getRoleDescription(selectedRole)}
              </HelperText>
            </View>

            {/* Department */}
            <Controller
              control={control}
              name="department"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Department"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={styles.input}
                    left={<TextInput.Icon icon="office-building" />}
                  />
                </View>
              )}
            />

            {/* Phone */}
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Phone Number"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    style={styles.input}
                    left={<TextInput.Icon icon="phone" />}
                  />
                </View>
              )}
            />

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Account Security
            </Text>

            {/* Password */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Password *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.password}
                    secureTextEntry
                    style={styles.input}
                    left={<TextInput.Icon icon="lock" />}
                  />
                  {errors.password && (
                    <HelperText type="error">{errors.password.message}</HelperText>
                  )}
                </View>
              )}
            />

            {/* Confirm Password */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Confirm Password *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.confirmPassword}
                    secureTextEntry
                    style={styles.input}
                    left={<TextInput.Icon icon="lock-check" />}
                  />
                  {errors.confirmPassword && (
                    <HelperText type="error">{errors.confirmPassword.message}</HelperText>
                  )}
                </View>
              )}
            />
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={[styles.button, styles.cancelButton]}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={[styles.button, styles.submitButton]}
            loading={loading}
            disabled={loading}
          >
            Create Member
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xl * 2,
    },
    card: {
      elevation: 2,
      marginBottom: spacing.lg,
    },
    cardContent: {
      padding: spacing.lg,
    },
    title: {
      color: theme.colors.onSurface,
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.lg,
    },
    divider: {
      marginVertical: spacing.lg,
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
    fieldLabel: {
      color: theme.colors.onSurface,
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    segmentedButtons: {
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      marginBottom: spacing.md,
      fontWeight: '600',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    button: {
      flex: 1,
    },
    cancelButton: {
      borderColor: theme.colors.outline,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
  })

export default AddTeamMemberScreen