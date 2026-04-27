// Event Profile Types - Following Interface Segregation Principle
// Aligned with Ndoa Plan Brand Guidelines

export interface EventInfo {
  id: string
  name: string
  type: string
  date: string
  venue: string | null
  description: string | null
  startTime: string | null
  endTime: string | null
  isMain: boolean
  themeColor: string
  themeAccent: string
}

export interface WeddingInfo {
  name: string
  budget: number
  couplePhotoPath?: string | null
  members?: Array<{ role: string }> | null
}

export interface TaskAnalytics {
  total: number
  completed: number
  overdue: number
  highPriority: number
}

export interface BudgetAnalytics {
  allocated: number
  spent: number
  lines: number
}

export interface GuestAnalytics {
  total: number
  confirmed: number
  pending: number
  checkedIn: number
  vip: number
}

export interface VendorAnalytics {
  total: number
  confirmed: number
  totalOwed: number
}

export interface PaymentAnalytics {
  total: number
  completed: number
  totalReceived: number
}

export interface ContributionAnalytics {
  total: number
  totalPledged: number
  totalPaid: number
}

export interface AppointmentAnalytics {
  total: number
  upcoming: number
}

export interface RiskAnalytics {
  total: number
  critical: number
  high: number
}

export interface EventAnalytics {
  daysUntilEvent: number
  tasks: TaskAnalytics
  budget: BudgetAnalytics
  guests: GuestAnalytics
  vendors: VendorAnalytics
  payments: PaymentAnalytics
  contributions: ContributionAnalytics
  appointments: AppointmentAnalytics
  risks: RiskAnalytics
}

export interface Activity {
  id: string
  type: 'task' | 'payment' | 'guest' | 'vendor' | 'budget' | 'appointment'
  description: string
  status: string
  priority: 'high' | 'normal' | 'low'
  createdAt: string
  category?: string
  amount?: number
  location?: string | null
}

export interface UpcomingTask {
  id: string
  title: string
  dueDate: string
  category?: string | null
  priority: number
  isOverdue: boolean
}

export interface RecentRisk {
  id: string
  severity: string
  message: string
  category: string
  createdAt: string
}

export interface EventProfileData {
  event: EventInfo
  wedding: WeddingInfo
  analytics: EventAnalytics
  activities: Activity[]
  upcomingTasks: UpcomingTask[]
  recentRisks: RecentRisk[]
}

// Milestone and Timeline Types
export interface Milestone {
  id: string
  title: string
  dueDate: string
  completed: boolean
  status: 'completed' | 'pending' | 'overdue'
  type: 'task' | 'payment' | 'vendor' | 'other'
}

// Risk Assessment Types
export interface RiskIndicator {
  type: 'critical' | 'warning' | 'info'
  category: 'budget' | 'timeline' | 'vendors' | 'tasks'
  message: string
  actionRequired: boolean
}

// Theme Configuration Types
export interface ThemeConfig {
  primaryColor: string
  accentColor: string
  previewMode: boolean
}