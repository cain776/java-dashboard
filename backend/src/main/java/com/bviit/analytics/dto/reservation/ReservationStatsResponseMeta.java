package com.bviit.analytics.dto.reservation;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 예약통계 API 응답 메타데이터.
 *
 * 숫자 자체와 별개로, 어떤 출처/스키마/공식 버전에서 온 응답인지 명시한다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReservationStatsResponseMeta(
        Source source,
        String period,
        Integer schemaVersion,
        String formulaVersion,
        Boolean locked,
        String confirmedAt,
        String confirmedBy
) {
    public enum Source {
        SNAPSHOT,
        LIVE,
        UNAVAILABLE
    }

    public static ReservationStatsResponseMeta snapshot(
            String period,
            String formulaVersion,
            boolean locked,
            String confirmedAt,
            String confirmedBy,
            int schemaVersion
    ) {
        return new ReservationStatsResponseMeta(
                Source.SNAPSHOT,
                period,
                schemaVersion,
                formulaVersion,
                locked,
                confirmedAt,
                confirmedBy
        );
    }

    public static ReservationStatsResponseMeta live(String period, String formulaVersion, int schemaVersion) {
        return new ReservationStatsResponseMeta(
                Source.LIVE,
                period,
                schemaVersion,
                formulaVersion,
                false,
                null,
                null
        );
    }

    public static ReservationStatsResponseMeta unavailable(String period, String formulaVersion, int schemaVersion) {
        return new ReservationStatsResponseMeta(
                Source.UNAVAILABLE,
                period,
                schemaVersion,
                formulaVersion,
                null,
                null,
                null
        );
    }
}
