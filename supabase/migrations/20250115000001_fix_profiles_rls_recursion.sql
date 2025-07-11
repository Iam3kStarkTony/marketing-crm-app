-- Fix infinite recursion in profiles RLS policy and create bootstrap admin
-- This migration fixes the "Only admins can insert profiles" policy and creates the first admin

-- Drop the problematic policy
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;

-- Temporarily disable RLS to create the bootstrap admin
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create a function to bootstrap the first admin user
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user()
RETURNS void AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Check if any admin users exist
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    
    -- If no admin exists, create one from the first user in auth.users
    IF admin_count = 0 THEN
        INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
        SELECT 
            id,
            email,
            COALESCE(raw_user_meta_data->>'full_name', email),
            'admin',
            created_at,
            updated_at
        FROM auth.users 
        ORDER BY created_at ASC 
        LIMIT 1
        ON CONFLICT (id) DO UPDATE SET 
            role = 'admin',
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the bootstrap function
SELECT public.bootstrap_admin_user();

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the correct admin-only insert policy
CREATE POLICY "Only admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow if the current user is an admin (but not for self-insertion to avoid recursion)
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- Create a special policy for the bootstrap process
CREATE POLICY "Bootstrap admin creation" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow insertion if no admin exists yet (bootstrap case)
        NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
    );

-- Update the handle_new_user function to handle admin creation properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
    user_role TEXT;
BEGIN
    -- Check if any admin users exist
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    
    -- Determine the role for the new user
    IF admin_count = 0 THEN
        -- First user becomes admin
        user_role := 'admin';
    ELSE
        -- Subsequent users get the role from metadata or default to 'agent'
        user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
    END IF;
    
    -- Insert the profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        user_role
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up the bootstrap function (no longer needed after migration)
DROP FUNCTION IF EXISTS public.bootstrap_admin_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. First user becomes admin, others default to agent role.';
COMMENT ON POLICY "Bootstrap admin creation" ON public.profiles IS 'Allows creation of the first admin user during system bootstrap';
COMMENT ON POLICY "Only admins can insert profiles" ON public.profiles IS 'Only existing admin users can create new profiles for other users';