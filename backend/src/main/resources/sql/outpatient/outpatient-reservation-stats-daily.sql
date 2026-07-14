SET NOCOUNT ON;
-- 외래 예약통계(BCRM RSS) 일자별 원시 카운트 — 외래 = RESERVE_FLAG='F'.
-- 시력교정(system-daily-counts.sql)과 동일한 채널 종합표를 외래 기준으로 재현한다.
-- 스펙: BCRM_RSS_외래·백내장_260512 + BCRM 콜_마감 정본 쿼리(2026-07-14 사용자 제공).
--
-- 채널 소스:
--   콜 인입/응대콜  = EICN OPENQUERY(stat_user_inbound_bseye), 외래 큐 hunt_number
--                     '07040180091'(05_IVR4_수술후_1) + '00033331103'(08_드림렌즈 일반외래), dcontext='hunt_context'
--   콜 예약/변경/취소/문의만 = CtiRptLst. CtiGbnCod A=예약등록·M=예약수정·C=예약취소·S=상담등록(문의만).
--                     예약행(A/M/C)=CtiCtgCod='F'(외래), 상담행(S=문의만)=CtiCtgCod='3'(외래 상담).
--                     상세1=CtiDtlCod1(1=외래초진·2=일정문의·4=일정불가). ⚠️ 예약변경(M)은 SoftTeleManager
--                     내부 dedup(연결콜/예약1건)이라 라이브가 다소 과다 — 확정월은 스냅샷으로 보정.
--   어플/현장 예약/취소 = RESERVATION(FLAG='F') 예약등록일(RESERVE_NUM YYMMDD), APP=어플·CRM=현장
--   카톡 모든상담/예약/취소 = HappyTalk C01='수술후외래'(외래카톡). 예약=일정예약및변경·당일취소후예약,
--                     취소=예약취소·당일취소후예약(당일취소후예약은 예약·취소 양쪽 카운트 — 콜_마감 정의).
--   부도 = RESERVATION(FLAG='F') 예약일(RESERVE_DATE) STATE='Y' 과거일, 경로별 CTI/APP/CRM.
--
-- READ-ONLY · MSSQL 2014 호환. MSSQL측 :from/:to 네임드 파라미터, OPENQUERY 내부(MySQL 리터럴)는
-- ISO(yyyy-MM-dd) 재검증 후 __OQ_FROM__/__OQ_TO__ 치환(주입 방지, 시력교정 repo와 동일 패턴).
WITH
-- 콜 인입/응대콜 (EICN 외래 큐)
EICN AS (
  SELECT CONVERT(VARCHAR(10), stat_date, 23) AS d, inbound AS inboundCall, answered AS answeredCall
  FROM OPENQUERY(EICN_MySQL,
    'SELECT stat_date, SUM(in_total) AS inbound, SUM(in_success) AS answered
       FROM stat_user_inbound_bseye
      WHERE stat_date BETWEEN ''__OQ_FROM__'' AND ''__OQ_TO__''
        AND dcontext = ''hunt_context''
        AND hunt_number IN (''07040180091'',''00033331103'')
      GROUP BY stat_date')
),
-- 콜 문의만/예약/예약변경/취소 (CtiRptLst)
CTI AS (
  SELECT CONVERT(VARCHAR(10), CtiRgtDtm, 23) AS d,
         SUM(CASE WHEN CtiGbnCod='S' AND CtiCtgCod='3' AND CtiDtlCod1 IN (1,2)   THEN 1 ELSE 0 END) AS inquiryOnly,       -- 문의만(상담등록)
         SUM(CASE WHEN CtiGbnCod='A' AND CtiCtgCod='F' AND CtiDtlCod1 IN (1,2,4) THEN 1 ELSE 0 END) AS callReservation,   -- 예약(예약등록)
         SUM(CASE WHEN CtiGbnCod='M' AND CtiCtgCod='F' AND CtiDtlCod1 IN (1,2,4) THEN 1 ELSE 0 END) AS reservationChange, -- 예약변경(예약수정)
         SUM(CASE WHEN CtiGbnCod='C' AND CtiCtgCod='F' AND CtiDtlCod1 = 4        THEN 1 ELSE 0 END) AS callCancel          -- 취소(예약취소)
  FROM CtiRptLst WITH(NOLOCK)
  WHERE CtiRgtDtm >= :from AND CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
  GROUP BY CONVERT(VARCHAR(10), CtiRgtDtm, 23)
),
-- 어플·현장 예약/취소: RESERVATION(FLAG='F'), 예약등록일=RESERVE_NUM 앞 6자리(YYMMDD).
--   ⚠️ RSS 스펙(예약경로×예약상태 피벗)은 '예약'(STATE='Y') 행만 예약으로 기입하고 '내원'(I)은 제외한다.
--   STATE<>'C'로 잡으면 내원(I)까지 포함돼 ~2배 과다(내원이 예약과 비슷한 규모). 반드시 ='Y'.
--   (당월 라이브는 등록 후 내원 처리되면 Y→I로 빠져 시점에 따라 소폭 감소 — 확정월은 D-1 스냅샷으로 동결.)
REG AS (
  SELECT '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) AS d,
         SUM(CASE WHEN R.RESERVE_PATH='APP' AND R.RESERVE_STATE='Y' THEN 1 ELSE 0 END) AS appReservation,
         SUM(CASE WHEN R.RESERVE_PATH='APP' AND R.RESERVE_STATE='C' THEN 1 ELSE 0 END) AS appCancel,
         SUM(CASE WHEN R.RESERVE_PATH='CRM' AND R.RESERVE_STATE='Y' THEN 1 ELSE 0 END) AS crmReservation,
         SUM(CASE WHEN R.RESERVE_PATH='CRM' AND R.RESERVE_STATE='C' THEN 1 ELSE 0 END) AS crmCancel
  FROM RESERVATION R WITH(NOLOCK)
  WHERE R.RESERVE_FLAG = 'F'
    AND '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) >= CONVERT(VARCHAR(10),:from,23)
    AND '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) <= CONVERT(VARCHAR(10),:to,23)
  GROUP BY '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2)
),
-- 카톡: HappyTalk 외래카톡(C01='수술후외래'). 당일취소후예약은 예약·취소 양쪽 카운트(콜_마감 정의).
KAKAO AS (
  SELECT CONVERT(VARCHAR(10), H.InsertedDateTime, 23) AS d,
         COUNT(*) AS kakaoAll,
         SUM(CASE WHEN C02.Name IN ('일정예약및변경','일정예약 및 변경','당일 취소 후 예약') THEN 1 ELSE 0 END) AS kakaoReservation,
         SUM(CASE WHEN C02.Name IN ('예약취소','당일 취소 후 예약') THEN 1 ELSE 0 END) AS kakaoCancel
  FROM HappyTalk_Counsel_List H WITH(NOLOCK)
  INNER JOIN HappyTalk_Category01 C01 WITH(NOLOCK) ON C01.Seq = H.Category01
  LEFT JOIN HappyTalk_Category02 C02 WITH(NOLOCK) ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
  WHERE H.InsertedDateTime >= :from AND H.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND C01.Name = '수술후외래'
  GROUP BY CONVERT(VARCHAR(10), H.InsertedDateTime, 23)
),
-- 부도(no-show): RESERVATION(FLAG='F') 예약일(RESERVE_DATE) STATE='Y' 과거일. 경로별.
--   ⚠️ 현장(CRM)은 내원해도 Y로 방치하는 경우가 많아 과다 집계 경향(시력교정 예약부도와 동일 한계).
NOSHOW AS (
  SELECT CONVERT(VARCHAR(10), R.RESERVE_DATE, 23) AS d,
         SUM(CASE WHEN R.RESERVE_PATH='CTI' THEN 1 ELSE 0 END) AS noShowCti,
         SUM(CASE WHEN R.RESERVE_PATH='APP' THEN 1 ELSE 0 END) AS noShowApp,
         SUM(CASE WHEN R.RESERVE_PATH='CRM' THEN 1 ELSE 0 END) AS noShowCrm
  FROM RESERVATION R WITH(NOLOCK)
  WHERE R.RESERVE_FLAG = 'F' AND R.RESERVE_STATE = 'Y'
    AND R.RESERVE_DATE >= :from AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND R.RESERVE_DATE < CAST(GETDATE() AS DATE)
  GROUP BY CONVERT(VARCHAR(10), R.RESERVE_DATE, 23)
),
DATES AS (
  SELECT d FROM EICN
  UNION SELECT d FROM CTI
  UNION SELECT d FROM REG
  UNION SELECT d FROM KAKAO
  UNION SELECT d FROM NOSHOW
)
SELECT
  Z.d AS d,
  ISNULL(EICN.inboundCall,0)      AS inboundCall,
  ISNULL(EICN.answeredCall,0)     AS answeredCall,
  ISNULL(CTI.inquiryOnly,0)       AS inquiryOnly,
  ISNULL(REG.appReservation,0)    AS appReservation,
  ISNULL(REG.appCancel,0)         AS appCancel,
  ISNULL(REG.crmReservation,0)    AS crmReservation,
  ISNULL(REG.crmCancel,0)         AS crmCancel,
  ISNULL(CTI.reservationChange,0) AS reservationChange,
  ISNULL(CTI.callReservation,0)   AS callReservation,
  ISNULL(CTI.callCancel,0)        AS callCancel,
  ISNULL(KAKAO.kakaoAll,0)        AS kakaoAll,
  ISNULL(KAKAO.kakaoReservation,0) AS kakaoReservation,
  ISNULL(KAKAO.kakaoCancel,0)     AS kakaoCancel,
  ISNULL(NOSHOW.noShowCti,0)      AS noShowCti,
  ISNULL(NOSHOW.noShowApp,0)      AS noShowApp,
  ISNULL(NOSHOW.noShowCrm,0)      AS noShowCrm
FROM DATES Z
LEFT JOIN EICN   ON EICN.d = Z.d
LEFT JOIN CTI    ON CTI.d = Z.d
LEFT JOIN REG    ON REG.d = Z.d
LEFT JOIN KAKAO  ON KAKAO.d = Z.d
LEFT JOIN NOSHOW ON NOSHOW.d = Z.d
ORDER BY Z.d
