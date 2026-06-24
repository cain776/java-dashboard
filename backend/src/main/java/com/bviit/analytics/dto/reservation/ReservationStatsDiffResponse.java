package com.bviit.analytics.dto.reservation;

import java.util.List;

/**
 * 예약통계 월별 진단 diff 응답.
 */
public record ReservationStatsDiffResponse(
        String period,
        boolean snapshotExists,
        String liveFrom,
        String liveTo,
        int diffCount,
        List<ReservationStatsDiffItem> diffs
) {
    public ReservationStatsDiffResponse {
        diffs = List.copyOf(diffs);
        diffCount = diffs.size();
    }
}
