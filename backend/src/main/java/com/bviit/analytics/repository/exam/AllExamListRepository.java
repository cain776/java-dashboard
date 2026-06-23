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
 * ⚠️ 시력교정(EXAM)은 사람(행) 단위, **백내장(Cataract_Exam)은 눈(안구) 단위**다(팀 결정).
 * EXAM_DATE 기준. 시력교정(EXAM)은 리포트(findVisionCorrectionMonthly)와 1:1로 테스트 고객·백내장스텁을
 * 제외한다(중복은 미제외). 시력교정 검사유입(일반/소개/직장인/학생)은 월별 검사자 종합지표
 * (사람 단위)와 정합하나, **백내장은 눈 단위라 종합지표(사람)와 다르다**(백내장 = 레거시 검사수·예약률의 눈 정의).
 *
 * 산출 필드:
 *   - examGroup  : 시력교정 / 드림렌즈 / 백내장. EXAM은 검사일 드림렌즈예약(RESERVE_FLAG='D')만 있고
 *                  의료예약('M') 없으면 드림렌즈, 아니면 시력교정(검사자 리스트와 동일 기준). Cataract_Exam은 백내장.
 *   - eye        : 백내장 행의 안구(R/L). 시력교정·드림렌즈는 빈값.
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
              CASE WHEN src.isCat = 1 THEN N'백내장'
                   WHEN vis.hasDreamlens = 1 AND vis.hasMedical = 0 THEN N'드림렌즈'
                   ELSE N'시력교정' END                     AS examGroup,
              ISNULL(src.eye, '')                          AS eye,
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
              SELECT e.CUST_NUM AS cn, e.EXAM_DATE AS d, 0 AS isCat, '' AS eye
              FROM EXAM e WITH(NOLOCK)
              JOIN CUSTOM cux WITH(NOLOCK) ON e.CUST_NUM = cux.CUST_NUM
              WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                -- 리포트(findVisionCorrectionMonthly)와 1:1 정합: 테스트 고객 + 백내장스텁(같은날 백내장검사 존재 & EXAM 측정값 전무) 제외
                AND NOT (ISNULL(cux.CUST_NAME, '') LIKE N'%테스트%' OR LOWER(ISNULL(cux.CUST_NAME, '')) LIKE '%test%')
                AND NOT (
                  EXISTS (SELECT 1 FROM Cataract_Exam ce WITH(NOLOCK)
                          WHERE ce.CUST_NUM = e.CUST_NUM AND ce.EXAM_DATE = e.EXAM_DATE)
                  AND __EXAM_MEASUREMENTS_BLANK__
                )
              UNION ALL
              -- 백내장은 눈(안구) 단위: 적절 수술방법(OPERATIONR/L)이 입력된 눈만 좌/우 각각 1행.
              -- ExaminationStatsRepository.findCataractMonthly(월간레포트 백내장 검사수)와 동일 필터:
              -- 중단(Stop_YN)·취소(Cancel_CD)·테스트 제외 + 같은 날 백내장검사 예약(RESERVE_FLAG='H') 내원 EXISTS.
              SELECT ce.CUST_NUM AS cn, ce.EXAM_DATE AS d, 1 AS isCat, eye.side AS eye
              FROM Cataract_Exam ce WITH(NOLOCK)
              JOIN CUSTOM cuc WITH(NOLOCK) ON ce.CUST_NUM = cuc.CUST_NUM
              CROSS APPLY (
                SELECT 'R' AS side WHERE NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONR, ''))), '') IS NOT NULL
                UNION ALL
                SELECT 'L' AS side WHERE NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONL, ''))), '') IS NOT NULL
              ) eye
              WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
                AND (ce.Stop_YN IS NULL OR ce.Stop_YN <> 'Y')
                AND (ce.Cancel_CD IS NULL OR LTRIM(RTRIM(ce.Cancel_CD)) = '')
                AND NOT (ISNULL(cuc.CUST_NAME, '') LIKE N'%테스트%' OR LOWER(ISNULL(cuc.CUST_NAME, '')) LIKE '%test%')
                AND EXISTS (SELECT 1 FROM RESERVATION r WITH(NOLOCK)
                            WHERE r.CUST_NUM = ce.CUST_NUM AND r.RESERVE_DATE = ce.EXAM_DATE
                              AND r.RESERVE_STATE IN ('I','H') AND r.RESERVE_FLAG = 'H')
            ) src
            LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = src.cn
            OUTER APPLY (
              -- 검사구분 드림렌즈/시력교정 분리: 검사일에 드림렌즈예약(RESERVE_FLAG='D')만 있고 의료예약('M') 없으면 드림렌즈
              -- (검사자 리스트와 동일 기준). 백내장(isCat=1)은 이 플래그와 무관하게 '백내장'.
              SELECT
                CASE WHEN EXISTS (SELECT 1 FROM RESERVATION rd WITH(NOLOCK)
                                   WHERE rd.CUST_NUM = src.cn AND rd.RESERVE_DATE = src.d
                                     AND rd.RESERVE_STATE IN ('I','H') AND rd.RESERVE_FLAG = 'D') THEN 1 ELSE 0 END AS hasDreamlens,
                CASE WHEN EXISTS (SELECT 1 FROM RESERVATION rm WITH(NOLOCK)
                                   WHERE rm.CUST_NUM = src.cn AND rm.RESERVE_DATE = src.d
                                     AND rm.RESERVE_STATE IN ('I','H') AND rm.RESERVE_FLAG = 'M') THEN 1 ELSE 0 END AS hasMedical
            ) vis
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
            ORDER BY src.d, src.isCat, cu.CUST_NAME
            """.replace("__EXAM_MEASUREMENTS_BLANK__", examMeasurementsBlankPredicate("e"));
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * EXAM 측정값(RIGHT01~30·LEFT01~30)이 모두 비었는지 판정하는 술어.
     * 백내장스텁(같은 날 Cataract_Exam이 있고 EXAM 측정값은 전무한 행) 제외에 사용 —
     * ExaminationStatsRepository.findVisionCorrectionMonthly(리포트)와 동일 기준.
     */
    private String examMeasurementsBlankPredicate(String alias) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 30; i++) {
            if (!sb.isEmpty()) {
                sb.append("\n                  AND ");
            }
            String index = String.format("%02d", i);
            sb.append("NULLIF(LTRIM(RTRIM(ISNULL(")
                    .append(alias).append(".RIGHT").append(index)
                    .append(", ''))), '') IS NULL\n                  AND NULLIF(LTRIM(RTRIM(ISNULL(")
                    .append(alias).append(".LEFT").append(index)
                    .append(", ''))), '') IS NULL");
        }
        return sb.toString();
    }
}
