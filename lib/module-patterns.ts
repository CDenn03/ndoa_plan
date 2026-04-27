/**
 * Shared Module Patterns and Utilities
 * 
 * This file provides standardized interfaces, utilities, and patterns for consistent
 * module implementation across the wedding planning platform. All modules should
 * follow these patterns to ensure maintainability and user experience consistency.
 * 
 * Based on the gold standard pattern established by the checklist (task) module.
 */

import type { WeddingEvent } from '@/lib/generated/prisma'
import type { ReactNode } from 'react'

// ─── Base Component Props ─────────────────────────────────────────────────────

/**
 * Standard props for module page components (server components)
 */
export interface ModulePageProps {
  params: Promise<{ weddingId: string; eventId?: string }>
}

/**
 * Standard props for module client components
 */
export interface ModuleClientProps {
  weddingId: string
  eventId?: string
  initialData?: unknown[]
  events?: WeddingEvent[]
  vendors?: unknown[]
}

/**
 * Standard props for module modal components
 */
export interface ModuleModalProps {
  weddingId: string
  eventId?: string
  item?: unknown
  onClose: () => void
  onSuccess?: () => void
}

/**
 * Standard props for module list components
 */
export interface ModuleListProps {
  items: unknown[]
  weddingId: string
  eventId?: string
  onEdit?: (item: unknown) => void
  onDelete?: (item: unknown) => void
  onAdd?: () => void
}

// ─── Statistics Card Patterns ─────────────────────────────────────────────────

/**
 * Standard statistics card configuration
 */
export interface StatsCardConfig {
  label: string
  value: string | number
  color: 'blue' | 'green' | 'amber' | 'red' | 'default' | 'gold'
  icon?: ReactNode
  trend?: 'up' | 'down' | 'stable'
  subtitle?: string
}

/**
 * Standard statistics cards props
 */
export interface StatsCardsProps {
  stats: StatsCardConfig[]
  className?: string
}

// ─── Modal System Patterns ────────────────────────────────────────────────────

/**
 * Standard modal configuration
 */
export interface StandardModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  className?: string
}

/**
 * Standard confirmation dialog props
 */
export interface ConfirmationDialogProps {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  loading?: boolean
}

/**
 * Template modal props for consistent template loading
 */
export interface TemplateModalProps {
  weddingId: string
  eventId?: string
  templateType: string
  onClose: () => void
  onSuccess?: () => void
}

// ─── Error Handling Interfaces ────────────────────────────────────────────────

/**
 * Standard error state interface
 */
export interface ErrorState {
  error: Error | null
  isLoading: boolean
  retry: () => void
  reset: () => void
}

/**
 * Standard loading state interface
 */
export interface LoadingState {
  isLoading: boolean
  isError: boolean
  error?: Error | null
}

/**
 * API error response interface
 */
export interface APIError {
  message: string
  code?: string
  field?: string
  details?: Record<string, unknown>
}

// ─── Module Header Patterns ───────────────────────────────────────────────────

/**
 * Standard module header configuration
 */
export interface ModuleHeaderConfig {
  title: string
  subtitle?: string
  breadcrumb?: string
  actions?: ReactNode[]
  stats?: StatsCardConfig[]
  showAddButton?: boolean
  addButtonLabel?: string
  onAdd?: () => void
  showTemplateButton?: boolean
  onLoadTemplate?: () => void
}

// ─── Filter and Search Patterns ───────────────────────────────────────────────

/**
 * Standard filter configuration
 */
export interface FilterConfig {
  key: string
  label: string
  options: Array<{ value: string; label: string; count?: number }>
  defaultValue?: string
  type?: 'select' | 'toggle' | 'multi-select'
}

/**
 * Standard search configuration
 */
export interface SearchConfig {
  placeholder: string
  fields: string[]
  debounceMs?: number
}

/**
 * Combined filter and search state
 */
export interface FilterSearchState {
  search: string
  filters: Record<string, string | string[]>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ─── Data Validation Utilities ────────────────────────────────────────────────

/**
 * Standard validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Standard form field validation
 */
export interface FieldValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: unknown) => string | null
}

/**
 * Form validation schema
 */
export type ValidationSchema = Record<string, FieldValidation>

// ─── Formatting Utilities ─────────────────────────────────────────────────────

/**
 * Currency formatting options
 */
export interface CurrencyFormatOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  format?: 'short' | 'medium' | 'long' | 'full'
  locale?: string
  timeZone?: string
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Sanitizes numeric values to prevent NaN errors from Dexie Decimal objects
 */
export function sanitizeNumeric(value: unknown): number {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

/**
 * Formats currency values consistently using KES as default
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = 'KES',
    locale = 'en-KE',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(sanitizeNumeric(amount))
}

/**
 * Formats dates consistently across modules
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  const { format = 'medium', locale = 'en-US' } = options
  const dateObj = new Date(date)

  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }

  return dateObj.toLocaleDateString(locale, { dateStyle: format })
}

/**
 * Validates form data against a schema
 */
export function validateForm(
  data: Record<string, unknown>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [field, validation] of Object.entries(schema)) {
    const value = data[field]

    if (validation.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = `${field} is required`
      continue
    }

    if (value && typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors[field] = `${field} must be at least ${validation.minLength} characters`
        continue
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        errors[field] = `${field} must be no more than ${validation.maxLength} characters`
        continue
      }

      if (validation.pattern && !validation.pattern.test(value)) {
        errors[field] = `${field} format is invalid`
        continue
      }
    }

    if (validation.custom) {
      const customError = validation.custom(value)
      if (customError) {
        errors[field] = customError
        continue
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Generates consistent query keys for TanStack Query
 */
export function createQueryKey(
  module: string,
  weddingId: string,
  eventId?: string,
  filters?: Record<string, unknown>
): (string | Record<string, unknown>)[] {
  const key: (string | Record<string, unknown>)[] = [module, weddingId]
  
  if (eventId) {
    key.push('event', eventId)
  }
  
  if (filters && Object.keys(filters).length > 0) {
    key.push('filters', filters)
  }
  
  return key
}

/**
 * Calculates percentage with safe division
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((sanitizeNumeric(value) / sanitizeNumeric(total)) * 100)
}

/**
 * Filters items by event ID, handling both event-specific and wedding-wide views
 */
export function filterByEvent<T extends { eventId?: string }>(
  items: T[],
  eventId?: string
): T[] {
  if (!eventId) return items
  return items.filter(item => item.eventId === eventId)
}

/**
 * Groups items by a specified field
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const key = keyFn(item)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Creates a stable sort function for consistent ordering
 */
export function createSortFunction<T>(
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): (a: T, b: T) => number {
  return (a, b) => {
    const aVal = a[field]
    const bVal = b[field]
    
    if (aVal === bVal) return 0
    
    // Use localeCompare for strings, regular comparison for others
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal)
      return order === 'asc' ? comparison : -comparison
    }
    
    const comparison = aVal < bVal ? -1 : 1
    return order === 'asc' ? comparison : -comparison
  }
}

/**
 * Generates a consistent checksum for data integrity
 */
export function generateChecksum(data: Record<string, unknown>): string {
  const sortedKeys = Object.keys(data).sort((a, b) => a.localeCompare(b))
  const sortedData: Record<string, unknown> = {}
  
  for (const key of sortedKeys) {
    sortedData[key] = data[key]
  }
  
  const str = JSON.stringify(sortedData)
  let hash = 0
  
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) || 0
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Standard error messages for consistent user feedback
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  SYNC_ERROR: 'Sync failed. Your changes are saved locally and will sync when connection is restored.',
  DUPLICATE_ERROR: 'This item already exists.',
  DELETE_ERROR: 'Failed to delete item. Please try again.',
  SAVE_ERROR: 'Failed to save changes. Please try again.',
} as const

/**
 * Standard success messages for consistent user feedback
 */
export const SUCCESS_MESSAGES = {
  CREATED: 'Item created successfully',
  UPDATED: 'Item updated successfully',
  DELETED: 'Item deleted successfully',
  TEMPLATE_APPLIED: 'Template applied successfully',
  SYNC_COMPLETE: 'All changes synced successfully',
  EXPORT_COMPLETE: 'Export completed successfully',
  IMPORT_COMPLETE: 'Import completed successfully',
} as const

/**
 * Priority levels for consistent priority handling
 */
export const PRIORITY_LEVELS = {
  HIGH: { value: 1, label: 'High', color: 'red' },
  MEDIUM: { value: 2, label: 'Medium', color: 'amber' },
  LOW: { value: 3, label: 'Low', color: 'blue' },
} as const

/**
 * Common status types for consistent status handling
 */
export const STATUS_TYPES = {
  PENDING: { value: 'PENDING', label: 'Pending', color: 'amber' },
  CONFIRMED: { value: 'CONFIRMED', label: 'Confirmed', color: 'green' },
  COMPLETED: { value: 'COMPLETED', label: 'Completed', color: 'green' },
  CANCELLED: { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
  DECLINED: { value: 'DECLINED', label: 'Declined', color: 'red' },
  ACTIVE: { value: 'ACTIVE', label: 'Active', color: 'blue' },
  INACTIVE: { value: 'INACTIVE', label: 'Inactive', color: 'default' },
} as const