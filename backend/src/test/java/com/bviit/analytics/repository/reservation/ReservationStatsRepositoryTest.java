package com.bviit.analytics.repository.reservation;

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
import static org.mockito.ArgumentMatchers.anyString;
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
    void findSummaryBindsDateParameters() {
        when(jdbc.queryForMap(anyString(), any(MapSqlParameterSource.class))).thenReturn(Map.of());

        repository.findSummary("2026-04-01", "2026-04-30");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForMap(sqlCaptor.capture(), paramsCaptor.capture());

        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2026-04-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-04-30");
        assertThat(sqlCaptor.getValue()).contains("COUNT(*) AS totalReservations");
    }

    @Test
    void findMonthlyByTypeUsesMinAndMaxYearsForRange() {
        when(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class))).thenReturn(List.of());

        repository.findMonthlyByType(List.of(2026, 2024));

        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).queryForList(anyString(), paramsCaptor.capture());

        assertThat(paramsCaptor.getValue().getValue("from")).isEqualTo("2024-01-01");
        assertThat(paramsCaptor.getValue().getValue("to")).isEqualTo("2026-12-31");
    }
}
