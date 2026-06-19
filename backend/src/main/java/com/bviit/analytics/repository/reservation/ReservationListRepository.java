package com.bviit.analytics.repository.reservation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 행 목록.
 *
 * ReservationOverallStatsRepository.findReservationOverallMonthly 와 동일 정의(행 단위):
 *   - 검사예약: RESERVE_FLAG='M' + RESERVE_JINRYO IN ('','5','6','7','24','25')
 *   - 집계 기준 날짜: 등록일(InsertedDateTime) — RSS 화면이 등록일로 집계하기 때문(예약일 아님)
 *   - 채널: 콜(CTI=인콜·CRM=아웃콜, B2B군인·재검·중복·시뮬·차트있음 제외) + 온라인(ONLINE·APP=홈페이지·NAVER=네이버)
 *   - 제외: 테스트/TEST 이름, 공용 더미 고객 8888888888888 (CRM 플레이스홀더)
 *   - 상태(RESERVE_STATE) 필터 없음 — 종합은 등록 시점 기준이라 사후 취소도 포함.
 * 행 1개 = RESERVE_NUM 1개(PK). 월 합계 = 예약 종합 월 값과 일치.
 *
 * READ-ONLY · MSSQL 2014 호환(TRIM 금지). 날짜 범위는 등록일(InsertedDateTime) 기준.
 */
@Repository
@Profile("mssql")
public class ReservationListRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findReservationList(String from, String to) {
        String sql = """
            SELECT
              CONVERT(varchar(10), r.InsertedDateTime, 23)            AS registeredAt,
              ISNULL(CONVERT(varchar(5), r.InsertedDateTime, 108), '') AS registeredTime,
              ISNULL(r.RESERVE_DATE, '')                              AS reserveDate,
              ISNULL(LTRIM(RTRIM(r.START_TIME)), '')                  AS reserveTime,
              ISNULL(LTRIM(RTRIM(r.CUST_NUM)), '')                    AS chartNo,
              ISNULL(r.CUST_NAME, '')                                 AS name,
              ISNULL(r.RESERVE_STATE, '')                             AS reserveState,
              CASE
                WHEN r.RESERVE_PATH = 'CTI' THEN '인콜'
                WHEN r.RESERVE_PATH = 'CRM' THEN '아웃콜'
                WHEN r.RESERVE_PATH = 'ONLINE' THEN '홈페이지'
                WHEN r.RESERVE_PATH = 'APP' THEN '앱'
                WHEN r.RESERVE_PATH = 'NAVER' THEN '네이버'
                WHEN r.RESERVE_PATH = 'KAKAO' THEN '카카오'
                ELSE ISNULL(r.RESERVE_PATH, '')
              END                                                     AS channel,
              CASE
                WHEN r.RESERVE_PATH IN ('CTI', 'CRM') THEN '콜'
                WHEN r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER', 'KAKAO') THEN '온라인'
                ELSE '기타'
              END                                                     AS channelGroup,
              ISNULL(doc.EMP_NAME, '')                                AS doctor,
              ISNULL(cns.EMP_NAME, '')                                AS counselor,
              ISNULL(r.COMMENT, '')                                   AS comment
            FROM RESERVATION r WITH(NOLOCK)
            LEFT JOIN EMPLOYEE doc WITH(NOLOCK)
              ON doc.EMP_NUM = ISNULL(NULLIF(r.SELECT_DOC, ''), r.RESERVE_DOC)
             AND doc.EMP_STATE <> 'N'
            LEFT JOIN EMPLOYEE cns WITH(NOLOCK)
              ON cns.EMP_NUM = r.RESERVE_EMP
            WHERE r.InsertedDateTime >= :from
              AND r.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))
              AND r.RESERVE_FLAG = 'M'
              AND r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')
              AND NOT (r.CUST_NAME LIKE '%테스트%' OR r.CUST_NAME LIKE '%TEST%' OR r.CUST_NUM = '8888888888888')
              AND (
                (
                  r.RESERVE_PATH IN ('CTI', 'CRM')
                  AND ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')
                  AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%' AND ISNULL(r.COMMENT, '') NOT LIKE '%재검%'
                  AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
                  AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
                )
                OR r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER', 'KAKAO')
              )
            ORDER BY r.InsertedDateTime, r.RESERVE_NUM
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
