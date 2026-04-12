import { useQuery } from '@tanstack/react-query'
import { statsApi, type SurgeryMonthlyItem } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useSurgeryKpi(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-kpi', years, source],
    queryFn: () => statsApi.getSurgeryKpi(years, isMock),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
