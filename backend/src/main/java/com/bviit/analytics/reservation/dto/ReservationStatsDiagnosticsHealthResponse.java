package com.bviit.analytics.reservation.dto;

import com.bviit.analytics.common.stats.StatsResponseMeta;

/**
 * 예약통계 진단 API의 운영 상태.
 *
 * 숫자를 조회하기 전에 현재 월이 스냅샷으로 고정되어 있는지, 라이브 MSSQL/진단 서비스가
 * 붙어 있는지 확인하는 가벼운 점검 응답이다.
 */
public record ReservationStatsDiagnosticsHealthResponse(
        String period,
        String statsType,
        StatsResponseMeta.Source currentSource,
        boolean liveServiceAvailable,
        boolean diagnosticServiceAvailable,
        boolean snapshotExists,
        boolean snapshotLocked,
        Integer schemaVersion,
        Integer dayCount,
        String latestDate,
        String confirmedAt,
        String confirmedBy,
        String formulaVersion,
        String checkedAt
) {
}
