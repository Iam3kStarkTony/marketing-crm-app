-- Update messages table to support team-to-team communication
-- This migration adds support for internal team messaging alongside client communication

-- First, let's add a new message_category to distinguish between client and team messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_category TEXT CHECK (message_category IN ('client_communication', 'team_communication')) DEFAULT 'client_communication';

-- Add recipient_id to support direct messaging between team members
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id);

-- Update the client_id to be nullable for team messages
ALTER TABLE public.messages 
ALTER COLUMN client_id DROP NOT NULL;

-- Add constraint to ensure either client_id or recipient_id is set
ALTER TABLE public.messages 
ADD CONSTRAINT check_message_recipient 
CHECK (
  (message_category = 'client_communication' AND client_id IS NOT NULL AND recipient_id IS NULL) OR
  (message_category = 'team_communication' AND client_id IS NULL AND recipient_id IS NOT NULL)
);

-- Update sender_type to include more roles
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_type_check;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_type_check 
CHECK (sender_type IN ('agent', 'client', 'admin', 'manager'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_category ON public.messages(message_category);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);

-- Update RLS policies for the new message structure
DROP POLICY IF EXISTS "Users can view messages for assigned clients or team messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages for assigned clients or team messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- New RLS policies for team and client communication
CREATE POLICY "View client messages" ON public.messages
FOR SELECT
USING (
  message_category = 'client_communication' AND (
    -- Admins and managers can see all client messages
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager') OR
    -- Agents can see messages for clients they have tasks for
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.client_id = messages.client_id 
      AND tasks.assigned_to = auth.uid()
    ) OR
    -- Users can see their own messages
    sender_id = auth.uid()
  )
);

CREATE POLICY "View team messages" ON public.messages
FOR SELECT
USING (
  message_category = 'team_communication' AND (
    -- Users can see messages they sent or received
    sender_id = auth.uid() OR recipient_id = auth.uid()
  )
);

CREATE POLICY "Insert client messages" ON public.messages
FOR INSERT
WITH CHECK (
  message_category = 'client_communication' AND (
    -- Admins and managers can send to any client
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager') OR
    -- Agents can send to clients they have tasks for
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.client_id = messages.client_id 
      AND tasks.assigned_to = auth.uid()
    )
  ) AND
  sender_id = auth.uid()
);

CREATE POLICY "Insert team messages" ON public.messages
FOR INSERT
WITH CHECK (
  message_category = 'team_communication' AND
  sender_id = auth.uid() AND
  (
    -- Admins can message anyone
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
    -- Managers can message admins and agents
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager' AND
     (SELECT role FROM public.profiles WHERE id = messages.recipient_id) IN ('admin', 'agent')) OR
    -- Agents can only message admins and managers
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' AND
     (SELECT role FROM public.profiles WHERE id = messages.recipient_id) IN ('admin', 'manager'))
  )
);

CREATE POLICY "Update own messages" ON public.messages
FOR UPDATE
USING (
  sender_id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Add a function to get conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants(user_id UUID)
RETURNS TABLE (
  participant_id UUID,
  participant_name TEXT,
  participant_role TEXT,
  participant_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  conversation_type TEXT
) AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- Return different participants based on user role
  IF user_role = 'admin' THEN
    -- Admins see all clients and team members
    RETURN QUERY
    -- Clients
    SELECT 
      c.id as participant_id,
      c.name as participant_name,
      'client'::TEXT as participant_role,
      c.avatar_url as participant_avatar,
      COALESCE(latest.content, '') as last_message,
      latest.created_at as last_message_time,
      COALESCE(unread.count, 0) as unread_count,
      'client_communication'::TEXT as conversation_type
    FROM public.clients c
    LEFT JOIN LATERAL (
      SELECT content, created_at
      FROM public.messages m
      WHERE m.client_id = c.id AND m.message_category = 'client_communication'
      ORDER BY created_at DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as count
      FROM public.messages m
      WHERE m.client_id = c.id 
      AND m.message_category = 'client_communication'
      AND m.sender_id != user_id
      AND m.is_read = false
    ) unread ON true
    WHERE c.status = 'active'
    
    UNION ALL
    
    -- Team members
    SELECT 
      p.id as participant_id,
      p.full_name as participant_name,
      p.role as participant_role,
      p.avatar_url as participant_avatar,
      COALESCE(latest.content, '') as last_message,
      latest.created_at as last_message_time,
      COALESCE(unread.count, 0) as unread_count,
      'team_communication'::TEXT as conversation_type
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT content, created_at
      FROM public.messages m
      WHERE m.message_category = 'team_communication'
      AND ((m.sender_id = user_id AND m.recipient_id = p.id) OR 
           (m.sender_id = p.id AND m.recipient_id = user_id))
      ORDER BY created_at DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as count
      FROM public.messages m
      WHERE m.message_category = 'team_communication'
      AND m.sender_id = p.id
      AND m.recipient_id = user_id
      AND m.is_read = false
    ) unread ON true
    WHERE p.id != user_id AND p.is_active = true;
    
  ELSIF user_role IN ('manager', 'agent') THEN
    -- Managers and agents only see admins
    RETURN QUERY
    SELECT 
      p.id as participant_id,
      p.full_name as participant_name,
      p.role as participant_role,
      p.avatar_url as participant_avatar,
      COALESCE(latest.content, '') as last_message,
      latest.created_at as last_message_time,
      COALESCE(unread.count, 0) as unread_count,
      'team_communication'::TEXT as conversation_type
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT content, created_at
      FROM public.messages m
      WHERE m.message_category = 'team_communication'
      AND ((m.sender_id = user_id AND m.recipient_id = p.id) OR 
           (m.sender_id = p.id AND m.recipient_id = user_id))
      ORDER BY created_at DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as count
      FROM public.messages m
      WHERE m.message_category = 'team_communication'
      AND m.sender_id = p.id
      AND m.recipient_id = user_id
      AND m.is_read = false
    ) unread ON true
    WHERE p.role = 'admin' AND p.is_active = true;
    
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_participants(UUID) TO authenticated;

COMMENT ON FUNCTION get_conversation_participants(UUID) IS 'Returns conversation participants based on user role and permissions';