import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi, type SurgeryMonthlyItem } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

interface SurgeryData {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
}

const EMPTY: SurgeryData = {
  lasek: 0, lasik: 0, smile: 0, smilePro: 0,
  icl: 0, tIcl: 0, kpl: 0, tKpl: 0, viva: 0,
  catMulti: 0, catMono: 0, catEdof: 0,
}

function toDataMap(items: SurgeryMonthlyItem[]): Record<number, SurgeryData[]> {
  const map: Record<number, SurgeryData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      lasek: item.lasek, lasik: item.lasik, smile: item.smile, smilePro: item.smilePro,
      icl: item.icl, tIcl: item.tIcl, kpl: item.kpl, tKpl: item.tKpl, viva: item.viva,
      catMulti: item.catMulti, catMono: item.catMono, catEdof: item.catEdof,
    }
  }
  return map
}

export function useSurgeryComposition(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['surgery-composition', years, source],
    queryFn: () => statsApi.getSurgeryComposition(years, isMock),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
