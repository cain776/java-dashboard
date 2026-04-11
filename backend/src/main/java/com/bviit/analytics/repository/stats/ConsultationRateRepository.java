package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 상담 전환율 쿼리.
 *
 * 시력교정 수술전환율 = 수술예약(FLAG=O, JINRYO IN 1,5) / 검사(FLAG=M)  ← RESERVATION
 * 시력교정 상담전환율 = 수술예약 / 상담수(EXAM: STOP_YN<>Y, BS지시 있음) ← EXAM
 * 백내장 수술전환율  = 백내장수술(FLAG=O, JINRYO=4) / 백내장검사(FLAG=H) ← RESERVATION
 *
 * RESERVE_FLAG 출처: softcrm/js/customer-data.js (MEDICAL_TIME_CFG)
 *   M=검사, O=수술, H=백내장검사, F=외래, D=드림렌즈
 */
@Repository
@Profile("mssql")
public class ConsultationRateRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ConsultationRateRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 월별 시력교정 검사/수술 + 백내장 검사/수술 건수.
     */
    public List<Map<String, Object>> findMonthlyConversionData(String fromDate, String toDate) {
        String sql = """
            SELECT
                YEAR(r.RESERVE_DATE) AS yr,
                MONTH(r.RESERVE_DATE) AS mo,
                SUM(CASE WHEN r.RESERVE_FLAG = 'M' THEN 1 ELSE 0 END) AS visionExam,
                SUM(CASE WHEN r.RESERVE_FLAG = 'O' AND r.RESERVE_JINRYO IN ('1','5') THEN 1 ELSE 0 END) AS visionSurgery,
                SUM(CASE WHEN r.RESERVE_FLAG = 'H' THEN 1 ELSE 0 END) AS cataractExam,
                SUM(CASE WHEN r.RESERVE_FLAG = 'O' AND r.RESERVE_JINRYO = '4' THEN 1 ELSE 0 END) AS cataractSurgery
            FROM RESERVATION r
            WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
                AND r.RESERVE_STATE <> 'C'
            GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            ORDER BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate));
    }

    /**
     * 월별 시력교정 상담수 (EXAM 테이블).
     * 상담수 = 전체 검사 - 중단(STOP_YN='Y') - BS미지시(OPERATIONR+L 모두 빈값)
     */
    public List<Map<String, Object>> findMonthlyCounselData(String fromDate, String toDate) {
        String sql = """
            SELECT
                YEAR(e.EXAM_DATE) AS yr,
                MONTH(e.EXAM_DATE) AS mo,
                SUM(CASE WHEN ISNULL(e.STOP_YN,'') <> 'Y'
                          AND (RTRIM(ISNULL(e.OPERATIONR,'')) <> '' OR RTRIM(ISNULL(e.OPERATIONL,'')) <> '')
                     THEN 1 ELSE 0 END) AS counselCount
            FROM EXAM e
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                AND ISNULL(e.CANCEL_CD,'') = ''
            GROUP BY YEAR(e.EXAM_DATE), MONTH(e.EXAM_DATE)
            ORDER BY YEAR(e.EXAM_DATE), MONTH(e.EXAM_DATE)
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate));
    }
}
