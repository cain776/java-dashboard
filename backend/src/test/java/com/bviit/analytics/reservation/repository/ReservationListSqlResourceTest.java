package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationListSqlResourceTest {

    @Test
    void reservation_list_sql은_named_parameter와_제외필터를_보존한다() {
        String sql = SqlLoader.load(ReservationListRepository.RESERVATION_LIST_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM RESERVATION r WITH(NOLOCK)")
                .contains("r.InsertedDateTime >= :from")
                .contains("r.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))")
                .contains("r.RESERVE_FLAG = 'M'")
                .contains("r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')")
                .contains("r.RESERVE_PATH IN ('CTI', 'CRM', 'ONLINE', 'APP', 'NAVER')")
                .contains("ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')")
                .contains("'%B2B(군인)%'", "'%재검%'", "'%중복%'", "'%시뮬%'", "'%차트있음%'")
                .contains("ORDER BY r.InsertedDateTime, r.RESERVE_NUM")
                .doesNotContain("OPENQUERY", "__OQ_");
    }

    @Test
    void kakao_count_sql은_happytalk_기준과_named_parameter를_보존한다() {
        String sql = SqlLoader.load(ReservationListRepository.KAKAO_COUNT_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21))")
                .contains("HappyTalk_Counsel_List")
                .contains("HappyTalk_Category01")
                .contains("HappyTalk_Category02")
                .contains("C01.Name = '수술전'")
                .contains("C02.NAME = '★신환'")
                .doesNotContain("OPENQUERY", "__OQ_");
    }
}
