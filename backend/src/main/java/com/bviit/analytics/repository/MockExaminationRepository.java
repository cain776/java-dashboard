package com.bviit.analytics.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class MockExaminationRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public MockExaminationRepository(@Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return jdbc.queryForList("""
            SELECT year, month, vision_correction AS visionCorrection, dreamlens,
                   (vision_correction + dreamlens) AS examTotal,
                   (vision_correction + dreamlens) AS total
            FROM examination_monthly WHERE year >= :min AND year <= :max ORDER BY year, month
            """, new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear));
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return jdbc.queryForList("""
            SELECT year, SUM(vision_correction) AS visionCorrection,
                   SUM(dreamlens) AS dreamlens,
                   SUM(vision_correction + dreamlens) AS examTotal,
                   SUM(vision_correction + dreamlens) AS total
            FROM examination_monthly WHERE year >= :min AND year <= :max GROUP BY year ORDER BY year
            """, new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear));
    }
}
