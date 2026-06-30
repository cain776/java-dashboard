package com.bviit.analytics.surgery.dto;

import java.util.List;

/**
 * 수술별 비중 일별 월별 확정/누적 스냅샷 — JSON 파일로 저장(월별 1개).
 *
 * OPERATIONDATA/Cataract_Operationdata는 시점마다 소급 변동할 수 있어, 한 번 적재한 날짜는
 * 동결(보존)하고 진행 중인 달은 전일(D-1)까지만 누적해 "흔들리지 않는" 일별 표를 만든다.
 * 예약통계시스템 스냅샷(ReservationStatsSnapshot)과 동일한 규약을 따른다.
 */
public record SurgerySnapshot(
        String period,        // YYYY-MM
        String confirmedAt,   // ISO-8601 (저장 시각)
        String confirmedBy,   // 적재한 사용자 로그인 ID (자동 채움은 "auto")
        boolean locked,       // true면 재집계(덮어쓰기) 금지 — 현재는 미사용(확장 대비)
        List<SurgeryDailyItem> days,
        int schemaVersion     // 스냅샷 JSON 구조 버전
) {
    public static final int CURRENT_SCHEMA_VERSION = 1;

    public SurgerySnapshot {
        if (schemaVersion == 0) {
            schemaVersion = CURRENT_SCHEMA_VERSION;
        }
        days = List.copyOf(days);
    }

    public SurgerySnapshot(
            String period,
            String confirmedAt,
            String confirmedBy,
            boolean locked,
            List<SurgeryDailyItem> days
    ) {
        this(period, confirmedAt, confirmedBy, locked, days, CURRENT_SCHEMA_VERSION);
    }
}
