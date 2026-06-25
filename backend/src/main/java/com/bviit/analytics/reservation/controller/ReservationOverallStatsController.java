package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.service.ReservationOverallStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 예약 종합(콜, 온라인) 통계 API.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ReservationOverallStatsController {

    private final ReservationOverallStatsService reservationOverallStatsService;

    /**
     * GET /api/stats/reservation-overall/monthly?years=2024,2025,2026
     */
    @GetMapping("/reservation-overall/monthly")
    public ResponseEntity<ApiResponse<List<ReservationOverallMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(reservationOverallStatsService.getMonthlyStats(years)));
    }
}
