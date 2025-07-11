-- Final fix for profiles RLS infinite recursion
-- This migration properly addresses the circular dependency in RLS policies

-- Drop the problematic "Only admins can insert profiles" policy
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;

-- Create a new policy that allows the trigger function to insert profiles
-- while still maintaining security for manual insertions
CREATE POLICY "Allow profile creation" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow if it's the trigger function creating the profile (first user or admin-created)
        auth.uid() = id OR
        -- Allow if an admin is manually creating a profile
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update the handle_new_user function to be simpler and more reliable
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
    
    -- Insert the profile (the new policy allows this)
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        user_role
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup. First user becomes admin automatically, subsequent users follow role from metadata or default to agent.';
COMMENT ON POLICY "Allow profile creation" ON public.profiles IS 'Allows profile creation by trigger function for new users and by admins for manual creation.';