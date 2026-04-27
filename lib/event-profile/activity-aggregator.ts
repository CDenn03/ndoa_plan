// Activity Aggregator - Single Responsibility Principle
// Handles aggregation and formatting of activities from different modules

import type { Activity } from '@/types/event-profile'
import { formatDistanceToNow } from 'date-fns'

export class ActivityAggregator {
  // Activity type icons mapping
  private static readonly ACTIVITY_ICONS = {
    task: '✓',
    payment: '💰',
    guest: '👤',
    vendor: '🏢',
    budget: '📊'
  } as const

  // Activity priority colors
  private static readonly PRIORITY_COLORS = {
    high: 'red',
    normal: 'default',
    low: 'blue'
  } as const

  // Format activity for display
  static formatActivity(activity: Activity): {
    icon: string
    formattedDescription: string
    timeAgo: string
    priorityColor: string
    statusBadge: string
  } {
    return {
      icon: this.ACTIVITY_ICONS[activity.type],
      formattedDescription: this.formatDescription(activity),
      timeAgo: formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }),
      priorityColor: this.PRIORITY_COLORS[activity.priority],
      statusBadge: this.formatStatus(activity.status)
    }
  }

  // Format activity description with context
  private static formatDescription(activity: Activity): string {
    const baseDescription = activity.description
    
    switch (activity.type) {
      case 'task':
        return activity.status === 'completed' ? `✅ ${baseDescription}` : `⏳ ${baseDescription}`
      case 'payment':
        return activity.status === 'completed' ? `💚 ${baseDescription}` : `⏳ ${baseDescription}`
      case 'guest':
        return `👤 ${baseDescription}`
      case 'vendor':
        return `🏢 ${baseDescription}`
      case 'budget':
        return `📊 ${baseDescription}`
      default:
        return baseDescription
    }
  }

  // Format status for badge display
  private static formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  }

  // Group activities by date
  static groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
    return activities.reduce((groups, activity) => {
      const date = new Date(activity.createdAt).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
      return groups
    }, {} as Record<string, Activity[]>)
  }

  // Filter activities by type
  static filterActivitiesByType(activities: Activity[], types: Activity['type'][]): Activity[] {
    return activities.filter(activity => types.includes(activity.type))
  }

  // Get activity summary statistics
  static getActivitySummary(activities: Activity[]): {
    totalActivities: number
    byType: Record<Activity['type'], number>
    byPriority: Record<Activity['priority'], number>
    recentActivity: boolean
  } {
    const byType = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1
      return acc
    }, {} as Record<Activity['type'], number>)

    const byPriority = activities.reduce((acc, activity) => {
      acc[activity.priority] = (acc[activity.priority] || 0) + 1
      return acc
    }, {} as Record<Activity['priority'], number>)

    const recentActivity = activities.some(activity => {
      const activityDate = new Date(activity.createdAt)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return activityDate > oneDayAgo
    })

    return {
      totalActivities: activities.length,
      byType,
      byPriority,
      recentActivity
    }
  }
}