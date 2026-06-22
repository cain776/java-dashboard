package com.bviit.analytics.repository.overall;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사자 종합표 주간 집계 쿼리 — 일자별로 집계한 뒤 서비스에서 주(월~일)로 버킷팅한다.
 *
 * 모든 쿼리는 EXAM_DATE(또는 OPERATION_DATE) 일자별 GROUP BY로 결과를 돌려준다.
 * 주 경계(월~일, 월 클립) 계산은 {@code OverallExamWeeklyService}에서 자바로 처리한다.
 * SQL 본문은 §1.3~1.10·§6의 검증된 월별 쿼리와 동일하며 집계 단위만 일자로 바꿨다.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 * MSSQL 2014 호환: STRING_AGG/TRIM 미사용 (LTRIM/RTRIM 사용).
 */
@Repository
@Profile("mssql")
public class OverallExamWeeklyRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public OverallExamWeeklyRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 인구통계(검사수 모집단 = EXAM 행 + Cataract_Exam 세션) 일자별 집계.
     *   popTotal        = 총검사자(§1.9.1, raw COUNT)
     *   cataractSessions = 백내장 전체(노안포함, Cataract_Exam 세션수, idx9)
     *   직업(직장인/학생/기타)  §1.10 CUSTOM.JOB 롤업
     *   소개유형(일반/고객소개/직원소개) MOTIVE_NEW02.category01_name (Idx='1' 최신)
     * 고객소개 = '소개고객' + '소개미확인'(소개자정보 미입력). 레거시 월간보고가 소개미확인을
     * 고객소개로 편입한 것을 맞춰 정합(2026 prod 평균차 고객소개 ~13건·일반 ~10건, 지표정의 §6.3).
     */
    public List<Map<String, Object>> findDemographicsDaily(String from, String to) {
        String sql = """
            SELECT p.d AS d,
                   COUNT(*) AS popTotal,
                   SUM(p.isCat) AS cataractSessions,
                   SUM(CASE WHEN p.jobBucket = N'직장인' THEN 1 ELSE 0 END) AS jobOffice,
                   SUM(CASE WHEN p.jobBucket = N'학생'   THEN 1 ELSE 0 END) AS jobStudent,
                   SUM(CASE WHEN p.jobBucket = N'기타'   THEN 1 ELSE 0 END) AS jobEtc,
                   SUM(CASE WHEN p.motiveL IN (N'소개고객', N'소개미확인') THEN 1 ELSE 0 END) AS introCustomer,
                   SUM(CASE WHEN p.motiveL = N'소개직원' THEN 1 ELSE 0 END) AS introStaff,
                   SUM(CASE WHEN p.motiveL NOT IN (N'소개고객', N'소개미확인', N'소개직원') OR p.motiveL IS NULL THEN 1 ELSE 0 END) AS introGeneral
            FROM (
                SELECT src.d AS d, src.isCat AS isCat,
                       (CASE
                          WHEN jj.j LIKE N'%교사%' OR jj.j LIKE N'%교수%' OR jj.j LIKE N'%교직원%' OR jj.j LIKE N'%강사%' THEN N'직장인'
                          WHEN jj.j LIKE N'%학생%' OR jj.j LIKE N'%대학원생%' OR jj.j LIKE N'%수험생%'
                            OR jj.j LIKE N'%재수생%' OR jj.j LIKE N'%신입생%'
                            OR jj.j LIKE N'초[0-9]%' OR jj.j LIKE N'중[0-9]%' OR jj.j LIKE N'고[0-9]%'
                            OR jj.j LIKE N'%초등%' OR jj.j LIKE N'%중학%' OR jj.j LIKE N'%고등%' OR jj.j LIKE N'%고3%'
                            OR jj.j LIKE N'%대학%예정%' OR jj.j LIKE N'%졸업%예정%' OR jj.j LIKE N'%졸업생%' OR jj.j LIKE N'%대입%'
                            OR jj.j = 'university' THEN N'학생'
                          WHEN jj.j LIKE N'%군인%' OR jj.j LIKE N'%사회복무%' OR jj.j LIKE N'%공익근무%' THEN N'기타'
                          WHEN jj.j = N'사무직' THEN N'직장인'
                          WHEN jj.j IN ('', '.', N'무', N'無', N'무 직', N'무직', N'없음', 'N', 'None', 'none', N'가사', N'주부',
                                        N'휴식', N'휴식중', N'휴직중', N'취업준비', N'취업준비중', N'취업준비(휴식)', N'취업준비/휴식중',
                                        N'군입대 직전', N'입대 전', N'기타')
                            OR jj.j LIKE N'%주부%' OR jj.j LIKE N'%취업준비%' OR jj.j LIKE N'%취준%'
                            OR jj.j LIKE N'%퇴직%' OR jj.j LIKE N'%은퇴%' OR jj.j LIKE N'%휴직%' THEN N'기타'
                          ELSE N'직장인'
                        END) AS jobBucket,
                       m.motiveL AS motiveL
                FROM (
                    SELECT e.CUST_NUM AS cn, e.EXAM_DATE AS d, 0 AS isCat
                    FROM EXAM e WITH(NOLOCK)
                    WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                    UNION ALL
                    SELECT ce.CUST_NUM AS cn, ce.EXAM_DATE AS d, 1 AS isCat
                    FROM Cataract_Exam ce WITH(NOLOCK)
                    WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
                ) src
                LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = src.cn
                CROSS APPLY (SELECT LTRIM(RTRIM(ISNULL(cu.JOB, ''))) AS j) jj
                OUTER APPLY (
                    SELECT TOP 1 ISNULL(m2.category01_name, '') AS motiveL
                    FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
                    WHERE m2.cust_num = src.cn AND m2.Idx = '1'
                    ORDER BY m2.pkey DESC
                ) m
            ) p
            GROUP BY p.d
            ORDER BY p.d
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 시력교정 검사(§1.3, idx17) + 시력교정 수술예약(idx7) 일자별 집계.
     * examCount = 시력교정 검사건수, surgeryBooked = 그 중 수술예약(O, 취소 아님) 보유 고객.
     */
    public List<Map<String, Object>> findVisionDaily(String from, String to) {
        String sql = """
            SELECT base.d AS d,
                   COUNT(*) AS examCount,
                   SUM(CASE WHEN base.hasSurgeryBooking = 1 THEN 1 ELSE 0 END) AS surgeryBooked
            FROM (
                SELECT e.EXAM_DATE AS d,
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
            GROUP BY base.d
            ORDER BY base.d
            """.replace("__EXAM_MEASUREMENTS_BLANK__", examMeasurementsBlankPredicate("e"));
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 백내장 만(추천 눈 수, §1.4, idx10) + 백내장 수술예약(idx12) 일자별 집계.
     */
    public List<Map<String, Object>> findCataractDaily(String from, String to) {
        String sql = """
            SELECT base.d AS d,
                   SUM(base.rightEye) + SUM(base.leftEye) AS examCount,
                   SUM(CASE WHEN (base.rightEye = 1 OR base.leftEye = 1)
                              AND base.hasSurgeryBooking = 1 THEN 1 ELSE 0 END) AS surgeryBooked
            FROM (
                SELECT ce.EXAM_DATE AS d,
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
            GROUP BY base.d
            ORDER BY base.d
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 드림렌즈 검사(§1.5, idx18) 일자별 집계 — 같은 날 렌즈센터(D) 예약만 있고 검사(M) 예약 없는 EXAM 행.
     */
    public List<Map<String, Object>> findDreamlensDaily(String from, String to) {
        String sql = """
            SELECT e.EXAM_DATE AS d, COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON e.CUST_NUM = cu.CUST_NUM
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                          WHERE rd.CUST_NUM = e.CUST_NUM AND rd.RESERVE_DATE = e.EXAM_DATE
                            AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D')
              AND NOT EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                              WHERE rm.CUST_NUM = e.CUST_NUM AND rm.RESERVE_DATE = e.EXAM_DATE
                                AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M')
              AND NOT (
                EXISTS (
                  SELECT 1 FROM Cataract_Exam ce WITH(NOLOCK)
                  WHERE ce.CUST_NUM = e.CUST_NUM AND ce.EXAM_DATE = e.EXAM_DATE
                )
                AND __EXAM_MEASUREMENTS_BLANK__
              )
            GROUP BY e.EXAM_DATE
            ORDER BY e.EXAM_DATE
            """.replace("__EXAM_MEASUREMENTS_BLANK__", examMeasurementsBlankPredicate("e"));
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 중단수(idx15) 일자별 집계 — EXAM.STOP_YN='Y'.
     */
    public List<Map<String, Object>> findStopCountDaily(String from, String to) {
        String sql = """
            SELECT e.EXAM_DATE AS d, COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND ISNULL(e.STOP_YN, '') = 'Y'
            GROUP BY e.EXAM_DATE
            ORDER BY e.EXAM_DATE
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    /**
     * 원데이(idx28) + 원데이예약(idx29) 일자별 집계.
     *   oneDay       = EXAM 기준 같은 날 검사OP(M/5) 내원 + 중단/취소/테스트 제외 (§1.9.2)
     *   oneDayBooked = 그 중 검사일~+7일 사이 유효 시력교정 수술(OPERATIONDATA, 백내장 제외) 존재
     */
    public List<Map<String, Object>> findOneDayDaily(String from, String to) {
        String sql = """
            SELECT e.EXAM_DATE AS d,
                   COUNT(*) AS oneDay,
                   SUM(CASE WHEN booked.hit IS NULL THEN 0 ELSE 1 END) AS oneDayBooked
            FROM EXAM e WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = e.CUST_NUM
            OUTER APPLY (
                SELECT TOP 1 1 AS hit
                FROM OPERATIONDATA o WITH(NOLOCK)
                WHERE o.CUST_NUM = e.CUST_NUM
                  AND o.OPERATION_DATE >= e.EXAM_DATE
                  AND o.OPERATION_DATE <= CONVERT(varchar(10), DATEADD(day, 7, CONVERT(date, e.EXAM_DATE)), 23)
                  AND NOT EXISTS (
                      SELECT 1 FROM Cataract_Operationdata co WITH(NOLOCK)
                      WHERE co.CUST_NUM = o.CUST_NUM
                  )
                  AND (
                    (o.OPERATIONR IS NOT NULL AND RTRIM(o.OPERATIONR) <> ''
                       AND o.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
                    OR (o.OPERATIONL IS NOT NULL AND RTRIM(o.OPERATIONL) <> ''
                       AND o.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
                  )
            ) booked
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
                SELECT 1 FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = e.CUST_NUM
                  AND r.RESERVE_DATE = e.EXAM_DATE
                  AND r.RESERVE_FLAG = 'M'
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_JINRYO = '5'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%test%'
                  AND LOWER(ISNULL(r.RESERVE_NUM, '')) NOT LIKE '%kiosktest%'
              )
            GROUP BY e.EXAM_DATE
            ORDER BY e.EXAM_DATE
            """;
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }

    /** EXAM 측정값(RIGHT01~30 / LEFT01~30)이 모두 비어 있는지 판정하는 술어 (드림렌즈 혼입 보정용). */
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
