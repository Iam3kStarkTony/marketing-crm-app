-- Fix profiles RLS to allow admin/manager access without recursion
-- Create a function to check if user is admin/manager without causing recursion

-- Create a function that checks user role using service role
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'manager')
  );
END;
$$;

-- Drop the current policy
DROP POLICY IF EXISTS "Users can view task-related profiles" ON public.profiles;

-- Create a new policy that uses the function to avoid recursion
CREATE POLICY "Users can view relevant profiles" ON public.profiles
    FOR SELECT USING (
        -- Users can view their own profile
        auth.uid() = id OR
        -- Admin/manager users can view all profiles (using function to avoid recursion)
        public.is_admin_or_manager(auth.uid()) OR
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

COMMENT ON FUNCTION public.is_admin_or_manager(UUID) IS 'Checks if a user is admin or manager without causing RLS recursion';
COMMENT ON POLICY "Users can view relevant profiles" ON public.profiles IS 'Allows users to view their own profile, task-related profiles, and all profiles for admin/manager users.';