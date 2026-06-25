package com.bviit.analytics.reservation.dto;

import java.util.List;

/**
 * 예약통계_백내장 월별 확정 스냅샷 — JSON 파일로 저장(월별 1개).
 *
 * 시력교정(ReservationStatsSnapshot)과 동일한 운영 방식. 확정(마감) 시 일자별 원시 카운트를
 * 동결해 소급 변동 없이 빠르게 조회한다.
 *
 * locked: PDF 등 외부 원본을 옮긴 고정 스냅샷이면 true — 재확정(라이브 덮어쓰기)을 거부한다.
 */
public record CataractStatsSnapshot(
        String period,        // YYYY-MM
        String confirmedAt,   // ISO-8601 (저장 시각)
        String confirmedBy,   // 확정한 사용자 로그인 ID
        boolean locked,       // true면 재확정(라이브 덮어쓰기) 금지
        List<CataractStatsDailyRow> days,
        int schemaVersion     // 스냅샷 JSON 구조 버전
) {
    public static final int CURRENT_SCHEMA_VERSION = 1;

    public CataractStatsSnapshot {
        if (schemaVersion == 0) {
            schemaVersion = CURRENT_SCHEMA_VERSION;
        }
        days = List.copyOf(days);
    }

    public CataractStatsSnapshot(
            String period,
            String confirmedAt,
            String confirmedBy,
            boolean locked,
            List<CataractStatsDailyRow> days
    ) {
        this(period, confirmedAt, confirmedBy, locked, days, CURRENT_SCHEMA_VERSION);
    }
}
