package com.bviit.analytics.repository.reservation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.util.NumberUtils.toInt;

/**
 * 예약 종합(콜, 온라인) 통계 쿼리.
 *
 * ⚠️ 레거시 BCRM '문의통계(RSS)' 종합값(콜+홈페이지+네이버+카톡, 등록일 기준, 콜센터 MySQL·네이버·해피톡
 * 다중 소스)은 운영 MSSQL 단독으로 재현 불가. 여기서는 **추정치**로, 검사예약(RESERVATION
 * RESERVE_FLAG='M' + 검사류 RESERVE_JINRYO)을 채널별(콜 + 온라인)로 **등록일(InsertedDateTime) 기준** 집계한다.
 *
 * 온라인은 RESERVE_PATH(ONLINE/APP/NAVER)로 잡되, RESERVE_PATH가 없는 카카오(해피톡)만 HappyTalk에서
 * 별도 집계해 더한다. 콜·온라인 공통 junk(중복/재검/시뮬/차트있음/B2B) 제외 적용. 레거시 화면이 채널마다
 * 다른 원천·정의(홈 예약접수·네이버 유효접수 등)·다른 날짜축을 섞어 쓰므로 월별 ±10% 안팎 잔차는 남는다
 * (2026 온라인 우리/레거시: 1월 941/993·2월 755/760·3월 471/482·4월 484/493·5월 415/465). 당월까지만 신뢰.
 *
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile("mssql")
public class ReservationOverallStatsRepository {

    /**
     * 레거시 RSS '카카오톡_예약'(uSTATISTICSD1Sql.cs CH_08·CH18) = 해피톡 상담 중
     * 대분류 '수술전' + 중분류 '★신환'을 등록일(InsertedDateTime) 기준으로 집계.
     * PK(레거시) = ms 단위 등록시각이므로 동일 기준으로 distinct 카운트한다.
     */
    private static final String KAKAO_SQL = """
            SELECT YEAR(H.InsertedDateTime) AS yr,
                   MONTH(H.InsertedDateTime) AS mo,
                   COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21)) AS kakao_cnt
            FROM HappyTalk_Counsel_List H WITH(NOLOCK)
            INNER JOIN HappyTalk_Category01 C01 ON C01.Seq = H.Category01
            LEFT JOIN HappyTalk_Category02 C02 ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
            WHERE H.InsertedDateTime >= :from AND H.InsertedDateTime <= :to
              AND C01.Name = '수술전'
              AND C02.NAME = '★신환'
            GROUP BY YEAR(H.InsertedDateTime), MONTH(H.InsertedDateTime)
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationOverallStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /**
     * 월별 검사예약 종합·온라인·콜(추정치). 레거시 RSS 화면(uSTATISTICSD1) 정의에 맞춰 보정.
     *
     *   공통 제외   = **B2B(군인)·재검·중복·시뮬·차트있음 예약**(RESERVE_SEQ '8'=B2B군인·'5'=재검, COMMENT 매칭)을
     *                WHERE 절에서 콜·온라인 양 채널에 일괄 제외. (과거엔 콜에만 적용했으나 온라인에도 중복예약이
     *                월 12~54건 잡혀 레거시·콜과 동일 기준으로 통일 — 2026-06 수정. 특히 2026-03 중복 53건 과대 해소.)
     *   call_cnt   = 콜 채널(RESERVE_PATH CTI=인콜·CRM=아웃콜).
     *   online_cnt = 온라인 채널(ONLINE/APP=홈페이지·NAVER=네이버) + 카카오. 2026부터 네이버=RESERVE_PATH='NAVER'.
     *                카카오는 RESERVE_PATH가 없어(해피톡) RESERVATION엔 안 잡히므로 별도로 HappyTalk(수술전·★신환
     *                =레거시 RSS '카카오톡_예약')를 세어 더한다(카카오는 카테고리 기반이라 위 junk 제외 미적용).
     *   cnt(종합)   = 콜 + 온라인 (경로가 상호배타이므로 union DISTINCT = 두 채널 합) + 카카오.
     *
     * ⚠️ 집계 기준은 예약일이 아니라 **등록일(InsertedDateTime)** — RSS 화면이 등록일로 집계하기 때문.
     * 이 보정(등록일 + 콜 B2B제외 + 종합=콜+온라인)으로 2026 차트와 월 ±1~3% 일치. 등록일은 미래 불가라
     * 당월까지 자연 완결, 이후 월은 행이 없어 null.
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
        List<Map<String, Object>> mainRows = jdbc.queryForList(sql, params(from, to));

        // 카카오(해피톡) 예약은 RESERVE_PATH가 없어 위 RESERVATION 집계에서 0으로 누락된다.
        // 레거시 RSS '카카오톡_예약'(대분류 '수술전' + 중분류 '★신환', 등록일 기준)을 별도 집계해
        // 월별로 online_cnt·cnt(종합)에 더한다. 콜(call_cnt)에는 영향 없음.
        // 카카오만 있고 검사예약이 0인 달은 사실상 없지만, 누락 방지로 computeIfAbsent로 별도 행을 만든다.
        Map<String, Map<String, Object>> byMonth = new LinkedHashMap<>();
        for (Map<String, Object> row : mainRows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("yr", yr);
            m.put("mo", mo);
            m.put("call_cnt", toInt(row.get("call_cnt")));
            m.put("online_cnt", toInt(row.get("online_cnt")));
            m.put("cnt", toInt(row.get("cnt")));
            byMonth.put(monthKey(yr, mo), m);
        }
        for (Map<String, Object> k : jdbc.queryForList(KAKAO_SQL, params(from, to))) {
            int yr = toInt(k.get("yr"));
            int mo = toInt(k.get("mo"));
            int kakao = toInt(k.get("kakao_cnt"));
            Map<String, Object> m = byMonth.computeIfAbsent(monthKey(yr, mo), key -> {
                Map<String, Object> seed = new LinkedHashMap<>();
                seed.put("yr", yr);
                seed.put("mo", mo);
                seed.put("call_cnt", 0);
                seed.put("online_cnt", 0);
                seed.put("cnt", 0);
                return seed;
            });
            m.put("online_cnt", toInt(m.get("online_cnt")) + kakao);
            m.put("cnt", toInt(m.get("cnt")) + kakao);
        }
        return new ArrayList<>(byMonth.values());
    }

    private static String monthKey(int year, int month) {
        return year + "-" + month;
    }

    private MapSqlParameterSource params(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }
}
