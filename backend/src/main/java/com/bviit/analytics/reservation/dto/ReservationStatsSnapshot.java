package com.bviit.analytics.reservation.dto;

import java.util.List;

/**
 * 예약통계시스템 월별 확정 스냅샷 — JSON 파일로 저장(월별 1개).
 *
 * 무거운 BCRM RSS 쿼리를 확정(마감) 시 1회만 돌려 일자별 원시 카운트를 동결한다.
 * 과거 월도 라이브로 재집계하면 소급 변동(EXAM 덮어쓰기·RESERVE_STATE 사후변경)이 있어,
 * 확정 시점 스냅샷으로 고정해 신뢰성과 속도를 함께 확보한다.
 *
 * locked: PDF(골든와이즈 RSS) 등 외부 원본을 옮긴 고정 스냅샷. 라이브 쿼리는 채널 분해가
 * 프록시라 원본과 정확히 일치하지 않으므로, locked=true면 재확정(덮어쓰기)을 거부한다.
 */
public record ReservationStatsSnapshot(
        String period,        // YYYY-MM
        String confirmedAt,   // ISO-8601 (저장 시각)
        String confirmedBy,   // 확정한 사용자 로그인 ID
        boolean locked,       // true면 재확정(라이브 덮어쓰기) 금지
        List<ReservationStatsDailyRow> days,
        int schemaVersion     // 스냅샷 JSON 구조 버전
) {
    public static final int CURRENT_SCHEMA_VERSION = 1;

    public ReservationStatsSnapshot {
        if (schemaVersion == 0) {
            schemaVersion = CURRENT_SCHEMA_VERSION;
        }
        days = List.copyOf(days);
    }

    public ReservationStatsSnapshot(
            String period,
            String confirmedAt,
            String confirmedBy,
            boolean locked,
            List<ReservationStatsDailyRow> days
    ) {
        this(period, confirmedAt, confirmedBy, locked, days, CURRENT_SCHEMA_VERSION);
    }
}
