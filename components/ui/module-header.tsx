'use client'
import { cn } from '@/components/ui'
import type { ModuleHeaderConfig } from '@/lib/module-patterns'
import { StatsCards } from './stats-cards'
import { Plus, LayoutTemplate } from 'lucide-react'
import * as React from 'react'

// ─── Module Header Component ──────────────────────────────────────────────────

interface ModuleHeaderProps extends ModuleHeaderConfig {
  className?: string
}

export function ModuleHeader({
  title,
  subtitle,
  breadcrumb,
  actions = [],
  stats = [],
  showAddButton = false,
  addButtonLabel = 'Add Item',
  onAdd,
  showTemplateButton = false,
  onLoadTemplate,
  className,
}: Readonly<ModuleHeaderProps>) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Breadcrumb */}
      {breadcrumb && (
        <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">
          {breadcrumb}
        </p>
      )}

      {/* Title and Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#14161C]/40 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Action Buttons */}
        {(actions.length > 0 || showAddButton || showTemplateButton) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Template Button */}
            {showTemplateButton && onLoadTemplate && (
              <button
                onClick={onLoadTemplate}
                className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-[#D4A94F]/12 text-[#1F4D3A] hover:bg-[#D4A94F]/20 transition-colors"
              >
                <LayoutTemplate size={13} />
                Template
              </button>
            )}

            {/* Custom Actions */}
            {actions.map((action, index) => (
              <div key={`action-${index}`}>{action}</div>
            ))}

            {/* Add Button */}
            {showAddButton && onAdd && (
              <button
                onClick={onAdd}
                className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-[#1F4D3A] text-white hover:bg-[#16382B] transition-colors"
              >
                <Plus size={14} />
                {addButtonLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {stats.length > 0 && (
        <StatsCards stats={stats} />
      )}
    </div>
  )
}

// ─── Compact Module Header ────────────────────────────────────────────────────

interface CompactModuleHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode[]
  className?: string
}

export function CompactModuleHeader({
  title,
  subtitle,
  actions = [],
  className,
}: Readonly<CompactModuleHeaderProps>) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-heading font-semibold text-[#14161C] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-[#14161C]/40">{subtitle}</p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions.map((action, index) => (
            <div key={`compact-header-action-${index}`}>{action}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section Header Component ─────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  subtitle?: string
  count?: number
  actions?: React.ReactNode[]
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  count,
  actions = [],
  className,
}: Readonly<SectionHeaderProps>) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-[#14161C]">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-[#14161C]/40 bg-[#F7F5F2] px-2 py-1 rounded-full">
            {count}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-[#14161C]/40">• {subtitle}</span>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions.map((action, index) => (
            <div key={`section-header-action-${index}`}>{action}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page Header with Tabs ────────────────────────────────────────────────────

interface PageHeaderWithTabsProps {
  title: string
  subtitle?: string
  breadcrumb?: string
  tabs: React.ReactNode
  actions?: React.ReactNode[]
  className?: string
}

export function PageHeaderWithTabs({
  title,
  subtitle,
  breadcrumb,
  tabs,
  actions = [],
  className,
}: Readonly<PageHeaderWithTabsProps>) {
  return (
    <div className={cn('px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white', className)}>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        {breadcrumb && (
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">
            {breadcrumb}
          </p>
        )}

        {/* Title and Actions */}
        <div className="flex items-end justify-between gap-4 mb-1">
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">
            {title}
          </h1>
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <div key={`page-tabs-action-${index}`}>{action}</div>
              ))}
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">{subtitle}</p>
        )}

        {/* Tabs */}
        <div className="mb-0">{tabs}</div>
      </div>
    </div>
  )
}

// ─── Filter Header Component ──────────────────────────────────────────────────

interface FilterHeaderProps {
  title?: string
  subtitle?: string
  filters: React.ReactNode
  search?: React.ReactNode
  actions?: React.ReactNode[]
  className?: string
}

export function FilterHeader({
  title,
  subtitle,
  filters,
  search,
  actions = [],
  className,
}: Readonly<FilterHeaderProps>) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Title and Actions */}
      {(title || actions.length > 0) && (
        <div className="flex items-center justify-between gap-4">
          {title && (
            <div>
              <h3 className="text-lg font-semibold text-[#14161C]">{title}</h3>
              {subtitle && (
                <p className="text-sm text-[#14161C]/40">{subtitle}</p>
              )}
            </div>
          )}
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <div key={`filter-header-action-${index}`}>{action}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {search && <div className="flex-1 min-w-[200px]">{search}</div>}
        <div className="flex items-center gap-2 flex-wrap">{filters}</div>
      </div>
    </div>
  )
}

// ─── Empty State Header ───────────────────────────────────────────────────────

interface EmptyStateHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode[]
  className?: string
}

export function EmptyStateHeader({
  title,
  description,
  icon,
  actions = [],
  className,
}: Readonly<EmptyStateHeaderProps>) {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="flex justify-center mb-4 text-[#1F4D3A]/20">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#14161C] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#14161C]/40 mb-6 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actions.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          {actions.map((action, index) => (
            <div key={`empty-state-action-${index}`}>{action}</div>
          ))}
        </div>
      )}
    </div>
  )
}