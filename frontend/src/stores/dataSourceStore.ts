import { create } from 'zustand'

type DataSource = 'mock' | 'real'

interface DataSourceState {
  source: DataSource
  toggle: () => void
}

/** 데이터소스는 항상 real로 고정한다. */
export const useDataSourceStore = create<DataSourceState>(() => ({
  source: 'real',
  toggle: () => {},
}))
