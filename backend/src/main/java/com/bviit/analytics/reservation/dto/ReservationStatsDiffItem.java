package com.bviit.analytics.reservation.dto;

/**
 * 예약통계 스냅샷과 라이브 재조회 결과의 일자/필드 단위 차이.
 */
public record ReservationStatsDiffItem(
        String date,
        String field,
        String label,
        Integer snapshotValue,
        Integer liveValue,
        Integer delta
) {
}
