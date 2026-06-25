package com.bviit.analytics.repository.surgery;

import com.bviit.analytics.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class MockSurgeryRepository {

    private static final String MONTHLY_BY_YEARS_SQL = "sql/mock/surgery/monthly-by-years.sql";
    private static final String KPI_BY_YEARS_SQL = "sql/mock/surgery/kpi-by-years.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String monthlyByYearsSql;
    private final String kpiByYearsSql;

    public MockSurgeryRepository(@Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.monthlyByYearsSql = SqlLoader.load(MONTHLY_BY_YEARS_SQL);
        this.kpiByYearsSql = SqlLoader.load(KPI_BY_YEARS_SQL);
    }

    private MapSqlParameterSource yearParams(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear);
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        return jdbc.queryForList(monthlyByYearsSql, yearParams(years));
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        return jdbc.queryForList(kpiByYearsSql, yearParams(years));
    }
}
