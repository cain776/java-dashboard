package com.bviit.analytics.repository.reservation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약 종합(콜, 온라인) 통계 쿼리.
 *
 * ⚠️ 레거시 BCRM '문의통계(RSS)' 종합값(콜+홈페이지+네이버+카톡, 등록일 기준, 콜센터 MySQL·네이버·해피톡
 * 다중 소스)은 운영 MSSQL 단독으로 재현 불가. 여기서는 **추정치**로, 검사예약 전체(RESERVATION
 * RESERVE_FLAG='M' + 검사류 RESERVE_JINRYO) 행 수를 RESERVE_DATE 기준으로 집계한다.
 *
 * 검증(2026): 차트 대비 3월 −1, 4월 −4%, 1월 +3%로 근접하나 2월은 +20% 초과(등록일 기준 재분배 차이).
 * 채널(콜+홈+네이버+카톡) 합산보다 전체 집계가 차트에 더 가까워 전체 기준 채택.
 * 미래 예약이므로 당월까지만 사실상 신뢰 가능(이후 월은 예약이 더 쌓이며 증가).
 *
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile("mssql")
public class ReservationOverallStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationOverallStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 월별 검사예약 종합·온라인·콜(추정치). 레거시 RSS 화면(uSTATISTICSD1) 정의에 맞춰 보정.
     *
     *   call_cnt   = 콜 채널(RESERVE_PATH CTI=인콜·CRM=아웃콜). **B2B(군인)·재검·중복 예약 제외**
     *                (RESERVE_SEQ '8'=B2B군인·'5'=재검, COMMENT B2B/재검/중복/시뮬/차트있음). B2B군인은
     *                월 ~80건으로 주로 콜로 유입돼 콜에만 제외 적용.
     *   online_cnt = 온라인 채널(ONLINE/APP=홈페이지·NAVER=네이버). 제외 미적용(B2B군인이 온라인엔 거의 없음).
     *                카카오는 RESERVE_PATH 부재(해피톡)로 거의 안 잡힘. 2026부터 네이버=RESERVE_PATH='NAVER'.
     *   cnt(종합)   = 콜 + 온라인 (경로가 상호배타이므로 union DISTINCT = 두 채널 합).
     *
     * ⚠️ 집계 기준은 예약일이 아니라 **등록일(InsertedDateTime)** — RSS 화면이 등록일로 집계하기 때문.
     * 이 보정(등록일 + 콜 B2B제외 + 종합=콜+온라인)으로 2026 차트와 월 ±1~3% 일치. 등록일은 미래 불가라
     * 당월까지 자연 완결, 이후 월은 행이 없어 null.
     */
    public List<Map<String, Object>> findReservationOverallMonthly(String from, String to) {
        String callFilter = """
                r.RESERVE_PATH IN ('CTI', 'CRM')
                AND ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')
                AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%' AND ISNULL(r.COMMENT, '') NOT LIKE '%재검%'
                AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
                AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
                """;
        String sql = """
            SELECT YEAR(r.InsertedDateTime) AS yr,
                   MONTH(r.InsertedDateTime) AS mo,
                   COUNT(DISTINCT CASE WHEN (%1$s)
                                         OR r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')
                                       THEN r.RESERVE_NUM END) AS cnt,
                   COUNT(DISTINCT CASE WHEN r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')
                                       THEN r.RESERVE_NUM END) AS online_cnt,
                   COUNT(DISTINCT CASE WHEN %1$s THEN r.RESERVE_NUM END) AS call_cnt
            FROM RESERVATION r WITH(NOLOCK)
            WHERE r.InsertedDateTime >= :from AND r.InsertedDateTime <= :to
              AND r.RESERVE_FLAG = 'M'
              AND r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')
              AND NOT (r.CUST_NAME LIKE '%%테스트%%' OR r.CUST_NAME LIKE '%%TEST%%' OR r.CUST_NUM = '8888888888888')
            GROUP BY YEAR(r.InsertedDateTime), MONTH(r.InsertedDateTime)
            ORDER BY yr, mo
            """.formatted(callFilter);
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
