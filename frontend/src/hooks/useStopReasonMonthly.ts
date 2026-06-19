import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi, type StopReasonMonthlyItem } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

function toDataMap(items: StopReasonMonthlyItem[]): Record<number, (StopReasonMonthlyItem | null)[]> {
  const map: Record<number, (StopReasonMonthlyItem | null)[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => null)
    map[item.year][item.month - 1] = item
  }
  return map
}

export function useStopReasonMonthly(years: number[]) {
  const source = useDataSourceStore((state) => state.source)

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['stop-reason-monthly', years, source],
    queryFn: () => statsApi.getStopReasonMonthly(years),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return { dataMap, isLoading, isError }
}
