import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  Linking,
} from 'react-native'
import {
  Modal,
  Portal,
  Card,
  Text,
  Button,
  IconButton,
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper'
// Conditional import for document picker
let DocumentPicker: any = null
if (Platform.OS !== 'web') {
  DocumentPicker = require('react-native-document-picker')
}
import { Platform } from 'react-native'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface TaskFileUploadProps {
  visible: boolean
  onDismiss: () => void
  taskId: string
}

interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string
  uploaded_at: string
  uploader_name?: string
}

const TaskFileUpload: React.FC<TaskFileUploadProps> = ({
  visible,
  onDismiss,
  taskId,
}) => {
  const theme = useTheme()
  const { user } = useAuth()
  const styles = createStyles(theme)
  
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (visible) {
      fetchAttachments()
    }
  }, [visible, taskId])

  const fetchAttachments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select(`
          *,
          uploader:users!uploaded_by(
            first_name,
            last_name
          )
        `)
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Error fetching attachments:', error)
        Alert.alert('Error', 'Failed to load attachments')
        return
      }

      const formattedAttachments = data.map(attachment => ({
        ...attachment,
        uploader_name: attachment.uploader 
          ? `${attachment.uploader.first_name} ${attachment.uploader.last_name}`
          : 'Unknown User'
      }))

      setAttachments(formattedAttachments)
    } catch (error) {
      console.error('Error fetching attachments:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const pickDocument = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web platform: use HTML input element
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '*/*'
        input.onchange = async (event: any) => {
          const file = event.target.files[0]
          if (file) {
            const webFile = {
              uri: URL.createObjectURL(file),
              name: file.name,
              type: file.type,
              size: file.size,
            }
            await uploadFile(webFile)
          }
        }
        input.click()
      } else {
        // Mobile platforms: use react-native-document-picker
        if (!DocumentPicker) {
          Alert.alert('Error', 'Document picker not available on this platform')
          return
        }
        
        const result = await DocumentPicker.pick({
          type: [DocumentPicker.types.allFiles],
          allowMultiSelection: false,
        })

        if (result && result.length > 0) {
          await uploadFile(result[0])
        }
      }
    } catch (error) {
      if (DocumentPicker.isCancel && DocumentPicker.isCancel(error)) {
        // User cancelled the picker
        return
      }
      console.error('Error picking document:', error)
      Alert.alert('Error', 'Failed to pick document')
    }
  }

  const uploadFile = async (file: any) => {
    setUploading(true)
    try {
      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        Alert.alert('Error', 'File size must be less than 10MB')
        return
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `task-attachments/${taskId}/${fileName}`

      // Upload file to Supabase Storage
      let uploadData, uploadError
      
      if (Platform.OS === 'web') {
        // For web, convert blob URL to actual file
        const response = await fetch(file.uri)
        const blob = await response.blob()
        const result = await supabase.storage
          .from('task-files')
          .upload(filePath, blob, {
            contentType: file.type,
          })
        uploadData = result.data
        uploadError = result.error
      } else {
        // For mobile platforms
        const result = await supabase.storage
          .from('task-files')
          .upload(filePath, {
            uri: file.uri,
            type: file.type,
            name: file.name,
          })
        uploadData = result.data
        uploadError = result.error
      }

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        Alert.alert('Error', 'Failed to upload file')
        return
      }

      // Insert attachment record
      const { error: insertError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        })

      if (insertError) {
        console.error('Error inserting attachment record:', insertError)
        Alert.alert('Error', 'Failed to save attachment record')
        return
      }

      // Insert system message
      const { error: messageError } = await supabase
        .from('task_messages')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          message: `File uploaded: ${file.name}`,
          message_type: 'system',
        })

      if (messageError) {
        console.error('Error inserting system message:', messageError)
        // Don't show error to user as the main upload succeeded
      }

      Alert.alert('Success', 'File uploaded successfully!')
      fetchAttachments() // Refresh the list
    } catch (error) {
      console.error('Error uploading file:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setUploading(false)
    }
  }

  const downloadFile = async (attachment: TaskAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-files')
        .createSignedUrl(attachment.file_path, 3600) // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error)
        Alert.alert('Error', 'Failed to generate download link')
        return
      }

      if (data?.signedUrl) {
        Linking.openURL(data.signedUrl)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    }
  }

  const deleteAttachment = async (attachment: TaskAttachment) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${attachment.file_name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from storage
              const { error: storageError } = await supabase.storage
                .from('task-files')
                .remove([attachment.file_path])

              if (storageError) {
                console.error('Error deleting file from storage:', storageError)
                // Continue with database deletion even if storage deletion fails
              }

              // Delete from database
              const { error: dbError } = await supabase
                .from('task_attachments')
                .delete()
                .eq('id', attachment.id)

              if (dbError) {
                console.error('Error deleting attachment record:', dbError)
                Alert.alert('Error', 'Failed to delete attachment')
                return
              }

              Alert.alert('Success', 'File deleted successfully!')
              fetchAttachments() // Refresh the list
            } catch (error) {
              console.error('Error deleting attachment:', error)
              Alert.alert('Error', 'An unexpected error occurred')
            }
          },
        },
      ]
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderAttachment = ({ item }: { item: TaskAttachment }) => (
    <Card style={styles.attachmentCard}>
      <Card.Content>
        <View style={styles.attachmentHeader}>
          <View style={styles.attachmentInfo}>
            <Text variant="titleMedium" numberOfLines={1}>
              {item.file_name}
            </Text>
            <Text variant="bodySmall" style={styles.attachmentMeta}>
              {formatFileSize(item.file_size)} • {item.uploader_name}
            </Text>
            <Text variant="bodySmall" style={styles.attachmentDate}>
              {formatDate(item.uploaded_at)}
            </Text>
          </View>
          <View style={styles.attachmentActions}>
            <IconButton
              icon="download"
              size={20}
              onPress={() => downloadFile(item)}
            />
            {item.uploaded_by === user?.id && (
              <IconButton
                icon="delete"
                size={20}
                onPress={() => deleteAttachment(item)}
              />
            )}
          </View>
        </View>
        {item.file_type && (
          <Chip
            mode="outlined"
            compact
            style={styles.fileTypeChip}
          >
            {item.file_type}
          </Chip>
        )}
      </Card.Content>
    </Card>
  )

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card>
          <Card.Title
            title="Task Attachments"
            right={(props) => (
              <IconButton
                {...props}
                icon="close"
                onPress={onDismiss}
              />
            )}
          />
          <Card.Content>
            <View style={styles.uploadSection}>
              <Button
                mode="contained"
                onPress={pickDocument}
                disabled={uploading}
                loading={uploading}
                icon="paperclip"
                style={styles.uploadButton}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading attachments...</Text>
              </View>
            ) : (
              <FlatList
                data={attachments}
                renderItem={renderAttachment}
                keyExtractor={(item) => item.id}
                style={styles.attachmentsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                      No attachments yet
                    </Text>
                  </View>
                }
              />
            )}
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '80%',
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadButton: {
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onSurfaceVariant,
  },
  attachmentsList: {
    maxHeight: 400,
  },
  attachmentCard: {
    marginBottom: 8,
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attachmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  attachmentMeta: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  attachmentDate: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  attachmentActions: {
    flexDirection: 'row',
  },
  fileTypeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
  },
})

export default TaskFileUpload