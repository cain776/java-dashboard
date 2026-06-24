import { useQuery } from '@tanstack/react-query'
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
 * 확정 스냅샷 목록 조회 — "확정됨"·"PDF 고정" 뱃지 표시용.
 * (백내장은 라이브 소스가 없어 확정 저장/호출은 지원하지 않는다 — PDF 스냅샷 JSON으로 채운다.)
 */
export function useReservationStatsCataractSnapshots() {
  const { data: snapshots = [] } = useQuery({
    queryKey: ['reservation-stats-cataract-snapshots'],
    queryFn: () => reservationStatsCataractApi.getSnapshots(),
  })

  return {
    snapshots,
    isConfirmed: (period: string) => snapshots.some((s) => s.period === period),
    /** PDF 고정 스냅샷 — 재확정(덮어쓰기) 금지. */
    isLocked: (period: string) => snapshots.some((s) => s.period === period && s.locked),
  }
}
