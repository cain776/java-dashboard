import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useSurgeryRatioTrend(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-ratio-trend', years, source],
    queryFn: () => statsApi.getSurgeryRatio(years, isMock),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
