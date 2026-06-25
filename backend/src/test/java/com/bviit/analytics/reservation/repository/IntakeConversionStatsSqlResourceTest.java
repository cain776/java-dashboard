package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IntakeConversionStatsSqlResourceTest {

    @Test
    void monthly_sql은_유입채널_매핑과_예약_필터를_보존한다() {
        String sql = SqlLoader.load(IntakeConversionStatsRepository.MONTHLY_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'CTI'")
                .contains("RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'CRM'")
                .contains("RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'KAKAO'")
                .contains("RTRIM(ISNULL(r.RESERVE_PATH, '')) = 'NAVER'")
                .contains("RTRIM(ISNULL(r.RESERVE_PATH, '')) IN ('ONLINE', 'APP')")
                .contains("r.RESERVE_STATE <> 'C'")
                .contains("r.RESERVE_FLAG IN ('M', 'H', 'D', 'F')")
                .contains("GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)")
                .doesNotContain("OPENQUERY", "__OQ_");
    }
}
