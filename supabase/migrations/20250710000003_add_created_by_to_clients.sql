-- Add created_by column to clients table
-- This column tracks which user created each client record
-- Required for analytics and role-based filtering

-- Add created_by column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Set default value for existing records (set to first admin user)
-- This is a one-time update for existing data
UPDATE public.clients 
SET created_by = (
  SELECT id FROM public.profiles 
  WHERE role = 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Make created_by NOT NULL for future records
ALTER TABLE public.clients 
ALTER COLUMN created_by SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);

-- Update RLS policies to use created_by instead of assigned_agent_id
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Agents can update all clients" ON public.clients;

-- Create new policies based on created_by
CREATE POLICY "Users can view clients they created or all if admin/manager" ON public.clients
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can update clients they created or all if admin/manager" ON public.clients
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Drop existing insert policy if it exists and recreate
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
CREATE POLICY "Authenticated users can insert clients" ON public.clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

-- Add comment
COMMENT ON COLUMN public.clients.created_by IS 'User who created this client record';