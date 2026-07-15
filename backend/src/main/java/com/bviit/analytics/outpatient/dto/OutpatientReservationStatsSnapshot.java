package com.bviit.analytics.outpatient.dto;

import java.util.List;

/**
 * 외래 예약통계 월별 확정 스냅샷 — JSON 파일로 저장(월별 1개).
 *
 * 예약통계_시력교정/백내장(ReservationStatsSnapshot/CataractStatsSnapshot)과 동일한 운영 방식.
 * 확정(마감) 시 일자별 원시 카운트를 동결해 소급 변동 없이 빠르게 조회한다.
 *
 * locked: RSS 등 외부 원본을 옮긴 고정 스냅샷이면 true — 재확정(라이브 덮어쓰기)을 거부한다.
 */
public record OutpatientReservationStatsSnapshot(
        String period,        // YYYY-MM
        String confirmedAt,   // ISO-8601 (저장 시각)
        String confirmedBy,   // 확정한 사용자 로그인 ID
        boolean locked,       // true면 재확정(라이브 덮어쓰기) 금지
        List<OutpatientReservationStatsDailyRow> days,
        int schemaVersion     // 스냅샷 JSON 구조 버전
) {
    public static final int CURRENT_SCHEMA_VERSION = 1;

    public OutpatientReservationStatsSnapshot {
        if (schemaVersion == 0) {
            schemaVersion = CURRENT_SCHEMA_VERSION;
        }
        days = List.copyOf(days);
    }

    public OutpatientReservationStatsSnapshot(
            String period,
            String confirmedAt,
            String confirmedBy,
            boolean locked,
            List<OutpatientReservationStatsDailyRow> days
    ) {
        this(period, confirmedAt, confirmedBy, locked, days, CURRENT_SCHEMA_VERSION);
    }
}
