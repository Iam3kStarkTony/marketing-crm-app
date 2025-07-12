import { supabase } from './supabase';
import { ErrorHandler } from '../utils/errorHandler';
import { Task } from '../types/database';

// Interface for task statistics
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  // Change percentages compared to previous period
  totalChange: number;
  completedChange: number;
  inProgressChange: number;
  pendingChange: number;
}

export interface TaskStatsResponse {
  current: TaskStats;
  previous: TaskStats;
}

class TaskStatsService {
  /**
   * Fetch task statistics for the current period and calculate changes
   */
  async fetchTaskStats(): Promise<TaskStats> {
    try {
      // Get current month's date range
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Get previous month's date range
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Fetch current month tasks
      const { data: currentTasks, error: currentError } = await supabase
        .from('tasks')
        .select('status')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      if (currentError) {
        throw new Error(`Failed to fetch current month task statistics: ${currentError.message}`);
      }

      // Fetch previous month tasks for comparison
      const { data: previousTasks, error: previousError } = await supabase
        .from('tasks')
        .select('status')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      if (previousError) {
        throw new Error(`Failed to fetch previous month task statistics: ${previousError.message}`);
      }

      // Calculate current month statistics
      const currentStats = this.calculateStats(currentTasks || []);
      const previousStats = this.calculateStats(previousTasks || []);

      // Calculate percentage changes
      const stats: TaskStats = {
        ...currentStats,
        totalChange: this.calculatePercentageChange(previousStats.total, currentStats.total),
        completedChange: this.calculatePercentageChange(previousStats.completed, currentStats.completed),
        inProgressChange: this.calculatePercentageChange(previousStats.inProgress, currentStats.inProgress),
        pendingChange: this.calculatePercentageChange(previousStats.pending, currentStats.pending),
      };

      return stats;
    } catch (error) {
      await ErrorHandler.handleError(error as Error, {
        operation: 'TaskStatsService.fetchTaskStats',
        metadata: { error: error }
      });
      
      // Return default stats on error
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        totalChange: 0,
        completedChange: 0,
        inProgressChange: 0,
        pendingChange: 0,
      };
    }
  }

  /**
   * Calculate statistics from task array
   */
  private calculateStats(tasks: Pick<Task, 'status'>[]): Omit<TaskStats, 'totalChange' | 'completedChange' | 'inProgressChange' | 'pendingChange'> {
    const stats = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'in_progress':
          stats.inProgress++;
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
   * Fetch task statistics with retry mechanism
   */
  async fetchTaskStatsWithRetry(maxRetries: number = 3): Promise<TaskStats> {
    const result = await ErrorHandler.withErrorHandling(
      () => this.fetchTaskStats(),
      {
        operation: 'TaskStatsService.fetchTaskStatsWithRetry',
        metadata: { maxRetries }
      },
      {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        totalChange: 0,
        completedChange: 0,
        inProgressChange: 0,
        pendingChange: 0,
      }
    );
    
    return result || {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      totalChange: 0,
      completedChange: 0,
      inProgressChange: 0,
      pendingChange: 0,
    };
  }
}

// Export singleton instance
export const taskStatsService = new TaskStatsService();