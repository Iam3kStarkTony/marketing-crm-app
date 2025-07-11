-- Fix profiles RLS to allow viewing profiles for task assignments
-- The current policy only allows users to view their own profile,
-- but we need to allow viewing profiles of users assigned to tasks

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create a new policy that allows:
-- 1. Users to view their own profile
-- 2. Users to view profiles of people assigned to tasks they can see
-- 3. Users to view profiles of people who created tasks they can see
CREATE POLICY "Users can view relevant profiles" ON public.profiles
    FOR SELECT USING (
        -- Users can view their own profile
        auth.uid() = id OR
        -- Users can view profiles of people assigned to tasks they have access to
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE assigned_to = profiles.id AND (
                assigned_to = auth.uid() OR
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
                )
            )
        ) OR
        -- Users can view profiles of people who created tasks they have access to
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE created_by = profiles.id AND (
                assigned_to = auth.uid() OR
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
                )
            )
        )
    );

COMMENT ON POLICY "Users can view relevant profiles" ON public.profiles IS 'Allows users to view their own profile and profiles of users involved in tasks they have access to.';