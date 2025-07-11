-- Enable real-time for HIGH and MEDIUM priority tables
-- This migration configures Supabase real-time for critical tables only
-- to optimize performance and avoid unnecessary real-time overhead

-- HIGH PRIORITY TABLES (Critical for user experience)
-- Enable replica identity for high priority real-time tables
ALTER TABLE public.task_messages REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- MEDIUM PRIORITY TABLES (Important for workflow efficiency)
-- Enable replica identity for medium priority real-time tables
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Add HIGH PRIORITY tables to the real-time publication
-- These tables require immediate real-time updates for optimal UX
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add MEDIUM PRIORITY tables to the real-time publication
-- These tables benefit from real-time updates but are not critical
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- PRIORITY CLASSIFICATION:
-- HIGH PRIORITY:
--   - task_messages: Real-time chat in TaskChatDrawer.tsx and taskChatService.ts
--   - messages: Team/client messaging in ConversationDetailScreen.tsx
--   - notifications: Instant notification delivery for user alerts
--
-- MEDIUM PRIORITY:
--   - tasks: Task status updates for workflow coordination
--
-- LOW PRIORITY (NOT ENABLED - use polling/refresh instead):
--   - profiles: User profile changes (infrequent updates)
--   - clients: Client data changes (infrequent updates)
--   - analytics_events: Historical data (no real-time requirement)
--   - storage objects: File uploads (handled separately)