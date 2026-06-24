import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationStatsCataractApi } from '@/api/reservation/reservationStatsCataract'

/**
 * 예약통계_백내장 일자별 카운트 조회 훅. from~to(등록일) 범위로 서버 조회.
 * 라이브 소스가 없어 스냅샷 미존재 시 503 → isError → 페이지가 시드로 폴백한다(재시도 없음).
 */
export function useReservationStatsCataract(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reservation-stats-cataract', from, to],
    queryFn: () => reservationStatsCataractApi.getDailyCounts(from, to),
    enabled: enabled && Boolean(from && to),
    retry: false, // 503(미연결)은 재시도해도 동일 → 즉시 시드 폴백
  })

  return { dailies: data, isLoading, isFetching, isError }
}

/**
 * 확정 스냅샷 목록 조회 + 호출(증분 채움) 뮤테이션.
 * 호출은 라이브(mssql)로 D-1까지 비어있는 날짜만 적재 — 성공 시 스냅샷·통계 쿼리 무효화로 즉시 갱신.
 */
export function useReservationStatsCataractSnapshots() {
  const qc = useQueryClient()

  const { data: snapshots = [] } = useQuery({
    queryKey: ['reservation-stats-cataract-snapshots'],
    queryFn: () => reservationStatsCataractApi.getSnapshots(),
  })

  const fill = useMutation({
    mutationFn: (period: string) => reservationStatsCataractApi.fillSnapshot(period),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservation-stats-cataract-snapshots'] })
      qc.invalidateQueries({ queryKey: ['reservation-stats-cataract'] })
    },
  })

  return {
    snapshots,
    isConfirmed: (period: string) => snapshots.some((s) => s.period === period),
    /** PDF 고정 스냅샷 — 재확정(덮어쓰기)·호출 금지. */
    isLocked: (period: string) => snapshots.some((s) => s.period === period && s.locked),
    fillSnapshot: fill.mutateAsync,
    isFilling: fill.isPending,
  }
}
