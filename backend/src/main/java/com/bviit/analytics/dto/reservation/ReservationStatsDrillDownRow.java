package com.bviit.analytics.dto.reservation;

/**
 * 예약통계 진단용 원천 row 후보.
 */
public record ReservationStatsDrillDownRow(
        String date,
        String field,
        String source,
        String gb,
        String gb2,
        String primaryKey,
        Integer contribution
) {
}
