'use client'
import { cn } from '@/components/ui'
import type { StandardModalProps } from '@/lib/module-patterns'
import * as React from 'react'
import { useEffect } from 'react'

// ─── Standard Modal Component ─────────────────────────────────────────────────

export function StandardModal({ 
  title, 
  onClose, 
  children, 
  size = 'md', 
  loading = false,
  className 
}: Readonly<StandardModalProps>) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center !mt-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          'bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#1F4D3A]/8 sm:animate-none modal-slide-up',
          sizeClasses[size],
          loading && 'pointer-events-none opacity-75',
          className
        )}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1F4D3A]/8">
          <h2 id="modal-title" className="font-heading font-semibold text-base text-[#14161C]">
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F4D3A]/6 text-[#14161C]/40 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1F4D3A]/10 border-t-[#1F4D3A]" />
                <span className="text-sm text-[#14161C]/60">Loading...</span>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Form Modal Component ─────────────────────────────────────────────────────

interface FormModalProps extends Omit<StandardModalProps, 'children'> {
  onSubmit: (e: React.FormEvent) => void
  submitLabel?: string
  cancelLabel?: string
  submitDisabled?: boolean
  submitVariant?: 'primary' | 'danger'
  children: React.ReactNode
}

export function FormModal({
  title,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitDisabled = false,
  submitVariant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
}: Readonly<FormModalProps>) {
  return (
    <StandardModal
      title={title}
      onClose={onClose}
      size={size}
      loading={loading}
      className={className}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        
        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-[#1F4D3A]/8">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 px-4 rounded-xl font-semibold text-sm bg-[#F7F5F2] text-[#1F4D3A] border border-[#1F4D3A]/15 hover:bg-[#1F4D3A]/8 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={submitDisabled || loading}
            className={cn(
              'flex-1 h-10 px-4 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50',
              submitVariant === 'primary' 
                ? 'bg-[#1F4D3A] text-white hover:bg-[#16382B]'
                : 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                <span>Saving...</span>
              </div>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </StandardModal>
  )
}

// ─── List Modal Component ─────────────────────────────────────────────────────

interface ListModalProps extends Omit<StandardModalProps, 'children'> {
  items: Array<{
    id: string
    title: string
    subtitle?: string
    action?: React.ReactNode
    onClick?: () => void
  }>
  emptyMessage?: string
  emptyAction?: React.ReactNode
}

export function ListModal({
  title,
  onClose,
  items,
  emptyMessage = 'No items available',
  emptyAction,
  size = 'md',
  loading = false,
  className,
}: Readonly<ListModalProps>) {
  return (
    <StandardModal
      title={title}
      onClose={onClose}
      size={size}
      loading={loading}
      className={className}
    >
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#14161C]/40 mb-4">{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between gap-3 py-3 px-4 rounded-xl border border-[#1F4D3A]/8 hover:border-[#1F4D3A]/12 transition-colors',
                item.onClick && 'cursor-pointer hover:bg-[#F7F5F2]/50'
              )}
              onClick={item.onClick}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#14161C] truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-[#14161C]/40 truncate">{item.subtitle}</p>
                )}
              </div>
              {item.action && (
                <div className="flex-shrink-0">
                  {item.action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </StandardModal>
  )
}

// ─── Template Loading Modal ───────────────────────────────────────────────────

interface TemplateLoadingModalProps {
  title: string
  onClose: () => void
  templates: Array<{
    id: string
    name: string
    description?: string
    itemCount?: number
    culturalType?: string
  }>
  onApplyTemplate: (templateId: string) => Promise<void>
  isLoading?: boolean
  applyingId?: string | null
}

export function TemplateLoadingModal({
  title,
  onClose,
  templates,
  onApplyTemplate,
  isLoading = false,
  applyingId = null,
}: Readonly<TemplateLoadingModalProps>) {
  const handleApply = async (templateId: string) => {
    try {
      await onApplyTemplate(templateId)
    } catch (error) {
      console.error('Failed to apply template:', error)
    }
  }

  return (
    <StandardModal title={title} onClose={onClose} size="md" loading={isLoading}>
      <div className="space-y-4">
        <p className="text-xs text-[#14161C]/40">
          Appends items to your list. Existing items are not affected.
        </p>
        
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#14161C]/40">No templates available.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {templates.map(template => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl border border-[#1F4D3A]/8"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C] truncate">
                    {template.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {template.itemCount !== undefined && (
                      <span className="text-xs text-[#14161C]/40">
                        {template.itemCount} items
                      </span>
                    )}
                    {template.culturalType && (
                      <span className="text-xs text-[#1F4D3A]/70">
                        {template.culturalType}
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-[#14161C]/40 mt-1 truncate">
                      {template.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleApply(template.id)}
                  disabled={applyingId === template.id}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A94F]/12 text-[#1F4D3A] hover:bg-[#D4A94F]/20 transition-colors disabled:opacity-50"
                >
                  {applyingId === template.id ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border border-[#1F4D3A]/20 border-t-[#1F4D3A]" />
                      <span>Applying...</span>
                    </div>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </StandardModal>
  )
}