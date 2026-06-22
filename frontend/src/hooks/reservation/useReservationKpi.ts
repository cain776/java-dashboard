import { useQuery } from '@tanstack/react-query'
import { reservationApi } from '@/api/reservation'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useReservationKpi(queryYears: number[]) {
  const source = useDataSourceStore((s) => s.source)
  const isMock = source === 'mock'

  return useQuery({
    queryKey: ['reservation-kpi', queryYears, source],
    queryFn: () => reservationApi.getReservationKpi(queryYears, isMock),
  })
}
