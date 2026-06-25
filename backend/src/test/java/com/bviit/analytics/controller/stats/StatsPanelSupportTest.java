package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.exception.DataSourceUnavailableException;
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
}
