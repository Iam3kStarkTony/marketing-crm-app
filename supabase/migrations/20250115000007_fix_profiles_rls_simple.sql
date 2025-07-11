-- Simple fix for profiles RLS infinite recursion
-- Remove all circular dependencies by simplifying the policies

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Bootstrap admin creation" ON public.profiles;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.is_admin_user(UUID);

-- Create a simple policy that allows profile insertion during signup
-- This policy only checks that the user is inserting their own profile
CREATE POLICY "Allow profile creation during signup" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow if the user is creating their own profile
        auth.uid() = id
    );

-- Simplify the handle_new_user function to avoid any RLS queries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Determine role from metadata or default to 'agent'
    -- First user will be set as admin manually if needed
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
    
    -- Insert the profile (this will use the simple policy above)
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup with role from metadata or defaults to agent.';
COMMENT ON POLICY "Allow profile creation during signup" ON public.profiles IS 'Allows users to insert their own profile during signup process.';