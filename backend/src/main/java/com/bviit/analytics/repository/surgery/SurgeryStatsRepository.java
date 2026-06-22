package com.bviit.analytics.repository.surgery;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 수술 통계 쿼리 (레거시 stats-weekly-report.js 준용).
 *
 * 핵심 원칙:
 *   1) 시력교정: OPERATIONDATA에서 CUST_NUM이 Cataract_Operationdata에 있으면 제외 (중복 방지)
 *   2) 시력교정은 환자 수 기준, 백내장은 눈(안) 기준(CUST_NUM+OPERATION_DATE+R/L)
 *   3) 테스트 고객 제외 (CUST_NAME LIKE '%TEST%' OR '%테스트%')
 *   4) 수술 코드 제외 (X, OP불가, 모든수술가능, op x, Strabismus, TEST-TEST)
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
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
     * 시력교정 + 렌즈 수술 월별 환자 수 (OPERATIONDATA, 백내장 환자 제외).
     *
     * 분류 순서 (가장 구체적 패턴 먼저):
     *   smilePro → smile → viva → tIcl → icl → tKpl → kpl → lasik → lasek → other
     */
    public List<Map<String, Object>> findVisionMonthlyByType(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        // 수술 코드 분류 (R/L 공통)
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

        // 환자 수 기준 COUNT(DISTINCT CUST_NUM)
        String sql = """
                SELECT
                    YEAR(e.op_date) AS yr,
                    MONTH(e.op_date) AS mo,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'lasek'    THEN e.cust_num END) AS lasek,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'lasik'    THEN e.cust_num END) AS lasik,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'smile'    THEN e.cust_num END) AS smile,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'smilePro' THEN e.cust_num END) AS smilePro,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'icl'      THEN e.cust_num END) AS icl,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'tIcl'     THEN e.cust_num END) AS tIcl,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'kpl'      THEN e.cust_num END) AS kpl,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'tKpl'     THEN e.cust_num END) AS tKpl,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'viva'     THEN e.cust_num END) AS viva,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%+X%'  THEN e.cust_num END) AS xtra,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%W.V%' THEN e.cust_num END) AS waveVision,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE 'MONO%' THEN e.cust_num END) AS monoVision,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%CONT%' THEN e.cust_num END) AS contra,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%P.E%'  THEN e.cust_num END) AS personal,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%EYECLE%' AND e.raw LIKE '%EX500%' THEN e.cust_num END) AS lasekEx,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%EYECLE%' AND e.raw LIKE '%RED%'   THEN e.cust_num END) AS lasekRed,
                    COUNT(DISTINCT e.cust_num) AS visionPatients
                FROM (
                    SELECT o.OPERATION_DATE AS op_date,
                           o.CUST_NUM AS cust_num,
                           o.OPERATIONR AS raw,
                """
                + classifyCase.replace("op_code", "o.OPERATIONR") +
                """
                         AS op_type
                    FROM OPERATIONDATA o WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = o.CUST_NUM
                    WHERE o.OPERATION_DATE >= :from AND o.OPERATION_DATE <= :to
                      AND o.OPERATIONR IS NOT NULL AND RTRIM(o.OPERATIONR) <> ''
                      AND o.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM Cataract_Operationdata co WITH(NOLOCK)
                          WHERE co.CUST_NUM = o.CUST_NUM
                      )
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                    UNION ALL
                    SELECT o.OPERATION_DATE AS op_date,
                           o.CUST_NUM AS cust_num,
                           o.OPERATIONL AS raw,
                """
                + classifyCase.replace("op_code", "o.OPERATIONL") +
                """
                         AS op_type
                    FROM OPERATIONDATA o WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = o.CUST_NUM
                    WHERE o.OPERATION_DATE >= :from AND o.OPERATION_DATE <= :to
                      AND o.OPERATIONL IS NOT NULL AND RTRIM(o.OPERATIONL) <> ''
                      AND o.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM Cataract_Operationdata co WITH(NOLOCK)
                          WHERE co.CUST_NUM = o.CUST_NUM
                      )
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                ) e
                GROUP BY YEAR(e.op_date), MONTH(e.op_date)
                ORDER BY YEAR(e.op_date), MONTH(e.op_date)
                """;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 백내장 수술 월별 눈(안) 수 (Cataract_Operationdata).
     * 레거시 백내장 수술건수 기준과 동일하게 우/좌안을 각각 1건으로 센다.
     *
     * 분류:
     *   catMulti (다초점): CTR(M), CTRmulti, 3PodF, RESTOR, T-CTR, T-CATARACT, Panoptix, symfony, Lara
     *   catEdof (EDOF):    EDOF, Vivity
     *   catMono (단초점):  CATARACT, CTR 단독, CTR(Sensa/superflex/preciz/k-flex/SN60WF)
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
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catMulti' THEN e.eye_key END) AS catMulti,
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catMono'  THEN e.eye_key END) AS catMono,
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catEdof'  THEN e.eye_key END) AS catEdof,
                    COUNT(DISTINCT e.eye_key) AS cataractPatients
                FROM (
                    SELECT c.OPERATIONR_DATE AS op_date,
                           c.CUST_NUM AS cust_num,
                           LTRIM(RTRIM(ISNULL(c.CUST_NUM, ''))) + '|' + c.OPERATIONR_DATE + '|R' AS eye_key,
                """
                + classifyCase.replace("op_code", "c.OPERATIONR") +
                """
                         AS cat_type
                    FROM Cataract_Operationdata c WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = c.CUST_NUM
                    WHERE c.OPERATIONR_DATE >= :from AND c.OPERATIONR_DATE <= :to
                      AND c.OPERATIONR IS NOT NULL AND RTRIM(c.OPERATIONR) <> ''
                      AND c.OPERATIONR NOT IN ('X','OP불가','TEST-TEST')
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                    UNION ALL
                    SELECT c.OPERATIONL_DATE AS op_date,
                           c.CUST_NUM AS cust_num,
                           LTRIM(RTRIM(ISNULL(c.CUST_NUM, ''))) + '|' + c.OPERATIONL_DATE + '|L' AS eye_key,
                """
                + classifyCase.replace("op_code", "c.OPERATIONL") +
                """
                         AS cat_type
                    FROM Cataract_Operationdata c WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = c.CUST_NUM
                    WHERE c.OPERATIONL_DATE >= :from AND c.OPERATIONL_DATE <= :to
                      AND c.OPERATIONL IS NOT NULL AND RTRIM(c.OPERATIONL) <> ''
                      AND c.OPERATIONL NOT IN ('X','OP불가','TEST-TEST')
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                ) e
                GROUP BY YEAR(e.op_date), MONTH(e.op_date)
                ORDER BY YEAR(e.op_date), MONTH(e.op_date)
                """;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 시력교정 재수술 월별 건수 (RE_OPERATION, 레코드(건) 단위).
     *
     * RE_OPERATION 한 행(=한 번의 재수술 방문)을 1건으로 센다. AGAIN_R 또는 AGAIN_L 중
     * 하나라도 적격이면 그 행을 카운트(양안 재수술도 1건). 다음은 시력교정 재수술이 아니므로 제외:
     *   - Irrigation / repo* / *reposition* : 세척·정복술(재수술 아님)
     *   - Clareon / T-Clareon / Tecnis / LAL / ELANA : 백내장 IOL 명칭(렌즈 교체이나 시력교정 재수술 집계 대상 외)
     *
     * 포함되는 시력교정 재수술: 익스체인지(exch/encla/Bio…), 리무벌(remo…), 재교정(EN/ENHANCE/Re-en…) 등.
     * 레거시 월간보고 p.27 "재수술 합계"(레이저+렌즈)와 단위 동일, 2026 1~4월 ±1 일치
     * (레거시 32·33·19·19 / 본 쿼리 33·34·18·19).
     * ⚠ Phase 2 — 레이저/렌즈 세부 분류와 EN/enhancement 포함 여부는 팀장 검증 필요.
     *
     * REOP_DATE는 char 'YYYY-MM-DD' → 문자열 비교/추출로 연·월 도출 (MSSQL 2014 호환).
     * READ-ONLY — SELECT만 실행.
     */
    public List<Map<String, Object>> findReoperationMonthly(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        // 재수술 적격 조건 (op_col 자리에 AGAIN_R/AGAIN_L 치환). 제외 패턴 외이면 적격.
        String qualify = """
                    op_col IS NOT NULL AND RTRIM(op_col) <> ''
                    AND op_col NOT LIKE 'Irrigation%'
                    AND op_col NOT LIKE 'repo%'
                    AND op_col NOT LIKE '%reposition%'
                    AND op_col NOT LIKE 'Clareon%'
                    AND op_col NOT LIKE 'T-Clareon%'
                    AND op_col NOT LIKE 'Tecnis%'
                    AND op_col NOT LIKE 'LAL%'
                    AND op_col NOT LIKE 'ELANA%'
                """;

        // 레코드 단위: AGAIN_R 적격 OR AGAIN_L 적격이면 그 행을 1건으로 카운트.
        // 레이저/렌즈 분류(레거시 p.27): **적격인 눈의 시술명으로만** 판정한다.
        // (제외된 눈 — repo/Clareon 등 — 의 텍스트는 무시. 예: R=repo+T-ICL(제외)·L=bio+T-PRK(레이저) → 레이저)
        // 렌즈 마커(remo·exch·ICL·ART·EVO·ECHO·precizon 등) 우선, 그 외는 레이저(각막 재교정). 2026 1~4월 레이저/렌즈 분리 레거시 일치(총건수만 ±1).
        String lensMarkers = """
                    qt LIKE '%remo%' OR qt LIKE '%exch%' OR qt LIKE '%ICL%'
                    OR qt LIKE '%ARF%' OR qt LIKE '%ART%' OR qt LIKE '%EVO%'
                    OR qt LIKE '%ECHO%' OR qt LIKE '%GLAZE%' OR qt LIKE '%precizon%'
                    OR qt LIKE '%Lisa%' OR qt LIKE '%Gemetric%' OR qt LIKE '%encla%'
                """;

        String sql = """
                SELECT
                    x.yr, x.mo,
                    COUNT(*) AS reoperation,
                    SUM(CASE WHEN x.cat = 'lens' THEN 0 ELSE 1 END) AS reopLaser,
                    SUM(CASE WHEN x.cat = 'lens' THEN 1 ELSE 0 END) AS reopLens
                FROM (
                    SELECT
                        CAST(LEFT(y.d, 4) AS int)         AS yr,
                        CAST(SUBSTRING(y.d, 6, 2) AS int) AS mo,
                        CASE WHEN (
                """
                + lensMarkers.replace("qt", "y.qt") +
                """
                        ) THEN 'lens' ELSE 'laser' END AS cat
                    FROM (
                        SELECT
                            r.REOP_DATE AS d,
                            (CASE WHEN
                """
                + qualify.replace("op_col", "r.AGAIN_R") +
                """
                             THEN ISNULL(r.AGAIN_R, '') ELSE '' END)
                            + '|' +
                            (CASE WHEN
                """
                + qualify.replace("op_col", "r.AGAIN_L") +
                """
                             THEN ISNULL(r.AGAIN_L, '') ELSE '' END) AS qt
                        FROM RE_OPERATION r WITH(NOLOCK)
                        LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = r.CUST_NUM
                        WHERE r.REOP_DATE >= :from AND r.REOP_DATE <= :to
                          AND NOT (
                              ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                              OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                          )
                    ) y
                    WHERE REPLACE(y.qt, '|', '') <> ''
                ) x
                GROUP BY x.yr, x.mo
                ORDER BY x.yr, x.mo
                """;
        return jdbc.queryForList(sql, params);
    }
}
