-- Add assignment_type column to tasks table
-- This column categorizes tasks based on who they're assigned to or their nature

ALTER TABLE public.tasks 
ADD COLUMN assignment_type TEXT CHECK (assignment_type IN ('agent', 'client', 'todo')) DEFAULT 'agent';

-- Add index for better performance on assignment_type queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_type ON public.tasks(assignment_type);

-- Add comment to document the new column
COMMENT ON COLUMN public.tasks.assignment_type IS 'Categorizes tasks: agent (assigned to team member), client (client-facing task), todo (general todo item)';