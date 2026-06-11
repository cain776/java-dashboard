import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi, type ExaminationMonthlyItem } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

interface MonthlyData {
  visionCorrection: number
  dreamlens: number
  examTotal: number
}

const EMPTY: MonthlyData = {
  visionCorrection: 0,
  dreamlens: 0,
  examTotal: 0,
}

function toDataMap(items: ExaminationMonthlyItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      visionCorrection: item.visionCorrection,
      dreamlens: item.dreamlens,
      examTotal: item.examTotal ?? item.visionCorrection + item.dreamlens,
    }
  }
  return map
}

export function useExaminationComposition(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['examination-composition', years, source],
    queryFn: () => statsApi.getExaminationComposition(years, isMock),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
