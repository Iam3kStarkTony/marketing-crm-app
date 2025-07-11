-- Task Management System - Phase 1: Database Schema Changes
-- This migration adds new tables and columns for the task chat system
-- WITHOUT modifying existing task creation/update functionality

-- 1. Add task_accepted_date column to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_accepted_date TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_date ON tasks(task_accepted_date);

-- 2. Create task_messages table for chat functionality
CREATE TABLE IF NOT EXISTS task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text TEXT,
  message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for task_messages
CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_sender_id ON task_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created_at ON task_messages(created_at);

-- 3. Create task_status_history table for audit trail
CREATE TABLE IF NOT EXISTS task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for task_status_history
CREATE INDEX IF NOT EXISTS idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_created_at ON task_status_history(created_at);

-- 4. Create task_attachments table for file uploads
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  message_id UUID REFERENCES task_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for task_attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_message_id ON task_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);

-- 5. Update notifications table to support new task-related notification types
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

-- 6. Enable RLS on new tables
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for task_messages
-- Users can view messages for tasks they're assigned to or created
CREATE POLICY "Users can view task messages for assigned tasks" ON task_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_messages.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  );

-- Admins can view all task messages
CREATE POLICY "Admins can view all task messages" ON task_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can insert messages for tasks they're assigned to
CREATE POLICY "Users can insert messages for assigned tasks" ON task_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_messages.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  );

-- 8. Create RLS policies for task_status_history
-- Users can view status history for tasks they're assigned to or created
CREATE POLICY "Users can view task status history for assigned tasks" ON task_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_status_history.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  );

-- Admins can view all task status history
CREATE POLICY "Admins can view all task status history" ON task_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- System can insert status history (via triggers or functions)
CREATE POLICY "System can insert task status history" ON task_status_history
  FOR INSERT WITH CHECK (true);

-- 9. Create RLS policies for task_attachments
-- Users can view attachments for tasks they're assigned to or created
CREATE POLICY "Users can view task attachments for assigned tasks" ON task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_attachments.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  );

-- Admins can view all task attachments
CREATE POLICY "Admins can view all task attachments" ON task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can upload attachments for tasks they're assigned to
CREATE POLICY "Users can upload attachments for assigned tasks" ON task_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_attachments.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  );

-- 10. Create updated_at triggers for new tables
CREATE TRIGGER update_task_messages_updated_at
  BEFORE UPDATE ON task_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Add comments for documentation
COMMENT ON TABLE task_messages IS 'Chat messages for task collaboration';
COMMENT ON TABLE task_status_history IS 'Audit trail for task status changes';
COMMENT ON TABLE task_attachments IS 'File attachments for tasks and messages';
COMMENT ON COLUMN tasks.task_accepted_date IS 'Timestamp when user accepted the task';