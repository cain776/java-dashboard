package com.bviit.analytics.reservation.dto;

import java.util.List;

/**
 * 운영 parity 검증 응답.
 *
 * 같은 월/필드에서 daily SQL 집계값과 drill-down SQL row 합계가 같은지 확인한다.
 */
public record ReservationStatsParityResponse(
        String period,
        String field,
        String label,
        String liveFrom,
        String liveTo,
        int mismatchCount,
        List<ReservationStatsParityItem> items
) {
    public ReservationStatsParityResponse {
        items = List.copyOf(items);
    }
}
