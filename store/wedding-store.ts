import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WeddingStore {
  // Active wedding
  activeWeddingId: string | null
  setActiveWeddingId: (id: string | null) => void

  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Offline / sync
  isOffline: boolean
  setIsOffline: (v: boolean) => void
  syncCircuitOpen: boolean
  setSyncCircuitOpen: (v: boolean) => void
  pendingOpsCount: number
  setPendingOpsCount: (n: number) => void

  // Guest filters
  guestFilter: { search: string; rsvpStatus: string; side: string; table: string }
  setGuestFilter: (f: Partial<WeddingStore['guestFilter']>) => void

  // Vendor filters
  vendorFilter: { search: string; category: string; status: string }
  setVendorFilter: (f: Partial<WeddingStore['vendorFilter']>) => void

  // Timeline view
  timelineView: 'list' | 'timeline'
  setTimelineView: (v: 'list' | 'timeline') => void

  // Budget view
  budgetView: 'summary' | 'breakdown' | 'payments'
  setBudgetView: (v: 'summary' | 'breakdown' | 'payments') => void
}

export const useWeddingStore = create<WeddingStore>()(
  persist(
    (set) => ({
      activeWeddingId: null,
      setActiveWeddingId: (id) => set({ activeWeddingId: id }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      isOffline: false,
      setIsOffline: (v) => set({ isOffline: v }),
      syncCircuitOpen: false,
      setSyncCircuitOpen: (v) => set({ syncCircuitOpen: v }),
      pendingOpsCount: 0,
      setPendingOpsCount: (n) => set({ pendingOpsCount: n }),

      guestFilter: { search: '', rsvpStatus: 'all', side: 'all', table: 'all' },
      setGuestFilter: (f) => set((s) => ({ guestFilter: { ...s.guestFilter, ...f } })),

      vendorFilter: { search: '', category: 'all', status: 'all' },
      setVendorFilter: (f) => set((s) => ({ vendorFilter: { ...s.vendorFilter, ...f } })),

      timelineView: 'timeline',
      setTimelineView: (v) => set({ timelineView: v }),

      budgetView: 'summary',
      setBudgetView: (v) => set({ budgetView: v }),
    }),
    {
      name: 'wedding-platform-ui',
      partialize: (s) => ({
        activeWeddingId: s.activeWeddingId,
        sidebarOpen: s.sidebarOpen,
        timelineView: s.timelineView,
        budgetView: s.budgetView,
      }),
    }
  )
)
