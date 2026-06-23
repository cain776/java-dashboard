import { useQuery } from '@tanstack/react-query'
import { examListApi, type ExamListItem } from '@/api/exam/examList'
import { EXAM_LIST_MOCK } from '@/data/examListData'
import { useDataSourceStore } from '@/stores/dataSourceStore'

/**
 * 검사자 리스트 조회 훅. 검사일 범위(from~to)로 서버 조회.
 * 진료구분·검색 필터는 페이지에서 클라이언트 사이드로 적용한다.
 */
export function useExamList(from: string, to: string, enabled = true) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['exam-list', from, to, source],
    queryFn: async () => {
      if (isMock) {
        return EXAM_LIST_MOCK
          .filter((row) => row.examDate >= from && row.examDate <= to)
          .map((row) => ({
            ...row,
            patientType: row.examRegDate >= from && row.examRegDate <= to ? '신환' : '구환',
          }))
      }

      return examListApi.getExamList(from, to)
    },
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? (data ?? []) as ExamListItem[] : [],
    isLoading,
    isFetching,
    isError,
  }
}
