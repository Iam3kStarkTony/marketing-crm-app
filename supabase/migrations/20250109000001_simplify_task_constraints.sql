-- Migration: Simplify task constraints for single-owner agency
-- Remove NOT NULL constraint from created_by to allow null values
-- This prevents foreign key constraint violations during client onboarding

-- Make created_by nullable in tasks table
ALTER TABLE public.tasks 
ALTER COLUMN created_by DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.tasks.created_by IS 'User who created the task - nullable for simplified onboarding process';
COMMENT ON COLUMN public.tasks.assigned_to IS 'User assigned to the task - nullable for unassigned tasks';