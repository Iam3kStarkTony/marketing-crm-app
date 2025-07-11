-- Fix for profiles RLS infinite recursion by making first user admin
-- This keeps the admin-only policy but ensures the first user becomes admin automatically

-- Update the handle_new_user function to bypass RLS for the first admin user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
    user_role TEXT;
BEGIN
    -- Check if any admin users exist (using a direct count to avoid RLS)
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    
    -- Determine the role for the new user
    IF admin_count = 0 THEN
        -- First user becomes admin
        user_role := 'admin';
        
        -- Temporarily disable RLS to insert the first admin
        PERFORM set_config('row_security', 'off', true);
        
        -- Insert the first admin profile
        INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NEW.raw_user_meta_data->>'avatar_url',
            user_role
        );
        
        -- Re-enable RLS
        PERFORM set_config('row_security', 'on', true);
    ELSE
        -- Subsequent users get the role from metadata or default to 'agent'
        user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
        
        -- Insert profile normally (will be subject to RLS)
        INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NEW.raw_user_meta_data->>'avatar_url',
            user_role
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Ensure RLS is re-enabled even if there's an error
        PERFORM set_config('row_security', 'on', true);
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup. First user becomes admin and bypasses RLS, subsequent users follow normal RLS policies.';

-- Note: Keep the existing "Only admins can insert profiles" policy intact
-- This ensures that after the first admin is created, only admins can create new profiles