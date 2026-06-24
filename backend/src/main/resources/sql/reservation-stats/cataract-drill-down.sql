SET NOCOUNT ON;
WITH
CH_CALL AS (
  SELECT DISTINCT
    CASE
      WHEN a.CtiGbnCod='S' AND a.CtiCtgCod='9' AND a.CtiDtlCod1='21' AND a.CtiDtlCod2='21' AND a.CtiDtlCod3='28' AND ISNULL(b.ClgIOF,'I')='I' THEN '백내장_재문의'
      WHEN (a.CtiGbnCod='A' AND a.CtiCtgCod='H' AND a.CtiDtlCod1='10' AND a.CtiDtlCod2 IN ('28','31','32'))
        OR (a.CtiGbnCod='S' AND a.CtiCtgCod='9' AND a.CtiDtlCod1='21' AND a.CtiDtlCod2 IN ('9','41'))
        OR (a.CtiGbnCod='M' AND a.CtiCtgCod='H' AND a.CtiDtlCod1='7' AND a.CtiDtlCod2='5') THEN '백내장_신환'
      WHEN a.CtiGbnCod='S' AND a.CtiCtgCod='9' AND a.CtiDtlCod1='21' AND a.CtiDtlCod2 IN ('21','32') THEN '백내장_신규문의'
      ELSE '' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), a.CtiRgtDtm, 23) AS [예약날짜], CONVERT(VARCHAR(100), a.CtiCallID) AS PK
  FROM CtiRptLst a WITH(NOLOCK) LEFT JOIN CtiClg b WITH(NOLOCK) ON a.CtiCallID = b.ClgNum
  WHERE a.CtiRgtDtm >= :date AND a.CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND ((a.CtiCtgCod='H' AND a.CtiDtlCod1 IN ('10','7')) OR (a.CtiCtgCod='9' AND a.CtiDtlCod1='21'))
),
CH_KAKAO AS (
  SELECT DISTINCT
    CASE WHEN C01.Name='백내장검사' AND C02.Name LIKE '★신환%' THEN '카톡_검사예약'
         WHEN C02.Name='노안' THEN '카톡_노안'
         WHEN C02.Name='예약취소' THEN '카톡_취소'
         ELSE '카톡_문의' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), H.InsertedDateTime, 23) AS [예약날짜], CONVERT(VARCHAR(23), H.InsertedDateTime, 21) AS PK
  FROM HappyTalk_Counsel_List H WITH(NOLOCK)
  LEFT JOIN HappyTalk_Mapping M WITH(NOLOCK) ON H.HappyTalk_Num = M.HappyTalk_Num
  INNER JOIN HappyTalk_Category01 C01 WITH(NOLOCK) ON C01.Seq = H.Category01
  LEFT JOIN HappyTalk_Category02 C02 WITH(NOLOCK) ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
  WHERE H.InsertedDateTime >= :date AND H.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND C01.Name IN ('백내장검사','백내장외래')
),
CH_RES AS (
  SELECT DISTINCT
    CASE WHEN RH.RESERVE_PATH IN ('ONLINE','APP','NAVER') THEN '백내장_온라인예약' ELSE '백내장_예약' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), RH.HISTORY_TIME, 23) AS [예약날짜], CONVERT(VARCHAR(100), RH.HISTORY_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK) INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  WHERE RH.HISTORY_TIME >= :date AND RH.HISTORY_TIME < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND R.RESERVE_FLAG='H' AND R.RESERVE_STATE<>'C' AND R.RESERVE_JINRYO<>'16' AND RH.MEMO='예약저장'
    AND R.CUST_NUM<>'8888888888888' AND NOT (R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%')
),
CH_VISIT AS (
  SELECT DISTINCT
    CASE WHEN R.RESERVE_STATE='Y' AND R.RESERVE_DATE < CAST(GETDATE() AS DATE) THEN '백내장_부도'
         WHEN R.RESERVE_STATE='C' THEN '백내장_취소' END AS GB,
    CASE WHEN R.RESERVE_PATH IN ('ONLINE','APP','NAVER') THEN 'ONLINE' ELSE 'CRM' END AS GB2,
    CONVERT(VARCHAR(10), R.RESERVE_DATE, 23) AS [예약날짜], CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK) INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  WHERE R.RESERVE_DATE >= :date AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND R.RESERVE_FLAG='H' AND R.RESERVE_JINRYO NOT IN ('16','13') AND RH.MEMO='예약저장'
    AND R.CUST_NUM<>'8888888888888' AND NOT (R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%')
),
CH_EXAM AS (
  SELECT DISTINCT '백내장_내원' AS GB, '' AS GB2, CONVERT(VARCHAR(10), e.EXAM_DATE, 23) AS [예약날짜],
         CONVERT(VARCHAR(100), e.CUST_NUM) + '_' + CONVERT(VARCHAR(20), e.SEQ) AS PK
  FROM Cataract_Exam e WITH(NOLOCK)
  WHERE e.EXAM_DATE >= :date AND e.EXAM_DATE < DATEADD(DAY,1,CONVERT(datetime,:date)) AND ISNULL(e.Stop_YN,'') <> 'Y'
    AND EXISTS (SELECT 1 FROM RESERVATION r WITH(NOLOCK)
                WHERE LTRIM(RTRIM(r.CUST_NUM)) = LTRIM(RTRIM(e.CUST_NUM))
                  AND r.RESERVE_DATE = e.EXAM_DATE AND r.RESERVE_FLAG='H' AND r.RESERVE_STATE IN ('I','H'))
),
CH_TM AS (
  SELECT DISTINCT
    CASE WHEN TM_Gubun='1000' THEN 'TM_예약' WHEN TM_Gubun='2000' THEN 'TM_유효' ELSE 'TM_DB' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), assign_date, 23) AS [예약날짜], CONVERT(VARCHAR(100), DBCust_num) AS PK
  FROM DB_CUSTOM WITH(NOLOCK)
  WHERE assign_date >= :date AND assign_date < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND TM_EMP IN ('KC0307','BV1119','BV1207','BV0067') AND ISNULL(Gubun,'') NOT LIKE 'B2B%'
),
CH_ALL AS (
  SELECT 'CH_CALL' AS [source], GB, GB2, PK, [예약날짜] FROM CH_CALL
  UNION ALL SELECT 'CH_KAKAO', GB, GB2, PK, [예약날짜] FROM CH_KAKAO
  UNION ALL SELECT 'CH_RES', GB, GB2, PK, [예약날짜] FROM CH_RES
  UNION ALL SELECT 'CH_VISIT', GB, GB2, PK, [예약날짜] FROM CH_VISIT
  UNION ALL SELECT 'CH_EXAM', GB, GB2, PK, [예약날짜] FROM CH_EXAM
  UNION ALL SELECT 'CH_TM', GB, GB2, PK, [예약날짜] FROM CH_TM
),
DETAIL AS (
  SELECT
    CH.[예약날짜] AS d,
    FIELD_MAP.field,
    CH.[source],
    CH.GB AS gb,
    CH.GB2 AS gb2,
    CH.PK AS [primaryKey],
    FIELD_MAP.contribution
  FROM CH_ALL CH
  -- FIELD_MAP: cataract-daily-counts.sql의 SUM(CASE...)와 같은 필드별 row 기여도 정의.
  CROSS APPLY (VALUES
    ('totalCataract', CASE WHEN CH.GB IN ('백내장_신환','카톡_검사예약','백내장_온라인예약','TM_예약') THEN 1 ELSE 0 END),
    ('newExamInquiry', CASE WHEN CH.GB IN ('백내장_신규문의','백내장_신환') THEN 1 ELSE 0 END),
    ('newReInquiry', CASE WHEN CH.GB='백내장_재문의' THEN 1 ELSE 0 END),
    ('newPatient', CASE WHEN CH.GB='백내장_신환' THEN 1 ELSE 0 END),
    ('tmTotalDb', CASE WHEN CH.GB IN ('TM_예약','TM_유효','TM_DB') THEN 1 ELSE 0 END),
    ('tmValidDb', CASE WHEN CH.GB IN ('TM_예약','TM_유효') THEN 1 ELSE 0 END),
    ('tmReservation', CASE WHEN CH.GB='TM_예약' THEN 1 ELSE 0 END),
    ('kakaoTotalInquiry', CASE WHEN CH.GB IN ('카톡_검사예약','카톡_노안','카톡_취소','카톡_문의') THEN 1 ELSE 0 END),
    ('kakaoCataractReservation', CASE WHEN CH.GB='카톡_검사예약' THEN 1 ELSE 0 END),
    ('kakaoPresbyopiaReservation', CASE WHEN CH.GB='카톡_노안' THEN 1 ELSE 0 END),
    ('onlineReservation', CASE WHEN CH.GB='백내장_온라인예약' THEN 1 ELSE 0 END),
    ('cancelOnline', CASE WHEN CH.GB='백내장_취소' AND CH.GB2='ONLINE' THEN 1 ELSE 0 END),
    ('cancelCrm', CASE WHEN CH.GB='백내장_취소' AND CH.GB2='CRM' THEN 1 ELSE 0 END),
    ('cancelKakao', CASE WHEN CH.GB='카톡_취소' THEN 1 ELSE 0 END),
    ('visit', CASE WHEN CH.GB='백내장_내원' THEN 1 ELSE 0 END),
    ('noShowReservation', CASE WHEN CH.GB='백내장_부도' THEN 1 ELSE 0 END),
    ('cancel', CASE WHEN CH.GB='백내장_취소' THEN 1 ELSE 0 END)
  ) FIELD_MAP(field, contribution)
  WHERE FIELD_MAP.field = :field AND FIELD_MAP.contribution <> 0
)
SELECT d, field, [source], gb, gb2, [primaryKey], contribution
FROM DETAIL
ORDER BY d, [source], [primaryKey], field;
