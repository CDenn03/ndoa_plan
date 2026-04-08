// ─── Re-export Prisma enums for client use ────────────────────────────────────
export type {
  UserRole,
  CulturalType,
  EventType,
  RsvpStatus,
  GuestSide,
  VendorCategory,
  VendorStatus,
  PaymentStatus,
  ContribStatus,
  RiskSeverity,
} from '@/lib/generated/prisma'

// ─── Sync types ───────────────────────────────────────────────────────────────

export type EntityType =
  | 'guest'
  | 'vendor'
  | 'payment'
  | 'timeline_event'
  | 'checklist_item'
  | 'budget_line'
  | 'committee_contribution'

export type OpType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RSVP'
  | 'CHECKIN'
  | 'PAY'
  | 'CHECK'

export type SyncStatus = 'pending' | 'in_flight' | 'synced' | 'failed' | 'conflict'

export type ConflictResolution =
  | 'server_wins'
  | 'client_wins'
  | 'field_merge'
  | 'append'
  | 'needs_human'

export interface SyncOperation {
  localId?: number
  operationId: string
  entityType: EntityType
  entityId: string
  serverId?: string
  operation: OpType
  payload: Record<string, unknown>
  clientVersion: number
  priority: 1 | 2 | 3
  status: SyncStatus
  createdAt: number
  attemptCount: number
  lastAttemptAt?: number
  serverAck?: string
  conflictData?: ConflictPayload
}

export interface ConflictPayload {
  operationId: string
  entityType: EntityType
  entityId: string
  clientState: Record<string, unknown>
  serverState: Record<string, unknown>
  clientVersion: number
  serverVersion: number
  resolution: ConflictResolution
  resolvedAt?: number
  resolvedBy?: string
}

export interface SyncBatchRequest {
  weddingId: string
  operations: SyncOperation[]
  clientTimestamp: number
}

export interface SyncBatchResponse {
  results: SyncOperationResult[]
  serverTimestamp: number
}

export interface SyncOperationResult {
  operationId: string
  status: 'ok' | 'conflict' | 'error' | 'duplicate'
  serverId?: string
  serverVersion?: number
  conflict?: ConflictPayload
  error?: string
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export type StorageBucket = 'documents' | 'contracts' | 'receipts' | 'media'

// ─── Risk engine ──────────────────────────────────────────────────────────────

export type RiskCategory = 'vendor' | 'budget' | 'guests' | 'timeline' | 'payments'
export type EvaluationMode = 'realtime' | 'batch_hourly' | 'batch_daily'

export interface RiskRuleResult {
  ruleId: string
  triggered: boolean
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: RiskCategory
  message: string
  data?: Record<string, unknown>
  suggestedAction?: string
}

// ─── Dashboard summary types ──────────────────────────────────────────────────

export interface DashboardSummary {
  guestCount: number
  confirmedCount: number
  pendingCount: number
  checkedInCount: number
  vendorCount: number
  confirmedVendors: number
  totalBudget: number
  totalSpent: number
  totalCommitted: number
  budgetPercent: number
  upcomingTasks: number
  overdueTasks: number
  activeRisks: number
  criticalRisks: number
  daysToWedding: number
}

// ─── Local Dexie entity types ─────────────────────────────────────────────────

export interface LocalGuest {
  id: string
  serverId?: string
  weddingId: string
  name: string
  phone?: string
  email?: string
  rsvpStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'MAYBE' | 'WAITLISTED'
  tableNumber?: number
  seatNumber?: number
  committeeId?: string
  side?: string
  mealPref?: string
  checkedIn: boolean
  checkedInAt?: number
  notes?: string
  tags?: string[]
  version: number
  checksum: string
  syncedAt?: number
  isDirty: boolean
  updatedAt: number
  deletedAt?: number
}

export interface LocalVendor {
  id: string
  serverId?: string
  weddingId: string
  name: string
  category: string
  status: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  amount?: number
  paidAmount: number
  depositAmount?: number
  contractPath?: string
  lastContactAt?: number
  notes?: string
  rating?: number
  version: number
  checksum: string
  syncedAt?: number
  isDirty: boolean
  updatedAt: number
  deletedAt?: number
}

export interface LocalTimelineEvent {
  id: string
  serverId?: string
  weddingId: string
  title: string
  description?: string
  startTime: number
  endTime?: number
  location?: string
  assignedUserId?: string
  vendorId?: string
  category?: string
  color?: string
  isComplete: boolean
  version: number
  checksum: string
  syncedAt?: number
  isDirty: boolean
  updatedAt: number
  deletedAt?: number
}

export interface LocalChecklistItem {
  id: string
  serverId?: string
  weddingId: string
  title: string
  description?: string
  category?: string
  dueDate?: number
  assignedTo?: string
  isChecked: boolean
  checkedAt?: number
  checkedBy?: string
  priority: number
  order: number
  version: number
  checksum: string
  syncedAt?: number
  isDirty: boolean
  updatedAt: number
  deletedAt?: number
}

export interface LocalBudgetLine {
  id: string
  serverId?: string
  weddingId: string
  category: string
  description: string
  estimated: number
  actual: number
  committed: number
  vendorId?: string
  notes?: string
  version: number
  checksum: string
  syncedAt?: number
  isDirty: boolean
  updatedAt: number
  deletedAt?: number
}
