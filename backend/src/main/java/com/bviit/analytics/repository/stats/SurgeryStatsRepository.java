package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 수술 통계 쿼리 (OPERATIONDATA + Cataract_Operationdata).
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
 *
 * 수술 코드 분류 기준: softcrm/routes/surgery-status.js 203~249행
 * 테스트 제외 기준: softcrm/docs/specs/surgery-status/surgery-count-standard.md
 */
@Repository
@Profile("mssql")
public class SurgeryStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public SurgeryStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 시력교정 + 렌즈 수술 월별 건수 (OPERATIONDATA).
     * 각 눈(R/L)을 개별 카운트 → UNION ALL.
     *
     * 분류 순서 (CASE WHEN 최상위=가장 구체적 패턴):
     *   smilePro → smile → viva → tIcl → icl → tKpl → kpl
     *   → lasik → lasek → other(미분류)
     *
     * 근거:
     *   - SMILE: softcrm surgery-status.js L224
     *   - Piol(ICL계열): softcrm surgery-status.js L205,220-223
     *   - LASIK: softcrm surgery-status.js L206,219,242-248
     *   - LASEK: softcrm surgery-status.js L236-241,245
     */
    public List<Map<String, Object>> findVisionMonthlyByType(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        // 수술 코드 분류 CASE 문 (R/L 공통)
        // MSSQL LIKE는 대소문자 구분 안 함 (기본 collation)
        String classifyCase = """
                CASE
                    WHEN op_code LIKE '%SMILE Pro%' OR op_code LIKE '%SMILEpro%'
                         OR op_code LIKE '%SMILE PRO%' THEN 'smilePro'
                    WHEN op_code LIKE '%SMILE%' THEN 'smile'
                    WHEN op_code LIKE '%VIVA%' THEN 'viva'
                    WHEN op_code LIKE '%T-ICL%' OR op_code LIKE '%T-IPCL%'
                         OR op_code LIKE '%T-GLAZE%' OR op_code LIKE '%T-ECHO%' THEN 'tIcl'
                    WHEN op_code LIKE '%ICL%' OR op_code LIKE '%IPCL%'
                         OR op_code LIKE '%ARF%' OR op_code LIKE '%ART%'
                         OR op_code LIKE '%ARTIFLEX%' OR op_code LIKE '%GLAZE%'
                         OR op_code LIKE '%ECHO%' THEN 'icl'
                    WHEN op_code LIKE '%T-KPL%' THEN 'tKpl'
                    WHEN op_code LIKE '%KPL%' THEN 'kpl'
                    WHEN op_code LIKE '%FLAP LIFT%' OR op_code LIKE '%OPTI%'
                         OR op_code LIKE '%iFS%' OR op_code LIKE '%VISU%'
                         OR op_code LIKE '%fs200%' OR op_code LIKE '%Fs200%'
                         OR op_code LIKE '%Micro+%' OR op_code LIKE '%Hybrid%' THEN 'lasik'
                    WHEN op_code LIKE '%T-prk%' OR op_code LIKE '%EYE CLE%'
                         OR op_code LIKE '%EYE+%' OR op_code LIKE '%FLAP PRK%'
                         OR op_code LIKE '%PtK%' OR op_code LIKE '%M-LE%' THEN 'lasek'
                    ELSE 'other'
                END
                """;

        String sql = """
                SELECT
                    YEAR(e.op_date) AS yr,
                    MONTH(e.op_date) AS mo,
                    SUM(CASE WHEN e.op_type = 'lasek'    THEN 1 ELSE 0 END) AS lasek,
                    SUM(CASE WHEN e.op_type = 'lasik'    THEN 1 ELSE 0 END) AS lasik,
                    SUM(CASE WHEN e.op_type = 'smile'    THEN 1 ELSE 0 END) AS smile,
                    SUM(CASE WHEN e.op_type = 'smilePro' THEN 1 ELSE 0 END) AS smilePro,
                    SUM(CASE WHEN e.op_type = 'icl'      THEN 1 ELSE 0 END) AS icl,
                    SUM(CASE WHEN e.op_type = 'tIcl'     THEN 1 ELSE 0 END) AS tIcl,
                    SUM(CASE WHEN e.op_type = 'kpl'      THEN 1 ELSE 0 END) AS kpl,
                    SUM(CASE WHEN e.op_type = 'tKpl'     THEN 1 ELSE 0 END) AS tKpl,
                    SUM(CASE WHEN e.op_type = 'viva'     THEN 1 ELSE 0 END) AS viva
                FROM (
                    SELECT o.OPERATION_DATE AS op_date,
                """
                + classifyCase.replace("op_code", "o.OPERATIONR") +
                """
                         AS op_type
                    FROM OPERATIONDATA o
                    LEFT JOIN CUSTOM cu ON cu.CUST_NUM = o.CUST_NUM
                    WHERE o.OPERATION_DATE >= :from AND o.OPERATION_DATE <= :to
                      AND o.OPERATIONR IS NOT NULL AND RTRIM(o.OPERATIONR) <> ''
                      AND o.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND (cu.CUST_NAME NOT LIKE '%TEST%' AND cu.CUST_NAME NOT LIKE '%테스트%')
                    UNION ALL
                    SELECT o.OPERATION_DATE AS op_date,
                """
                + classifyCase.replace("op_code", "o.OPERATIONL") +
                """
                         AS op_type
                    FROM OPERATIONDATA o
                    LEFT JOIN CUSTOM cu ON cu.CUST_NUM = o.CUST_NUM
                    WHERE o.OPERATION_DATE >= :from AND o.OPERATION_DATE <= :to
                      AND o.OPERATIONL IS NOT NULL AND RTRIM(o.OPERATIONL) <> ''
                      AND o.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND (cu.CUST_NAME NOT LIKE '%TEST%' AND cu.CUST_NAME NOT LIKE '%테스트%')
                ) e
                GROUP BY YEAR(e.op_date), MONTH(e.op_date)
                ORDER BY YEAR(e.op_date), MONTH(e.op_date)
                """;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 백내장 수술 월별 건수 (Cataract_Operationdata).
     * 각 눈(R/L)을 개별 카운트, 날짜 컬럼이 눈별로 분리 (OPERATIONR_DATE, OPERATIONL_DATE).
     *
     * 분류:
     *   catMulti (다초점): CTR(M), CTRmulti, 3PodF, RESTOR, T-CTR, T-CATARACT, Panoptix, symfony, Lara
     *   catEdof (EDOF):    EDOF, Vivity, symfony (단독)
     *   catMono (단초점):  CATARACT, CTR(Sensa/superflex/preciz/k-flex/SN60WF), CTR 단독
     *
     * 근거: softcrm/routes/surgery-status.js L207-235
     */
    public List<Map<String, Object>> findCataractMonthlyByType(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String classifyCase = """
                CASE
                    WHEN op_code LIKE '%EDOF%' OR op_code LIKE '%Vivity%' THEN 'catEdof'
                    WHEN op_code LIKE '%CTR(M)%' OR op_code LIKE '%CTRmulti%'
                         OR op_code LIKE '%CTR(multi)%'
                         OR op_code LIKE '%3PodF%' OR op_code LIKE '%RESTOR%'
                         OR op_code LIKE '%T-CTR%' OR op_code LIKE '%T-CATARACT%'
                         OR op_code LIKE '%Panoptix%' OR op_code LIKE '%symfony%'
                         OR op_code LIKE '%Lara%' OR op_code LIKE '%LISA TRI%' THEN 'catMulti'
                    WHEN op_code LIKE '%CATARACT%' OR op_code LIKE '%CTR%' THEN 'catMono'
                    ELSE 'catMono'
                END
                """;

        String sql = """
                SELECT
                    YEAR(e.op_date) AS yr,
                    MONTH(e.op_date) AS mo,
                    SUM(CASE WHEN e.cat_type = 'catMulti' THEN 1 ELSE 0 END) AS catMulti,
                    SUM(CASE WHEN e.cat_type = 'catMono'  THEN 1 ELSE 0 END) AS catMono,
                    SUM(CASE WHEN e.cat_type = 'catEdof'  THEN 1 ELSE 0 END) AS catEdof
                FROM (
                    SELECT c.OPERATIONR_DATE AS op_date,
                """
                + classifyCase.replace("op_code", "c.OPERATIONR") +
                """
                         AS cat_type
                    FROM Cataract_Operationdata c
                    LEFT JOIN CUSTOM cu ON cu.CUST_NUM = c.CUST_NUM
                    WHERE c.OPERATIONR_DATE >= :from AND c.OPERATIONR_DATE <= :to
                      AND c.OPERATIONR IS NOT NULL AND RTRIM(c.OPERATIONR) <> ''
                      AND c.OPERATIONR NOT IN ('X','OP불가','TEST-TEST')
                      AND (cu.CUST_NAME NOT LIKE '%TEST%' AND cu.CUST_NAME NOT LIKE '%테스트%')
                    UNION ALL
                    SELECT c.OPERATIONL_DATE AS op_date,
                """
                + classifyCase.replace("op_code", "c.OPERATIONL") +
                """
                         AS cat_type
                    FROM Cataract_Operationdata c
                    LEFT JOIN CUSTOM cu ON cu.CUST_NUM = c.CUST_NUM
                    WHERE c.OPERATIONL_DATE >= :from AND c.OPERATIONL_DATE <= :to
                      AND c.OPERATIONL IS NOT NULL AND RTRIM(c.OPERATIONL) <> ''
                      AND c.OPERATIONL NOT IN ('X','OP불가','TEST-TEST')
                      AND (cu.CUST_NAME NOT LIKE '%TEST%' AND cu.CUST_NAME NOT LIKE '%테스트%')
                ) e
                GROUP BY YEAR(e.op_date), MONTH(e.op_date)
                ORDER BY YEAR(e.op_date), MONTH(e.op_date)
                """;
        return jdbc.queryForList(sql, params);
    }
}
