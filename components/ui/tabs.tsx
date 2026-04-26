'use client'
import { cn } from '@/components/ui'
import * as React from 'react'

// ─── Standard Tab Navigation Component ────────────────────────────────────────
interface TabItem {
  key: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (key: string) => void
  variant?: 'default' | 'pills'
  size?: 'sm' | 'md'
  className?: string
}

export function Tabs({ tabs, activeTab, onTabChange, variant = 'default', size = 'md', className }: Readonly<TabsProps>) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-1 bg-[#F7F5F2] rounded-xl p-1', className)}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'flex-1 text-xs py-1.5 rounded-lg transition-all font-medium',
              activeTab === tab.key
                ? 'bg-white text-[#14161C] font-bold shadow-sm'
                : 'text-[#14161C]/40 hover:text-[#1F4D3A]'
            )}
          >
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5'

  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-thin -mb-px', className)}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 font-semibold border-b-2 transition-colors',
            textSize,
            padding,
            activeTab === tab.key
              ? 'border-[#14161C] text-[#14161C]'
              : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Event Tab Navigation (without emojis) ────────────────────────────────────
interface EventTabsProps {
  events: Array<{ id: string; name: string }>
  activeTab: string
  onTabChange: (key: string) => void
  showOverall?: boolean
  className?: string
}

export function EventTabs({ events, activeTab, onTabChange, showOverall = true, className }: Readonly<EventTabsProps>) {
  const tabs: TabItem[] = []
  
  if (showOverall) {
    tabs.push({ key: '__overall__', label: 'Overall' })
  }
  
  tabs.push(...events.map(event => ({
    key: event.id,
    label: event.name
  })))

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      className={className}
    />
  )
}

// ─── Statistics Card Component ─────────────────────────────────────────────────
interface StatsCardProps {
  stats: Array<{
    label: string
    value: string | number
    color?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'gold'
    subtext?: string
  }>
  className?: string
}

export function StatsCard({ stats, className }: Readonly<StatsCardProps>) {
  const colors = {
    default: 'text-[#14161C]',
    green: 'text-[#1F4D3A]',
    red: 'text-red-500',
    amber: 'text-amber-500',
    blue: 'text-sky-600',
    gold: 'text-[#D4A94F]',
  }

  return (
    <div className={cn(
      'rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm',
      stats.length > 1 ? 'grid divide-x divide-zinc-100' : '',
      stats.length === 2 ? 'grid-cols-2' : '',
      stats.length === 3 ? 'grid-cols-3' : '',
      stats.length === 4 ? 'grid-cols-4' : '',
      className
    )}>
      {stats.map((stat, idx) => (
        <div key={`${stat.label}-${idx}`} className="p-5 space-y-1">
          <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">
            {stat.label}
          </p>
          <p className={cn('text-3xl font-extrabold font-heading leading-none', colors[stat.color || 'default'])}>
            {stat.value}
          </p>
          {stat.subtext && (
            <p className="text-xs text-[#14161C]/40 pt-0.5">{stat.subtext}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Content Card Component ────────────────────────────────────────────────────
interface ContentCardProps {
  title?: string
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
}

export function ContentCard({ title, children, className, headerAction }: Readonly<ContentCardProps>) {
  return (
    <div className={cn('rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm', className)}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F4D3A]/8">
          <h3 className="font-semibold text-sm text-[#14161C] tracking-tight">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  )
}