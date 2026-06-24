package com.bviit.analytics.dto.reservation;

/**
 * daily 집계값과 drill-down row 기여도 합계의 일자별 parity 결과.
 */
public record ReservationStatsParityItem(
        String date,
        String field,
        String label,
        Integer dailyValue,
        Integer drillDownValue,
        Integer delta,
        int rowCount
) {
}
