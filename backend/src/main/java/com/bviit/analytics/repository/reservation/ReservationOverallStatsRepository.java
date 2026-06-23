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
 * 다중 소스)은 운영 MSSQL 단독으로 재현 불가. 여기서는 **추정치**로, 검사예약(RESERVATION
 * RESERVE_FLAG='M' + 검사류 RESERVE_JINRYO)을 채널별(콜 + 온라인)로 **등록일(InsertedDateTime) 기준** 집계한다.
 *
 * 온라인 = RESERVE_PATH ONLINE/APP/NAVER. 콜·온라인 공통 junk(중복/재검/시뮬/차트있음/B2B) 제외 적용.
 * **카카오(해피톡)는 종합에 미포함** — 레거시 RSS가 월마다 카카오를 포함/미포함이 들쭉날쭉해(예: 2026-05는 미포함
 * =1,153, 2월은 포함≈1,892) 일관성을 위해 제외한다. 카카오 건수는 예약자 리스트에서 참고용으로만 표시한다
 * (ReservationListRepository.countKakao). 레거시 화면이 채널마다 다른 원천·정의·날짜축을 섞어 쓰므로 월별
 * 잔차는 남으며 당월까지만 신뢰.
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
     *   공통 제외   = B2B(군인)·재검·중복·시뮬·차트있음 예약(RESERVE_SEQ '8'=B2B군인·'5'=재검, COMMENT 매칭)을
     *                WHERE 절에서 콜·온라인 양 채널에 일괄 제외(2026-06 통일).
     *   call_cnt   = 콜 채널(RESERVE_PATH CTI=인콜·CRM=아웃콜).
     *   online_cnt = 온라인 채널(ONLINE/APP=홈페이지·NAVER=네이버). 2026부터 네이버=RESERVE_PATH='NAVER'.
     *   cnt(종합)   = 콜 + 온라인 (경로가 상호배타이므로 union DISTINCT = 두 채널 합). **카카오 미포함**(클래스 주석 참고).
     *
     * ⚠️ 집계 기준은 예약일이 아니라 **등록일(InsertedDateTime)** — RSS 화면이 등록일로 집계하기 때문.
     * 등록일은 미래 불가라 당월까지 자연 완결, 이후 월은 행이 없어 null.
     */
    public List<Map<String, Object>> findReservationOverallMonthly(String from, String to) {
        // 콜·온라인 공통 junk 제외(중복/재검/시뮬/차트있음/B2B 예약). 레거시 RSS가 양 채널 모두에 적용하므로
        // WHERE 절에서 일괄 제외한다. (과거엔 콜에만 적용 → 온라인 중복예약이 월 12~54건 과대계상되던 것 보정)
        String junkExclusion = """
                ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')
                AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%' AND ISNULL(r.COMMENT, '') NOT LIKE '%재검%'
                AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
                AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
                """;
        String callPaths = "r.RESERVE_PATH IN ('CTI', 'CRM')";
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
              AND (%2$s)
            GROUP BY YEAR(r.InsertedDateTime), MONTH(r.InsertedDateTime)
            ORDER BY yr, mo
            """.formatted(callPaths, junkExclusion);
        return jdbc.queryForList(sql, params(from, to));
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
