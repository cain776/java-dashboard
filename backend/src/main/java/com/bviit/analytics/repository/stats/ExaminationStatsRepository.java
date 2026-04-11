package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 건수 통계 쿼리 (RESERVATION 기반).
 * "실제 실시"를 위해 RESERVE_STATE IN ('I','H') 로 필터.
 *   I = 접수/내원 (체크인)
 *   H = 수납/완료
 *
 * 분류: RESERVE_FLAG
 *   M = 시력교정 검사
 *   H = 백내장 검사
 *   D = 상담(드림렌즈)
 *   F = 외래
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
 *
 * 레거시 근거: softcrm/docs/db/sql-reference/통계_상담사.sql L82, L134, L169, L198
 *   (RESERVE_FLAG='M' AND RESERVE_STATE IN ('i','H') 패턴)
 */
@Repository
@Profile("mssql")
public class ExaminationStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ExaminationStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 연도 범위 내 월별 검사 건수.
     * 주의: 연도 파라미터는 [min, max] 범위로 조회 후 서비스에서 필요한 연도만 필터.
     */
    public List<Map<String, Object>> findMonthlyByType(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String sql = """
            SELECT
                YEAR(r.RESERVE_DATE) AS yr,
                MONTH(r.RESERVE_DATE) AS mo,
                SUM(CASE WHEN r.RESERVE_FLAG = 'M' THEN 1 ELSE 0 END) AS visionCorrection,
                SUM(CASE WHEN r.RESERVE_FLAG = 'H' THEN 1 ELSE 0 END) AS cataract,
                SUM(CASE WHEN r.RESERVE_FLAG = 'D' THEN 1 ELSE 0 END) AS dreamlens,
                SUM(CASE WHEN r.RESERVE_FLAG = 'F' THEN 1 ELSE 0 END) AS outpatient
            FROM RESERVATION r
            WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
                AND r.RESERVE_STATE IN ('I','H')
                AND r.RESERVE_FLAG IN ('M','H','D','F')
            GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            ORDER BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            """;
        return jdbc.queryForList(sql, params);
    }
}
