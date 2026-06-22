package com.bviit.analytics.repository.consultation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class MockConsultationRateRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public MockConsultationRateRepository(@Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private MapSqlParameterSource yearParams(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear);
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        return jdbc.queryForList("""
            SELECT year, month,
                   vision_exam_count AS visionExamCount,
                   vision_counsel_count AS visionCounselCount,
                   vision_surgery_booked AS visionSurgeryBooked,
                   vision_actual_surgery AS visionActualSurgery,
                   ROUND(CAST(vision_surgery_booked AS REAL) / vision_exam_count * 100, 1) AS visionSurgeryRate,
                   ROUND(CAST(vision_surgery_booked AS REAL) / vision_counsel_count * 100, 1) AS visionCounselRate,
                   cataract_exam_count AS cataractExamCount,
                   cataract_surgery_booked AS cataractSurgeryBooked,
                   cataract_stopped_count AS cataractStoppedCount,
                   ROUND(CAST(cataract_surgery_booked AS REAL) / cataract_exam_count * 100, 1) AS cataractSurgeryRate
            FROM consultation_rate_monthly WHERE year >= :min AND year <= :max ORDER BY year, month
            """, yearParams(years));
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        return jdbc.queryForList("""
            SELECT year,
                   ROUND(CAST(SUM(vision_surgery_booked) AS REAL) / SUM(vision_counsel_count) * 100, 1) AS overallConsultation,
                   ROUND(CAST(SUM(vision_surgery_booked) AS REAL) / SUM(vision_counsel_count) * 100, 1) AS visionConsultation,
                   ROUND(CAST(SUM(vision_surgery_booked) AS REAL) / SUM(vision_exam_count) * 100, 1) AS visionSurgery,
                   ROUND(CAST(SUM(cataract_surgery_booked) AS REAL) / SUM(cataract_exam_count) * 100, 1) AS cataractSurgery
            FROM consultation_rate_monthly WHERE year >= :min AND year <= :max GROUP BY year ORDER BY year
            """, yearParams(years));
    }
}
