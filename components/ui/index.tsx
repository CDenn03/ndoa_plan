import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import * as React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants = {
  default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  maybe: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export function Badge({ variant = 'default', className, children }: {
  variant?: keyof typeof badgeVariants; className?: string; children: React.ReactNode
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeVariants[variant], className)}>
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'
const btnVariants = {
  primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm',
  secondary: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
  ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
}
const btnSizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-6 text-base', icon: 'h-9 w-9' }

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof btnVariants; size?: keyof typeof btnSizes
}>(({ variant = 'primary', size = 'md', className, ...props }, ref) => (
  <button ref={ref} className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...props} />
))
Button.displayName = 'Button'

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl', className)} {...props}>{children}</div>
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 border-b border-zinc-100 dark:border-zinc-800', className)} {...props} />
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}
export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('font-semibold text-base text-zinc-900 dark:text-zinc-100', className)}>{children}</h3>
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      'flex h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
      'px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
      'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
      'disabled:opacity-50 disabled:cursor-not-allowed transition-shadow',
      className
    )} {...props} />
  )
)
Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
      'px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400',
      'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
      'disabled:opacity-50 resize-none transition-shadow',
      className
    )} {...props} />
  )
)
Textarea.displayName = 'Textarea'

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(
      'flex h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
      'px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100',
      'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
      'disabled:opacity-50 cursor-pointer appearance-none',
      className
    )} {...props}>{children}</select>
  )
)
Select.displayName = 'Select'

// ─── Label ────────────────────────────────────────────────────────────────────
export function Label({ className, htmlFor, children }: { className?: string; htmlFor?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className={cn('block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1', className)}>{children}</label>
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'default' }: {
  label: string; value: string | number; sub?: string
  color?: 'default' | 'green' | 'red' | 'amber' | 'blue'
}) {
  const colors = {
    default: 'text-zinc-900 dark:text-zinc-100',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', colors[color])}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'violet' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : `bg-${color}-500`
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
      <div className={cn('h-2 rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-zinc-300 dark:text-zinc-600 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      {description && <p className="text-sm text-zinc-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return (
    <div className={cn('animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600', s[size])} />
  )
}
