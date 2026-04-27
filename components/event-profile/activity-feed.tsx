'use client'
import { useState, useMemo } from 'react'
import { Activity, Filter } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { Tabs } from '@/components/ui/tabs'
import { ActivityAggregator } from '@/lib/event-profile/activity-aggregator'
import type { Activity as ActivityType } from '@/types/event-profile'

interface ActivityFeedProps {
  activities: ActivityType[]
}

export function ActivityFeed({ activities }: Readonly<ActivityFeedProps>) {
  const [filterType, setFilterType] = useState<'all' | ActivityType['type']>('all')
  const [showAll, setShowAll] = useState(false)

  const filteredActivities = useMemo(() => {
    const filtered = filterType === 'all' 
      ? activities 
      : ActivityAggregator.filterActivitiesByType(activities, [filterType])
    
    return showAll ? filtered : filtered.slice(0, 10)
  }, [activities, filterType, showAll])

  const groupedActivities = useMemo(() => 
    ActivityAggregator.groupActivitiesByDate(filteredActivities),
    [filteredActivities]
  )

  const activitySummary = useMemo(() => 
    ActivityAggregator.getActivitySummary(activities),
    [activities]
  )

  const filterTabs = [
    { key: 'all', label: `All (${activities.length})` },
    { key: 'task', label: `Tasks (${activitySummary.byType.task || 0})` },
    { key: 'payment', label: `Payments (${activitySummary.byType.payment || 0})` },
    { key: 'guest', label: `Guests (${activitySummary.byType.guest || 0})` },
    { key: 'vendor', label: `Vendors (${activitySummary.byType.vendor || 0})` }
  ]

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-8 text-center">
        <Activity size={40} className="text-[#14161C]/20 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#14161C] mb-2">No Activity Yet</h3>
        <p className="text-[#14161C]/60">Activity will appear here as you work on this event.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#1F4D3A]/8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#14161C] flex items-center gap-2">
            <Activity size={20} />
            Recent Activity
          </h3>
          {activitySummary.recentActivity && (
            <Badge variant="confirmed">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Active
            </Badge>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs
          tabs={filterTabs}
          activeTab={filterType}
          onTabChange={(key) => setFilterType(key as typeof filterType)}
          variant="pills"
          size="sm"
        />
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="sticky top-0 bg-[#F7F5F2] px-6 py-2 border-b border-[#1F4D3A]/8">
              <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            {/* Activities for this date */}
            {dayActivities.map((activity) => {
              const formatted = ActivityAggregator.formatActivity(activity)
              
              return (
                <div key={activity.id} className="flex items-start gap-4 p-4 border-b border-[#1F4D3A]/8 last:border-0 hover:bg-[#F7F5F2]/50 transition-colors">
                  {/* Activity Icon */}
                  <div className="w-8 h-8 rounded-full bg-[#1F4D3A]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm">{formatted.icon}</span>
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#14161C] leading-relaxed">
                      {formatted.formattedDescription}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#14161C]/40">
                        {formatted.timeAgo}
                      </span>
                      <Badge 
                        variant={
                          activity.status === 'completed' ? 'confirmed' :
                          activity.status === 'pending' ? 'pending' :
                          activity.status === 'overdue' ? 'critical' :
                          'default'
                        }
                      >
                        {formatted.statusBadge}
                      </Badge>
                      {activity.priority === 'high' && (
                        <Badge variant="critical">High Priority</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {!showAll && activities.length > 10 && (
        <div className="p-4 border-t border-[#1F4D3A]/8 text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAll(true)}
            className="text-[#1F4D3A]"
          >
            Show {activities.length - 10} more activities
          </Button>
        </div>
      )}
    </div>
  )
}