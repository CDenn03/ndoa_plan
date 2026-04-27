// Analytics Calculator - Single Responsibility Principle
// Handles all calculation logic for event analytics

import type { EventAnalytics, TaskAnalytics, BudgetAnalytics, RiskIndicator } from '@/types/event-profile'

export class EventAnalyticsCalculator {
  // Calculate completion percentage for any metric
  static calculateCompletionPercentage(completed: number, total: number): number {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  // Calculate budget variance
  static calculateBudgetVariance(allocated: number, spent: number): {
    variance: number
    percentage: number
    status: 'under' | 'over' | 'on-track'
  } {
    const variance = spent - allocated
    const percentage = allocated > 0 ? Math.round((variance / allocated) * 100) : 0
    
    let status: 'under' | 'over' | 'on-track' = 'on-track'
    if (percentage > 10) status = 'over'
    else if (percentage < -10) status = 'under'
    
    return { variance, percentage, status }
  }

  // Calculate project health score (0-100)
  static calculateHealthScore(analytics: EventAnalytics): number {
    const taskScore = this.calculateCompletionPercentage(analytics.tasks.completed, analytics.tasks.total)
    const budgetScore = analytics.budget.allocated > 0 
      ? Math.max(0, 100 - Math.abs(this.calculateBudgetVariance(analytics.budget.allocated, analytics.budget.spent).percentage))
      : 100
    const guestScore = this.calculateCompletionPercentage(analytics.guests.confirmed, analytics.guests.total)
    const vendorScore = this.calculateCompletionPercentage(analytics.vendors.confirmed, analytics.vendors.total)
    
    // Weighted average (tasks and budget are more important)
    return Math.round((taskScore * 0.3 + budgetScore * 0.3 + guestScore * 0.2 + vendorScore * 0.2))
  }

  // Generate risk indicators
  static generateRiskIndicators(analytics: EventAnalytics, eventDate: string): RiskIndicator[] {
    const risks: RiskIndicator[] = []
    const daysUntilEvent = Math.ceil((new Date(eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    // Budget risks
    const budgetVariance = this.calculateBudgetVariance(analytics.budget.allocated, analytics.budget.spent)
    if (budgetVariance.status === 'over' && budgetVariance.percentage > 20) {
      risks.push({
        type: 'critical',
        category: 'budget',
        message: `Budget exceeded by ${budgetVariance.percentage}%`,
        actionRequired: true
      })
    }
    
    // Timeline risks
    if (analytics.tasks.overdue > 0) {
      risks.push({
        type: 'critical',
        category: 'timeline',
        message: `${analytics.tasks.overdue} overdue tasks`,
        actionRequired: true
      })
    }
    
    // Vendor risks
    if (analytics.vendors.totalOwed > 0 && daysUntilEvent < 30) {
      risks.push({
        type: 'warning',
        category: 'vendors',
        message: `Outstanding vendor payments with event approaching`,
        actionRequired: true
      })
    }
    
    // Task completion risks
    const taskCompletion = this.calculateCompletionPercentage(analytics.tasks.completed, analytics.tasks.total)
    if (taskCompletion < 50 && daysUntilEvent < 60) {
      risks.push({
        type: 'warning',
        category: 'tasks',
        message: `Only ${taskCompletion}% of tasks completed with ${daysUntilEvent} days remaining`,
        actionRequired: true
      })
    }
    
    return risks
  }

  // Calculate estimated completion date based on current progress
  static estimateCompletionDate(analytics: EventAnalytics, eventDate: string): string | null {
    if (analytics.tasks.total === 0) return null
    
    const completionRate = analytics.tasks.completed / analytics.tasks.total
    const remainingTasks = analytics.tasks.total - analytics.tasks.completed
    
    if (remainingTasks === 0) return new Date().toISOString()
    
    // Estimate based on current velocity (simplified calculation)
    const daysElapsed = 30 // This would be calculated from actual data
    const tasksPerDay = analytics.tasks.completed / daysElapsed
    
    if (tasksPerDay <= 0) return null
    
    const daysToComplete = remainingTasks / tasksPerDay
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysToComplete)
    
    return completionDate.toISOString()
  }
}