import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import * as React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Brand tokens (mirrors landing page) ─────────────────────────────────────
// Primary:   #1F4D3A  (deep green)
// Gold:      #D4A94F
// BG:        #F7F5F2
// Text:      #14161C

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants = {
  default:   'bg-[#F7F5F2] text-[#1F4D3A]/70 border border-[#1F4D3A]/10',
  confirmed: 'bg-emerald-50 text-emerald-700',
  declined:  'bg-red-50 text-red-600',
  pending:   'bg-amber-50 text-amber-700',
  maybe:     'bg-[#E6C878]/30 text-[#1F4D3A]',
  critical:  'bg-red-50 text-red-600',
  high:      'bg-orange-50 text-orange-600',
  medium:    'bg-sky-50 text-sky-700',
  low:       'bg-emerald-50 text-emerald-700',
}

export function Badge({ variant = 'default', className, children }: Readonly<{
  variant?: keyof typeof badgeVariants; className?: string; children: React.ReactNode
}>) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide',
      badgeVariants[variant], className
    )}>
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D3A]/50 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]'
const btnVariants = {
  primary:   'bg-[#1F4D3A] text-white hover:bg-[#16382B]',
  secondary: 'bg-[#F7F5F2] text-[#1F4D3A] border border-[#1F4D3A]/15 hover:bg-[#1F4D3A]/8',
  ghost:     'hover:bg-[#1F4D3A]/6 text-[#1F4D3A]/70',
  danger:    'bg-red-500 text-white hover:bg-red-600',
  outline:   'border border-[#1F4D3A]/20 hover:bg-[#1F4D3A]/5 text-[#14161C]',
  lavender:  'bg-[#D4A94F]/12 text-[#1F4D3A] hover:bg-[#D4A94F]/20',
}
const btnSizes = { sm: 'h-8 px-3.5 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-6 text-base', icon: 'h-9 w-9' }

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof btnVariants
    size?: keyof typeof btnSizes
  }
>(({ variant = 'primary', size = 'md', className, ...props }, ref) => (
  <button ref={ref} className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...props} />
))
Button.displayName = 'Button'

// ─── Card ─────────────────────────────────────────────────────────────────────
const cardVariants = {
  default: 'bg-white rounded-2xl border border-[#1F4D3A]/8',
  ghost:   'bg-[#F7F5F2] rounded-2xl',
  flush:   'bg-white',
}

export function Card({ variant = 'default', className, children, ...props }: Readonly<
  React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof cardVariants }
>) {
  return (
    <div className={cn(cardVariants[variant], className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn('px-6 py-4 border-b border-[#1F4D3A]/8', className)} {...props} />
}

export function CardContent({ className, ...props }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

export function CardTitle({ className, children }: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <h3 className={cn('font-semibold text-sm text-[#14161C] tracking-tight', className)}>
      {children}
    </h3>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ className }: Readonly<{ className?: string }>) {
  return <hr className={cn('border-none border-t border-[#1F4D3A]/8 my-6', className)} />
}

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, children }: Readonly<{
  title: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode
}>) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#14161C]">{title}</h1>
        {subtitle && <p className="text-sm text-[#14161C]/55 mt-1">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────
export function SectionLabel({ children, className }: Readonly<{
  children: React.ReactNode; className?: string
}>) {
  return (
    <p className={cn('text-xs font-semibold uppercase tracking-widest text-[#1F4D3A]/40 mb-3', className)}>
      {children}
    </p>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      'flex h-10 w-full rounded-xl border border-[#1F4D3A]/15 bg-white',
      'px-3.5 py-2 text-sm text-[#14161C] placeholder:text-[#14161C]/30',
      'focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/30 focus:ring-offset-1 focus:border-transparent',
      'disabled:opacity-50 disabled:cursor-not-allowed transition-shadow',
      className
    )} {...props} />
  )
)
Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-xl border border-[#1F4D3A]/15 bg-white',
      'px-3.5 py-2.5 text-sm text-[#14161C] placeholder:text-[#14161C]/30',
      'focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/30 focus:ring-offset-1 focus:border-transparent',
      'disabled:opacity-50 resize-none transition-shadow',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn('relative', className?.includes('w-auto') ? 'w-auto' : 'w-full')}>
      <select ref={ref} className={cn(
        'flex h-10 w-full rounded-xl border border-[#1F4D3A]/15 bg-white',
        'px-3.5 py-2 pr-9 text-sm text-[#14161C]',
        'focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/30 focus:ring-offset-1 focus:border-transparent',
        'disabled:opacity-50 cursor-pointer appearance-none',
        className
      )} {...props}>{children}</select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#1F4D3A]/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
)
Select.displayName = 'Select'

// ─── Label ────────────────────────────────────────────────────────────────────
export function Label({ className, htmlFor, children }: Readonly<{
  className?: string; htmlFor?: string; children: React.ReactNode
}>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-xs font-semibold text-[#1F4D3A]/60 uppercase tracking-wide mb-1.5', className)}
    >
      {children}
    </label>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'default' }: Readonly<{
  label: string; value: string | number; sub?: string
  color?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'gold'
}>) {
  const colors = {
    default: 'text-[#14161C]',
    green:   'text-[#1F4D3A]',
    red:     'text-red-500',
    amber:   'text-amber-500',
    blue:    'text-sky-600',
    gold:    'text-[#D4A94F]',
  }
  return (
    <div className="py-4 px-8 first:pl-0">
      <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn('text-3xl font-bold leading-none', colors[color])}>{value}</p>
      {sub && <p className="text-xs text-[#14161C]/40 mt-1.5">{sub}</p>}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function getBarColor(pct: number): string {
  if (pct > 100) return 'bg-red-400'
  if (pct > 85)  return 'bg-amber-400'
  return 'bg-[#1F4D3A]'
}

export function ProgressBar({ value, max }: Readonly<{ value: number; max: number }>) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100))
  return (
    <div className="w-full bg-[#1F4D3A]/8 rounded-full h-1.5">
      <div
        className={cn('h-1.5 rounded-full transition-all duration-500', getBarColor(pct))}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: Readonly<{
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}>) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-[#1F4D3A]/15 mb-5">{icon}</div>
      <h3 className="text-base font-semibold text-[#14161C]/50">{title}</h3>
      {description && (
        <p className="text-sm text-[#14161C]/35 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: Readonly<{ size?: 'sm' | 'md' | 'lg' }>) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return (
    <div className={cn('animate-spin rounded-full border-2 border-[#1F4D3A]/10 border-t-[#1F4D3A]', s[size])} />
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export function ConfirmDialog({ title, description, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }: Readonly<{
  title: string; description?: string; confirmLabel?: string
  onConfirm: () => void; onCancel: () => void; danger?: boolean
}>) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-lg border border-[#1F4D3A]/8 p-6 space-y-4">
        <div>
          <h2 className="font-heading font-semibold text-base text-[#14161C]">{title}</h2>
          {description && <p className="text-sm text-[#14161C]/55 mt-1">{description}</p>}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────
export function Modal({ onClose, title, children }: Readonly<{
  onClose: () => void; title: string; children: React.ReactNode
}>) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center !mt-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg border border-[#1F4D3A]/8 sm:animate-none modal-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1F4D3A]/8">
          <h2 className="font-heading font-semibold text-base text-[#14161C]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F4D3A]/6 text-[#14161C]/40 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
