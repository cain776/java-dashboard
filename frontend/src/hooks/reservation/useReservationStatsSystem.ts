import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationStatsSystemApi } from '@/api/reservation/reservationStatsSystem'

/**
 * 예약통계시스템 일자별 카운트 조회 훅. from~to(등록일) 범위로 서버 조회.
 * 실 데이터 전용 — mssql 미연결(503) 시 isError → 페이지가 시드로 폴백한다(재시도 없음).
 */
export function useReservationStatsSystem(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reservation-stats-system', from, to],
    queryFn: () => reservationStatsSystemApi.getDailyCounts(from, to),
    enabled: enabled && Boolean(from && to),
    retry: false, // 503(미연결)은 재시도해도 동일 → 즉시 시드 폴백
  })

  return { dailies: data, isLoading, isFetching, isError }
}

/**
 * 확정 스냅샷 목록 조회 + 저장(확정) 뮤테이션.
 * 저장 성공 시 스냅샷 목록과 통계 데이터 쿼리를 무효화해 즉시 동결값으로 갱신한다.
 */
export function useReservationStatsSnapshots() {
  const qc = useQueryClient()

  const { data: snapshots = [] } = useQuery({
    queryKey: ['reservation-stats-snapshots'],
    queryFn: () => reservationStatsSystemApi.getSnapshots(),
  })

  const save = useMutation({
    mutationFn: (period: string) => reservationStatsSystemApi.saveSnapshot(period),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservation-stats-snapshots'] })
      qc.invalidateQueries({ queryKey: ['reservation-stats-system'] })
    },
  })

  return {
    snapshots,
    isConfirmed: (period: string) => snapshots.some((s) => s.period === period),
    /** PDF 고정 스냅샷(2026-01~05 등) — 재확정(덮어쓰기) 금지. */
    isLocked: (period: string) => snapshots.some((s) => s.period === period && s.locked),
    saveSnapshot: save.mutateAsync,
    isSaving: save.isPending,
  }
}
