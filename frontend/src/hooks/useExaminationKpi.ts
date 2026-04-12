import { useQuery } from '@tanstack/react-query'
import { statsApi, type ExaminationMonthlyItem } from '@/api/stats'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useExaminationKpi(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['examination-kpi', years, source],
    queryFn: () => statsApi.getExaminationKpi(years, isMock),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
