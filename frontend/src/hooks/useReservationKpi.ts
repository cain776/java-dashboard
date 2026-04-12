import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useReservationKpi(queryYears: number[]) {
  const source = useDataSourceStore((s) => s.source)
  const isMock = source === 'mock'

  return useQuery({
    queryKey: ['reservation-kpi', queryYears, source],
    queryFn: () => statsApi.getReservationKpi(queryYears, isMock),
  })
}
