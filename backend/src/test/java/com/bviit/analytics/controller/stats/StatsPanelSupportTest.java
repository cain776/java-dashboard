package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

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
    void resolveReturns503WhenRealServiceIsUnavailable() {
        ResponseEntity<ApiResponse<String>> response = StatsPanelSupport.resolve(
                false,
                Optional.<String>empty(),
                service -> service,
                () -> "mock"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("MSSQL");
    }
}
