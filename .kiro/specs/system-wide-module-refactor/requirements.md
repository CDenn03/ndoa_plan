# Requirements Document

## Introduction

This document outlines the requirements for a comprehensive system-wide refactor of the wedding planning platform to ensure proper organization, SOLID/DRY principles, and module synchronization. The refactor addresses critical issues with module consistency, missing implementations, calculation errors, and user experience inconsistencies across the platform.

## Glossary

- **Module**: A functional area of the wedding planning platform (e.g., tasks, budget, schedule, guests)
- **Event_Profile**: The overview page accessed via `/events/[eventId]/profile` showing event analytics and quick actions
- **Sidebar_Navigation**: The left navigation panel providing access to wedding-wide features
- **Event_Tabs**: The tabbed navigation within event-specific pages
- **Gold_Standard_Pattern**: The task module implementation that serves as the reference for consistent patterns
- **Template_System**: The existing system for quickly populating modules with pre-defined data
- **Sync_Engine**: The offline-first synchronization system using Dexie and TanStack Query
- **Budget_Calculation**: Server-computed arithmetic operations for budget line actuals
- **Modal_Pattern**: Standardized popup dialogs for add/edit operations
- **Confirmation_Dialog**: User confirmation prompts for destructive actions

## Requirements

### Requirement 1: Module Pattern Standardization

**User Story:** As a developer, I want all modules to follow consistent implementation patterns, so that the codebase is maintainable and user experience is uniform.

#### Acceptance Criteria

1. THE Task_Module SHALL serve as the gold standard pattern for all other modules
2. WHEN implementing any module, THE System SHALL follow the task module's structure for page.tsx and client component organization
3. THE System SHALL use consistent naming conventions: `[module]-client.tsx` for client components
4. WHEN displaying data lists, THE System SHALL use consistent card layouts, filtering, and search patterns
5. THE System SHALL implement consistent statistics cards with icons, labels, and formatting
6. WHEN handling state management, THE System SHALL use consistent patterns with useState, useMemo, and TanStack Query

### Requirement 2: Budget Module Arithmetic Corrections

**User Story:** As a user, I want budget calculations to be mathematically accurate, so that financial tracking is reliable.

#### Acceptance Criteria

1. THE Budget_Module SHALL perform proper arithmetic calculations instead of string concatenation
2. WHEN calculating budget totals, THE System SHALL use numeric addition operations
3. THE System SHALL ensure all budget values are properly typed as numbers
4. WHEN displaying currency values, THE System SHALL use consistent formatting with Intl.NumberFormat
5. THE Budget_Calculation SHALL be server-computed for BudgetLine.actual values
6. THE System SHALL sanitize numeric values from Dexie with `Number(x) || 0` to prevent NaN errors

### Requirement 3: Missing Module Implementation

**User Story:** As a user, I want all navigation tabs to lead to functional pages, so that I can access all promised features.

#### Acceptance Criteria

1. THE System SHALL implement missing modules: appointments, contributions, bridal-team, risk-alerts, analytics
2. WHEN a user clicks any tab in Event_Tabs, THE System SHALL display a functional page
3. THE System SHALL create page.tsx and client component files for each missing module
4. WHEN implementing new modules, THE System SHALL follow the Gold_Standard_Pattern
5. THE System SHALL ensure all modules have proper API route integration
6. THE System SHALL implement proper loading states and error handling for all modules

### Requirement 4: Module Synchronization Consistency

**User Story:** As a user, I want modules accessed through event profile and sidebar to behave identically, so that the interface is predictable.

#### Acceptance Criteria

1. WHEN accessing a module via Event_Profile quick actions, THE System SHALL provide identical functionality to Sidebar_Navigation access
2. THE System SHALL ensure data consistency between event-specific and wedding-wide module views
3. WHEN filtering by event in wedding-wide views, THE System SHALL show identical data to event-specific views
4. THE System SHALL maintain consistent URL patterns and navigation behavior
5. THE System SHALL synchronize state between different access paths to the same module

### Requirement 5: Modal and Add Button Standardization

**User Story:** As a user, I want consistent add buttons and modal dialogs across all modules, so that the interface is intuitive.

#### Acceptance Criteria

1. THE System SHALL implement consistent "Add [Item]" buttons in all module headers
2. WHEN displaying add buttons, THE System SHALL use consistent styling with Plus icon and primary button variant
3. THE System SHALL implement standardized Modal_Pattern for all add/edit operations
4. WHEN showing modals, THE System SHALL use consistent form layouts, validation, and submission patterns
5. THE System SHALL ensure all modals have proper loading states and error handling
6. THE Template_System integration SHALL follow consistent patterns across all applicable modules

### Requirement 6: Delete Confirmation Implementation

**User Story:** As a user, I want confirmation dialogs for all delete actions, so that I don't accidentally lose important data.

#### Acceptance Criteria

1. WHEN a user attempts to delete any item, THE System SHALL display a Confirmation_Dialog
2. THE Confirmation_Dialog SHALL clearly state what will be deleted and any consequences
3. THE System SHALL require explicit user confirmation before proceeding with deletion
4. WHEN confirming deletion, THE System SHALL show loading state and success/error feedback
5. THE System SHALL implement consistent confirmation dialog styling and behavior
6. THE System SHALL handle soft-delete operations according to the existing deletedAt pattern

### Requirement 7: Schedule Module Pattern Consistency

**User Story:** As a developer, I want the schedule module to maintain its existing pattern while ensuring consistency with other modules, so that proven functionality is preserved.

#### Acceptance Criteria

1. THE Schedule_Module SHALL retain its current implementation pattern as a reference
2. WHEN other modules need similar functionality, THE System SHALL adapt schedule patterns appropriately
3. THE System SHALL ensure schedule module follows consistent header, filtering, and display patterns
4. THE Schedule_Module SHALL maintain its sub-tab functionality (Program, Contacts) as a pattern for other complex modules
5. THE System SHALL ensure schedule module integrates properly with the Template_System

### Requirement 8: State Management Synchronization

**User Story:** As a user, I want consistent data across all views and modules, so that information is always accurate and up-to-date.

#### Acceptance Criteria

1. THE System SHALL use consistent TanStack Query patterns for data fetching across all modules
2. WHEN data changes in one module, THE System SHALL invalidate related queries in other modules
3. THE Sync_Engine SHALL handle offline operations consistently across all modules
4. THE System SHALL maintain consistent loading and error states across all modules
5. WHEN using Zustand store, THE System SHALL follow consistent patterns for filter states and UI preferences
6. THE System SHALL ensure proper cache invalidation after mutations

### Requirement 9: SOLID and DRY Principle Compliance

**User Story:** As a developer, I want the codebase to follow SOLID and DRY principles, so that it is maintainable and extensible.

#### Acceptance Criteria

1. THE System SHALL eliminate code duplication by extracting common patterns into reusable components
2. WHEN implementing similar functionality, THE System SHALL use shared utilities and hooks
3. THE System SHALL follow Single Responsibility Principle with focused component functions
4. THE System SHALL use dependency injection patterns for API calls and data operations
5. THE System SHALL implement consistent error handling and loading patterns across modules
6. THE System SHALL extract common business logic into shared utility functions

### Requirement 10: Navigation and URL Consistency

**User Story:** As a user, I want consistent navigation patterns and URLs across all modules, so that the application is predictable.

#### Acceptance Criteria

1. THE System SHALL maintain consistent URL patterns: `/dashboard/[weddingId]/[module]` for wedding-wide and `/dashboard/[weddingId]/events/[eventId]/[module]` for event-specific
2. WHEN navigating between modules, THE System SHALL preserve context and filter states where appropriate
3. THE System SHALL ensure breadcrumb navigation is consistent across all modules
4. THE Event_Tabs navigation SHALL highlight the active tab correctly for all modules
5. THE Sidebar_Navigation SHALL highlight active sections correctly for all access patterns
6. THE System SHALL handle deep linking and browser back/forward navigation consistently
