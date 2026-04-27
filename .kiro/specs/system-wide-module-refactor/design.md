# System-Wide Module Refactor - Technical Design

## Overview

This design document outlines a comprehensive refactoring approach for the wedding planning platform to achieve module consistency, implement missing functionality, and establish standardized patterns across all features. The refactor addresses critical issues with module synchronization, budget arithmetic errors, missing implementations, and user experience inconsistencies.

The design establishes the checklist (task) module as the gold standard pattern and systematically applies this pattern across all modules while preserving existing functionality and maintaining backward compatibility.

## Architecture

### Module Standardization Architecture

The refactor implements a layered architecture with consistent patterns across all modules:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Page Components     │  Client Components  │  Modal System  │
│  - page.tsx         │  - [module]-client  │  - Add/Edit    │
│  - Layout wrapper   │  - Event handling   │  - Delete      │
│  - Data fetching    │  - State management │  - Templates   │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Hooks & Utilities  │  State Management   │  Data Services │
│  - use-[module]     │  - TanStack Query   │  - API routes  │
│  - Shared utilities │  - Zustand store    │  - Validation  │
│  - Common patterns  │  - Cache management │  - Sync engine │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Database          │  Offline Storage    │  Synchronization│
│  - Prisma/Postgres │  - Dexie/IndexedDB  │  - Conflict res │
│  - Server computed │  - Local mutations  │  - Batch sync   │
│  - Soft deletes    │  - Optimistic UI    │  - Circuit break│
└─────────────────────────────────────────────────────────────┘
```

### Gold Standard Pattern Structure

Based on the checklist module analysis, the standardized module structure follows this pattern:

```typescript
// File Structure
/dashboard/[weddingId]/[module]/
├── page.tsx                    // Server component with data fetching
├── [module]-client.tsx         // Client component with UI logic
└── components/                 // Module-specific components
    ├── [module]-modals.tsx     // Add/Edit/Delete modals
    ├── [module]-components.tsx // Shared components
    └── [module]-list.tsx       // Data display components

// Component Architecture
Page Component (Server)
├── Data fetching (TanStack Query)
├── Session management
├── Props preparation
└── Client component rendering

Client Component
├── State management (useState, useMemo)
├── Event handling
├── Tab management (EventTabs)
├── Modal orchestration
└── Data display coordination
```

## Components and Interfaces

### Core Component Interfaces

```typescript
// Standard Module Page Props
interface ModulePageProps {
  params: Promise<{ weddingId: string; eventId?: string }>
}

// Standard Client Component Props
interface ModuleClientProps {
  weddingId: string
  eventId?: string
  initialData?: any[]
  events?: WeddingEvent[]
  vendors?: Vendor[]
}

// Standard Modal Props
interface ModuleModalProps {
  weddingId: string
  eventId?: string
  item?: any
  onClose: () => void
  onSuccess?: () => void
}

// Standard List Component Props
interface ModuleListProps {
  items: any[]
  weddingId: string
  eventId?: string
  onEdit?: (item: any) => void
  onDelete?: (item: any) => void
  onAdd?: () => void
}
```

### Standardized UI Components

#### Statistics Cards Pattern
```typescript
interface StatsCardProps {
  stats: Array<{
    label: string
    value: string | number
    color: 'blue' | 'green' | 'amber' | 'red' | 'default'
    icon?: React.ReactNode
    trend?: 'up' | 'down' | 'stable'
  }>
}
```

#### Event Tabs Pattern
```typescript
interface EventTabsProps {
  events: WeddingEvent[]
  activeTab: string
  onTabChange: (tabId: string) => void
  showOverall?: boolean
}
```

#### Modal System Pattern
```typescript
interface StandardModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
}
```

### Module-Specific Implementations

#### Missing Module Interfaces

```typescript
// Appointments Module
interface Appointment {
  id: string
  weddingId: string
  eventId?: string
  title: string
  date: string
  time?: string
  location?: string
  vendorId?: string
  notes?: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
}

// Bridal Team Module
interface BridalTeamMember {
  id: string
  weddingId: string
  name: string
  role: 'MAID_OF_HONOR' | 'BRIDESMAID' | 'BEST_MAN' | 'GROOMSMAN' | 'FLOWER_GIRL' | 'RING_BEARER'
  email?: string
  phone?: string
  address?: string
  tasks?: string[]
  status: 'INVITED' | 'CONFIRMED' | 'DECLINED'
  createdAt: string
  updatedAt: string
}

// Risk Alerts Module
interface RiskAlert {
  id: string
  weddingId: string
  eventId?: string
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'BUDGET' | 'TIMELINE' | 'VENDOR' | 'WEATHER' | 'LOGISTICS' | 'OTHER'
  status: 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'DISMISSED'
  dueDate?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

// Analytics Module
interface AnalyticsData {
  weddingId: string
  eventId?: string
  period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
  metrics: {
    budget: BudgetMetrics
    tasks: TaskMetrics
    guests: GuestMetrics
    vendors: VendorMetrics
    timeline: TimelineMetrics
  }
  trends: TrendData[]
  insights: InsightData[]
}
```

## Data Models

### Standardized Data Patterns

All modules follow consistent data modeling patterns:

```typescript
// Base Entity Pattern
interface BaseEntity {
  id: string
  weddingId: string
  eventId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  version: number
  checksum: string
  updatedBy: string
}

// Soft Delete Pattern
interface SoftDeletable {
  deletedAt?: string
  deletedBy?: string
  deleteReason?: string
}

// Audit Trail Pattern
interface Auditable {
  createdBy: string
  updatedBy: string
  version: number
  checksum: string
}

// Sync Pattern
interface Syncable {
  isDirty: boolean
  lastSyncAt?: string
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR'
}
```

### Budget Arithmetic Corrections

The budget module implements proper numeric calculations:

```typescript
// Corrected Budget Calculation Patterns
interface BudgetCalculations {
  // Server-computed actual values
  calculateActual: (budgetLineId: string) => Promise<number>
  
  // Proper numeric operations
  addBudgetLines: (lines: BudgetLine[]) => number
  subtractAmounts: (total: number, spent: number) => number
  calculatePercentage: (spent: number, allocated: number) => number
  
  // Value sanitization
  sanitizeNumeric: (value: any) => number
  formatCurrency: (amount: number) => string
}

// Implementation
const sanitizeNumeric = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

const calculateBudgetSummary = (lines: BudgetLine[]) => {
  const estimated = lines.reduce((sum, line) => sum + sanitizeNumeric(line.estimated), 0)
  const actual = lines.reduce((sum, line) => sum + sanitizeNumeric(line.actual), 0)
  return { estimated, actual, remaining: estimated - actual }
}
```

### Module Synchronization Data Flow

```typescript
// Synchronization Patterns
interface ModuleSyncPattern {
  // Event-specific data filtering
  filterByEvent: (items: any[], eventId: string) => any[]
  
  // Wedding-wide data aggregation
  aggregateByWedding: (items: any[], weddingId: string) => any[]
  
  // Cache invalidation patterns
  invalidateRelatedQueries: (moduleType: string, weddingId: string) => void
  
  // State synchronization
  syncStateAcrossViews: (state: any, viewType: 'event' | 'wedding') => void
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated:

**Redundancy Analysis:**
- Properties 1.4 and 1.5 (UI consistency) can be combined into a comprehensive UI pattern property
- Properties 2.1, 2.2, and 2.3 (budget arithmetic) can be consolidated into a single numeric calculation property
- Properties 5.1, 5.2, 5.3, 5.4, 5.5 (modal patterns) can be combined into a comprehensive modal consistency property
- Properties 6.1, 6.2, 6.3, 6.4, 6.5 (confirmation dialogs) can be consolidated into a single confirmation workflow property
- Properties 8.2 and 8.6 (cache invalidation) are redundant and can be combined
- Properties 10.4 and 10.5 (navigation highlighting) can be combined into a single navigation state property

**Final Consolidated Properties:**

### Property 1: UI Pattern Consistency

*For any* module in the system, the UI components (data lists, statistics cards, filtering, and search patterns) should follow the same structural patterns and styling as the gold standard task module.

**Validates: Requirements 1.4, 1.5**

### Property 2: Budget Arithmetic Correctness

*For any* budget calculation operation, the system should perform proper numeric arithmetic (addition, subtraction, percentage calculation) and return valid numbers, never string concatenation or NaN values.

**Validates: Requirements 2.1, 2.2, 2.3, 2.6**

### Property 3: Currency Formatting Consistency

*For any* currency value displayed in the system, the formatting should use consistent Intl.NumberFormat patterns with KES currency and proper decimal handling.

**Validates: Requirements 2.4**

### Property 4: Module Completeness

*For any* navigation tab or module link in the system, clicking it should lead to a functional page with proper loading states, error handling, and API integration.

**Validates: Requirements 3.2, 3.5, 3.6**

### Property 5: Access Path Functional Equivalence

*For any* module accessible through both event profile quick actions and sidebar navigation, both access paths should provide identical functionality and data consistency.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 6: URL Pattern Consistency

*For any* module in the system, the URL patterns should follow the standard format: `/dashboard/[weddingId]/[module]` for wedding-wide views and `/dashboard/[weddingId]/events/[eventId]/[module]` for event-specific views.

**Validates: Requirements 4.4, 10.1**

### Property 7: Modal System Consistency

*For any* add, edit, or template operation across all modules, the modal dialogs should follow standardized patterns for layout, validation, submission, loading states, and error handling.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 8: Delete Confirmation Workflow

*For any* delete operation in the system, the workflow should require explicit user confirmation through a standardized dialog, show proper loading states, provide success/error feedback, and implement soft-delete using the deletedAt pattern.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 9: Schedule Module Pattern Preservation

*For any* functionality in the schedule module (header patterns, filtering, display, sub-tabs, template integration), the behavior should remain consistent with existing implementation while following standardized patterns.

**Validates: Requirements 7.3, 7.4, 7.5**

### Property 10: Cache Invalidation Consistency

*For any* data mutation in the system, related queries in other modules should be properly invalidated and offline sync operations should be handled consistently across all modules.

**Validates: Requirements 8.2, 8.3, 8.6**

### Property 11: Error Handling Uniformity

*For any* module in the system, loading states and error conditions should be handled using consistent patterns and provide uniform user feedback.

**Validates: Requirements 8.4, 9.5**

### Property 12: Navigation State Management

*For any* navigation between modules, the system should preserve appropriate context and filter states, maintain consistent breadcrumbs, highlight active tabs/sections correctly, and handle deep linking and browser navigation properly.

**Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**

## Error Handling

### Standardized Error Patterns

All modules implement consistent error handling:

```typescript
// Error Boundary Pattern
interface ModuleErrorBoundary {
  fallback: React.ComponentType<{ error: Error; retry: () => void }>
  onError: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
}

// API Error Handling
interface APIErrorHandler {
  handleNetworkError: (error: NetworkError) => void
  handleValidationError: (error: ValidationError) => void
  handleAuthError: (error: AuthError) => void
  handleServerError: (error: ServerError) => void
}

// Loading State Management
interface LoadingStateManager {
  isLoading: boolean
  error: Error | null
  retry: () => void
  reset: () => void
}
```

### Error Recovery Strategies

```typescript
// Circuit Breaker Pattern for Sync
interface SyncCircuitBreaker {
  isOpen: boolean
  failureCount: number
  lastFailureTime: number
  timeout: number
  
  execute: <T>(operation: () => Promise<T>) => Promise<T>
  reset: () => void
}

// Offline Fallback Patterns
interface OfflineFallback {
  detectOnlineStatus: () => boolean
  queueOfflineOperations: (operation: Operation) => void
  retryOnReconnect: () => void
  showOfflineIndicator: () => void
}
```

## Testing Strategy

### Dual Testing Approach

The system implements both unit testing and property-based testing for comprehensive coverage:

**Unit Testing Focus:**
- Specific examples of module functionality
- Integration points between components
- Edge cases and error conditions
- Modal workflows and user interactions
- API endpoint responses

**Property-Based Testing Focus:**
- Universal properties across all modules
- UI consistency validation
- Data synchronization correctness
- Navigation behavior verification
- Error handling uniformity

### Property-Based Testing Configuration

**Testing Library:** fast-check for TypeScript/JavaScript property-based testing
**Configuration:** Minimum 100 iterations per property test
**Tagging Format:** `Feature: system-wide-module-refactor, Property {number}: {property_text}`

### Test Implementation Examples

```typescript
// Property 1: UI Pattern Consistency
describe('Feature: system-wide-module-refactor, Property 1: UI Pattern Consistency', () => {
  test('all modules follow consistent UI patterns', async () => {
    await fc.assert(fc.asyncProperty(
      fc.constantFrom('checklist', 'budget', 'guests', 'vendors', 'appointments'),
      async (moduleName) => {
        const moduleComponent = await renderModule(moduleName)
        expect(moduleComponent).toHaveConsistentUIPatterns()
        expect(moduleComponent).toFollowGoldStandardLayout()
      }
    ), { numRuns: 100 })
  })
})

// Property 2: Budget Arithmetic Correctness
describe('Feature: system-wide-module-refactor, Property 2: Budget Arithmetic Correctness', () => {
  test('budget calculations return valid numbers', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        estimated: fc.float({ min: 0, max: 1000000 }),
        actual: fc.float({ min: 0, max: 1000000 })
      })),
      async (budgetLines) => {
        const result = calculateBudgetSummary(budgetLines)
        expect(typeof result.estimated).toBe('number')
        expect(typeof result.actual).toBe('number')
        expect(typeof result.remaining).toBe('number')
        expect(isNaN(result.estimated)).toBe(false)
        expect(isNaN(result.actual)).toBe(false)
        expect(isNaN(result.remaining)).toBe(false)
      }
    ), { numRuns: 100 })
  })
})
```

### Integration Testing Strategy

```typescript
// Module Integration Tests
describe('Module Integration', () => {
  test('event profile quick actions match sidebar navigation', async () => {
    const eventProfileActions = await getEventProfileQuickActions(weddingId, eventId)
    const sidebarNavigation = await getSidebarNavigationOptions(weddingId)
    
    expect(eventProfileActions).toProvideEquivalentFunctionality(sidebarNavigation)
  })
  
  test('cache invalidation works across modules', async () => {
    await updateBudgetLine(weddingId, budgetLineId, newData)
    
    const budgetCache = await getCacheState('budget', weddingId)
    const paymentsCache = await getCacheState('payments', weddingId)
    
    expect(budgetCache.isStale).toBe(true)
    expect(paymentsCache.isStale).toBe(true)
  })
})
```

This comprehensive design provides a systematic approach to refactoring the wedding platform modules while maintaining consistency, implementing missing functionality, and ensuring robust error handling and testing coverage.