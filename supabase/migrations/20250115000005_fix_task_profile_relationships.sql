-- Fix ambiguous relationships between tasks and profiles tables
-- Add explicit foreign key constraint names to resolve PGRST201 errors

-- Drop existing foreign key constraints
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

-- Recreate foreign key constraints with explicit names
ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_assigned_to_profiles_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);

ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_created_by_profiles_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Add comments to clarify the relationships
COMMENT ON CONSTRAINT tasks_assigned_to_profiles_fkey ON public.tasks IS 'Foreign key to profiles table for task assignee';
COMMENT ON CONSTRAINT tasks_created_by_profiles_fkey ON public.tasks IS 'Foreign key to profiles table for task creator';

-- Update table comment to clarify relationships
COMMENT ON TABLE public.tasks IS 'Task management for client work. assigned_to references the user assigned to complete the task, created_by references the user who created the task.';