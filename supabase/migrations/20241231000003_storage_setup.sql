-- Supabase Storage Setup
-- Phase 2.4: Storage Buckets and Policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('attachments', 'attachments', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1] AND
        auth.role() = 'authenticated'
    );

-- Allow public access to view avatars
CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1] AND
        auth.role() = 'authenticated'
    );

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1] AND
        auth.role() = 'authenticated'
    );

-- Storage policies for attachments bucket
-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'attachments' AND
        auth.role() = 'authenticated'
    );

-- Allow users to view attachments they uploaded or have access to
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
            -- User has access to the client/task the attachment belongs to
            EXISTS (
                SELECT 1 FROM public.file_attachments fa
                LEFT JOIN public.clients c ON fa.client_id = c.id
                LEFT JOIN public.tasks t ON fa.task_id = t.id
                WHERE fa.file_path = name AND (
                    c.assigned_agent_id = auth.uid() OR
                    t.assigned_to = auth.uid() OR
                    t.created_by = auth.uid()
                )
            )
        )
    );

-- Allow users to update attachments they uploaded or if admin
CREATE POLICY "Users can update own attachments" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'attachments' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Allow users to delete attachments they uploaded or if admin
CREATE POLICY "Users can delete own attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'attachments' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Create helper function to generate file paths
CREATE OR REPLACE FUNCTION public.generate_file_path(
    bucket_name TEXT,
    user_id UUID,
    filename TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN bucket_name || '/' || user_id::text || '/' || filename;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to get file URL
CREATE OR REPLACE FUNCTION public.get_file_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    IF bucket_name = 'avatars' THEN
        -- Public bucket - return public URL
        RETURN 'http://127.0.0.1:54321/storage/v1/object/public/' || bucket_name || '/' || file_path;
    ELSE
        -- Private bucket - return signed URL (this would need to be handled in the application)
        RETURN 'http://127.0.0.1:54321/storage/v1/object/sign/' || bucket_name || '/' || file_path;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_file_path(TEXT, UUID, TEXT) IS 'Generates a standardized file path for storage';
COMMENT ON FUNCTION public.get_file_url(TEXT, TEXT) IS 'Returns the appropriate URL for accessing a stored file';