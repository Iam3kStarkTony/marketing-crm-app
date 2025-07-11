-- Remove assigned_agent_id from clients table
-- Clients are not assigned to agents; instead, tasks are created for clients and assigned to agents

-- First, drop policies that depend on assigned_agent_id
DROP POLICY IF EXISTS "Users can view assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view client messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert client messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view relevant attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Users can insert relevant attachments" ON public.file_attachments;
-- Drop storage policy that depends on assigned_agent_id
DROP POLICY IF EXISTS "Users can view relevant attachments" ON storage.objects;

-- Drop the index
DROP INDEX IF EXISTS public.idx_clients_assigned_agent;

-- Remove the assigned_agent_id column from clients table
ALTER TABLE public.clients DROP COLUMN IF EXISTS assigned_agent_id;

-- Recreate policies without assigned_agent_id dependency
-- Clients policies - All agents can view/manage all clients
CREATE POLICY "Agents can view all clients" ON public.clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

CREATE POLICY "Agents can update all clients" ON public.clients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

-- Tasks policies - Users can view tasks assigned to them, created by them, or all if admin/manager
CREATE POLICY "Users can view relevant tasks" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Messages policies - All agents can view/insert messages for any client
CREATE POLICY "Agents can view client messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

CREATE POLICY "Agents can insert client messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

-- File attachments policies - All agents can view/insert attachments
CREATE POLICY "Agents can view relevant attachments" ON public.file_attachments
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = file_attachments.task_id AND (
                assigned_to = auth.uid() OR created_by = auth.uid()
            )
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

CREATE POLICY "Agents can insert relevant attachments" ON public.file_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

-- Recreate storage policy without assigned_agent_id dependency
CREATE POLICY "Users can view relevant attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'attachments' AND
        (
            -- User uploaded the file
            auth.uid()::text = (storage.foldername(name))[1] OR
            -- User is admin or manager
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('admin', 'manager')
            ) OR
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

-- Add comment to clarify the relationship
COMMENT ON TABLE public.clients IS 'Client information and contact details. Tasks are assigned to agents via the tasks table, not directly to clients.';