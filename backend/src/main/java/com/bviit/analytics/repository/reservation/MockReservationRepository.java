package com.bviit.analytics.repository.reservation;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * SQLite mock-data.db에서 예약 더미 데이터 조회.
 */
@Repository
public class MockReservationRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public MockReservationRepository(
            @Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        return jdbc.queryForList(
                """
                SELECT year, month, surgery, outpatient, dreamlens,
                       (surgery + outpatient + dreamlens) AS total
                FROM reservation_monthly
                WHERE year >= :minYear AND year <= :maxYear
                ORDER BY year, month
                """,
                new MapSqlParameterSource()
                        .addValue("minYear", minYear)
                        .addValue("maxYear", maxYear)
        );
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        return jdbc.queryForList(
                """
                SELECT year,
                       SUM(surgery) AS surgery,
                       SUM(outpatient) AS outpatient,
                       SUM(dreamlens) AS dreamlens,
                       SUM(surgery + outpatient + dreamlens) AS total
                FROM reservation_monthly
                WHERE year >= :minYear AND year <= :maxYear
                GROUP BY year
                ORDER BY year
                """,
                new MapSqlParameterSource()
                        .addValue("minYear", minYear)
                        .addValue("maxYear", maxYear)
        );
    }
}
