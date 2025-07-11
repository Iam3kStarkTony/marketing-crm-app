-- Fix infinite recursion in profiles RLS policy
-- The previous policy caused recursion by checking profiles.role within a profiles policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

-- Create a simple policy that allows viewing profiles without recursion
-- This policy allows users to view profiles of people involved in their tasks
-- without checking roles in the profiles table itself
CREATE POLICY "Users can view task-related profiles" ON public.profiles
    FOR SELECT USING (
        -- Users can view their own profile
        auth.uid() = id OR
        -- Users can view profiles of people assigned to tasks they created
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE assigned_to = profiles.id AND created_by = auth.uid()
        ) OR
        -- Users can view profiles of people who created tasks assigned to them
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE created_by = profiles.id AND assigned_to = auth.uid()
        )
    );

-- For admin/manager access, we'll use service role or create specific functions
-- This avoids the recursion issue while still allowing necessary profile access

COMMENT ON POLICY "Users can view task-related profiles" ON public.profiles IS 'Allows users to view their own profile and profiles of users involved in tasks they created or are assigned to, without role-based recursion.';