package com.bviit.analytics.dto.reservation;

import java.util.List;

/**
 * 특정 날짜/필드 diff의 원천 row 후보 응답.
 */
public record ReservationStatsDrillDownResponse(
        String period,
        String date,
        String field,
        boolean snapshotExists,
        Integer snapshotValue,
        Integer liveValue,
        Integer delta,
        int rowCount,
        List<ReservationStatsDrillDownRow> rows
) {
    public ReservationStatsDrillDownResponse {
        rows = List.copyOf(rows);
        rowCount = rows.size();
    }
}
