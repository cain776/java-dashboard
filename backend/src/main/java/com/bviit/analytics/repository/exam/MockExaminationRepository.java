package com.bviit.analytics.repository.exam;

import com.bviit.analytics.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class MockExaminationRepository {

    private static final String MONTHLY_BY_YEARS_SQL = "sql/mock/exam/monthly-by-years.sql";
    private static final String KPI_BY_YEARS_SQL = "sql/mock/exam/kpi-by-years.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String monthlyByYearsSql;
    private final String kpiByYearsSql;

    public MockExaminationRepository(@Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.monthlyByYearsSql = SqlLoader.load(MONTHLY_BY_YEARS_SQL);
        this.kpiByYearsSql = SqlLoader.load(KPI_BY_YEARS_SQL);
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return jdbc.queryForList(monthlyByYearsSql,
                new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear));
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return jdbc.queryForList(kpiByYearsSql,
                new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear));
    }
}
