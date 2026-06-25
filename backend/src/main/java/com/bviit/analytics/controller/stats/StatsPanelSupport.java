package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.exception.DataSourceUnavailableException;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

public final class StatsPanelSupport {

    private static final String REAL_DATA_UNAVAILABLE_MESSAGE = "실 데이터 소스(MSSQL)가 연결되지 않았습니다.";

    private StatsPanelSupport() {
    }

    public static <S, T> ResponseEntity<ApiResponse<T>> resolve(
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
                .orElseThrow(StatsPanelSupport::realDataUnavailable);
    }

    private static DataSourceUnavailableException realDataUnavailable() {
        return new DataSourceUnavailableException(REAL_DATA_UNAVAILABLE_MESSAGE);
    }
}
