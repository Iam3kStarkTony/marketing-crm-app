-- Add is_read column to task_messages table
-- This migration adds the missing is_read column for message read status tracking

-- 1. Add is_read column to task_messages table
ALTER TABLE task_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 2. Add index for performance on is_read queries
CREATE INDEX IF NOT EXISTS idx_task_messages_is_read ON task_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_task_messages_task_id_is_read ON task_messages(task_id, is_read);

-- 3. Add RLS policy for updating is_read status
-- Users can update is_read status for messages in tasks they're assigned to
CREATE POLICY "Users can update message read status for assigned tasks" ON task_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_messages.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_messages.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  );

-- 4. Add comment for documentation
COMMENT ON COLUMN task_messages.is_read IS 'Indicates if the message has been read by the recipient';