package com.bviit.analytics.repository.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계시스템 — BCRM RSS 컨택통계 일자별 원시 카운트(CH01~CH24).
 *
 * 운영 BCRM RSS 쿼리를 단일 SELECT(임시테이블 → CTE)로 재구성한 것. 7개 채널 소스를 PK+예약날짜로
 * LEFT JOIN해 일자별 카운트를 낸다. 검사 인입/응대콜은 EICN_MySQL 링크드서버를 OPENQUERY로 조회한다.
 *
 * 날짜 바인딩:
 *   - MSSQL 측 술어는 모두 :from / :to 네임드 파라미터(등록일 ≥ from, &lt; to+1일).
 *   - OPENQUERY 내부(MySQL 문자열 리터럴)는 파라미터 바인딩이 불가하므로, 컨트롤러에서
 *     LocalDate로 검증된 ISO 날짜(yyyy-MM-dd)만 치환한다(아래 ISO 형식 재검증 후 replace).
 *
 * READ-ONLY · MSSQL 2014 호환(TRIM 금지, WITH(NOLOCK)).
 */
@Repository
@Profile("mssql")
public class ReservationStatsSystemRepository {

    private static final String ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationStatsSystemRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<ReservationStatsDailyRow> findDailyCounts(String from, String to) {
        // OPENQUERY 리터럴 치환 전 ISO 형식 재검증(주입 방지). 컨트롤러가 LocalDate로 이미 검증하나 이중 가드.
        if (from == null || to == null || !from.matches(ISO_DATE) || !to.matches(ISO_DATE)) {
            throw new IllegalArgumentException("from/to must be ISO yyyy-MM-dd dates");
        }
        String sql = SQL.replace("__OQ_FROM__", from).replace("__OQ_TO__", to);

        return jdbc.query(sql,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new ReservationStatsDailyRow(
                        rs.getString("d"),
                        rs.getInt("inboundCall"), rs.getInt("answeredCall"), rs.getInt("newInquiry"), rs.getInt("callReservation"),
                        rs.getInt("tmTotalDb"), rs.getInt("tmValidDb"), rs.getInt("tmReservation"),
                        rs.getInt("tmRecounsel"), rs.getInt("tmRecounselValid"), rs.getInt("tmRecounselReservation"),
                        rs.getInt("homeReceived"), rs.getInt("homeReservation"),
                        rs.getInt("naverReceived"), rs.getInt("naverRejected"), rs.getInt("naverValid"), rs.getInt("naverReservation"),
                        rs.getInt("kakaoInquiry"), rs.getInt("kakaoReservation"),
                        rs.getInt("cancelCallNaver"), rs.getInt("cancelHome"), rs.getInt("cancelKakao"),
                        rs.getInt("visit"), rs.getInt("noShowReservation"), rs.getInt("cancel")));
    }

    /** 단일 SELECT로 재구성한 BCRM RSS 컨택통계 — 일자별 CH01~CH24 원시 카운트. */
    private static final String SQL = """
            SET NOCOUNT ON;
            IF OBJECT_ID('tempdb..#naver') IS NOT NULL DROP TABLE #naver;
            SELECT CONVERT(VARCHAR(10), R.InsertedDateTime, 23) AS regDate,
                   CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK, R.RESERVE_STATE AS state
              INTO #naver
              FROM RESERVATION R WITH(NOLOCK)
             WHERE R.RESERVE_PATH='NAVER' AND R.RESERVE_FLAG='M' AND R.RESERVE_JINRYO IN ('','5','6','7')
               AND R.InsertedDateTime >= :from AND R.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to));
            WITH
            CH_01 AS (
              SELECT CONVERT(VARCHAR(10), stat_date, 23) AS 예약날짜, inbound AS 인입콜, answered AS 응대콜
              FROM OPENQUERY(EICN_MySQL,
                'SELECT stat_date, SUM(in_total) AS inbound, SUM(in_success) AS answered
                   FROM stat_user_inbound_bseye
                  WHERE stat_date BETWEEN ''__OQ_FROM__'' AND ''__OQ_TO__''
                    AND dcontext = ''hunt_context''
                    AND hunt_number IN (''00000001121'',''07040180093'')
                  GROUP BY stat_date')
            ),
            CH_03 AS (
              SELECT DISTINCT
                CASE WHEN ((CtiGbnCod='A' and CtiCtgCod='M' and CtiDtlCod2='12')
                        OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='18')
                        OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='23')
                        OR (CtiGbnCod='M' and CtiCtgCod='M' and CtiDtlCod2='4')) THEN '검사_예약'
                     WHEN ((CtiGbnCod='A' and CtiCtgCod='M' and CtiDtlCod2='27')
                        OR CtiRptMmo LIKE '%+1%' OR CtiRptMmo LIKE '%+2%' OR CtiRptMmo LIKE '%+3%' OR CtiRptMmo LIKE '%+4%' OR CtiRptMmo LIKE '%+5%') THEN '검사_추가예약'
                     WHEN ((CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='17' AND (CtiDtlCod3 IS NULL OR CtiDtlCod3<>'29'))
                        OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='18')
                        OR (CtiGbnCod='A' and CtiCtgCod='M' and CtiDtlCod2='12')
                        OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='23')
                        OR (CtiGbnCod='M' and CtiCtgCod='M' and CtiDtlCod2='4')
                        OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='29' AND (CtiDtlCod3 IS NULL OR CtiDtlCod3<>'29'))) THEN '검사_신규예약문의'
                     ELSE '' END AS [GB],
                '' AS [GB2],
                CONVERT(VARCHAR(10), a.CtiRgtDtm, 23) AS [예약날짜],
                a.CtiCallID AS PK
              FROM CtiRptLst a WITH(NOLOCK)
              LEFT JOIN CtiClg b WITH(NOLOCK) ON a.CtiCallID = b.ClgNum
              WHERE a.CtiRgtDtm >= :from AND a.CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
                AND ISNULL(b.clgIOF,'I') = 'I'
            ),
            CH_04 AS (
              SELECT DISTINCT
                CASE WHEN TM_Gubun IN('1000') THEN 'TM_예약'
                     WHEN TM_Gubun IN('1000','2000') THEN 'TM_유효DB'
                     ELSE 'TM' END AS [GB],
                '' AS [GB2],
                CONVERT(VARCHAR(10), assign_date, 23) AS [예약날짜],
                a.DBCust_num AS PK
              FROM DB_CUSTOM a WITH(NOLOCK)
              WHERE a.assign_date >= :from AND a.assign_date < DATEADD(DAY,1,CONVERT(datetime,:to))
                AND NOT TM_EMP IN('KC0307','BV1119','BV1207','BV0067')
            ),
            CH_05 AS (
              SELECT DISTINCT
                CASE WHEN ReCounsel_Memo LIKE '%예약' THEN 'TM_재상담예약'
                     WHEN recounsel_state IN ('6') THEN 'TM_재상담유효'
                     ELSE 'TM_재상담' END AS [GB],
                '' AS [GB2],
                CONVERT(VARCHAR(10), InsertedDateTime, 23) AS [예약날짜],
                CONVERT(VARCHAR(100), a.Pkey) AS PK
              FROM DB_ReCounsel a WITH(NOLOCK)
              WHERE a.InsertedDateTime >= :from AND a.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
                AND (NOT (ReCounsel_Memo LIKE '%테스트%' OR ReCounsel_Memo LIKE '%TEST%') OR ReCounsel_Memo IS NULL)
            ),
            CH_06 AS (
              SELECT DISTINCT
                CASE WHEN RH.RESERVE_PATH IN ('ONLINE','APP') AND R.RESERVE_STATE <> 'C' THEN '홈페이지_예약'
                     WHEN RH.RESERVE_PATH IN ('ONLINE','APP') THEN '홈페이지'
                     ELSE '' END AS [GB],
                '' AS [GB2],
                CONVERT(VARCHAR(10), HISTORY_TIME, 23) AS [예약날짜],
                CONVERT(VARCHAR(100), RH.HISTORY_NUM) AS PK
              FROM RESERVATION R WITH(NOLOCK)
              RIGHT JOIN CUSTOM C WITH(NOLOCK) ON C.CUST_NUM = R.CUST_NUM
              INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
              WHERE RH.HISTORY_TIME >= :from AND RH.HISTORY_TIME < DATEADD(DAY,1,CONVERT(datetime,:to))
                AND R.RESERVE_FLAG = 'M'
                AND R.RESERVE_JINRYO IN ('','5','6','7')
                AND RH.MEMO = '예약저장'
                AND ( C.ETC IS NULL OR NOT (
                     R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%' OR R.COMMENT LIKE '%시뮬레이션%' OR R.COMMENT LIKE '%중복DB%'
                  OR R.COMMENT LIKE '%중복예약%' OR R.COMMENT LIKE '%차트있음%' OR R.COMMENT LIKE '%재검%'
                  OR C.ETC LIKE '%홍보실 가상계정%' OR C.ETC LIKE '%가상계정%' OR C.ETC LIKE '%가상데이터%' OR C.ETC LIKE '%시뮬레이션%'
                  OR C.ETC LIKE '%테스트%' OR C.ETC LIKE '%TEST%' OR C.ETC LIKE '%차트있음%' OR R.RESERVE_SEQ='8' OR R.RESERVE_SEQ='5'
                  OR R.COMMENT LIKE '%테스트%' OR R.COMMENT LIKE '%TEST%' OR R.COMMENT LIKE '%B2B(군인)%'
                  OR R.CUST_NUM='8888888888888' ) )
            ),
            -- 네이버: RESERVATION(NAVER 경로) 등록일 기준(#naver, 1회 스캔). 예약일 변경에 안전(최초 등록 1건).
            CH_07 AS (
              SELECT CASE WHEN state='Y' THEN '네이버_예약'
                          WHEN state<>'C' THEN '네이버_유효'
                          ELSE '네이버' END AS [GB],
                     '' AS [GB2], regDate AS [예약날짜], PK
              FROM #naver
            ),
            CH_08 AS (
              SELECT DISTINCT
                CASE WHEN C02.NAME = '★신환' THEN '카카오톡_예약'
                     WHEN C02.NAME = '예약취소' THEN '카카오톡_취소'
                     ELSE '카카오톡_문의' END AS [GB],
                '' AS [GB2],
                CONVERT(VARCHAR(10), InsertedDateTime, 23) AS [예약날짜],
                CONVERT(VARCHAR(23), InsertedDateTime, 21) AS PK
              FROM HappyTalk_Counsel_List H WITH(NOLOCK)
              LEFT JOIN HappyTalk_Mapping M WITH(NOLOCK) ON H.HappyTalk_Num = M.HappyTalk_Num
              INNER JOIN HappyTalk_Category01 C01 WITH(NOLOCK) ON C01.Seq = H.Category01
              LEFT JOIN HappyTalk_Category02 C02 WITH(NOLOCK) ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
              WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
                AND C01.Name = '수술전'
            ),
            CH_09 AS (
              SELECT DISTINCT
                CASE WHEN R.RESERVE_STATE IN ('I','H') THEN '내원'
                     WHEN R.RESERVE_STATE IN ('Y') AND R.RESERVE_DATE < CAST(GETDATE() AS DATE) THEN '예약부도'
                     WHEN R.RESERVE_STATE IN ('C') THEN '취소' END AS [GB],
                CASE WHEN R.RESERVE_PATH IN ('ONLINE','APP') THEN '홈페이지' ELSE '' END AS [GB2],
                R.RESERVE_DATE AS [예약날짜],
                CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK
              FROM RESERVATION R WITH(NOLOCK)
              RIGHT JOIN CUSTOM C WITH(NOLOCK) ON C.CUST_NUM = R.CUST_NUM
              INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
              WHERE R.RESERVE_DATE >= :from AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
                AND R.RESERVE_FLAG = 'M'
                AND R.RESERVE_JINRYO IN ('','5','6','7')
                AND RH.MEMO = '예약저장'
                AND ( C.ETC IS NULL OR NOT (
                     R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%' OR R.COMMENT LIKE '%시뮬레이션%' OR R.COMMENT LIKE '%중복DB%'
                  OR R.COMMENT LIKE '%중복예약%' OR R.COMMENT LIKE '%차트있음%' OR R.COMMENT LIKE '%재검%'
                  OR C.ETC LIKE '%홍보실 가상계정%' OR C.ETC LIKE '%가상계정%' OR C.ETC LIKE '%가상데이터%' OR C.ETC LIKE '%시뮬레이션%'
                  OR C.ETC LIKE '%테스트%' OR C.ETC LIKE '%TEST%' OR C.ETC LIKE '%차트있음%' OR R.RESERVE_SEQ='8' OR R.RESERVE_SEQ='5'
                  OR R.COMMENT LIKE '%테스트%' OR R.COMMENT LIKE '%TEST%' OR R.COMMENT LIKE '%B2B(군인)%'
                  OR R.CUST_NUM='8888888888888' ) )
            ),
            CH_ALL AS (
              SELECT GB, GB2, PK, [예약날짜] FROM CH_03
              UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_04
              UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_05
              UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_06
              UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_07
              UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_08
              UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_09
            ),
            R AS (
              SELECT CONVERT(VARCHAR(10), CtiRgtDtm, 23) AS RESERVE_DATE, CtiCallID AS PK FROM CtiRptLst WITH(NOLOCK)
               WHERE CtiRgtDtm >= :from AND CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
              UNION SELECT CONVERT(VARCHAR(10), assign_date, 23), CONVERT(CHAR(100), DBCust_num) FROM DB_CUSTOM WITH(NOLOCK)
               WHERE assign_date >= :from AND assign_date < DATEADD(DAY,1,CONVERT(datetime,:to))
              UNION SELECT CONVERT(VARCHAR(10), InsertedDateTime, 23), CONVERT(CHAR(100), Pkey) FROM DB_ReCounsel WITH(NOLOCK)
               WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
              UNION SELECT CONVERT(VARCHAR(10), HISTORY_TIME, 23), HISTORY_NUM FROM RESERVE_HISTORY WITH(NOLOCK)
               WHERE HISTORY_TIME >= :from AND HISTORY_TIME < DATEADD(DAY,1,CONVERT(datetime,:to))
              UNION SELECT CONVERT(VARCHAR(10), RESERVE_DATE, 23), RESERVE_NUM FROM RESERVATION WITH(NOLOCK)
               WHERE RESERVE_DATE >= :from AND RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
              UNION SELECT CONVERT(VARCHAR(10), InsertedDateTime, 23), CONVERT(VARCHAR(23), InsertedDateTime, 21) FROM HappyTalk_Counsel_List WITH(NOLOCK)
               WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
              UNION SELECT regDate, PK FROM #naver
            )
            SELECT
              Z.RESERVE_DATE AS d,
              CH01 AS inboundCall, CH02 AS answeredCall, CH03 AS newInquiry, CH04 AS callReservation,
              CH05 AS tmTotalDb, CH06 AS tmValidDb, CH07 AS tmReservation, CH08 AS tmRecounsel,
              CH09 AS tmRecounselValid, CH10 AS tmRecounselReservation,
              CH11 AS homeReceived, CH12 AS homeReservation,
              CH13 AS naverReceived, CH14 AS naverRejected, CH15 AS naverValid, CH16 AS naverReservation,
              CH17 AS kakaoInquiry, CH18 AS kakaoReservation,
              CH19 AS cancelCallNaver, CH20 AS cancelHome, CH21 AS cancelKakao,
              CH22 AS visit, CH23 AS noShowReservation, CH24 AS cancel
            FROM (
              SELECT
                R.RESERVE_DATE AS RESERVE_DATE,
                MAX(CH_01.인입콜) AS CH01,
                MAX(CH_01.응대콜) AS CH02,
                SUM(CASE WHEN CH.GB='검사_신규예약문의' OR CH.GB='검사_예약' THEN 1 ELSE 0 END) AS CH03,
                SUM(CASE WHEN CH.GB='검사_예약' OR CH.GB='검사_추가예약' THEN 1 ELSE 0 END) AS CH04,
                SUM(CASE WHEN CH.GB='TM_예약' OR CH.GB='TM_유효DB' OR CH.GB='TM' THEN 1 ELSE 0 END) AS CH05,
                SUM(CASE WHEN CH.GB='TM_유효DB' OR CH.GB='TM_예약' THEN 1 ELSE 0 END) AS CH06,
                SUM(CASE WHEN CH.GB='TM_예약' THEN 1 ELSE 0 END) AS CH07,
                SUM(CASE WHEN CH.GB='TM_재상담' OR CH.GB='TM_재상담유효' OR CH.GB='TM_재상담예약' THEN 1 ELSE 0 END) AS CH08,
                SUM(CASE WHEN CH.GB='TM_재상담유효' OR CH.GB='TM_재상담예약' THEN 1 ELSE 0 END) AS CH09,
                SUM(CASE WHEN CH.GB='TM_재상담예약' THEN 1 ELSE 0 END) AS CH10,
                SUM(CASE WHEN CH.GB='홈페이지_예약' OR CH.GB='홈페이지' THEN 1 ELSE 0 END) AS CH11,
                SUM(CASE WHEN CH.GB='홈페이지_예약' THEN 1 ELSE 0 END) AS CH12,
                SUM(CASE WHEN CH.GB IN ('네이버','네이버_유효','네이버_예약') THEN 1 ELSE 0 END) AS CH13,
                SUM(CASE WHEN CH.GB='네이버' THEN 1 ELSE 0 END) AS CH14,
                SUM(CASE WHEN CH.GB IN ('네이버_유효','네이버_예약') THEN 1 ELSE 0 END) AS CH15,
                SUM(CASE WHEN CH.GB='네이버_예약' THEN 1 ELSE 0 END) AS CH16,
                SUM(CASE WHEN CH.GB='카카오톡_문의' OR CH.GB='카카오톡_예약' OR CH.GB='카카오톡_취소' THEN 1 ELSE 0 END) AS CH17,
                SUM(CASE WHEN CH.GB='카카오톡_예약' THEN 1 ELSE 0 END) AS CH18,
                SUM(CASE WHEN CH.GB='취소' AND CH.GB2<>'홈페이지' THEN 1 ELSE 0 END) AS CH19,
                SUM(CASE WHEN CH.GB='취소' AND CH.GB2='홈페이지' THEN 1 ELSE 0 END) AS CH20,
                SUM(CASE WHEN CH.GB='카카오톡_취소' THEN 1 ELSE 0 END) AS CH21,
                SUM(CASE WHEN CH.GB='내원' THEN 1 ELSE 0 END) AS CH22,
                SUM(CASE WHEN CH.GB='예약부도' THEN 1 ELSE 0 END) AS CH23,
                SUM(CASE WHEN CH.GB='취소' THEN 1 ELSE 0 END) AS CH24
              FROM R
              LEFT JOIN CH_ALL CH ON CH.PK = R.PK AND CH.예약날짜 = R.RESERVE_DATE
              LEFT JOIN CH_01 ON R.RESERVE_DATE = CH_01.예약날짜
              GROUP BY R.RESERVE_DATE
            ) Z
            ORDER BY Z.RESERVE_DATE
            """;
}
