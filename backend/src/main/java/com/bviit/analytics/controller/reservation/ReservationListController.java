package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.reservation.ReservationListResult;
import com.bviit.analytics.service.reservation.ReservationListService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Optional;

/**
 * GET /api/reservation-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 예약자 명단 + 카카오 건수. 응답: ApiResponse&lt;{rows:List&lt;Map&gt;, kakaoCount:int}&gt; (camelCase 키).
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/reservation-list")
@RequiredArgsConstructor
public class ReservationListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReservationListService> reservationListService;

    @GetMapping
    public ResponseEntity<ApiResponse<ReservationListResult>> getReservationList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                reservationListService,
                service -> service.getReservationList(from.toString(), to.toString())
        );
    }
}
