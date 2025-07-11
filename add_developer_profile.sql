-- SQL query to add a new profile with Developer position
-- IMPORTANT: The profiles table has a foreign key constraint to auth.users(id)
-- You must first create a user in Supabase Auth, then use that user's ID here

-- Option 1: If you have an existing auth user ID, replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  department,
  is_active,
  created_at,
  updated_at
) VALUES (
  'YOUR_AUTH_USER_ID_HERE', -- Replace with actual auth.users.id
  'developer@company.com',
  'Developer User',
  'agent',
  'Developer',
  true,
  now(),
  now()
);

-- Option 2: Create auth user first (requires admin privileges or use Supabase Dashboard)
-- You can create a user through:
-- 1. Supabase Dashboard > Authentication > Users > Add User
-- 2. Use Supabase Admin API
-- 3. Use the application's signup flow
-- Then use the generated user ID in the INSERT above

-- Alternative version with custom values (replace with actual data):
-- INSERT INTO profiles (
--   id,
--   email,
--   full_name,
--   role,
--   department,
--   phone,
--   is_active,
--   created_at,
--   updated_at
-- ) VALUES (
--   'ANOTHER_AUTH_USER_ID_HERE', -- Replace with actual auth.users.id
--   'john.developer@company.com',
--   'John Developer',
--   'agent',
--   'Developer',
--   '+1234567890',
--   true,
--   now(),
--   now()
-- );

-- Steps to create a new user and profile:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and enter email/password
-- 3. Copy the generated User ID (UUID)
-- 4. Replace 'YOUR_AUTH_USER_ID_HERE' with the copied UUID
-- 5. Run the INSERT statement above