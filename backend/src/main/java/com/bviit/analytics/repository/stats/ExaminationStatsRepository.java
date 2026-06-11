package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 건수 통계 쿼리 — 시력교정 + 드림렌즈 (docs/db/지표정의.md §1).
 *
 * 카테고리별 기준:
 *   시력교정 = EXAM 검사자 리스트 행 (사람) — 드림렌즈 분류 배제
 *   드림렌즈 = EXAM 검사자 리스트 행 (사람) — 같은 날 D/L 예약만 있는 행
 *
 * 시력교정 + 드림렌즈 = 검사자 리스트 월별 건수와 일치해야 한다.
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지 (LTRIM/RTRIM 사용).
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
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
     * 시력교정 검사 — EXAM(검사결과) 기준, 사람 단위.
     * 병원 "검사자 리스트" 행수 기준 → 측정값(RIGHT01/LEFT01) 필터 없음(미입력 검사도 포함).
     * EXAM에는 검사종류 구분 컬럼이 없어 드림렌즈가 월 ~2% 섞임 →
     * 같은 날 드림렌즈(D/L) 예약만 있고 검사(M) 예약이 없는 건을 배제.
     * 엄격 "실시"분만 필요하면 RIGHT01/LEFT01 존재 조건 추가.
     */
    public List<Map<String, Object>> findVisionCorrectionMonthly(String from, String to) {
        String sql = """
            SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON e.CUST_NUM = cu.CUST_NUM
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND NOT (
                    EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                            WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                              AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D'
                              AND ISNULL(rd.RESERVE_JINRYO, '') IN ('1','5','7'))
                AND NOT EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                            WHERE rm.CUST_NUM = e.CUST_NUM AND rm.RESERVE_DATE = e.EXAM_DATE
                              AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M')
              )
              AND NOT (
                EXISTS (
                  SELECT 1
                  FROM Cataract_Exam ce WITH(NOLOCK)
                  WHERE ce.CUST_NUM = e.CUST_NUM
                    AND ce.EXAM_DATE = e.EXAM_DATE
                )
                AND __EXAM_MEASUREMENTS_BLANK__
              )
            GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT), CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
            """.replace("__EXAM_MEASUREMENTS_BLANK__", examMeasurementsBlankPredicate("e"));
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 드림렌즈 검사 — 검사자 리스트와 같은 EXAM 기준, 사람 단위.
     * 같은 검사일에 드림렌즈(D/L) 예약이 있고 시력교정(M) 예약이 없는 EXAM 행만 집계한다.
     * H/L, MiSight, FU, 소아검진 등 렌즈센터 비-D/L 세부구분은 제외한다.
     */
    public List<Map<String, Object>> findDreamlensMonthly(String from, String to) {
        String sql = """
            SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON e.CUST_NUM = cu.CUST_NUM
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                          WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                            AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D'
                            AND ISNULL(rd.RESERVE_JINRYO, '') IN ('1','5','7'))
              AND NOT EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                              WHERE rm.CUST_NUM = e.CUST_NUM AND rm.RESERVE_DATE = e.EXAM_DATE
                                AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M')
              AND NOT (
                EXISTS (
                  SELECT 1
                  FROM Cataract_Exam ce WITH(NOLOCK)
                  WHERE ce.CUST_NUM = e.CUST_NUM
                    AND ce.EXAM_DATE = e.EXAM_DATE
                )
                AND __EXAM_MEASUREMENTS_BLANK__
              )
            GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT), CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
            """.replace("__EXAM_MEASUREMENTS_BLANK__", examMeasurementsBlankPredicate("e"));
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }

    private String examMeasurementsBlankPredicate(String alias) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 30; i++) {
            if (!sb.isEmpty()) {
                sb.append("\n                AND ");
            }
            String index = String.format("%02d", i);
            sb.append("NULLIF(LTRIM(RTRIM(ISNULL(")
                    .append(alias).append(".RIGHT").append(index)
                    .append(", ''))), '') IS NULL\n                AND NULLIF(LTRIM(RTRIM(ISNULL(")
                    .append(alias).append(".LEFT").append(index)
                    .append(", ''))), '') IS NULL");
        }
        return sb.toString();
    }
}
