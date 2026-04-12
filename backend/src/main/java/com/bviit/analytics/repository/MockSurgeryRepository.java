package com.bviit.analytics.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class MockSurgeryRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public MockSurgeryRepository(@Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private MapSqlParameterSource yearParams(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        return new MapSqlParameterSource().addValue("min", minYear).addValue("max", maxYear);
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        return jdbc.queryForList("""
            SELECT year, month, lasek, lasik, smile, smile_pro AS smilePro,
                   icl, t_icl AS tIcl, kpl, t_kpl AS tKpl, viva,
                   cat_multi AS catMulti, cat_mono AS catMono, cat_edof AS catEdof,
                   (lasek+lasik+smile+smile_pro+icl+t_icl+kpl+t_kpl+viva+cat_multi+cat_mono+cat_edof) AS total
            FROM surgery_monthly WHERE year >= :min AND year <= :max ORDER BY year, month
            """, yearParams(years));
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        return jdbc.queryForList("""
            SELECT year,
                   SUM(lasek+lasik+smile+smile_pro) AS refractive,
                   SUM(icl+t_icl+kpl+t_kpl+viva) AS lens,
                   SUM(cat_multi+cat_mono+cat_edof) AS cataract,
                   SUM(lasek+lasik+smile+smile_pro+icl+t_icl+kpl+t_kpl+viva+cat_multi+cat_mono+cat_edof) AS total
            FROM surgery_monthly WHERE year >= :min AND year <= :max GROUP BY year ORDER BY year
            """, yearParams(years));
    }
}
