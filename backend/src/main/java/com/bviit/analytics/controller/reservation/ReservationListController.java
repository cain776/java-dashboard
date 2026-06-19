package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.service.reservation.ReservationListService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * GET /api/reservation-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 예약자 리스트 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키).
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/reservation-list")
@RequiredArgsConstructor
public class ReservationListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReservationListService> reservationListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReservationList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return reservationListService
                .map(service -> ResponseEntity.ok(ApiResponse.ok(service.getReservationList(from.toString(), to.toString()))))
                .orElseGet(ReservationListController::realDataUnavailable);
    }

    private static ResponseEntity<ApiResponse<List<Map<String, Object>>>> realDataUnavailable() {
        return ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
    }
}
