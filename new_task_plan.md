# New Task Management System - Detailed Implementation Plan

## 📋 Implementation Progress Checklist

### Phase 1: Database Schema Changes ✅
- [x] Create migration file `20250115000015_task_management_system_phase1.sql`
- [x] Add `task_accepted_date` column to tasks table
- [x] Create `task_messages` table for chat functionality
- [x] Create `task_status_history` table for audit trail
- [x] Create `task_attachments` table for file uploads
- [x] Update notification types constraint
- [x] Set up RLS policies for all new tables
- [x] Add proper indexes for performance
- [x] **COMPLETED:** Migration applied successfully - all tables created
- [x] **COMPLETED:** Tables verified and working correctly

### Phase 2: Frontend Components ✅ COMPLETED
- [x] Create `TasksScreen` component (similar to ClientsScreen layout)
- [x] Create `TaskChatDrawer` component (animated slide-in)
- [x] Create `TaskMessage` component (user/admin/system messages)
- [x] Create `TaskActionButtons` component (role-based actions)
- [x] Create `FileUpload` component (multi-file support)
- [x] Update navigation to include new TasksScreen
- [x] Test basic UI layout and navigation

**Phase 2 Summary:**
- Created `TaskChatDrawer.tsx` with real-time messaging functionality
- Created `TaskActionButtons.tsx` with enhanced status management and role-based permissions
- Created `TaskFileUpload.tsx` with file attachment capabilities
- Successfully integrated all components into `TaskDetailScreen.tsx`
- Replaced old quick actions with new enhanced functionality
- Added proper state management and error handling

### Phase 3: Chat Functionality
- [ ] Implement real-time messaging with Supabase subscriptions
- [ ] Add message sending/receiving functionality
- [ ] Implement system messages for status changes
- [ ] Add message timestamps and read status
- [ ] Test chat functionality between users and admins

### Phase 4: File Upload System
- [ ] Set up Supabase Storage bucket for task files
- [ ] Implement file upload with progress indicators
- [ ] Add file preview and download functionality
- [ ] Implement file access control (RLS)
- [ ] Test file upload/download across different file types

### Phase 5: Status Management & Workflow
- [ ] Implement task status change functionality
- [ ] Add role-based action buttons (Accept, Start, Submit, etc.)
- [ ] Create status history tracking
- [ ] Implement automatic notification creation
- [ ] Test complete status workflow from pending to completed

### Phase 6: Integration & Testing
- [ ] Update n8n workflow for new notification types
- [ ] Test real-time notifications
- [ ] Implement push notifications for task events
- [ ] Performance testing and optimization
- [ ] End-to-end testing of complete workflow
- [ ] Documentation and deployment

---

## Overview
Transform the current task management page into a chat-based collaboration system where tasks open in a drawer with messaging capabilities, file attachments, and role-based status management.

## Database Schema Changes

### 1. Enhanced Tasks Table
```sql
-- Add new columns to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_accepted_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_date ON tasks(task_accepted_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status); -- if not already exists

-- Status values: 'pending', 'accepted', 'in_progress', 'submitted_for_review', 'completed', 'needs_revision'
```

### 2. New Task Messages Table
```sql
CREATE TABLE task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text TEXT,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'status_change', 'system'
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),
  metadata JSONB, -- For additional file info, status change details, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  reply_to_message_id UUID REFERENCES task_messages(id)
);

-- Indexes for performance
CREATE INDEX idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX idx_task_messages_created_at ON task_messages(created_at DESC);
CREATE INDEX idx_task_messages_sender_id ON task_messages(sender_id);
```

### 3. Task Status History Table
```sql
CREATE TABLE task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_status_history_task_id ON task_status_history(task_id);
```

### 4. File Attachments Table
```sql
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  message_id UUID REFERENCES task_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  storage_path TEXT,
  is_submission BOOLEAN DEFAULT FALSE, -- Mark files as task submissions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_message_id ON task_attachments(message_id);
```

## Frontend Components Architecture

### 1. Enhanced TasksScreen Component
```typescript
// Similar structure to ClientsScreen but for tasks
interface TasksScreenProps {
  navigation: any;
}

// Key features:
// - Task list with status badges
// - Search and filter by status, assignee
// - Click task opens TaskChatDrawer
// - Real-time updates via Supabase subscriptions
// - Role-based UI rendering
```

### 2. TaskChatDrawer Component
```typescript
interface TaskChatDrawerProps {
  task: Task;
  isVisible: boolean;
  onClose: () => void;
  currentUser: Profile;
}

// Structure:
// - Task header with details and status
// - Chat messages area with file attachments
// - Message input with file upload
// - Action buttons based on role and status
// - File gallery for easy access to submissions
```

### 3. TaskMessage Component
```typescript
interface TaskMessageProps {
  message: TaskMessage;
  currentUser: Profile;
  onFileDownload: (fileUrl: string, fileName: string) => void;
}

// Features:
// - Different styling for sent/received messages
// - File attachment preview
// - System messages for status changes
// - Timestamp and read status
```

### 4. TaskActionButtons Component
```typescript
interface TaskActionButtonsProps {
  task: Task;
  currentUser: Profile;
  onStatusChange: (newStatus: string, reason?: string) => void;
}

// Role-based buttons:
// Admin: Accept, Start, Submit for Review, Mark Complete, Request Revision
// User: Accept, Start, Submit for Review
```

### 5. FileUpload Component
```typescript
interface FileUploadProps {
  taskId: string;
  onFileUploaded: (file: TaskAttachment) => void;
  allowedTypes?: string[];
  maxSize?: number;
}

// Features:
// - Drag & drop support
// - Multiple file selection
// - Progress indicators
// - File type validation
// - Preview for images
```

## Status Workflow Logic

### Task Status Flow
```
1. Created (by admin) → Pending
2. Pending → Accepted (by assignee)
3. Accepted → In Progress (by assignee)
4. In Progress → Submitted for Review (by assignee)
5. Submitted for Review → Completed (by admin) OR Revision (by admin)
6. Revision → In Progress (back to assignee)
```

### Role-Based Actions

#### Admin Actions:
- **Create Task**: Set initial status to 'pending'
- **Accept Own Task**: If admin is assignee, can accept
- **Review Submission**: Mark as 'completed' or send for 'revision'
- **Override Status**: Can change any status with reason

#### User/Assignee Actions:
- **Accept Task**: Change from 'pending' to 'accepted'
- **Start Task**: Change from 'accepted' to 'in_progress'
- **Submit for Review**: Change from 'in_progress' to 'submitted_for_review'
- **Resubmit**: After revision, change back to 'submitted_for_review'

### Notification Triggers
Every status change will automatically:
1. Insert a record into `task_status_history` table
2. Create a notification in the `notifications` table
3. Send real-time updates via Supabase subscriptions
4. Trigger push notifications to relevant users

```sql
-- Example notification insertion for status change
INSERT INTO notifications (user_id, type, title, message, data)
VALUES (
  $assignee_id,
  'task_status_changed',
  'Task Status Updated',
  'Task "$task_title" status changed from $old_status to $new_status',
  jsonb_build_object(
    'task_id', $task_id,
    'old_status', $old_status,
    'new_status', $new_status,
    'changed_by', $changed_by_user_id
  )
);
```

## Real-time Features

### 1. Supabase Subscriptions
```typescript
// Subscribe to task messages
const subscription = supabase
  .channel('task_messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'task_messages',
    filter: `task_id=eq.${taskId}`
  }, handleNewMessage)
  .subscribe();

// Subscribe to task status changes
const taskSubscription = supabase
  .channel('task_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tasks'
  }, handleTaskUpdate)
  .subscribe();
```

### 2. Push Notifications
```typescript
// Trigger notifications for:
// - New task assignment
// - Task status changes
// - New messages in task chat
// - File submissions
// - Review requests

// Update notification types in database:
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'task_assigned', 
  'task_completed', 
  'task_status_changed',
  'task_accepted',
  'task_submitted_for_review',
  'task_needs_revision',
  'message_received', 
  'client_updated',
  'file_uploaded'
));
```

## File Management System

### 1. Supabase Storage Integration
```typescript
// Storage bucket structure:
// task-files/
//   ├── {task_id}/
//   │   ├── messages/
//   │   │   └── {message_id}_{filename}
//   │   └── submissions/
//   │       └── {timestamp}_{filename}

const uploadTaskFile = async (taskId: string, file: File, isSubmission: boolean) => {
  const folder = isSubmission ? 'submissions' : 'messages';
  const filePath = `task-files/${taskId}/${folder}/${Date.now()}_${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file);
    
  // Save file record to database
  // Send message with file attachment
};
```

### 2. File Access Control
```sql
-- RLS policies for task attachments
CREATE POLICY "Users can view task files they have access to" ON task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_attachments.task_id 
      AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  );
```

## UI/UX Design Specifications

### 1. Task List Layout
- **Left Panel**: Task list (similar to client list)
  - Task cards with status badges
  - Priority indicators
  - Assignee avatars
  - Due date indicators
  - Unread message badges

### 2. Chat Drawer Layout
- **Header Section**:
  - Task title and description
  - Status badge with progress indicator
  - Assignee and due date info
  - Action buttons based on role

- **Chat Area**:
  - Message bubbles with sender info
  - File attachment previews
  - System messages for status changes
  - Timestamp and read indicators

- **Input Section**:
  - Text input with emoji support
  - File attachment button
  - Send button
  - File upload progress

### 3. File Gallery
- **Quick Access Panel**:
  - All task files organized by type
  - Submission files highlighted
  - Download and preview options
  - File metadata display

## Implementation Phases

### Phase 1: Database Setup (Week 1)
- [ ] Create migration files for new tables
- [ ] Set up RLS policies
- [ ] Create database functions for status changes
- [ ] Set up Supabase storage bucket
- [ ] Test database schema

### Phase 2: Core Components (Week 2)
- [ ] Create TasksScreen component
- [ ] Implement TaskChatDrawer component
- [ ] Build TaskMessage component
- [ ] Create file upload functionality
- [ ] Implement real-time subscriptions

### Phase 3: Status Management (Week 3)
- [ ] Implement status workflow logic
- [ ] Create role-based action buttons
- [ ] Build status change tracking
- [ ] Add notification system
- [ ] Test status transitions

### Phase 4: File Management (Week 4)
- [ ] Complete file upload/download system
- [ ] Implement file gallery
- [ ] Add file preview capabilities
- [ ] Set up file access controls
- [ ] Test file operations

### Phase 5: Integration & Testing (Week 5)
- [ ] Integrate with existing navigation
- [ ] Add search and filtering
- [ ] Implement push notifications
- [ ] Performance optimization
- [ ] End-to-end testing

### Phase 6: Polish & Deployment (Week 6)
- [ ] UI/UX refinements
- [ ] Error handling improvements
- [ ] Documentation updates
- [ ] Production deployment
- [ ] User training materials

## Technical Considerations

### 1. Performance Optimization
- Implement message pagination for large task histories
- Use virtual scrolling for long message lists
- Optimize file upload with chunking for large files
- Cache frequently accessed task data

### 2. Security Measures
- File type validation and virus scanning
- Rate limiting for message sending
- Secure file access with signed URLs
- Input sanitization for all user content

### 3. Offline Support
- Cache recent messages locally
- Queue messages when offline
- Sync when connection restored
- Show offline indicators

### 4. Mobile Responsiveness
- Responsive drawer sizing
- Touch-friendly file upload
- Optimized for mobile keyboards
- Gesture support for navigation

## Success Metrics

### 1. User Engagement
- Task completion rate improvement
- Average response time to task assignments
- File submission frequency
- User satisfaction scores

### 2. System Performance
- Message delivery speed
- File upload success rate
- Real-time update latency
- System uptime and reliability

### 3. Business Impact
- Reduced task turnaround time
- Improved communication clarity
- Better file organization
- Enhanced project visibility

This comprehensive plan provides a roadmap for implementing a robust, chat-based task management system that enhances collaboration and streamlines workflow processes.