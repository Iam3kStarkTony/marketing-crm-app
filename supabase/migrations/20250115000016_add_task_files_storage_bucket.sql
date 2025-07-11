-- Add task-files storage bucket for task management system
-- This migration creates the storage bucket and policies for task file attachments

-- Create task-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('task-files', 'task-files', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-files bucket
-- Allow authenticated users to upload files to tasks they have access to
CREATE POLICY "Users can upload task files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'task-files' AND
        auth.role() = 'authenticated' AND
        -- Check if user has access to the task (extracted from file path)
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id::text = (storage.foldername(name))[2] AND
            (
                t.assigned_to = auth.uid() OR
                t.created_by = auth.uid() OR
                t.client_id IN (
                    SELECT client_id FROM public.profiles
                    WHERE id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Allow users to view task files they have access to
CREATE POLICY "Users can view task files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'task-files' AND
        auth.role() = 'authenticated' AND
        -- Check if user has access to the task (extracted from file path)
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id::text = (storage.foldername(name))[2] AND
            (
                t.assigned_to = auth.uid() OR
                t.created_by = auth.uid() OR
                t.client_id IN (
                    SELECT client_id FROM public.profiles
                    WHERE id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Allow users to delete task files they uploaded or if admin
CREATE POLICY "Users can delete task files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'task-files' AND
        auth.role() = 'authenticated' AND
        (
            -- User uploaded the file (check metadata or assume from folder structure)
            auth.uid()::text = (storage.foldername(name))[3] OR
            -- Admin can delete any file
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin'
            )
        )
    );

-- Note: task-files bucket created for task management system file attachments