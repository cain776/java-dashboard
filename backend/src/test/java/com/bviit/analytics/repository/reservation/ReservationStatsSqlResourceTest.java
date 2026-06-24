package com.bviit.analytics.repository.reservation;

import com.bviit.analytics.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReservationStatsSqlResourceTest {

    private static final String SYSTEM_SQL = "sql/reservation-stats/system-daily-counts.sql";
    private static final String CATARACT_SQL = "sql/reservation-stats/cataract-daily-counts.sql";

    @Test
    void system_sql은_openquery_placeholder만_iso_날짜로_치환한다() {
        String baseSql = SqlLoader.load(SYSTEM_SQL);
        String resolvedSql = ReservationStatsSystemRepository.resolveSystemSql(baseSql, "2026-06-01", "2026-06-23");

        assertThat(resolvedSql)
                .contains("'2026-06-01'", "'2026-06-23'")
                .doesNotContain("__OQ_FROM__", "__OQ_TO__")
                .contains(":from", ":to", "OPENQUERY(EICN_MySQL", "#naver", "SET NOCOUNT ON");
        assertThat(countOccurrences(resolvedSql, ":from")).isEqualTo(countOccurrences(baseSql, ":from"));
        assertThat(countOccurrences(resolvedSql, ":to")).isEqualTo(countOccurrences(baseSql, ":to"));
    }

    @Test
    void system_sql은_잘못된_openquery_치환_날짜를_거부한다() {
        String baseSql = SqlLoader.load(SYSTEM_SQL);

        assertThatThrownBy(() -> ReservationStatsSystemRepository.resolveSystemSql(baseSql, "2026-6-1", "2026-06-23"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReservationStatsSystemRepository.resolveSystemSql(baseSql, "2026-06-01'; DROP", "2026-06-23"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cataract_sql은_named_parameter와_핵심_계산_마커를_보존한다() {
        String sql = SqlLoader.load(CATARACT_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("Cataract_Exam", "DB_CUSTOM", "HappyTalk_Counsel_List")
                .contains("<= :to")
                .contains("0 AS totalPresbyopia", "0 AS inboundCall");
        assertThat(sql).doesNotContain("OPENQUERY", "__OQ_");
    }

    private static int countOccurrences(String text, String token) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(token, index)) >= 0) {
            count++;
            index += token.length();
        }
        return count;
    }
}
