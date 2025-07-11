-- Row Level Security (RLS) Policies
-- Phase 2.3: RLS Policies Implementation

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins and managers can view all profiles
CREATE POLICY "Admins and managers can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Only admins can insert new profiles
CREATE POLICY "Only admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Clients policies
-- Users can view clients assigned to them or all clients if admin/manager
CREATE POLICY "Users can view assigned clients" ON public.clients
    FOR SELECT USING (
        assigned_agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Users can insert clients if they are admin, manager, or agent
CREATE POLICY "Authenticated users can insert clients" ON public.clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

-- Users can update clients assigned to them or all clients if admin/manager
CREATE POLICY "Users can update assigned clients" ON public.clients
    FOR UPDATE USING (
        assigned_agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Only admins can delete clients
CREATE POLICY "Only admins can delete clients" ON public.clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Tasks policies
-- Users can view tasks assigned to them, created by them, or related to their clients
CREATE POLICY "Users can view relevant tasks" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE id = tasks.client_id AND assigned_agent_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Users can insert tasks if they are authenticated
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
        )
    );

-- Users can update tasks assigned to them, created by them, or if admin/manager
CREATE POLICY "Users can update relevant tasks" ON public.tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Users can delete tasks they created or if admin/manager
CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Messages policies
-- Users can view messages for clients assigned to them or if admin/manager
CREATE POLICY "Users can view client messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE id = messages.client_id AND assigned_agent_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Users can insert messages for clients assigned to them
CREATE POLICY "Users can insert client messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE id = messages.client_id AND assigned_agent_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Users can update messages they sent or if admin/manager
CREATE POLICY "Users can update own messages" ON public.messages
    FOR UPDATE USING (
        sender_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- File attachments policies
-- Users can view attachments for clients/tasks they have access to
CREATE POLICY "Users can view relevant attachments" ON public.file_attachments
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE id = file_attachments.client_id AND assigned_agent_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = file_attachments.task_id AND (
                assigned_to = auth.uid() OR created_by = auth.uid()
            )
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Users can insert attachments for clients/tasks they have access to
CREATE POLICY "Users can insert relevant attachments" ON public.file_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND (
            client_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.clients
                WHERE id = file_attachments.client_id AND assigned_agent_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('admin', 'manager')
            )
        )
    );

-- Users can delete attachments they uploaded or if admin
CREATE POLICY "Users can delete own attachments" ON public.file_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up';