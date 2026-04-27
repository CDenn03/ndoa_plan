'use client'
import { cn } from '@/components/ui'
import type { StatsCardConfig } from '@/lib/module-patterns'
import * as React from 'react'

// ─── Statistics Cards Component ───────────────────────────────────────────────

interface StatsCardsProps {
  stats: StatsCardConfig[]
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
}

export function StatsCards({ stats, className, variant = 'default' }: Readonly<StatsCardsProps>) {
  const colors = {
    default: 'text-[#14161C]',
    green: 'text-[#1F4D3A]',
    red: 'text-red-500',
    amber: 'text-amber-500',
    blue: 'text-sky-600',
    gold: 'text-[#D4A94F]',
  }

  const trendIcons = {
    up: (
      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
    ),
    down: (
      <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
      </svg>
    ),
    stable: (
      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex gap-4 overflow-x-auto scrollbar-thin', className)}>
        {stats.map((stat, idx) => (
          <div key={`${stat.label}-${idx}`} className="flex-shrink-0 bg-white rounded-xl border border-[#1F4D3A]/8 p-4 min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              {stat.icon && <div className="text-[#1F4D3A]/40">{stat.icon}</div>}
              <p className="text-[10px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <p className={cn('text-2xl font-bold leading-none', colors[stat.color])}>
                {stat.value}
              </p>
              {stat.trend && (
                <div className="flex items-center">
                  {trendIcons[stat.trend]}
                </div>
              )}
            </div>
            {stat.subtitle && (
              <p className="text-xs text-[#14161C]/40 mt-1">{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('grid gap-4', className)}>
        {stats.map((stat, idx) => (
          <div key={`${stat.label}-${idx}`} className="bg-white rounded-2xl border border-[#1F4D3A]/8 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {stat.icon && (
                  <div className="w-10 h-10 rounded-xl bg-[#1F4D3A]/6 flex items-center justify-center text-[#1F4D3A]">
                    {stat.icon}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[#14161C]">{stat.label}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-[#14161C]/40 mt-0.5">{stat.subtitle}</p>
                  )}
                </div>
              </div>
              {stat.trend && (
                <div className="flex items-center gap-1">
                  {trendIcons[stat.trend]}
                </div>
              )}
            </div>
            <p className={cn('text-4xl font-bold leading-none', colors[stat.color])}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    )
  }

  // Default variant - horizontal grid
  return (
    <div className={cn(
      'rounded-2xl border border-[#1F4D3A]/8 bg-white shadow-sm',
      stats.length > 1 ? 'grid divide-x divide-[#1F4D3A]/8' : '',
      stats.length === 2 ? 'grid-cols-2' : '',
      stats.length === 3 ? 'grid-cols-3' : '',
      stats.length === 4 ? 'grid-cols-4' : '',
      stats.length > 4 ? 'grid-cols-2 md:grid-cols-4' : '',
      className
    )}>
      {stats.map((stat, idx) => (
        <div key={`${stat.label}-${idx}`} className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            {stat.icon && <div className="text-[#1F4D3A]/40">{stat.icon}</div>}
            <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">
              {stat.label}
            </p>
            {stat.trend && (
              <div className="ml-auto">
                {trendIcons[stat.trend]}
              </div>
            )}
          </div>
          <p className={cn('text-3xl font-bold leading-none', colors[stat.color])}>
            {stat.value}
          </p>
          {stat.subtitle && (
            <p className="text-xs text-[#14161C]/40">{stat.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Single Stat Card Component ───────────────────────────────────────────────

interface SingleStatCardProps extends StatsCardConfig {
  className?: string
  variant?: 'default' | 'large' | 'minimal'
}

export function SingleStatCard({ 
  label, 
  value, 
  color = 'default', 
  icon, 
  trend, 
  subtitle, 
  className,
  variant = 'default' 
}: Readonly<SingleStatCardProps>) {
  const colors = {
    default: 'text-[#14161C]',
    green: 'text-[#1F4D3A]',
    red: 'text-red-500',
    amber: 'text-amber-500',
    blue: 'text-sky-600',
    gold: 'text-[#D4A94F]',
  }

  const trendIcons = {
    up: (
      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
    ),
    down: (
      <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
      </svg>
    ),
    stable: (
      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center gap-2">
          {icon && <div className="text-[#1F4D3A]/40">{icon}</div>}
          <p className="text-xs font-medium text-[#14161C]/60">{label}</p>
          {trend && trendIcons[trend]}
        </div>
        <p className={cn('text-2xl font-bold leading-none', colors[color])}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-[#14161C]/40">{subtitle}</p>
        )}
      </div>
    )
  }

  if (variant === 'large') {
    return (
      <div className={cn('bg-white rounded-2xl border border-[#1F4D3A]/8 p-8 text-center', className)}>
        {icon && (
          <div className="w-16 h-16 rounded-2xl bg-[#1F4D3A]/6 flex items-center justify-center text-[#1F4D3A] mx-auto mb-4">
            {icon}
          </div>
        )}
        <p className="text-sm font-semibold text-[#14161C] mb-2">{label}</p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className={cn('text-5xl font-bold leading-none', colors[color])}>
            {value}
          </p>
          {trend && trendIcons[trend]}
        </div>
        {subtitle && (
          <p className="text-sm text-[#14161C]/40">{subtitle}</p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn('bg-white rounded-xl border border-[#1F4D3A]/8 p-5 space-y-2', className)}>
      <div className="flex items-center gap-2">
        {icon && <div className="text-[#1F4D3A]/40">{icon}</div>}
        <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">
          {label}
        </p>
        {trend && (
          <div className="ml-auto">
            {trendIcons[trend]}
          </div>
        )}
      </div>
      <p className={cn('text-3xl font-bold leading-none', colors[color])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-[#14161C]/40">{subtitle}</p>
      )}
    </div>
  )
}