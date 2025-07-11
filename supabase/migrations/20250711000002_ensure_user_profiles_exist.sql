-- Ensure all auth.users have corresponding profiles
-- This fixes foreign key constraint issues for analytics_events

-- Create profiles for any auth users that don't have them
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    COALESCE(au.raw_user_meta_data->>'role', 'agent') as role,
    au.created_at,
    CURRENT_TIMESTAMP as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.email IS NOT NULL;

-- Log the number of profiles created
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL;
    
    IF profile_count > 0 THEN
        RAISE NOTICE 'Created % missing user profiles', profile_count;
    ELSE
        RAISE NOTICE 'All auth users already have profiles';
    END IF;
END $$;

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users - ensures all auth users have profiles';