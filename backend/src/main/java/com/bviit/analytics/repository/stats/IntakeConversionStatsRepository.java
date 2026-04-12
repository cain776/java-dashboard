package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 유입(검사예약) 통계 쿼리.
 *
 * 현재 DB에서 식별 가능한 유입 채널만 보수적으로 매핑한다.
 *   CTI    -> 인콜
 *   CRM    -> 아웃콜/CRM 직접 입력
 *   KAKAO  -> 카카오톡
 *   NAVER  -> 네이버
 *   ONLINE, APP -> 홈페이지
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 최신 함수 사용 금지.
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile("mssql")
public class IntakeConversionStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public IntakeConversionStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findMonthlyStats(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String sql = """
            SELECT
                YEAR(r.RESERVE_DATE) AS yr,
                MONTH(r.RESERVE_DATE) AS mo,
                SUM(CASE WHEN RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'CTI' THEN 1 ELSE 0 END) AS incall,
                SUM(CASE WHEN RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'CRM' THEN 1 ELSE 0 END) AS outcall,
                SUM(CASE WHEN RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'KAKAO' THEN 1 ELSE 0 END) AS kakao,
                SUM(CASE WHEN RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'NAVER' THEN 1 ELSE 0 END) AS naver,
                SUM(CASE WHEN RTRIM(ISNULL(r.RESERVE_PATH, '')) IN ('ONLINE', 'APP') THEN 1 ELSE 0 END) AS homepage
            FROM RESERVATION r
            WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
                AND r.RESERVE_STATE <> 'C'
                AND r.RESERVE_FLAG IN ('M', 'H', 'D', 'F')
            GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            ORDER BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            """;

        return jdbc.queryForList(sql, params);
    }
}
