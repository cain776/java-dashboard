package com.bviit.analytics.repository.reservation;

import com.bviit.analytics.util.SqlLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationStatsRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate jdbc;

    private ReservationStatsRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ReservationStatsRepository(jdbc);
    }

    @Test
    void findSummary는_sql_리소스와_날짜_파라미터를_사용한다() {
        when(jdbc.queryForMap(any(String.class), any(MapSqlParameterSource.class))).thenReturn(Map.of());

        repository.findSummary("2026-04-01", "2026-04-30");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForMap(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationStatsRepository.SUMMARY_SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-04-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-04-30");
    }

    @Test
    void findDailyTrend는_sql_리소스와_날짜_파라미터를_사용한다() {
        when(jdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findDailyTrend("2026-04-01", "2026-04-30");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationStatsRepository.DAILY_TREND_SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-04-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-04-30");
    }

    @Test
    void findSourceBreakdown는_sql_리소스와_날짜_파라미터를_사용한다() {
        when(jdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findSourceBreakdown("2026-04-01", "2026-04-30");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationStatsRepository.SOURCE_BREAKDOWN_SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-04-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-04-30");
    }

    @Test
    void findMonthlyByType는_sql_리소스와_연도_범위_파라미터를_사용한다() {
        when(jdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findMonthlyByType(List.of(2026, 2024));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationStatsRepository.MONTHLY_BY_TYPE_SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2024-01-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-12-31");
    }

    @Test
    void findHourlyDistribution는_sql_리소스와_날짜_파라미터를_사용한다() {
        when(jdbc.queryForList(any(String.class), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findHourlyDistribution("2026-04-01", "2026-04-30");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForList(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(sqlCaptor.getValue()).isEqualTo(SqlLoader.load(ReservationStatsRepository.HOURLY_DISTRIBUTION_SQL));
        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-04-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-04-30");
    }
}
