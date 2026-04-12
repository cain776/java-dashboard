package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

final class StatsPanelSupport {

    private static final String REAL_DATA_UNAVAILABLE_MESSAGE = "실 데이터 소스(MSSQL)가 연결되지 않았습니다.";

    private StatsPanelSupport() {
    }

    static <S, T> ResponseEntity<ApiResponse<T>> resolve(
            boolean mock,
            Optional<S> realService,
            Function<S, T> realFetcher,
            Supplier<T> mockFetcher
    ) {
        if (mock) {
            return ResponseEntity.ok(ApiResponse.ok(mockFetcher.get()));
        }

        return realService
                .map(service -> ResponseEntity.ok(ApiResponse.ok(realFetcher.apply(service))))
                .orElseGet(StatsPanelSupport::realDataUnavailable);
    }

    private static <T> ResponseEntity<ApiResponse<T>> realDataUnavailable() {
        return ResponseEntity.status(503).body(ApiResponse.error(REAL_DATA_UNAVAILABLE_MESSAGE));
    }
}
