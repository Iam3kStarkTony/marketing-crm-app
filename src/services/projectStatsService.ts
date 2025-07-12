import { supabase } from './supabase';
import { ErrorHandler } from '../utils/errorHandler';
import { Task } from '../types/database';

// Interface for project statistics
export interface ProjectStats {
  total: number;
  ended: number;
  running: number;
  pending: number;
  // Change percentages compared to previous period
  totalChange: number;
  endedChange: number;
  runningChange: number;
  pendingChange: number;
}

export interface ProjectStatsResponse {
  current: ProjectStats;
  previous: ProjectStats;
}

class ProjectStatsService {
  /**
   * Fetch project statistics for the current period and calculate changes
   * In this CRM system, tasks are used to represent projects
   */
  async fetchProjectStats(userId: string): Promise<ProjectStats> {
    try {
      // Get current month's date range
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Get previous month's date range
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      const userRole = profile?.role || 'agent';

      // Build query based on user role
      let currentTasksQuery = supabase
        .from('tasks')
        .select('status')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      let previousTasksQuery = supabase
        .from('tasks')
        .select('status')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());
      
      // If not admin, filter by user's tasks
      if (userRole !== 'admin') {
        currentTasksQuery = currentTasksQuery.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
        previousTasksQuery = previousTasksQuery.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      // Fetch current month tasks
      const { data: currentTasks, error: currentError } = await currentTasksQuery;

      if (currentError) {
        throw new Error(`Failed to fetch current month project statistics: ${currentError.message}`);
      }

      // Fetch previous month tasks for comparison
      const { data: previousTasks, error: previousError } = await previousTasksQuery;

      if (previousError) {
        throw new Error(`Failed to fetch previous month project statistics: ${previousError.message}`);
      }

      // Calculate current month statistics
      const currentStats = this.calculateStats(currentTasks || []);
      const previousStats = this.calculateStats(previousTasks || []);

      // Calculate percentage changes
      const stats: ProjectStats = {
        ...currentStats,
        totalChange: this.calculatePercentageChange(previousStats.total, currentStats.total),
        endedChange: this.calculatePercentageChange(previousStats.ended, currentStats.ended),
        runningChange: this.calculatePercentageChange(previousStats.running, currentStats.running),
        pendingChange: this.calculatePercentageChange(previousStats.pending, currentStats.pending),
      };

      return stats;
    } catch (error) {
      await ErrorHandler.handleError(error as Error, {
        operation: 'ProjectStatsService.fetchProjectStats',
        metadata: { error: error }
      });
      
      // Return default stats on error
      return {
        total: 0,
        ended: 0,
        running: 0,
        pending: 0,
        totalChange: 0,
        endedChange: 0,
        runningChange: 0,
        pendingChange: 0,
      };
    }
  }

  /**
   * Calculate statistics from task array
   */
  private calculateStats(tasks: Pick<Task, 'status'>[]): Omit<ProjectStats, 'totalChange' | 'endedChange' | 'runningChange' | 'pendingChange'> {
    const stats = {
      total: tasks.length,
      ended: 0,
      running: 0,
      pending: 0,
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'completed':
          stats.ended++;
          break;
        case 'in_progress':
          stats.running++;
          break;
        case 'pending':
          stats.pending++;
          break;
        // Note: 'cancelled' tasks are included in total but not in other categories
      }
    });

    return stats;
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  /**
   * Fetch project statistics with retry mechanism
   */
  async fetchProjectStatsWithRetry(userId: string, maxRetries: number = 3): Promise<ProjectStats> {
    const result = await ErrorHandler.withErrorHandling(
      () => this.fetchProjectStats(userId),
      {
        operation: 'ProjectStatsService.fetchProjectStatsWithRetry',
        metadata: { maxRetries, userId }
      },
      {
        total: 0,
        ended: 0,
        running: 0,
        pending: 0,
        totalChange: 0,
        endedChange: 0,
        runningChange: 0,
        pendingChange: 0,
      }
    );
    
    return result || {
      total: 0,
      ended: 0,
      running: 0,
      pending: 0,
      totalChange: 0,
      endedChange: 0,
      runningChange: 0,
      pendingChange: 0,
    };
  }
}

// Export singleton instance
export const projectStatsService = new ProjectStatsService();