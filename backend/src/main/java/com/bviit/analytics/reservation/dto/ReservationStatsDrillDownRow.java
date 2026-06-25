package com.bviit.analytics.reservation.dto;

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
        String custNum,
        String reserveNum,
        String reserveState,
        String exclusionReasonCandidate,
        Integer contribution
) {
    public ReservationStatsDrillDownRow(
            String date,
            String field,
            String source,
            String gb,
            String gb2,
            String primaryKey,
            Integer contribution
    ) {
        this(date, field, source, gb, gb2, primaryKey, null, null, null, null, contribution);
    }
}
