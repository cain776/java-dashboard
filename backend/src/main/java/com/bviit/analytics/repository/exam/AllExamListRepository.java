package com.bviit.analytics.repository.exam;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 전체 검사자 리스트 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 행 목록.
 *
 * ⚠️ 모집단은 "월별 검사자 종합지표"(OverallExamWeeklyRepository.findDemographicsDaily)와 **동일**하게
 * EXAM ∪ Cataract_Exam 을 EXAM_DATE 기준으로 그대로 센다(테스트/중복 미제외). 따라서 검사구분·내원동기·
 * 직업 토글의 조회건수가 월간레포트 검사유입·검사수 수치와 정합한다.
 * (검사자 리스트/백내장 검사자 리스트는 테스트·백내장스텁을 제외하므로 그 단순 합과는 다르다 — 정합 우선.)
 *
 * 산출 필드:
 *   - examGroup  : 시력교정(EXAM) / 백내장(Cataract_Exam)
 *   - introType  : 일반 / 고객소개(소개고객·소개미확인) / 직원소개(소개직원) — motiveL 기준(종합지표와 동일)
 *   - jobBucket  : 직장인 / 학생 / 기타 — CUSTOM.JOB 기준(종합지표와 동일 CASE, 정합 위해 동기화 유지)
 *
 * 견적·수납·수술상세 등 타입별 상세 컬럼은 기존 개별 리스트(검사자/백내장 검사자 리스트)에 유지.
 * READ-ONLY · MSSQL 2014 호환. EMPLOYEE 조인은 EMP_NUM 중복 시 행 증식 방지로 OUTER APPLY TOP 1.
 */
@Repository
@Profile("mssql")
public class AllExamListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public AllExamListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findAllExamList(String from, String to) {
        String sql = """
            SELECT
              ISNULL(LTRIM(RTRIM(src.cn)), '')             AS chartNo,
              ISNULL(cu.CUST_NAME, '')                     AS name,
              ISNULL(src.d, '')                            AS examDate,
              src.examGroup                                AS examGroup,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN N'신환' ELSE N'구환' END            AS patientType,
              CASE WHEN mv.motiveL IN (N'소개고객', N'소개미확인') THEN N'고객소개'
                   WHEN mv.motiveL = N'소개직원' THEN N'직원소개'
                   ELSE N'일반' END                         AS introType,
              ISNULL(mv.motiveL, '')                       AS motiveL,
              ISNULL(mv.motiveM, '')                       AS motiveM,
              ISNULL(mv.motiveS, '')                       AS motiveS,
              CASE
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
              END                                          AS jobBucket,
              ISNULL(cu.JOB, '')                           AS job,
              ISNULL(cu.LEVEL, '')                         AS grade,
              ISNULL(cu.BIRTH_DAY, '')                     AS birth,
              ISNULL(cu.CALL_NUM2, '')                     AS phone2,
              ISNULL(cu.CALL_NUM1, '')                     AS phone1,
              ISNULL(cu.EMAIL, '')                         AS email,
              ISNULL(ec.nm, '')                            AS counselor,
              ISNULL(ed.nm, '')                            AS doctor,
              ISNULL(eo.nm, '')                            AS optometrist,
              ISNULL(cu.LAST_DAY, '')                      AS lastVisit,
              ISNULL(cu.ETC, '')                           AS memo
            FROM (
              SELECT e.CUST_NUM AS cn, e.EXAM_DATE AS d, N'시력교정' AS examGroup
              FROM EXAM e WITH(NOLOCK)
              WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              UNION ALL
              SELECT ce.CUST_NUM AS cn, ce.EXAM_DATE AS d, N'백내장' AS examGroup
              FROM Cataract_Exam ce WITH(NOLOCK)
              WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
            ) src
            LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = src.cn
            CROSS APPLY (SELECT LTRIM(RTRIM(ISNULL(cu.JOB, ''))) AS j) jj
            OUTER APPLY (
              SELECT TOP 1 ISNULL(m2.category01_name, '') AS motiveL,
                           ISNULL(m2.category02_name, '') AS motiveM,
                           ISNULL(m2.category03_name, '') AS motiveS
              FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
              WHERE m2.cust_num = src.cn AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) mv
            OUTER APPLY (SELECT TOP 1 ISNULL(EMP_NAME, '') AS nm FROM EMPLOYEE WITH(NOLOCK) WHERE EMP_NUM = cu.MY_COUNSELOR) ec
            OUTER APPLY (SELECT TOP 1 ISNULL(EMP_NAME, '') AS nm FROM EMPLOYEE WITH(NOLOCK) WHERE EMP_NUM = cu.MY_DOCTOR) ed
            OUTER APPLY (SELECT TOP 1 ISNULL(EMP_NAME, '') AS nm FROM EMPLOYEE WITH(NOLOCK) WHERE EMP_NUM = cu.MY_OPTOMETRIST) eo
            ORDER BY src.d, src.examGroup, cu.CUST_NAME
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
