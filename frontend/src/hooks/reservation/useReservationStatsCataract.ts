import { useMutation, useQuery } from '@tanstack/react-query'
import { reservationStatsCataractApi } from '@/api/reservation/reservationStatsCataract'

/**
 * 예약통계_백내장 일자별 카운트 조회 훅. from~to(등록일) 범위로 서버 조회.
 * 서버 GET이 당월·미잠금이면 D-1까지 자동 증분 채움(조회=호출 통합). 미연결(503) 시 isError → 미연결 안내.
 * refetch로 같은 월 재조회 시 강제 갱신(서버 자동 채움 재평가).
 */
export function useReservationStatsCataract(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['reservation-stats-cataract', from, to],
    queryFn: () => reservationStatsCataractApi.getDailyCounts(from, to),
    enabled: enabled && Boolean(from && to),
    retry: false, // 503(미연결)은 재시도해도 동일 → 즉시 오류 상태
  })

  return { dailies: data, isLoading, isFetching, isError, refetch }
}

/** 스냅샷 vs 라이브 진단(diff) 뮤테이션. */
export function useReservationStatsCataractSnapshots() {
  const diff = useMutation({
    mutationFn: (period: string) => reservationStatsCataractApi.getDiff(period),
  })
  const drillDown = useMutation({
    mutationFn: ({ period, date, field }: { period: string; date: string; field: string }) =>
      reservationStatsCataractApi.getDrillDown(period, date, field),
  })

  return {
    getDiff: diff.mutateAsync,
    isDiffing: diff.isPending,
    getDrillDown: drillDown.mutateAsync,
    isDrillingDown: drillDown.isPending,
  }
}
