-- Fix analytics_events table RLS policies
-- This migration adds proper Row Level Security policies for the analytics_events table

-- Enable RLS on analytics_events table (if not already enabled)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Users can view their own analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.analytics_events;

-- Allow users to insert their own analytics events
CREATE POLICY "Users can insert their own analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL
    );

-- Allow users to view their own analytics events
CREATE POLICY "Users can view their own analytics events" ON public.analytics_events
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NULL
    );

-- Allow admins to view all analytics events
CREATE POLICY "Admins can view all analytics events" ON public.analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to insert analytics events for any user
CREATE POLICY "Admins can insert analytics events for any user" ON public.analytics_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

COMMENT ON TABLE public.analytics_events IS 'Analytics events table with proper RLS policies for user data isolation';