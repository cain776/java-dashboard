package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * B2B 매출 월별 집계 쿼리.
 *
 * 레거시 BCRM routes/b2b-corp-settlement.js를 기준으로
 * B2B(기업) 관련 시력교정, 백내장 수술/검사 데이터를 월별로 합산한다.
 *
 * 매출 정의:
 *   수술비 + 검사비 + DNA + PRP + 기타/약 + 노안 + 병원물품
 *
 * MSSQL 2014 / JTDS 호환을 위해 최신 함수 사용 금지.
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile("mssql")
public class B2bRevenueStatsRepository {

    private static final String[][] COST_COLUMNS = {
            {"opCost", "'O'", "false"},
            {"examCost", "'33'", "true"},
            {"dnaCost", "'D'", "true"},
            {"prpCost", "'Q','32'", "true"},
            {"etcCost", "'V'", "true"},
            {"presbyopiaCost", "'z','Y','H'", "true"},
            {"hospitalSupplyCost", "'U','3','1','K','2','7','8','9'", "true"}
    };

    private final NamedParameterJdbcTemplate jdbc;

    public B2bRevenueStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findMonthlyRevenue(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");

        String costSelect = buildCostSelect();
        String totalRevenueExpression =
                "(x.op_cost + x.exam_cost + x.dna_cost + x.prp_cost + x.etc_cost + x.presbyopia_cost + x.hospital_supply_cost)";

        String sql = (
                """
                WITH b2b_rows AS (
                    SELECT
                        x.surgery_category,
                        x.operation_date,
                        x.designation,
                        x.op_cost,
                        x.exam_cost,
                        x.dna_cost,
                        x.prp_cost,
                        x.etc_cost,
                        x.presbyopia_cost,
                        x.hospital_supply_cost
                    FROM (
                        SELECT
                            N'시력교정' AS surgery_category,
                            zz.OPERATION_DATE AS operation_date,
                            MAX(zz.designation) AS designation,
                            MAX(zz.opCost) AS op_cost,
                            MAX(zz.examCost) AS exam_cost,
                            MAX(zz.dnaCost) AS dna_cost,
                            MAX(zz.prpCost) AS prp_cost,
                            MAX(zz.etcCost) AS etc_cost,
                            MAX(zz.presbyopiaCost) AS presbyopia_cost,
                            MAX(zz.hospitalSupplyCost) AS hospital_supply_cost
                        FROM (
                            SELECT
                                op.OPERATION_DATE,
                                CASE
                                    WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                                    WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                                    ELSE mo.motive01
                                END AS motive01,
                                CASE WHEN c.[Level] = 'G' THEN N'비지정' ELSE N'지정' END AS designation,
                """ + costSelect + """
                ,
                                c.CUST_NUM,
                                mo.recommender01
                            FROM OPERATIONDATA op
                            LEFT JOIN Cataract_Operationdata co ON op.CUST_NUM = co.CUST_NUM
                            JOIN CUSTOM c ON c.CUST_NUM = op.CUST_NUM
                            LEFT JOIN (
                                SELECT
                                    CASE
                                        WHEN a.motive01 LIKE '%B2B(기업)%' OR a.motive01 LIKE '%B2B(군인)%'
                                            THEN a.motive01
                                        ELSE b.category01_name + '/' + b.category02_name + '/' + b.category03_name
                                    END AS motive01,
                                    CASE
                                        WHEN a.motive02 LIKE '%B2B(기업)%' OR a.motive02 LIKE '%B2B(군인)%'
                                            THEN a.motive02
                                        ELSE b.category01_name + '/' + b.category02_name + '/' + b.category03_name
                                    END AS motive02,
                                    a.recommender01,
                                    a.cust_num
                                FROM MOTIVE_NEW01 a
                                JOIN MOTIVE_NEW02 b ON a.cust_num = b.cust_num
                            ) mo ON mo.cust_num = op.CUST_NUM
                            WHERE op.OPERATION_DATE >= :from AND op.OPERATION_DATE <= :to
                              AND co.CUST_NUM IS NULL
                        ) zz
                        WHERE zz.motive01 LIKE '%B2B(기업)%'
                           OR zz.recommender01 LIKE N'%이상광%'
                           OR zz.recommender01 LIKE N'%유연환%'
                           OR zz.recommender01 LIKE N'%이재형%'
                        GROUP BY zz.CUST_NUM, zz.OPERATION_DATE

                        UNION ALL

                        SELECT
                            N'백내장' AS surgery_category,
                            zz.OPERATION_DATE AS operation_date,
                            MAX(zz.designation) AS designation,
                            MAX(zz.opCost) AS op_cost,
                            MAX(zz.examCost) AS exam_cost,
                            MAX(zz.dnaCost) AS dna_cost,
                            MAX(zz.prpCost) AS prp_cost,
                            MAX(zz.etcCost) AS etc_cost,
                            MAX(zz.presbyopiaCost) AS presbyopia_cost,
                            MAX(zz.hospitalSupplyCost) AS hospital_supply_cost
                        FROM (
                            SELECT
                                op.OPERATION_DATE,
                                CASE
                                    WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                                    WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                                    ELSE mo.motive01
                                END AS motive01,
                                CASE WHEN c.[Level] = 'G' THEN N'비지정' ELSE N'지정' END AS designation,
                """ + costSelect + """
                ,
                                c.CUST_NUM,
                                mo.recommender01
                            FROM (
                                SELECT OPERATIONL_DATE AS OPERATION_DATE, * FROM Cataract_Operationdata
                                WHERE ISNULL(OPERATIONL_DATE, '') <> ''
                                UNION ALL
                                SELECT OPERATIONR_DATE AS OPERATION_DATE, * FROM Cataract_Operationdata
                                WHERE ISNULL(OPERATIONR_DATE, '') <> ''
                            ) op
                            JOIN CUSTOM c ON c.CUST_NUM = op.CUST_NUM
                            LEFT JOIN (
                                SELECT
                                    CASE
                                        WHEN a.motive01 LIKE '%B2B(기업)%' OR a.motive01 LIKE '%B2B(군인)%'
                                            THEN a.motive01
                                        ELSE b.category01_name + '/' + b.category02_name + '/' + b.category03_name
                                    END AS motive01,
                                    CASE
                                        WHEN a.motive02 LIKE '%B2B(기업)%' OR a.motive02 LIKE '%B2B(군인)%'
                                            THEN a.motive02
                                        ELSE b.category01_name + '/' + b.category02_name + '/' + b.category03_name
                                    END AS motive02,
                                    a.recommender01,
                                    a.cust_num
                                FROM MOTIVE_NEW01 a
                                JOIN MOTIVE_NEW02 b ON a.cust_num = b.cust_num
                            ) mo ON mo.cust_num = op.CUST_NUM
                            WHERE op.OPERATION_DATE >= :from AND op.OPERATION_DATE <= :to
                        ) zz
                        WHERE zz.motive01 LIKE '%B2B(기업)%'
                           OR zz.recommender01 LIKE N'%이상광%'
                           OR zz.recommender01 LIKE N'%유연환%'
                           OR zz.recommender01 LIKE N'%이재형%'
                        GROUP BY zz.CUST_NUM, zz.OPERATION_DATE

                        UNION ALL

                        SELECT
                            N'백내장' AS surgery_category,
                            zz.exam_date AS operation_date,
                            MAX(zz.designation) AS designation,
                            MAX(zz.opCost) AS op_cost,
                            MAX(zz.examCost) AS exam_cost,
                            MAX(zz.dnaCost) AS dna_cost,
                            MAX(zz.prpCost) AS prp_cost,
                            MAX(zz.etcCost) AS etc_cost,
                            MAX(zz.presbyopiaCost) AS presbyopia_cost,
                            MAX(zz.hospitalSupplyCost) AS hospital_supply_cost
                        FROM (
                            SELECT
                                ex.EXAM_DATE AS exam_date,
                                CASE
                                    WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                                    WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                                    ELSE mo.motive01
                                END AS motive01,
                                CASE WHEN c.[Level] = 'G' THEN N'비지정' ELSE N'지정' END AS designation,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('O')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS opCost,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('33')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS examCost,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('D')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS dnaCost,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('Q', '32')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS prpCost,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('V')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS etcCost,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('z', 'Y', 'H')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS presbyopiaCost,
                                ISNULL((
                                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                                    FROM COSTPRICE aa
                                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                                    WHERE aa.CUST_NUM = ex.CUST_NUM
                                      AND aa.PayStt <> 'a'
                                      AND pr.PrcCod IN ('U', '3', '1', 'K', '2', '7', '8', '9')
                                      AND pr.PrcItmPrc <> 0
                                ), 0) AS hospitalSupplyCost,
                                c.CUST_NUM,
                                mo.recommender01
                            FROM Cataract_Exam ex
                            JOIN CUSTOM c ON c.CUST_NUM = ex.CUST_NUM
                            JOIN MOTIVE_NEW01 mo ON mo.cust_num = ex.CUST_NUM
                            WHERE ex.EXAM_DATE >= :from AND ex.EXAM_DATE <= :to
                              AND (
                                  mo.motive01 LIKE '%B2B(기업)%'
                                  OR mo.motive02 LIKE '%B2B(기업)%'
                                  OR mo.recommender01 LIKE N'%이상광%'
                                  OR mo.recommender01 LIKE N'%유연환%'
                                  OR mo.recommender01 LIKE N'%이재형%'
                              )
                        ) zz
                        GROUP BY zz.CUST_NUM, zz.exam_date
                    ) x
                )
                SELECT
                    YEAR(x.operation_date) AS yr,
                    MONTH(x.operation_date) AS mo,
                    COUNT(*) AS caseCount,
                    SUM(__REV__) AS totalRevenue,
                    CASE
                        WHEN COUNT(*) = 0 THEN 0
                        ELSE CAST(SUM(__REV__) / COUNT(*) AS INT)
                    END AS avgRevenuePerCase,
                    SUM(CASE WHEN x.surgery_category = N'시력교정' THEN __REV__ ELSE 0 END) AS visionRevenue,
                    SUM(CASE WHEN x.surgery_category = N'백내장' THEN __REV__ ELSE 0 END) AS cataractRevenue,
                    SUM(CASE WHEN x.surgery_category = N'시력교정' THEN 1 ELSE 0 END) AS visionCount,
                    SUM(CASE WHEN x.surgery_category = N'백내장' THEN 1 ELSE 0 END) AS cataractCount,
                    SUM(CASE WHEN x.designation = N'지정' THEN __REV__ ELSE 0 END) AS designatedRevenue,
                    SUM(CASE WHEN x.designation = N'비지정' THEN __REV__ ELSE 0 END) AS nonDesignatedRevenue,
                    SUM(CASE WHEN x.designation = N'지정' THEN 1 ELSE 0 END) AS designatedCount,
                    SUM(CASE WHEN x.designation = N'비지정' THEN 1 ELSE 0 END) AS nonDesignatedCount,
                    SUM(x.op_cost) AS opCost,
                    SUM(x.exam_cost) AS examCost,
                    SUM(x.dna_cost) AS dnaCost,
                    SUM(x.prp_cost) AS prpCost,
                    SUM(x.etc_cost) AS etcCost,
                    SUM(x.presbyopia_cost) AS presbyopiaCost,
                    SUM(x.hospital_supply_cost) AS hospitalSupplyCost
                FROM b2b_rows x
                GROUP BY YEAR(x.operation_date), MONTH(x.operation_date)
                ORDER BY YEAR(x.operation_date), MONTH(x.operation_date)
                """
        ).replace("__REV__", totalRevenueExpression);

        return jdbc.queryForList(sql, params);
    }

    private String buildCostSelect() {
        StringBuilder builder = new StringBuilder();

        for (int i = 0; i < COST_COLUMNS.length; i++) {
            String[] costColumn = COST_COLUMNS[i];
            builder.append(buildCostSubquery(costColumn[0], costColumn[1], Boolean.parseBoolean(costColumn[2])));

            if (i < COST_COLUMNS.length - 1) {
                builder.append(",\n");
            }
        }

        return builder.toString();
    }

    /**
     * COSTPRICE 비용 서브쿼리 생성.
     * 수술비(opCost)는 레거시와 동일하게 날짜 제한 없이 최신 값을 사용한다.
     */
    private String buildCostSubquery(String alias, String prcCodes, boolean useDateLimit) {
        String dateCondition = useDateLimit
                ? "                            AND y.COST_DATE <= op.OPERATION_DATE"
                : "";

        return (
                """
                ISNULL((
                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                    FROM COSTPRICE aa
                    LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                    WHERE aa.CUST_NUM = op.CUST_NUM
                      AND aa.PayStt <> 'a'
                      AND aa.COST_DATE = (
                          SELECT MAX(y.COST_DATE)
                          FROM COSTPRICE y
                          LEFT JOIN PrcItmLst z ON y.CUST_NUM = z.PrcCusNum AND y.SEQ = z.prcseq
                          WHERE y.CUST_NUM = op.CUST_NUM
                            AND y.PayStt <> 'a'
                            AND z.PrcCod = pr.PrcCod
                            AND z.PrcItmPrc <> 0
                __DATE_CONDITION__
                      )
                      AND pr.PrcCod IN (__PRC_CODES__)
                      AND pr.PrcItmPrc <> 0
                ), 0) AS __ALIAS__
                """
        )
                .replace("__DATE_CONDITION__", dateCondition)
                .replace("__PRC_CODES__", prcCodes)
                .replace("__ALIAS__", alias);
    }
}
