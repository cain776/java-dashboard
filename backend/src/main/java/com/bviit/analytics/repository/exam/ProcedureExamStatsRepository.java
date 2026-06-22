package com.bviit.analytics.repository.exam;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 시술별 검사 건수("검사수") 통계 쿼리.
 *
 * 검사수 = EXAM 검사자 행수 + Cataract_Exam 검사 세션수.
 * 레거시 "검사수" 차트와 동일하게 두 테이블의 raw COUNT(*)를 단순 합산한다
 * (테스트/취소/드림렌즈/눈 단위 필터 없음). 2026-01 = 1893 + 145 = 2038로 검증됨.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 * MSSQL 2014 호환: STRING_AGG/TRIM 미사용.
 */
@Repository
@Profile("mssql")
public class ProcedureExamStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ProcedureExamStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 월별 검사수 = EXAM 행수 + Cataract_Exam 세션수 (raw COUNT).
     * 두 테이블을 월별로 각각 센 뒤 UNION ALL로 합산한다.
     */
    public List<Map<String, Object>> findTotalExamCountMonthly(String from, String to) {
        String sql = """
            SELECT t.yr, t.mo, SUM(t.cnt) AS cnt
            FROM (
                SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                       COUNT(*) AS cnt
                FROM EXAM e WITH(NOLOCK)
                WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT),
                         CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
                UNION ALL
                SELECT CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT) AS mo,
                       COUNT(*) AS cnt
                FROM Cataract_Exam ce WITH(NOLOCK)
                WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
                GROUP BY CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT),
                         CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT)
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 월별 원데이 검사 = EXAM 기준 같은 날 검사OP(M/5) 내원 건.
     *
     * 레거시 "원데이 검사" 차트 대조 결과 실제 당일 수술 여부가 아니라 검사OP 분류가 가장 가깝다.
     * 운영 기준:
     *   - EXAM.EXAM_DATE 기준
     *   - 같은 고객/같은 날짜 RESERVATION M/5 검사OP, RESERVE_STATE IN ('I','H') 존재
     *   - EXAM 중단/취소 제외
     *   - 테스트 고객/검사메모/예약번호 제외
     */
    public List<Map<String, Object>> findOneDayExamCountMonthly(String from, String to) {
        String sql = """
            SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = e.CUST_NUM
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND ISNULL(e.STOP_YN, '') <> 'Y'
              AND ISNULL(e.CANCEL_CD, '') = ''
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                OR ISNULL(e.EXAM_MEMO, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(e.EXAM_MEMO, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1
                FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = e.CUST_NUM
                  AND r.RESERVE_DATE = e.EXAM_DATE
                  AND r.RESERVE_FLAG = 'M'
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_JINRYO = '5'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%test%'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%kiosktest%'
              )
            GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT),
                     CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
