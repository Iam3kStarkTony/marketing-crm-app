-- Final fix for profiles RLS infinite recursion
-- Remove circular dependency by using a simpler policy approach

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Create a simple policy that allows users to insert their own profile
-- This works because auth.uid() = id doesn't require querying the profiles table
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a separate policy for admin insertions using a function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Use a direct query with security definer to bypass RLS
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for admin manual insertions
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
    user_role TEXT;
BEGIN
    -- Check if any admin users exist (using security definer to bypass RLS)
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
COMMENT ON FUNCTION public.is_admin_user(UUID) IS 'Helper function to check if a user is admin, bypasses RLS to prevent recursion.';
COMMENT ON POLICY "Users can insert own profile" ON public.profiles IS 'Allows users to insert their own profile during signup.';
COMMENT ON POLICY "Admins can insert profiles" ON public.profiles IS 'Allows admins to manually create profiles for other users.';