# Implementation Plan: System-Wide Module Refactor

## Overview

This implementation plan systematically refactors the wedding planning platform to achieve module consistency, implement missing functionality, and establish standardized patterns. The refactor uses the checklist (task) module as the gold standard and applies consistent patterns across all modules while preserving existing functionality.

## Tasks

- [x] 1. Establish shared utilities and patterns
  - [x] 1.1 Create shared module utilities and interfaces
    - Create `lib/module-patterns.ts` with standardized interfaces and utilities
    - Define base component props, modal patterns, and error handling interfaces
    - Implement shared validation and formatting utilities
    - _Requirements: 1.1, 9.1, 9.2_

  - [x] 1.2 Create standardized UI components
    - Create `components/ui/stats-cards.tsx` for consistent statistics display
    - Create `components/ui/standard-modal.tsx` for unified modal patterns
    - Create `components/ui/confirmation-dialog.tsx` for delete confirmations
    - Create `components/ui/module-header.tsx` for consistent module headers
    - _Requirements: 1.4, 1.5, 5.2, 6.1_

  - [ ]* 1.3 Write property tests for shared utilities
    - **Property 1: UI Pattern Consistency**
    - **Validates: Requirements 1.4, 1.5**

- [x] 2. Fix budget module arithmetic issues
  - [x] 2.1 Implement proper numeric calculations in budget helpers
    - Update `lib/budget-helpers.ts` with proper arithmetic functions
    - Replace string concatenation with numeric addition operations
    - Add value sanitization with `Number(x) || 0` pattern
    - Implement consistent currency formatting with Intl.NumberFormat
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 2.2 Update budget client component with corrected calculations
    - Fix budget summary calculations in `budget-client.tsx`
    - Ensure all budget values are properly typed as numbers
    - Update percentage calculations and remaining amount logic
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.3 Write property tests for budget arithmetic
    - **Property 2: Budget Arithmetic Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6**

  - [ ]* 2.4 Write property tests for currency formatting
    - **Property 3: Currency Formatting Consistency**
    - **Validates: Requirements 2.4**

- [x] 3. Implement missing appointments module
  - [x] 3.1 Create appointments page and client component
    - Create `app/dashboard/[weddingId]/appointments/page.tsx`
    - Create `app/dashboard/[weddingId]/appointments/appointments-client.tsx`
    - Follow gold standard pattern from checklist module
    - Implement proper data fetching with TanStack Query
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 3.2 Create appointments modal components
    - Create `components/appointments/appointment-modals.tsx`
    - Implement Add/Edit appointment modals following standard patterns
    - Include template loading modal for appointment templates
    - Add proper form validation and error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.3 Create event-specific appointments page
    - Create `app/dashboard/[weddingId]/events/[eventId]/appointments/page.tsx`
    - Create `app/dashboard/[weddingId]/events/[eventId]/appointments/appointments-client.tsx`
    - Ensure functional equivalence with wedding-wide appointments view
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 3.4 Write unit tests for appointments functionality
    - Test appointment CRUD operations
    - Test template application workflow
    - Test event filtering and data consistency
    - _Requirements: 3.5, 3.6_

- [x] 4. Implement missing contributions module
  - [x] 4.1 Create contributions page and client component
    - Create `app/dashboard/[weddingId]/contributions/page.tsx`
    - Create `app/dashboard/[weddingId]/contributions/contributions-client.tsx`
    - Follow gold standard pattern with statistics cards and filtering
    - Integrate with existing contribution API routes
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 4.2 Create contributions modal components
    - Create `components/contributions/contribution-modals.tsx`
    - Implement Add/Edit contribution modals with M-Pesa integration
    - Add delete confirmation dialogs following standard patterns
    - Include proper loading states and error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [x] 4.3 Create event-specific contributions page
    - Create `app/dashboard/[weddingId]/events/[eventId]/contributions/page.tsx`
    - Create `app/dashboard/[weddingId]/events/[eventId]/contributions/contributions-client.tsx`
    - Ensure data consistency between event and wedding-wide views
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 4.4 Write unit tests for contributions functionality
    - Test contribution creation and payment processing
    - Test M-Pesa integration workflows
    - Test event filtering and aggregation
    - _Requirements: 3.5, 3.6_

- [x] 5. Implement missing bridal-team module
  - [x] 5.1 Create bridal team page and client component
    - Create `app/dashboard/[weddingId]/bridal-team/page.tsx`
    - Create `app/dashboard/[weddingId]/bridal-team/bridal-team-client.tsx`
    - Implement role-based organization and statistics
    - Add contact management and task assignment features
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 5.2 Create bridal team modal components
    - Create `components/bridal-team/bridal-team-modals.tsx`
    - Implement Add/Edit member modals with role selection
    - Add invitation status management and contact forms
    - Include delete confirmation with proper soft-delete handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.4, 6.6_

  - [x] 5.3 Create API routes for bridal team management
    - Create `app/api/weddings/[id]/bridal-team/route.ts`
    - Create `app/api/weddings/[id]/bridal-team/[memberId]/route.ts`
    - Implement CRUD operations with proper validation
    - Add invitation and status update endpoints
    - _Requirements: 3.5, 3.6_

  - [ ]* 5.4 Write unit tests for bridal team functionality
    - Test member management workflows
    - Test role assignment and invitation processes
    - Test contact management integration
    - _Requirements: 3.5, 3.6_

- [x] 6. Checkpoint - Ensure core modules are functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement missing risk-alerts module
  - [x] 7.1 Create risk alerts page and client component
    - Create `app/dashboard/[weddingId]/risk-alerts/page.tsx`
    - Create `app/dashboard/[weddingId]/risk-alerts/risk-alerts-client.tsx`
    - Implement severity-based filtering and categorization
    - Add alert status management and assignment features
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 7.2 Create risk alerts modal components
    - Create `components/risk-alerts/risk-alert-modals.tsx`
    - Implement Add/Edit alert modals with severity and category selection
    - Add resolution tracking and assignment workflows
    - Include delete confirmation and status update dialogs
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [x] 7.3 Create event-specific risk alerts page
    - Create `app/dashboard/[weddingId]/events/[eventId]/risk-alerts/page.tsx`
    - Create `app/dashboard/[weddingId]/events/[eventId]/risk-alerts/risk-alerts-client.tsx`
    - Ensure functional equivalence with wedding-wide view
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.4 Create API routes for risk alerts management
    - Create `app/api/weddings/[id]/risk-alerts/route.ts`
    - Create `app/api/weddings/[id]/risk-alerts/[alertId]/route.ts`
    - Implement CRUD operations with proper validation
    - Add status update and assignment endpoints
    - _Requirements: 3.5, 3.6_

  - [ ]* 7.5 Write unit tests for risk alerts functionality
    - Test alert creation and severity management
    - Test status workflows and assignment processes
    - Test event filtering and categorization
    - _Requirements: 3.5, 3.6_

- [x] 8. Implement missing analytics module
  - [x] 8.1 Create analytics page and client component
    - Create `app/dashboard/[weddingId]/analytics/page.tsx`
    - Create `app/dashboard/[weddingId]/analytics/analytics-client.tsx`
    - Implement comprehensive metrics dashboard with charts
    - Add period selection and trend analysis features
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 8.2 Create analytics components and charts
    - Create `components/analytics/analytics-charts.tsx`
    - Implement budget, task, guest, and vendor metrics visualization
    - Add trend analysis and insight generation components
    - Include responsive chart layouts and data export features
    - _Requirements: 1.4, 1.5_

  - [x] 8.3 Create event-specific analytics page
    - Create `app/dashboard/[weddingId]/events/[eventId]/analytics/page.tsx`
    - Create `app/dashboard/[weddingId]/events/[eventId]/analytics/analytics-client.tsx`
    - Ensure data consistency and functional equivalence
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.4 Create API routes for analytics data
    - Create `app/api/weddings/[id]/analytics/route.ts`
    - Implement metrics calculation and aggregation endpoints
    - Add trend analysis and insight generation logic
    - Include proper caching and performance optimization
    - _Requirements: 3.5, 3.6_

  - [ ]* 8.5 Write unit tests for analytics functionality
    - Test metrics calculation accuracy
    - Test chart rendering and data visualization
    - Test period filtering and trend analysis
    - _Requirements: 3.5, 3.6_

- [x] 9. Standardize existing modules with gold standard patterns
  - [x] 9.1 Update budget module to follow gold standard pattern
    - Refactor `budget-client.tsx` to match checklist module structure
    - Standardize header layout, statistics cards, and filtering
    - Ensure consistent modal patterns and error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 9.2 Update guests module to follow gold standard pattern
    - Refactor `guests-client.tsx` to match checklist module structure
    - Standardize RSVP statistics and filtering patterns
    - Ensure consistent modal workflows and confirmation dialogs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 9.3 Update vendors module to follow gold standard pattern
    - Refactor `vendors-client.tsx` to match checklist module structure
    - Standardize vendor statistics and category filtering
    - Ensure consistent modal patterns and delete confirmations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 9.4 Update schedule module while preserving existing patterns
    - Maintain current sub-tab functionality (Program, Contacts)
    - Standardize header layout and filtering patterns
    - Ensure template integration follows consistent patterns
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.5 Write property tests for module pattern consistency
    - **Property 4: Module Completeness**
    - **Validates: Requirements 3.2, 3.5, 3.6**

- [x] 10. Implement module synchronization and access path equivalence
  - [x] 10.1 Create event profile quick actions integration
    - Update `event-profile-client.tsx` to include all module quick actions
    - Ensure quick actions provide identical functionality to sidebar navigation
    - Implement consistent navigation patterns and state management
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 10.2 Standardize URL patterns across all modules
    - Ensure all wedding-wide modules follow `/dashboard/[weddingId]/[module]` pattern
    - Ensure all event-specific modules follow `/dashboard/[weddingId]/events/[eventId]/[module]` pattern
    - Update navigation components to use consistent URL generation
    - _Requirements: 4.4, 10.1_

  - [x] 10.3 Implement consistent state management and cache invalidation
    - Update all modules to use consistent TanStack Query patterns
    - Implement proper cache invalidation after mutations across modules
    - Ensure offline sync operations work consistently across all modules
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [ ]* 10.4 Write property tests for access path equivalence
    - **Property 5: Access Path Functional Equivalence**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

  - [ ]* 10.5 Write property tests for URL pattern consistency
    - **Property 6: URL Pattern Consistency**
    - **Validates: Requirements 4.4, 10.1**

- [x] 11. Implement standardized modal and confirmation systems
  - [x] 11.1 Update all modules to use standardized modal patterns
    - Replace existing modals with `StandardModal` component
    - Ensure consistent form layouts, validation, and submission patterns
    - Implement proper loading states and error handling across all modals
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 11.2 Implement delete confirmation dialogs across all modules
    - Add `ConfirmationDialog` to all delete operations
    - Ensure consistent confirmation messaging and consequences display
    - Implement proper loading states and success/error feedback
    - Handle soft-delete operations with deletedAt pattern
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 11.3 Write property tests for modal system consistency
    - **Property 7: Modal System Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [ ]* 11.4 Write property tests for delete confirmation workflow
    - **Property 8: Delete Confirmation Workflow**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

- [x] 12. Implement consistent navigation and state management
  - [x] 12.1 Update navigation components for consistent highlighting
    - Update `EventTabs` component to highlight active tabs correctly
    - Update sidebar navigation to highlight active sections properly
    - Ensure breadcrumb navigation is consistent across all modules
    - _Requirements: 10.3, 10.4, 10.5_

  - [x] 12.2 Implement context and filter state preservation
    - Preserve appropriate context when navigating between modules
    - Maintain filter states where appropriate across navigation
    - Handle deep linking and browser back/forward navigation consistently
    - _Requirements: 10.2, 10.6_

  - [x] 12.3 Standardize loading and error states across all modules
    - Implement consistent loading state patterns using shared components
    - Ensure uniform error handling and user feedback across modules
    - Add proper retry mechanisms and error recovery strategies
    - _Requirements: 8.4, 9.5_

  - [ ]* 12.4 Write property tests for navigation state management
    - **Property 12: Navigation State Management**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**

  - [ ]* 12.5 Write property tests for error handling uniformity
    - **Property 11: Error Handling Uniformity**
    - **Validates: Requirements 8.4, 9.5**

- [x] 13. Final integration and testing
  - [x] 13.1 Implement comprehensive cache invalidation patterns
    - Ensure data mutations properly invalidate related queries across modules
    - Test offline sync operations work consistently across all modules
    - Verify circuit breaker patterns work correctly for sync failures
    - _Requirements: 8.2, 8.3, 8.6_

  - [x] 13.2 Verify schedule module pattern preservation
    - Ensure schedule module maintains existing functionality
    - Verify sub-tab functionality (Program, Contacts) works correctly
    - Test template integration follows consistent patterns
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 13.3 Write property tests for cache invalidation consistency
    - **Property 10: Cache Invalidation Consistency**
    - **Validates: Requirements 8.2, 8.3, 8.6**

  - [ ]* 13.4 Write property tests for schedule module pattern preservation
    - **Property 9: Schedule Module Pattern Preservation**
    - **Validates: Requirements 7.3, 7.4, 7.5**

- [x] 14. Final checkpoint - Complete system verification
  - Ensure all tests pass, verify all modules are functional and consistent
  - Test navigation between all modules works correctly
  - Verify data synchronization works across all access paths
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties across all modules
- Unit tests validate specific examples and edge cases for each module
- The refactor maintains backward compatibility while establishing new patterns
- All modules follow the gold standard pattern established by the checklist module
- Budget arithmetic corrections ensure proper numeric calculations throughout
- Missing modules are implemented with full functionality and API integration
- Modal and confirmation systems provide consistent user experience
- Navigation and state management ensure predictable application behavior