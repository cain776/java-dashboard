import { useQuery } from '@tanstack/react-query'
import { consultationApi } from '@/api/consultation'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useConsultationRateKpi(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consultation-rate-kpi', years, source],
    queryFn: () => consultationApi.getConsultationRateKpi(years, isMock),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
