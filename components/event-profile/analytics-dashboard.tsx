'use client'
import { useMemo } from 'react'
import { CheckSquare, DollarSign, Users, Building, TrendingUp, AlertTriangle } from 'lucide-react'
import { StatsCard } from '@/components/ui/tabs'
import { Badge } from '@/components/ui'
import { EventAnalyticsCalculator } from '@/lib/event-profile/analytics-calculator'
import type { EventAnalytics, RiskIndicator } from '@/types/event-profile'

interface AnalyticsDashboardProps {
  analytics: EventAnalytics
  eventDate: string
}

export function AnalyticsDashboard({ analytics, eventDate }: Readonly<AnalyticsDashboardProps>) {
  const healthScore = useMemo(() => 
    EventAnalyticsCalculator.calculateHealthScore(analytics), 
    [analytics]
  )
  
  const budgetVariance = useMemo(() => 
    EventAnalyticsCalculator.calculateBudgetVariance(analytics.budget.allocated, analytics.budget.spent),
    [analytics.budget]
  )
  
  const risks = useMemo(() => 
    EventAnalyticsCalculator.generateRiskIndicators(analytics, eventDate),
    [analytics, eventDate]
  )

  const completionPercentages = useMemo(() => ({
    tasks: EventAnalyticsCalculator.calculateCompletionPercentage(analytics.tasks.completed, analytics.tasks.total),
    guests: EventAnalyticsCalculator.calculateCompletionPercentage(analytics.guests.confirmed, analytics.guests.total),
    vendors: EventAnalyticsCalculator.calculateCompletionPercentage(analytics.vendors.confirmed, analytics.vendors.total)
  }), [analytics])

  return (
    <div className="space-y-8">
      {/* Health Score Overview */}
      <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#14161C]">Event Health Score</h3>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className={healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-amber-500' : 'text-red-500'} />
            <span className={`text-2xl font-bold ${healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
              {healthScore}%
            </span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              healthScore >= 80 ? 'bg-green-500' : healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
        
        <p className="text-sm text-[#14161C]/60 mt-2">
          {healthScore >= 80 ? 'Excellent progress! Everything is on track.' :
           healthScore >= 60 ? 'Good progress with some areas needing attention.' :
           'Several areas need immediate attention.'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tasks Progress */}
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckSquare size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#14161C]/60">Tasks</p>
              <p className="text-2xl font-bold text-[#14161C]">{completionPercentages.tasks}%</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#14161C]/60">Completed</span>
              <span className="font-medium">{analytics.tasks.completed}/{analytics.tasks.total}</span>
            </div>
            {analytics.tasks.overdue > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-sm text-red-600">{analytics.tasks.overdue} overdue</span>
              </div>
            )}
          </div>
        </div>

        {/* Budget Status */}
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#14161C]/60">Budget</p>
              <p className="text-2xl font-bold text-[#14161C]">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(analytics.budget.spent)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#14161C]/60">of {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(analytics.budget.allocated)}</span>
              <Badge variant={budgetVariance.status === 'over' ? 'critical' : budgetVariance.status === 'under' ? 'confirmed' : 'default'}>
                {budgetVariance.percentage > 0 ? '+' : ''}{budgetVariance.percentage}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Guest Status */}
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#14161C]/60">Guests</p>
              <p className="text-2xl font-bold text-[#14161C]">{completionPercentages.guests}%</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#14161C]/60">Confirmed</span>
              <span className="font-medium text-green-600">{analytics.guests.confirmed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#14161C]/60">Pending</span>
              <span className="font-medium text-amber-600">{analytics.guests.pending}</span>
            </div>
          </div>
        </div>

        {/* Vendor Status */}
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#14161C]/60">Vendors</p>
              <p className="text-2xl font-bold text-[#14161C]">{completionPercentages.vendors}%</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#14161C]/60">Confirmed</span>
              <span className="font-medium">{analytics.vendors.confirmed}/{analytics.vendors.total}</span>
            </div>
            {analytics.vendors.totalOwed > 0 && (
              <div className="flex justify-between">
                <span className="text-[#14161C]/60">Owed</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(analytics.vendors.totalOwed)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Indicators */}
      {risks.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
          <h3 className="text-lg font-semibold text-[#14161C] mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            Risk Assessment
          </h3>
          <div className="space-y-3">
            {risks.map((risk, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                risk.type === 'critical' ? 'bg-red-50 border-red-500' :
                risk.type === 'warning' ? 'bg-amber-50 border-amber-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium ${
                      risk.type === 'critical' ? 'text-red-800' :
                      risk.type === 'warning' ? 'text-amber-800' :
                      'text-blue-800'
                    }`}>
                      {risk.message}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 capitalize">
                      {risk.category} • {risk.type}
                    </p>
                  </div>
                  {risk.actionRequired && (
                    <Badge variant={risk.type === 'critical' ? 'critical' : 'pending'}>
                      Action Required
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}