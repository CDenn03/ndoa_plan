'use client'
import { cn } from '@/components/ui'
import type { ConfirmationDialogProps } from '@/lib/module-patterns'
import * as React from 'react'
import { useEffect } from 'react'

// ─── Confirmation Dialog Component ────────────────────────────────────────────

export function ConfirmationDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: Readonly<ConfirmationDialogProps>) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-lg border border-[#1F4D3A]/8 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        role="document"
      >
        {/* Icon */}
        <div className="flex justify-center">
          {danger ? (
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#1F4D3A]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#1F4D3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h2 id="confirm-title" className="font-heading font-semibold text-base text-[#14161C]">
            {title}
          </h2>
          {description && (
            <p id="confirm-description" className="text-sm text-[#14161C]/55 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 px-4 rounded-xl font-semibold text-sm bg-[#F7F5F2] text-[#1F4D3A] border border-[#1F4D3A]/15 hover:bg-[#1F4D3A]/8 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-10 px-4 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50',
              danger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#1F4D3A] text-white hover:bg-[#16382B]'
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

interface DeleteConfirmationProps {
  itemName: string
  itemType?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  consequences?: string[]
}

export function DeleteConfirmation({
  itemName,
  itemType = 'item',
  onConfirm,
  onCancel,
  loading = false,
  consequences = [],
}: Readonly<DeleteConfirmationProps>) {
  return (
    <ConfirmationDialog
      title={`Delete ${itemType}?`}
      description={
        consequences.length > 0
          ? `Are you sure you want to delete "${itemName}"? This will also: ${consequences.join(', ')}`
          : `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
      }
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
      danger={true}
      loading={loading}
    />
  )
}

// ─── Bulk Action Confirmation Dialog ──────────────────────────────────────────

interface BulkActionConfirmationProps {
  action: string
  itemCount: number
  itemType: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  danger?: boolean
}

export function BulkActionConfirmation({
  action,
  itemCount,
  itemType,
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: Readonly<BulkActionConfirmationProps>) {
  const pluralType = itemCount === 1 ? itemType : `${itemType}s`
  
  return (
    <ConfirmationDialog
      title={`${action} ${itemCount} ${pluralType}?`}
      description={`Are you sure you want to ${action.toLowerCase()} ${itemCount} ${pluralType}? ${
        danger ? 'This action cannot be undone.' : ''
      }`}
      confirmLabel={action}
      onConfirm={onConfirm}
      onCancel={onCancel}
      danger={danger}
      loading={loading}
    />
  )
}

// ─── Status Change Confirmation Dialog ────────────────────────────────────────

interface StatusChangeConfirmationProps {
  itemName: string
  currentStatus: string
  newStatus: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  consequences?: string[]
}

export function StatusChangeConfirmation({
  itemName,
  currentStatus,
  newStatus,
  onConfirm,
  onCancel,
  loading = false,
  consequences = [],
}: Readonly<StatusChangeConfirmationProps>) {
  return (
    <ConfirmationDialog
      title="Change status?"
      description={
        consequences.length > 0
          ? `Change "${itemName}" from ${currentStatus} to ${newStatus}? This will: ${consequences.join(', ')}`
          : `Change "${itemName}" from ${currentStatus} to ${newStatus}?`
      }
      confirmLabel="Change Status"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    />
  )
}

// ─── Unsaved Changes Confirmation Dialog ──────────────────────────────────────

interface UnsavedChangesConfirmationProps {
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
  loading?: boolean
}

export function UnsavedChangesConfirmation({
  onSave,
  onDiscard,
  onCancel,
  loading = false,
}: Readonly<UnsavedChangesConfirmationProps>) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-lg border border-[#1F4D3A]/8 p-6 space-y-4"
        role="document"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h2 className="font-heading font-semibold text-base text-[#14161C]">
            Unsaved Changes
          </h2>
          <p className="text-sm text-[#14161C]/55 leading-relaxed">
            You have unsaved changes. What would you like to do?
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="w-full h-10 px-4 rounded-xl font-semibold text-sm bg-[#1F4D3A] text-white hover:bg-[#16382B] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDiscard}
              disabled={loading}
              className="flex-1 h-10 px-4 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 h-10 px-4 rounded-xl font-semibold text-sm bg-[#F7F5F2] text-[#1F4D3A] border border-[#1F4D3A]/15 hover:bg-[#1F4D3A]/8 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}