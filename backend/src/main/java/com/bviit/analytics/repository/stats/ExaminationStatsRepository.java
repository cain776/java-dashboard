package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 건수 통계 쿼리 — 시력교정 + 드림렌즈 + 백내장 (docs/db/지표정의.md §1).
 *
 * 카테고리별 기준:
 *   시력교정 = EXAM 검사자 리스트 행 (사람) — 드림렌즈 분류 배제
 *   드림렌즈 = EXAM 검사자 리스트 행 (사람) — 같은 날 렌즈센터(D) 예약만 있는 행
 *   백내장 = Cataract_Exam 추천 수술방법 입력 눈 수 — 같은 날 백내장 검사(H) 내원 행만
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
     * 같은 날 렌즈센터(D) 예약만 있고 검사(M) 예약이 없는 건을 배제.
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
                    )
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
     * 같은 검사일에 렌즈센터(D) 예약이 있고 시력교정(M) 예약이 없는 EXAM 행만 집계한다.
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
                          )
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

    /**
     * 백내장 검사 — Cataract_Exam 기준, 눈(안) 단위.
     * 레거시 백내장 검사건수와 맞춘 운영 기준:
     *   1) 중단/취소/테스트 고객 제외
     *   2) 같은 날 백내장 검사 예약(H)이 내원 상태로 존재
     *   3) 적절한 수술방법(OPERATIONR/L)이 입력된 눈만 각각 1건
     */
    public List<Map<String, Object>> findCataractMonthly(String from, String to) {
        String sql = """
            SELECT CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT) AS mo,
                   SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONR, ''))), '') IS NOT NULL THEN 1 ELSE 0 END)
                 + SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONL, ''))), '') IS NOT NULL THEN 1 ELSE 0 END) AS cnt
            FROM Cataract_Exam ce WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON ce.CUST_NUM = cu.CUST_NUM
            WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
              AND (ce.Stop_YN IS NULL OR ce.Stop_YN <> 'Y')
              AND (ce.Cancel_CD IS NULL OR LTRIM(RTRIM(ce.Cancel_CD)) = '')
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1
                FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = ce.CUST_NUM
                  AND r.RESERVE_DATE = ce.EXAM_DATE
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_FLAG = 'H'
              )
            GROUP BY CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT), CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 백내장 예약률 — 백내장 검사건수(Cataract_Exam 추천 눈 수) 안에서 수술예약이 있는 고객 수.
     *
     * 분모는 findCataractMonthly와 동일한 기준을 사용한다.
     * RESERVATION에는 좌/우 눈 구분이 없으므로 분자는 눈 수가 아니라 검사자 리스트의
     * 수술예약등록일 존재 여부와 같은 고객/예약 단위로 본다.
     */
    public List<Map<String, Object>> findCataractReservationRateMonthly(String from, String to) {
        String sql = """
            SELECT base.yr,
                   base.mo,
                   SUM(base.rightEye) + SUM(base.leftEye) AS examCount,
                   SUM(CASE WHEN (base.rightEye = 1 OR base.leftEye = 1)
                              AND base.hasSurgeryBooking = 1 THEN 1 ELSE 0 END) AS surgeryBookedCount
            FROM (
                SELECT CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT) AS mo,
                       CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONR, ''))), '') IS NOT NULL THEN 1 ELSE 0 END AS rightEye,
                       CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONL, ''))), '') IS NOT NULL THEN 1 ELSE 0 END AS leftEye,
                       CASE WHEN op.hasSurgeryBooking IS NULL THEN 0 ELSE 1 END AS hasSurgeryBooking
                FROM Cataract_Exam ce WITH(NOLOCK)
                JOIN CUSTOM cu WITH(NOLOCK) ON ce.CUST_NUM = cu.CUST_NUM
                OUTER APPLY (
                    SELECT TOP 1 1 AS hasSurgeryBooking
                    FROM RESERVATION op WITH(NOLOCK)
                    WHERE op.CUST_NUM = ce.CUST_NUM
                      AND op.RESERVE_FLAG = 'O'
                      AND op.RESERVE_STATE <> 'C'
                ) op
                WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
                  AND (ce.Stop_YN IS NULL OR ce.Stop_YN <> 'Y')
                  AND (ce.Cancel_CD IS NULL OR LTRIM(RTRIM(ce.Cancel_CD)) = '')
                  AND NOT (
                    ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                    OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                  )
                  AND EXISTS (
                    SELECT 1
                    FROM RESERVATION r WITH(NOLOCK)
                    WHERE r.CUST_NUM = ce.CUST_NUM
                      AND r.RESERVE_DATE = ce.EXAM_DATE
                      AND r.RESERVE_STATE IN ('I','H')
                      AND r.RESERVE_FLAG = 'H'
                  )
            ) base
            GROUP BY base.yr, base.mo
            ORDER BY yr, mo
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 시력교정 예약률 — 시력교정 검사건수(EXAM, 드림렌즈 제외) 안에서 수술예약이 있는 고객 수.
     *
     * 분모는 findVisionCorrectionMonthly와 동일한 기준을 사용한다.
     */
    public List<Map<String, Object>> findVisionReservationRateMonthly(String from, String to) {
        String sql = """
            SELECT base.yr,
                   base.mo,
                   COUNT(*) AS examCount,
                   SUM(CASE WHEN base.hasSurgeryBooking = 1 THEN 1 ELSE 0 END) AS surgeryBookedCount
            FROM (
                SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                       CASE WHEN op.hasSurgeryBooking IS NULL THEN 0 ELSE 1 END AS hasSurgeryBooking
                FROM EXAM e WITH(NOLOCK)
                JOIN CUSTOM cu WITH(NOLOCK) ON e.CUST_NUM = cu.CUST_NUM
                OUTER APPLY (
                    SELECT TOP 1 1 AS hasSurgeryBooking
                    FROM RESERVATION op WITH(NOLOCK)
                    WHERE op.CUST_NUM = e.CUST_NUM
                      AND op.RESERVE_FLAG = 'O'
                      AND op.RESERVE_STATE <> 'C'
                ) op
                WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                  AND NOT (
                    ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                    OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                  )
                  AND NOT (
                        EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                                WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                                  AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D'
                        )
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
            ) base
            GROUP BY base.yr, base.mo
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
