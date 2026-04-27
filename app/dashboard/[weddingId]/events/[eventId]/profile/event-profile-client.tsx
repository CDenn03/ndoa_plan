'use client'
import { useMemo } from 'react'
import {
  Calendar, Clock, MapPin, Users, DollarSign, CheckSquare,
  AlertTriangle, TrendingUp, ArrowRight, Settings,
  CalendarCheck, Wallet, Plus, Activity, Heart, Crown, BarChart3
} from 'lucide-react'
import { Button, Badge, ProgressBar, cn } from '@/components/ui'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import Link from 'next/link'
import type { EventProfileData } from '@/types/event-profile'

interface EventProfileClientProps {
  weddingId: string
  profileData: EventProfileData
}

const SEVERITY_COLORS = {
  CRITICAL: 'bg-[#14161C]/5 text-[#14161C] border-[#14161C]/20',
  HIGH: 'bg-[#14161C]/5 text-[#14161C] border-[#14161C]/20',
  MEDIUM: 'bg-[#D4A94F]/10 text-[#D4A94F] border-[#D4A94F]/20',
  LOW: 'bg-[#1F4D3A]/5 text-[#1F4D3A] border-[#1F4D3A]/20'
}

function getBudgetColor(percentage: number): string {
  if (percentage > 100) return 'text-[#14161C]'
  if (percentage > 85) return 'text-[#D4A94F]'
  return 'text-[#1F4D3A]'
}

function getHealthScore(analytics: EventProfileData['analytics']): number {
  const taskScore = analytics.tasks.total > 0
    ? (analytics.tasks.completed / analytics.tasks.total) * 100
    : 100

  const budgetScore = analytics.budget.allocated > 0
    ? Math.max(0, 100 - Math.abs(((analytics.budget.spent / analytics.budget.allocated) - 1) * 100))
    : 100

  const guestScore = analytics.guests.total > 0
    ? (analytics.guests.confirmed / analytics.guests.total) * 100
    : 100

  const vendorScore = analytics.vendors.total > 0
    ? (analytics.vendors.confirmed / analytics.vendors.total) * 100
    : 100

  // Weighted average with penalties for overdue tasks and critical risks
  const baseScore = (taskScore * 0.3 + budgetScore * 0.3 + guestScore * 0.2 + vendorScore * 0.2)
  const overdueTasksPenalty = analytics.tasks.overdue * 5
  const criticalRisksPenalty = analytics.risks.critical * 10

  return Math.max(0, Math.round(baseScore - overdueTasksPenalty - criticalRisksPenalty))
}

export function EventProfileClient({ weddingId, profileData }: Readonly<EventProfileClientProps>) {
  const { event, wedding, analytics, activities, upcomingTasks, recentRisks } = profileData

  const healthScore = useMemo(() => getHealthScore(analytics), [analytics])
  const budgetPercentage = analytics.budget.allocated > 0
    ? Math.round((analytics.budget.spent / analytics.budget.allocated) * 100)
    : 0
  const remaining = analytics.budget.allocated - analytics.budget.spent

  // Helper functions for color determination
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-[#1F4D3A]'
    if (score >= 60) return 'text-[#D4A94F]'
    return 'text-[#14161C]/60'
  }

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#1F4D3A]'
    if (score >= 60) return 'bg-[#D4A94F]'
    return 'bg-[#14161C]/60'
  }

  const getHealthMessage = (score: number) => {
    if (score >= 80) return 'Excellent! Everything is progressing smoothly.'
    if (score >= 60) return 'Good progress with some areas needing attention.'
    return 'Several areas require immediate focus.'
  }

  const getTaskBorderColor = (isOverdue: boolean, isUrgent: boolean) => {
    if (isOverdue) return 'border-[#14161C]/40 bg-[#14161C]/5'
    if (isUrgent) return 'border-[#D4A94F] bg-[#D4A94F]/10'
    return 'border-[#1F4D3A]/20 bg-[#F7F5F2]/50'
  }

  const getTaskTextColor = (isOverdue: boolean, isUrgent: boolean) => {
    if (isOverdue) return 'text-[#14161C]/60'
    if (isUrgent) return 'text-[#D4A94F]'
    return 'text-[#14161C]/60'
  }

  const getDueDateText = (daysLeft: number, isOverdue: boolean) => {
    if (isOverdue) return 'Overdue'
    if (daysLeft === 0) return 'Due today'
    if (daysLeft === 1) return 'Due tomorrow'
    return `Due in ${daysLeft} days`
  }

  const getRiskBadgeVariant = (severity: string) => {
    if (severity === 'CRITICAL') return 'critical'
    if (severity === 'HIGH') return 'high'
    if (severity === 'MEDIUM') return 'medium'
    return 'low'
  }

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0
    }).format(amount)

  return (
    <div className="min-h-full bg-[#F7F5F2]">
      {/* Clean Header with Event Information */}
      <div className="">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex justify-between">

            <div>
              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[#14161C]/70">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-[#1F4D3A]" />
                  <div>
                    <p className="text-sm text-[#14161C]/50 font-medium">Event Date</p>
                    <p className="font-semibold text-[#14161C]">{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</p>
                    {analytics.daysUntilEvent > 0 && (
                      <p className="text-xs text-[#14161C]/50">{analytics.daysUntilEvent} days to go</p>
                    )}
                  </div>
                </div>

                {(event.startTime || event.endTime) && (
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-[#1F4D3A]" />
                    <div>
                      <p className="text-sm text-[#14161C]/50 font-medium">Time</p>
                      <p className="font-semibold text-[#14161C]">
                        {event.startTime && event.endTime
                          ? `${event.startTime} - ${event.endTime}`
                          : event.startTime || event.endTime}
                      </p>
                    </div>
                  </div>
                )}

                {event.venue && (
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-[#1F4D3A]" />
                    <div>
                      <p className="text-sm text-[#14161C]/50 font-medium">Venue</p>
                      <p className="font-semibold text-[#14161C]">{event.venue}</p>
                    </div>
                  </div>
                )}
              </div>

              {event.description && (
                <div className="mt-6 p-4 bg-[#F7F5F2] rounded-xl border border-[#1F4D3A]/8">
                  <p className="text-[#14161C]/70 leading-relaxed">{event.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="flex gap-3">
                <Link href={`/dashboard/${weddingId}/events/${event.id}/manage`}>
                  <Button variant="outline" size="sm">
                    Manage Event
                    <Settings size={14} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Dashboard Content */}
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* Health Score & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
          {/* Health Score */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-semibold text-[#14161C]">Event Health</h3>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className={getHealthColor(healthScore)} />
                <span className={cn('text-3xl font-heading font-bold', getHealthColor(healthScore))}>
                  {healthScore}%
                </span>
              </div>
            </div>

            <div className="w-full bg-[#F7F5F2] rounded-full h-3 mb-4">
              <div
                className={cn('h-3 rounded-full transition-all duration-700', getHealthBgColor(healthScore))}
                style={{ width: `${healthScore}%` }}
              />
            </div>

            <p className="text-sm text-[#14161C]/60">
              {getHealthMessage(healthScore)}
            </p>

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-[#1F4D3A]/60 uppercase tracking-wide">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/${weddingId}/events/${event.id}/tasks`}>
                  <Button size="sm" variant="lavender">
                    <Plus size={12} />
                    Add Task
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/payments`}>
                  <Button size="sm" variant="lavender">
                    <Wallet size={12} />
                    Record Payment
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/guests`}>
                  <Button size="sm" variant="lavender">
                    <Users size={12} />
                    Manage Guests
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/appointments`}>
                  <Button size="sm" variant="lavender">
                    <CalendarCheck size={12} />
                    Appointments
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/contributions`}>
                  <Button size="sm" variant="lavender">
                    <Heart size={12} />
                    Contributions
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/bridal-team`}>
                  <Button size="sm" variant="lavender">
                    <Crown size={12} />
                    Bridal Team
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/risk-alerts`}>
                  <Button size="sm" variant="lavender">
                    <AlertTriangle size={12} />
                    Risk Alerts
                  </Button>
                </Link>
                <Link href={`/dashboard/${weddingId}/events/${event.id}/analytics`}>
                  <Button size="sm" variant="lavender">
                    <BarChart3 size={12} />
                    Analytics
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tasks */}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                  <CheckSquare size={18} className="text-[#1F4D3A]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Tasks</p>
                  <p className="text-xl font-heading font-bold text-[#14161C]">
                    {analytics.tasks.completed}/{analytics.tasks.total}
                  </p>
                </div>
              </div>
              {analytics.tasks.overdue > 0 && (
                <div className="flex items-center gap-1 text-xs text-[#14161C]/60">
                  <AlertTriangle size={12} />
                  {analytics.tasks.overdue} overdue
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#D4A94F]/10 rounded-xl flex items-center justify-center">
                  <DollarSign size={18} className="text-[#D4A94F]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Budget</p>
                  <p className={cn('text-xl font-heading font-bold', getBudgetColor(budgetPercentage))}>
                    {budgetPercentage}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#14161C]/60">
                {fmt(analytics.budget.spent)} of {fmt(analytics.budget.allocated)}
              </p>
            </div>

            {/* Guests */}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-[#1F4D3A]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Guests</p>
                  <p className="text-xl font-heading font-bold text-[#14161C]">
                    {analytics.guests.confirmed}/{analytics.guests.total}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#14161C]/60">
                {analytics.guests.pending} pending • {analytics.guests.vip} VIP
              </p>
            </div>

            {/* Vendors */}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#D4A94F]/10 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-[#D4A94F]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Vendors</p>
                  <p className="text-xl font-heading font-bold text-[#14161C]">
                    {analytics.vendors.confirmed}/{analytics.vendors.total}
                  </p>
                </div>
              </div>
              {analytics.vendors.totalOwed > 0 && (
                <p className="text-xs text-[#14161C]/60">
                  {fmt(analytics.vendors.totalOwed)} owed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Extended Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Appointments */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                <CalendarCheck size={18} className="text-[#1F4D3A]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Appointments</p>
                <p className="text-xl font-heading font-bold text-[#14161C]">
                  {analytics.appointments.upcoming}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#14161C]/60">
              {analytics.appointments.total} total scheduled
            </p>
          </div>

          {/* Contributions */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#D4A94F]/10 rounded-xl flex items-center justify-center">
                <Heart size={18} className="text-[#D4A94F]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Contributions</p>
                <p className="text-xl font-heading font-bold text-[#D4A94F]">
                  {fmt(analytics.contributions.totalPaid)}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#14161C]/60">
              {fmt(analytics.contributions.totalPledged)} pledged
            </p>
          </div>

          {/* Bridal Team */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                <Crown size={18} className="text-[#1F4D3A]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Bridal Team</p>
                <p className="text-xl font-heading font-bold text-[#14161C]">
                  {wedding.members?.filter(m => m.role === 'COMMITTEE').length || 0}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#14161C]/60">
              Committee members
            </p>
          </div>

          {/* Risk Alerts */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#14161C]/5 rounded-xl flex items-center justify-center">
                <AlertTriangle size={18} className="text-[#14161C]/60" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">Risk Alerts</p>
                <p className="text-xl font-heading font-bold text-[#14161C]">
                  {analytics.risks.critical + analytics.risks.high}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#14161C]/60">
              {analytics.risks.total} total risks
            </p>
          </div>
        </div>
        {/* Priority Tasks & Risk Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          {/* Priority Tasks */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-semibold text-[#14161C] flex items-center gap-2">
                <Clock size={20} />
                Priority Tasks
              </h3>
              <Link href={`/dashboard/${weddingId}/checklist?event=${event.id}`}>
                <Button size="sm" variant="ghost" className="text-[#1F4D3A]">
                  View All <ArrowRight size={12} />
                </Button>
              </Link>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckSquare size={32} className="text-[#1F4D3A]/40 mx-auto mb-3" />
                <p className="text-[#14161C]/60">All tasks completed! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 5).map(task => {
                  const daysLeft = differenceInDays(new Date(task.dueDate), new Date())
                  const isUrgent = daysLeft <= 3
                  const isOverdue = task.isOverdue

                  return (
                    <div key={task.id} className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-l-4',
                      getTaskBorderColor(isOverdue, isUrgent)
                    )}>
                      <div className="flex-1">
                        <p className="font-semibold text-[#14161C] mb-1">{task.title}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={cn('font-medium', getTaskTextColor(isOverdue, isUrgent))}>
                            {getDueDateText(daysLeft, isOverdue)}
                          </span>
                          {task.category && (
                            <span className="px-2 py-0.5 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                              {task.category}
                            </span>
                          )}
                          {task.priority === 1 && (
                            <span className="px-2 py-0.5 bg-[#14161C]/10 text-[#14161C] rounded-full">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Risk Alerts */}
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-semibold text-[#14161C] flex items-center gap-2">
                <AlertTriangle size={20} />
                Risk Alerts
              </h3>
              <Link href={`/dashboard/${weddingId}/events/${event.id}/risk-alerts`}>
                <Button size="sm" variant="ghost" className="text-[#1F4D3A]">
                  View All <ArrowRight size={12} />
                </Button>
              </Link>
            </div>

            {recentRisks.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-[#1F4D3A]/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckSquare size={20} className="text-[#1F4D3A]" />
                </div>
                <p className="text-[#14161C]/60">No active risks</p>
                <p className="text-xs text-[#14161C]/40 mt-1">Everything looks good!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRisks.slice(0, 4).map(risk => (
                  <div key={risk.id} className={cn(
                    'p-4 rounded-xl border',
                    SEVERITY_COLORS[risk.severity as keyof typeof SEVERITY_COLORS] || 'bg-gray-100 text-gray-700 border-gray-200'
                  )}>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={getRiskBadgeVariant(risk.severity)}>
                        {risk.severity}
                      </Badge>
                      <span className="text-xs opacity-60">
                        {formatDistanceToNow(new Date(risk.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{risk.message}</p>
                    <p className="text-xs opacity-60 mt-1 capitalize">{risk.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Budget Overview */}
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C] flex items-center gap-2">
              <Wallet size={20} />
              Budget Overview
            </h3>
            <Link href={`/dashboard/${weddingId}/budget?event=${event.id}`}>
              <Button size="sm" variant="ghost" className="text-[#1F4D3A]">
                Manage Budget <ArrowRight size={12} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            {/* Progress & Stats */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-sm text-[#14161C]/60 mb-1">Budget Utilization</p>
                  <p className="text-2xl font-heading font-bold text-[#14161C]">
                    {fmt(analytics.budget.spent)}
                    <span className="text-lg text-[#14161C]/40 font-normal ml-2">
                      of {fmt(analytics.budget.allocated)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('text-2xl font-heading font-bold', getBudgetColor(budgetPercentage))}>
                    {budgetPercentage}%
                  </p>
                  <p className="text-sm text-[#14161C]/60">used</p>
                </div>
              </div>

              <ProgressBar value={analytics.budget.spent} max={analytics.budget.allocated} />

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-lg font-heading font-bold text-[#1F4D3A]">
                    {fmt(analytics.budget.allocated)}
                  </p>
                  <p className="text-xs text-[#14161C]/60">Allocated</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-heading font-bold text-[#D4A94F]">
                    {fmt(analytics.budget.spent)}
                  </p>
                  <p className="text-xs text-[#14161C]/60">Spent</p>
                </div>
                <div className="text-center">
                  <p className={cn(
                    'text-lg font-heading font-bold',
                    remaining >= 0 ? 'text-[#1F4D3A]' : 'text-[#14161C]/60'
                  )}>
                    {fmt(Math.abs(remaining))}
                  </p>
                  <p className="text-xs text-[#14161C]/60">
                    {remaining >= 0 ? 'Remaining' : 'Over Budget'}
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Insights */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#1F4D3A]/60 uppercase tracking-wide mb-3">
                  Budget Insights
                </p>
                <div className="space-y-3">
                  {budgetPercentage > 100 && (
                    <div className="flex items-center gap-2 p-3 bg-[#14161C]/5 rounded-lg border border-[#14161C]/20">
                      <AlertTriangle size={14} className="text-[#14161C]/60 flex-shrink-0" />
                      <p className="text-xs text-[#14161C]/60">
                        Over budget by {fmt(Math.abs(remaining))}
                      </p>
                    </div>
                  )}

                  {budgetPercentage > 85 && budgetPercentage <= 100 && (
                    <div className="flex items-center gap-2 p-3 bg-[#D4A94F]/10 rounded-lg border border-[#D4A94F]/20">
                      <AlertTriangle size={14} className="text-[#D4A94F] flex-shrink-0" />
                      <p className="text-xs text-[#D4A94F]">
                        Approaching budget limit
                      </p>
                    </div>
                  )}

                  {analytics.payments.totalReceived > 0 && (
                    <div className="p-3 bg-[#1F4D3A]/5 rounded-lg border border-[#1F4D3A]/10">
                      <p className="text-xs text-[#1F4D3A]">
                        <span className="font-semibold">{fmt(analytics.payments.totalReceived)}</span> received from payments
                      </p>
                    </div>
                  )}

                  {analytics.contributions.totalPaid > 0 && (
                    <div className="p-3 bg-[#D4A94F]/10 rounded-lg border border-[#D4A94F]/20">
                      <p className="text-xs text-[#D4A94F]">
                        <span className="font-semibold">{fmt(analytics.contributions.totalPaid)}</span> from contributions
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C] flex items-center gap-2">
              <Activity size={20} />
              Recent Activity
            </h3>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity size={32} className="text-[#14161C]/20 mx-auto mb-3" />
              <p className="text-[#14161C]/60">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 8).map(activity => (
                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl bg-[#F7F5F2]/50 hover:bg-[#F7F5F2] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#1F4D3A]/10 flex items-center justify-center flex-shrink-0">
                    {activity.type === 'task' && <CheckSquare size={14} className="text-[#1F4D3A]" />}
                    {activity.type === 'payment' && <DollarSign size={14} className="text-[#D4A94F]" />}
                    {activity.type === 'appointment' && <CalendarCheck size={14} className="text-[#1F4D3A]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#14161C] leading-relaxed">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#14161C]/40">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                      {activity.category && (
                        <span className="text-xs px-2 py-0.5 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                          {activity.category}
                        </span>
                      )}
                      {activity.amount && (
                        <span className="text-xs font-semibold text-[#D4A94F]">
                          {fmt(activity.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}