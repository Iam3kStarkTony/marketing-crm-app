-- Rename 'name' column to 'full_name' in clients table for consistency with profiles table

ALTER TABLE public.clients 
RENAME COLUMN name TO full_name;

-- Update any existing comments
COMMENT ON COLUMN public.clients.full_name IS 'Client full name (renamed from name for consistency)';