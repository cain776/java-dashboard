import { create } from 'zustand'

type DataSource = 'mock' | 'real'

interface DataSourceState {
  source: DataSource
  toggle: () => void
}

/** 운영 빌드에서는 항상 real, 개발에서만 토글 허용 */
const isDev = import.meta.env.DEV
const stored = isDev && typeof window !== 'undefined' ? localStorage.getItem('data-source') : null

export const useDataSourceStore = create<DataSourceState>((set) => ({
  source: isDev ? ((stored === 'real' ? 'real' : 'mock') as DataSource) : 'real',
  toggle: () => {
    if (!isDev) return
    set((state) => {
      const next: DataSource = state.source === 'mock' ? 'real' : 'mock'
      localStorage.setItem('data-source', next)
      return { source: next }
    })
  },
}))
