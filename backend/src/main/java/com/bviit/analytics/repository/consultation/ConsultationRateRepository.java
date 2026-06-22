package com.bviit.analytics.repository.consultation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 상담 전환율 쿼리 (레거시 BCRM 에브리데이 시스템 로직 기반).
 *
 * 시력교정 — softcrm/routes/consult-statistics.js 준용
 *   분모: EXAM 테이블 (CANCEL_CD 빈값)
 *   상담수: EXAM 중 STOP_YN<>'Y' AND (OPERATIONR OR OPERATIONL 비어있지 않음)
 *   수술예약: RESERVATION FLAG='O', STATE<>'C' 의 고객별 MIN(RESERVE_DATE)
 *   실제수술: OPERATIONDATA.OPERATION_DATE
 *
 * 백내장 — softcrm/routes/stats-c-cataract-visit-motive.js 준용
 *   분모: RESERVATION FLAG='H', JINRYO<>'3', STATE<>'C',
 *         NOT (JINRYO='1' AND SEQ='3'), CUST_NUM<>'9999999999999' — DISTINCT CUST_NUM
 *   수술예약: RESERVATION FLAG='O', JINRYO='4', STATE<>'C' 의 고객별 MIN(RESERVE_DATE)
 *   중단: CUSTOM.MY_optometrist 있음 AND CUSTOM.MY_COUNSELOR='BS0808'
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
     * 월별 시력교정 상담전환율 (EXAM 기반).
     */
    public List<Map<String, Object>> findMonthlyVisionRates(String fromDate, String toDate) {
        String sql = """
            SELECT
                YEAR(E.EXAM_DATE) AS yr,
                MONTH(E.EXAM_DATE) AS mo,
                COUNT(*) AS examCount,
                SUM(CASE WHEN ISNULL(E.STOP_YN,'') <> 'Y'
                          AND (RTRIM(ISNULL(E.OPERATIONR,'')) <> '' OR RTRIM(ISNULL(E.OPERATIONL,'')) <> '')
                     THEN 1 ELSE 0 END) AS counselCount,
                SUM(CASE WHEN rs.MIN_RSV_DATE IS NOT NULL THEN 1 ELSE 0 END) AS surgeryBookedCount,
                SUM(CASE WHEN mo.MIN_OP_DATE IS NOT NULL THEN 1 ELSE 0 END) AS actualSurgeryCount
            FROM EXAM E WITH(NOLOCK)
            LEFT JOIN (
                SELECT CUST_NUM, MIN(RESERVE_DATE) AS MIN_RSV_DATE
                  FROM RESERVATION WITH(NOLOCK)
                 WHERE RESERVE_FLAG = 'O' AND RESERVE_STATE <> 'C'
                 GROUP BY CUST_NUM
            ) rs ON rs.CUST_NUM = E.CUST_NUM
            LEFT JOIN (
                SELECT CUST_NUM, MIN(OPERATION_DATE) AS MIN_OP_DATE
                  FROM OPERATIONDATA WITH(NOLOCK)
                 GROUP BY CUST_NUM
            ) mo ON mo.CUST_NUM = E.CUST_NUM
            WHERE E.EXAM_DATE >= :from AND E.EXAM_DATE <= :to
                AND ISNULL(E.CANCEL_CD,'') = ''
            GROUP BY YEAR(E.EXAM_DATE), MONTH(E.EXAM_DATE)
            ORDER BY YEAR(E.EXAM_DATE), MONTH(E.EXAM_DATE)
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate));
    }

    /**
     * 월별 백내장 수술전환율 (CUSTOM + RESERVATION 기반).
     */
    public List<Map<String, Object>> findMonthlyCataractRates(String fromDate, String toDate) {
        String sql = """
            SELECT
                YEAR(D.RESERVE_DATE) AS yr,
                MONTH(D.RESERVE_DATE) AS mo,
                COUNT(DISTINCT D.CUST_NUM) AS examCount,
                COUNT(DISTINCT CASE WHEN op.MIN_OP_RSV IS NOT NULL THEN D.CUST_NUM END) AS surgeryBookedCount,
                COUNT(DISTINCT CASE WHEN B.MY_optometrist IS NOT NULL
                                     AND B.MY_optometrist <> ''
                                     AND B.MY_COUNSELOR = 'BS0808' THEN D.CUST_NUM END) AS stoppedCount
            FROM RESERVATION D WITH(NOLOCK)
            INNER JOIN CUSTOM B WITH(NOLOCK) ON B.CUST_NUM = D.CUST_NUM
            LEFT JOIN (
                SELECT CUST_NUM, MIN(RESERVE_DATE) AS MIN_OP_RSV
                  FROM RESERVATION WITH(NOLOCK)
                 WHERE RESERVE_FLAG = 'O' AND RESERVE_JINRYO = '4' AND RESERVE_STATE <> 'C'
                 GROUP BY CUST_NUM
            ) op ON op.CUST_NUM = D.CUST_NUM
            WHERE D.RESERVE_DATE >= :from AND D.RESERVE_DATE <= :to
                AND D.RESERVE_FLAG = 'H'
                AND D.RESERVE_JINRYO <> '3'
                AND D.RESERVE_STATE <> 'C'
                AND NOT (D.RESERVE_FLAG = 'H' AND D.RESERVE_JINRYO = '1' AND D.RESERVE_SEQ = '3')
                AND D.CUST_NUM <> '9999999999999'
            GROUP BY YEAR(D.RESERVE_DATE), MONTH(D.RESERVE_DATE)
            ORDER BY YEAR(D.RESERVE_DATE), MONTH(D.RESERVE_DATE)
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate));
    }
}
