-- Fix infinite recursion in tasks RLS policies
-- The issue is that tasks policies check profiles.role while profiles policies reference tasks
-- This creates a circular dependency causing infinite recursion

-- Create a security definer function to check user roles without causing recursion
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    );
END;
$$;

-- Drop the problematic tasks policy
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;

-- Create a new tasks policy that uses the security definer function
CREATE POLICY "Users can view relevant tasks" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        public.is_user_admin_or_manager()
    );

-- Also fix other tasks policies that might have the same issue
DROP POLICY IF EXISTS "Users can update relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can update relevant tasks" ON public.tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        public.is_user_admin_or_manager()
    );

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (
        created_by = auth.uid() OR
        public.is_user_admin_or_manager()
    );

-- Fix clients policies that also check profiles.role
DROP POLICY IF EXISTS "Agents can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Agents can update all clients" ON public.clients;

CREATE POLICY "Agents can view all clients" ON public.clients
    FOR SELECT USING (
        public.is_user_admin_or_manager() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'agent'
        )
    );

CREATE POLICY "Agents can update all clients" ON public.clients
    FOR UPDATE USING (
        public.is_user_admin_or_manager() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'agent'
        )
    );

-- Fix messages policies
DROP POLICY IF EXISTS "Agents can view client messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert client messages" ON public.messages;

CREATE POLICY "Agents can view client messages" ON public.messages
    FOR SELECT USING (
        public.is_user_admin_or_manager() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'agent'
        )
    );

CREATE POLICY "Agents can insert client messages" ON public.messages
    FOR INSERT WITH CHECK (
        public.is_user_admin_or_manager() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'agent'
        )
    );

-- Fix file attachments policies
DROP POLICY IF EXISTS "Agents can view relevant attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Agents can insert relevant attachments" ON public.file_attachments;

CREATE POLICY "Agents can view relevant attachments" ON public.file_attachments
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = file_attachments.task_id AND (
                assigned_to = auth.uid() OR created_by = auth.uid()
            )
        ) OR
        public.is_user_admin_or_manager() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'agent'
        )
    );

CREATE POLICY "Agents can insert relevant attachments" ON public.file_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND (
            public.is_user_admin_or_manager() OR
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'agent'
            )
        )
    );

-- Fix storage policy
DROP POLICY IF EXISTS "Users can view relevant attachments" ON storage.objects;

CREATE POLICY "Users can view relevant attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'attachments' AND
        (
            -- User uploaded the file
            auth.uid()::text = (storage.foldername(name))[1] OR
            -- User is admin or manager
            public.is_user_admin_or_manager() OR
            -- User has access to the task the attachment belongs to
            EXISTS (
                SELECT 1 FROM public.file_attachments fa
                LEFT JOIN public.tasks t ON fa.task_id = t.id
                WHERE fa.file_path = name AND (
                    t.assigned_to = auth.uid() OR
                    t.created_by = auth.uid()
                )
            )
        )
    );