package com.bviit.analytics.repository.exam;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 백내장 검사자 리스트 — 성민CRM "백내장 검사자 리스트"(FrmCataract_ExamList) 화면 소스.
 * 소스: Cataract_Exam + Cataract_Operationdata + CUSTOM + EMPLOYEE + RESERVATION(flag 'H') + MOTIVE/COSTPRICE 등.
 * 검사자 리스트(시력교정/EXAM)와 동일한 47필드 계약을 공유하되, 소스 테이블만 백내장 계열로 교체.
 * docs/db/백내장검사리스트-컬럼정의.md 참조.
 *
 * 백내장 특화:
 *   - 예약 진료구분/검사시간/경로 = RESERVE_FLAG='H' 예약 (시력교정의 'M'과 다름)
 *   - 수술불가 = Impossible, 취소메모 = Cancel_reason (EXAM과 컬럼명 다름)
 *   - 견적가/집도의/수술일 = 좌/우(OP_ESTIMATE_R/L, OperationR/L_Doc, OperationR/L_Date) 통합
 *   - 적절한수술방법·수술방법 = IOL 렌즈명
 *
 * READ-ONLY · MSSQL 2014 호환(LTRIM/RTRIM). 날짜는 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile("mssql")
public class CataractExamListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public CataractExamListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findCataractExamList(String from, String to) {
        String sql = """
            SELECT
              ISNULL(LTRIM(RTRIM(cu.CUST_NUM)), '')        AS chartNo,
              ISNULL(cu.CUST_NAME, '')                     AS name,
              ISNULL(cu.CUST_ENAME, '')                    AS nameEng,
              ISNULL(ce.EXAM_DATE, '')                     AS examDate,
              ISNULL(
                NULLIF(LTRIM(RTRIM(ms.SUB_NAME)), ''),
                CASE WHEN ISNULL(LTRIM(RTRIM(rsv.RESERVE_FLAG)),'') = 'H' THEN '백내장검사' ELSE '' END
              )                                            AS examType,
              ISNULL(rsvReg.regDate, '')                   AS examRegDate,
              '백내장'                                      AS examCategory,
              CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                   THEN '신환' ELSE '구환' END             AS patientType,
              ISNULL(ce.EXAM_MEMO, '')                     AS examMemo,
              LTRIM(RTRIM(
                CASE
                  WHEN ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_R)),'0'),'') <> ''
                   AND ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_L)),'0'),'') <> ''
                  THEN 'R ' + LTRIM(RTRIM(ce.OP_ESTIMATE_R)) + ' / L ' + LTRIM(RTRIM(ce.OP_ESTIMATE_L))
                  WHEN ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_R)),'0'),'') <> '' THEN LTRIM(RTRIM(ce.OP_ESTIMATE_R))
                  WHEN ISNULL(NULLIF(LTRIM(RTRIM(ce.OP_ESTIMATE_L)),'0'),'') <> '' THEN LTRIM(RTRIM(ce.OP_ESTIMATE_L))
                  ELSE '' END
              ))                                           AS estimate,
              ISNULL(ce.ExamPercent, '')                   AS surgeryRate,
              ISNULL(rsv.START_TIME, '')                   AS examTime,
              ISNULL(ce.OPERATIONR, '')                    AS recommendedR,
              ISNULL(ce.OPERATIONL, '')                    AS recommendedL,
              ISNULL(opReg.regDate, '')                    AS surgeryRegDate,
              ISNULL(opRsv.RESERVE_DATE, '')               AS surgeryReserveDate,
              ISNULL(COALESCE(NULLIF(LTRIM(RTRIM(op.OPERATIONR_DATE)),''), NULLIF(LTRIM(RTRIM(op.OPERATIONL_DATE)),'')), '') AS surgeryDate,
              ISNULL(op.OPERATIONR, '')                    AS surgeryR,
              ISNULL(op.OPERATIONL, '')                    AS surgeryL,
              ISNULL(COALESCE(NULLIF(LTRIM(RTRIM(osr.EMP_NAME)),''), NULLIF(LTRIM(RTRIM(osl.EMP_NAME)),'')), '') AS surgeon,
              ISNULL(REPLACE(CONVERT(varchar(30), CONVERT(money, NULLIF(pay.RECEIPT, 0)), 1), '.00', ''), '') AS payment,
              ISNULL(ec.EMP_NAME, '')                      AS counselor,
              ISNULL(ed.EMP_NAME, '')                      AS doctor,
              ''                                           AS jumin,
              ISNULL(cu.BIRTH_DAY, '')                     AS birth,
              CASE WHEN cu.LUNAR_YN = 'Y' THEN '음' ELSE '양' END AS lunar,
              ISNULL(cu.CALL_NUM1, '')                     AS phone1,
              ISNULL(cu.CALL_NUM2, '')                     AS phone2,
              ISNULL(cu.EMAIL, '')                         AS email,
              ISNULL(LTRIM(RTRIM(cu.ZIP_CODE)), '')        AS zip,
              ISNULL(cu.ADDR1, '')                         AS addr1,
              ISNULL(cu.ADDR2, '')                         AS addr2,
              ISNULL(cu.ETC, '')                           AS memo,
              ISNULL(LTRIM(RTRIM(ce.Stop_YN)), '')         AS examStop,
              ISNULL(LTRIM(RTRIM(ce.Impossible)), '')      AS opImpossible,
              ISNULL(rsv.RESERVE_PATH, '')                 AS route,
              ISNULL(motive.section, '')                   AS section,
              ISNULL(motive.motiveL, '')                   AS motiveL,
              ISNULL(motive.motiveM, '')                   AS motiveM,
              ISNULL(motive.motiveS, '')                   AS motiveS,
              ISNULL(motive.motiveMemo, '')                AS motiveMemo,
              ISNULL(eo.EMP_NAME, '')                      AS optometrist,
              ISNULL(LTRIM(RTRIM(ce.Cancel_CD)), '')       AS cancelCode,
              ISNULL(NULLIF(ce.Cancel_reason, ''), ISNULL(cc.CANCEL_REASON, '')) AS cancelMemo,
              ISNULL(cu.LEVEL, '')                         AS grade,
              ISNULL(cu.JOB, '')                           AS job,
              ISNULL(cu.LAST_DAY, '')                      AS lastVisit,
              ISNULL(ins.EtcCodNam, '')                    AS insurance,
              ISNULL(nation.Nation_CodeName, '')           AS nationality
            FROM Cataract_Exam ce WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK)                       ON ce.CUST_NUM = cu.CUST_NUM
            LEFT JOIN Cataract_Operationdata op WITH(NOLOCK)  ON ce.CUST_NUM = op.CUST_NUM
            LEFT JOIN EMPLOYEE osr WITH(NOLOCK)               ON op.OPERATIONR_DOC = osr.EMP_NUM
            LEFT JOIN EMPLOYEE osl WITH(NOLOCK)               ON op.OPERATIONL_DOC = osl.EMP_NUM
            LEFT JOIN EMPLOYEE ec WITH(NOLOCK)                ON cu.MY_COUNSELOR   = ec.EMP_NUM
            LEFT JOIN EMPLOYEE ed WITH(NOLOCK)                ON cu.MY_DOCTOR      = ed.EMP_NUM
            LEFT JOIN EMPLOYEE eo WITH(NOLOCK)                ON cu.MY_OPTOMETRIST = eo.EMP_NUM
            LEFT JOIN CANCEL_CFG cc WITH(NOLOCK)              ON ce.Cancel_CD      = cc.CANCEL_CD
            LEFT JOIN NationCustom_CFG nation WITH(NOLOCK)    ON cu.Nation_code    = nation.Code
            LEFT JOIN EtcCfg ins WITH(NOLOCK)
              ON ins.EtcBseCod = 'InsuranceCfg' AND ins.EtcCod = cu.InsuranceCode
            OUTER APPLY (
              SELECT TOP 1 r.RESERVE_FLAG, r.RESERVE_JINRYO, r.START_TIME, r.RESERVE_PATH, r.RESERVE_NUM
              FROM RESERVATION r WITH(NOLOCK)
              WHERE r.CUST_NUM = ce.CUST_NUM AND r.RESERVE_DATE = ce.EXAM_DATE
                AND r.RESERVE_STATE IN ('I','H') AND r.RESERVE_FLAG = 'H'
              ORDER BY r.RESERVE_NUM DESC
            ) rsv
            LEFT JOIN MEDICAL_SUB_CFG ms WITH(NOLOCK)
              ON ms.RESERVE_FLAG = rsv.RESERVE_FLAG AND ms.SUB_FLAG = ISNULL(rsv.RESERVE_JINRYO, '')
            OUTER APPLY (
              SELECT CASE WHEN LEN(LTRIM(RTRIM(ISNULL(rsv.RESERVE_NUM, '')))) >= 6
                          THEN '20' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 1, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 3, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(rsv.RESERVE_NUM)), 5, 2)
                          ELSE '' END AS regDate
            ) rsvReg
            OUTER APPLY (
              SELECT TOP 1 f.RESERVE_DATE, f.RESERVE_NUM
              FROM RESERVATION f WITH(NOLOCK)
              WHERE f.CUST_NUM = ce.CUST_NUM AND f.RESERVE_FLAG = 'O' AND f.RESERVE_STATE <> 'C'
              ORDER BY f.RESERVE_NUM DESC
            ) opRsv
            OUTER APPLY (
              SELECT CASE WHEN LEN(LTRIM(RTRIM(ISNULL(opRsv.RESERVE_NUM, '')))) >= 6
                          THEN '20' + SUBSTRING(LTRIM(RTRIM(opRsv.RESERVE_NUM)), 1, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(opRsv.RESERVE_NUM)), 3, 2)
                             + '-' + SUBSTRING(LTRIM(RTRIM(opRsv.RESERVE_NUM)), 5, 2)
                          ELSE '' END AS regDate
            ) opReg
            OUTER APPLY (
              SELECT TOP 1
                ISNULL(m2.category01_name, '') AS motiveL,
                ISNULL(m2.category02_name, '') AS motiveM,
                ISNULL(m2.category03_name, '') AS motiveS,
                ISNULL(NULLIF(m1.comments, ''), ISNULL(m2.name, '')) AS motiveMemo,
                ISNULL(CONVERT(varchar(10), m2.[section]), '') AS section
              FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
              LEFT JOIN MOTIVE_NEW01 m1 WITH(NOLOCK) ON m2.fkey = m1.pkey
              WHERE m2.cust_num = ce.CUST_NUM AND m2.Idx = '1'
              ORDER BY m2.pkey DESC
            ) motive
            LEFT JOIN (
              SELECT TMP.PRC_CUSNUM, SUM(TMP.RECEIPT) AS RECEIPT
              FROM (
                SELECT A.CUST_NUM AS PRC_CUSNUM, SUM(ISNULL(A.COST_PRICE, 0)) AS RECEIPT
                FROM COSTPRICE A WITH(NOLOCK)
                LEFT JOIN (SELECT CstCusNum, CstSeq FROM CSTPRCSUB WITH(NOLOCK) GROUP BY CstCusNum, CstSeq) B
                  ON A.CUST_NUM = B.CstCusNum AND A.SEQ = B.CstSeq
                LEFT JOIN (SELECT PrcCusNum, PrcSeq FROM PRCITMLST WITH(NOLOCK) GROUP BY PrcCusNum, PrcSeq) C
                  ON A.CUST_NUM = C.PrcCusNum AND A.SEQ = C.PrcSeq
                WHERE B.CstCusNum IS NULL AND C.PrcCusNum IS NULL
                  AND A.COST_FLAG IN ('O','I','H') AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                GROUP BY A.CUST_NUM
                UNION ALL
                SELECT B.CstCusNum AS PRC_CUSNUM, SUM(ISNULL(B.CstPrc, 0)) AS RECEIPT
                FROM COSTPRICE A WITH(NOLOCK)
                JOIN CSTPRCSUB B WITH(NOLOCK)
                  ON A.CUST_NUM = B.CstCusNum AND A.SEQ = B.CstSeq
                 AND A.COST_FLAG IN ('O','I','H') AND B.CstCnlYnN = 'N' AND B.CstPayTyp = 'N'
                LEFT JOIN PRCITMLST C WITH(NOLOCK) ON B.CstCusNum = C.PrcCusNum AND B.CstSeq = C.PrcSeq
                WHERE C.PrcCusNum IS NULL AND UPPER(ISNULL(A.PayStt, '')) <> 'A'
                GROUP BY B.CstCusNum
                UNION ALL
                SELECT T2.CUST_NUM AS PRC_CUSNUM,
                       SUM(CASE D.PrcCnlYnN WHEN 'Y' THEN 0 ELSE ISNULL(D.PrcDtlPrc, 0) END) AS RECEIPT
                FROM (SELECT DISTINCT A.CUST_NUM, A.SEQ FROM COSTPRICE A WITH(NOLOCK)
                      WHERE ISNULL(A.COST_FLAG, '') = '' AND UPPER(ISNULL(A.PayStt, '')) <> 'A') T2
                JOIN PRCITMLST C WITH(NOLOCK) ON T2.CUST_NUM = C.PrcCusNum AND T2.SEQ = C.PrcSeq AND C.PrcCod IN ('O','I','H')
                JOIN PrcItmDtl D WITH(NOLOCK)  ON T2.CUST_NUM = D.PrcCusNum AND T2.SEQ = D.PrcSeq AND D.PrcCod IN ('O','I','H')
                GROUP BY T2.CUST_NUM
              ) TMP
              GROUP BY TMP.PRC_CUSNUM
            ) pay ON ce.CUST_NUM = pay.PRC_CUSNUM AND ce.CUST_NUM <> '9999999999999'
            WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
            ORDER BY ce.EXAM_DATE, rsv.START_TIME, cu.CUST_NAME
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
