import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {
  Text,
  Card,
  Avatar,
  Button,
  TextInput,
  Divider,
  List,
  Switch,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Profile } from '../../types/database'
import { spacing, shadows } from '../../config/theme'

// Validation schema for profile update
const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  bio: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileScreenProps {
  navigation: any
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const styles = createStyles(theme)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      })
    }
  }, [profile, reset])

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await updateProfile({
        id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        Alert.alert(
          'Update Failed',
          error.message || 'Failed to update profile. Please try again.',
          [{ text: 'OK' }]
        )
      } else {
        setEditMode(false)
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      console.error('Profile update error:', error)
      Alert.alert(
        'Update Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut()
            } catch (error) {
              console.error('Sign out error:', error)
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          },
        },
      ]
    )
  }

  const cancelEdit = () => {
    setEditMode(false)
    reset({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (!user || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
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
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={80}
              label={getInitials(profile.full_name || 'User')}
              style={styles.avatar}
            />
            <Text variant="headlineSmall" style={styles.name}>
              {profile.full_name || 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {user.email}
            </Text>
            {profile.bio && !editMode && (
              <Text variant="bodyMedium" style={styles.bio}>
                {profile.bio}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Profile Form */}
        {editMode ? (
          <Card style={styles.formCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Edit Profile
              </Text>
              
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="full_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Full Name"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        mode="outlined"
                        error={!!errors.full_name}
                        disabled={loading}
                        left={<TextInput.Icon icon="account" />}
                      />
                      <HelperText type="error" visible={!!errors.full_name}>
                        {errors.full_name?.message}
                      </HelperText>
                    </View>
                  )}
                />

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
                        mode="outlined"
                        keyboardType="phone-pad"
                        disabled={loading}
                        left={<TextInput.Icon icon="phone" />}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="bio"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Bio"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        disabled={loading}
                        left={<TextInput.Icon icon="text" />}
                      />
                    </View>
                  )}
                />

                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={cancelEdit}
                    disabled={loading}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={loading}
                    disabled={loading}
                    style={styles.saveButton}
                  >
                    Save Changes
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.infoCard}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Profile Information
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setEditMode(true)}
                  compact
                  icon="pencil"
                >
                  Edit
                </Button>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>
                  Phone:
                </Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {profile.phone || 'Not provided'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>
                  Member since:
                </Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {new Date(profile.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Settings */}
        <Card style={styles.settingsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Settings
            </Text>
            
            <List.Item
              title="Push Notifications"
              description="Receive notifications for new messages and tasks"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Dark Mode"
              description="Use dark theme"
              left={props => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Change Password"
              description="Update your account password"
              left={props => <List.Icon {...props} icon="lock" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Card style={styles.signOutCard}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleSignOut}
              icon="logout"
              textColor={theme.colors.error}
              style={styles.signOutButton}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    marginBottom: spacing.md,
    ...shadows.medium,
    borderRadius: 16,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: 16,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.onSurface,
  },
  email: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  bio: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 8,
  },
  formCard: {
    marginBottom: 16,
    elevation: 2,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  settingsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  signOutCard: {
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.onSurface,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  infoValue: {
    color: theme.colors.onSurface,
  },
  signOutButton: {
    borderColor: theme.colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onSurfaceVariant,
  },
})

export default ProfileScreen