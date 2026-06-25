package com.bviit.analytics.repository.reservation;

import com.bviit.analytics.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationStatsSqlResourcesTest {

    @Test
    void summary_sql은_요약_집계와_날짜_바인딩을_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.SUMMARY_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("COUNT(*) AS totalReservations")
                .contains("RESERVE_FLAG = 'F'")
                .contains("RESERVE_STATE = 'C'")
                .contains("TODAY_FLAG = 'Y'")
                .contains("FROM RESERVATION WITH(NOLOCK)")
                .contains("RESERVE_DATE >= :from AND RESERVE_DATE <= :to")
                .doesNotContain("OPENQUERY", "__OQ_");
    }

    @Test
    void daily_trend_sql은_일별_집계와_정렬을_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.DAILY_TREND_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("RESERVE_DATE AS date")
                .contains("COUNT(*) AS reservations")
                .contains("RESERVE_FLAG = 'F'")
                .contains("RESERVE_STATE = 'C'")
                .contains("GROUP BY RESERVE_DATE")
                .contains("ORDER BY RESERVE_DATE");
    }

    @Test
    void source_breakdown_sql은_채널_매핑을_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.SOURCE_BREAKDOWN_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("'CTI' THEN 'phone'")
                .contains("'NAVER' THEN 'naver'")
                .contains("'KAKAO' THEN 'kakao'")
                .contains("TODAY_FLAG = 'Y' THEN 'walkIn'")
                .contains("ELSE 'referral'")
                .contains("RESERVE_STATE <> 'C'")
                .contains("ORDER BY count DESC");
    }

    @Test
    void monthly_by_type_sql은_수술_외래_드림렌즈_집계를_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.MONTHLY_BY_TYPE_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("YEAR(r.RESERVE_DATE) AS yr")
                .contains("MONTH(r.RESERVE_DATE) AS mo")
                .contains("r.RESERVE_FLAG = 'O'")
                .contains("r.RESERVE_JINRYO = '2'")
                .contains("r.RESERVE_FLAG = 'D'")
                .contains("r.RESERVE_STATE <> 'C'")
                .contains("GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)");
    }

    @Test
    void hourly_distribution_sql은_시간대_집계와_빈_시간_제외를_보존한다() {
        String sql = SqlLoader.load(ReservationStatsRepository.HOURLY_DISTRIBUTION_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("LEFT(RTRIM(START_TIME), 2) + ':00' AS slot")
                .contains("START_TIME IS NOT NULL")
                .contains("RTRIM(START_TIME) <> ''")
                .contains("GROUP BY LEFT(RTRIM(START_TIME), 2)")
                .contains("ORDER BY LEFT(RTRIM(START_TIME), 2)");
    }
}
