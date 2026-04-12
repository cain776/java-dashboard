import { create } from 'zustand'

type DataSource = 'mock' | 'real'

interface DataSourceState {
  source: DataSource
  toggle: () => void
}

const stored = typeof window !== 'undefined' ? localStorage.getItem('data-source') : null

export const useDataSourceStore = create<DataSourceState>((set) => ({
  source: (stored === 'real' ? 'real' : 'mock') as DataSource,
  toggle: () =>
    set((state) => {
      const next: DataSource = state.source === 'mock' ? 'real' : 'mock'
      localStorage.setItem('data-source', next)
      return { source: next }
    }),
}))
