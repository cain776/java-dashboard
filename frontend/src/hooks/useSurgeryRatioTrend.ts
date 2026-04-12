import { useQuery } from '@tanstack/react-query'
import { statsApi, type SurgeryMonthlyItem } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useSurgeryRatioTrend(years: number[]) {
  const source = useDataSourceStore((state) => state.source)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-ratio-trend', years, source],
    queryFn: () => statsApi.getSurgeryRatio(years),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
