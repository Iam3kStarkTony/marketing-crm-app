-- Fix infinite recursion in profiles SELECT policy
-- The "Admins and managers can view all profiles" policy causes recursion
-- when other policies try to check user roles

-- Drop the problematic SELECT policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;

-- Create a simpler SELECT policy that doesn't cause recursion
-- Users can only view their own profile, admins will need to use service role for admin operations
CREATE POLICY "Users can view own profile only" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- For admin operations that need to view all profiles, we'll use service role
-- or create specific functions with SECURITY DEFINER that bypass RLS

COMMENT ON POLICY "Users can view own profile only" ON public.profiles IS 'Allows users to view only their own profile to prevent RLS recursion. Admin operations should use service role.';