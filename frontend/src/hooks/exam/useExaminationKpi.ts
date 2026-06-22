import { useQuery } from '@tanstack/react-query'
import { examApi } from '@/api/exam'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function useExaminationKpi(years: number[]) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['examination-kpi', years, source],
    queryFn: () => examApi.getExaminationKpi(years, isMock),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
