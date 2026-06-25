package com.bviit.analytics.common.stats;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatsPanelSupportTest {

    @Test
    void resolveReturnsMockPayloadWhenMockModeIsEnabled() {
        ResponseEntity<ApiResponse<String>> response = StatsPanelSupport.resolve(
                true,
                Optional.of("real"),
                service -> service,
                () -> "mock"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).isEqualTo("mock");
    }

    @Test
    void resolveThrowsDataSourceUnavailableWhenRealServiceIsUnavailable() {
        assertThatThrownBy(() -> StatsPanelSupport.resolve(
                        false,
                        Optional.<String>empty(),
                        service -> service,
                        () -> "mock"
                ))
                .isInstanceOf(DataSourceUnavailableException.class)
                .hasMessageContaining("MSSQL");
    }

    @Test
    void requireWrapsRealPayload() {
        ResponseEntity<ApiResponse<String>> response = StatsPanelSupport.require(
                Optional.of("real"),
                service -> service + "-payload"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isEqualTo("real-payload");
    }

    @Test
    void requireDataReturnsRawPayloadWithoutApiWrapper() {
        String response = StatsPanelSupport.requireData(
                Optional.of("real"),
                service -> service + "-raw"
        );

        assertThat(response).isEqualTo("real-raw");
    }

    @Test
    void panelResponsesCarryStandardMeta() {
        // resolve(실데이터)·resolve(mock)·require 는 LIVE 메타를 싣는다.
        assertThat(metaSource(StatsPanelSupport.resolve(
                false, Optional.of("svc"), s -> "d", () -> "m").getBody()))
                .isEqualTo(StatsResponseMeta.Source.LIVE);
        assertThat(metaSource(StatsPanelSupport.resolve(
                true, Optional.<String>empty(), s -> "d", () -> "m").getBody()))
                .isEqualTo(StatsResponseMeta.Source.LIVE);
        assertThat(metaSource(StatsPanelSupport.require(
                Optional.of("svc"), s -> "d").getBody()))
                .isEqualTo(StatsResponseMeta.Source.LIVE);

        // 미연결(503) 예외는 UNAVAILABLE 메타를 담는다.
        assertThatThrownBy(() -> StatsPanelSupport.resolve(
                false, Optional.<String>empty(), s -> "d", () -> "m"))
                .isInstanceOf(DataSourceUnavailableException.class)
                .satisfies(e -> assertThat(
                        ((StatsResponseMeta) ((DataSourceUnavailableException) e).getMeta()).source())
                        .isEqualTo(StatsResponseMeta.Source.UNAVAILABLE));
    }

    private static StatsResponseMeta.Source metaSource(ApiResponse<?> body) {
        assertThat(body).isNotNull();
        assertThat(body.getMeta()).isInstanceOf(StatsResponseMeta.class);
        return ((StatsResponseMeta) body.getMeta()).source();
    }
}
