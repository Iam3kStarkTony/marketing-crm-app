-- Fix notifications foreign key constraint issue
-- Drop the foreign key constraint to allow both profile IDs and client IDs
-- This enables notifications for both internal users and clients

-- Drop the existing foreign key constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Add comment to clarify the user_id field can reference either profiles or clients
COMMENT ON COLUMN public.notifications.user_id IS 'Can reference either profiles.id or clients.id depending on assignment type';