package com.bviit.analytics.exception;

import com.bviit.analytics.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void dataSourceUnavailable은_503과_meta를_반환한다() {
        Map<String, String> meta = Map.of("source", "UNAVAILABLE");

        ResponseEntity<ErrorResponse> response = handler.handleDataSourceUnavailable(
                new DataSourceUnavailableException("실 데이터 소스(MSSQL)가 연결되지 않았습니다.", meta)
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(503);
        assertThat(response.getBody().getMessage()).contains("실 데이터 소스");
        assertThat(response.getBody().getMeta()).isSameAs(meta);
    }

    @Test
    void snapshotLocked는_409를_반환한다() {
        ResponseEntity<ErrorResponse> response = handler.handleSnapshotLocked(
                new SnapshotLockedException("PDF 고정 스냅샷이라 호출(채움)할 수 없습니다: 2026-05")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(409);
        assertThat(response.getBody().getMessage()).contains("PDF 고정");
    }

    @Test
    void invalidPeriod는_400을_반환한다() {
        ResponseEntity<ErrorResponse> response = handler.handleInvalidPeriod(
                new InvalidPeriodException("기준 월 형식이 올바르지 않습니다(YYYY-MM): 2026-13")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getMessage()).contains("YYYY-MM");
    }
}
