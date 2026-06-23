package com.bviit.analytics.repository.exam;

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
     * 백내장 검사 — 레거시 BCRM "백내장_검사" 화면과 동일하게 RESERVATION 기준 **사람(고객)** 단위.
     * RESERVE_FLAG='H'(백내장) + RESERVE_JINRYO='1'(검사진료) + STATE 내원(I/H), 고객·검사일별 1건.
     * 전체 검사자 리스트(AllExamListRepository) 백내장과 동일 정의 → 리스트=레포트 정합.
     * 2024·2025는 ExaminationStatsService.LEGACY_CATARACT 확정값으로 덮어쓰고 2026+만 이 라이브값 사용.
     * 레거시 표시값과 ±10 안팎 잔차(라이브·다소스·시점차). 과거 눈(OPERATIONR/L) 정의에서 2026-06 전환.
     */
    public List<Map<String, Object>> findCataractMonthly(String from, String to) {
        String sql = """
            SELECT yr, mo, COUNT(*) AS cnt
            FROM (
              SELECT CAST(SUBSTRING(a.RESERVE_DATE, 1, 4) AS INT) AS yr,
                     CAST(SUBSTRING(a.RESERVE_DATE, 6, 2) AS INT) AS mo,
                     a.CUST_NUM, a.RESERVE_DATE
              FROM RESERVATION a WITH(NOLOCK)
              WHERE a.RESERVE_DATE >= :from AND a.RESERVE_DATE <= :to
                AND a.RESERVE_STATE IN ('I','H')
                AND a.RESERVE_FLAG = 'H'
                AND a.RESERVE_JINRYO = '1'
              GROUP BY CAST(SUBSTRING(a.RESERVE_DATE, 1, 4) AS INT),
                       CAST(SUBSTRING(a.RESERVE_DATE, 6, 2) AS INT),
                       a.CUST_NUM, a.RESERVE_DATE
            ) t
            GROUP BY yr, mo
            ORDER BY yr, mo
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 백내장 예약률 — 백내장 진단 눈 수(좌+우 합산) 대비 수술예약 보유 사람 수.
     *
     * ⚠️ 분모 = 눈 수, 분자 = 수술예약 사람 수로 단위가 다르지만, **레거시 월간보고(백내장 예약률 ~60%대)
     * 와 일치시키기 위해 눈분모를 사용**한다. 분모를 사람(좌·우 합산 아님)으로 바꾸면 ~89%로 레거시와
     * ~30%p 괴리가 나, 팀 결정에 따라 눈분모(레거시 정의)로 환원함 — 2026 라이브 ≈ 57·57·60·60·64%.
     * 2024·2025 하드코딩값(CATARACT_RATE_LEGACY)도 눈분모 기준이라 3개년 비교가 정합한다.
     */
    public List<Map<String, Object>> findCataractReservationRateMonthly(String from, String to) {
        String sql = """
            SELECT base.yr,
                   base.mo,
                   SUM(base.rightEye) + SUM(base.leftEye) AS examCount,
                   SUM(CASE WHEN (base.rightEye = 1 OR base.leftEye = 1)
                              AND base.hasSurgeryBooking = 1
                            THEN 1 ELSE 0 END) AS surgeryBookedCount
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
