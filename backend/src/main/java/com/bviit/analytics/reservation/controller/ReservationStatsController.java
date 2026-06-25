package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.service.ReservationStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 예약 통계 API.
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ReservationStatsController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReservationStatsService> statsService;

    /**
     * 기간 기반 예약 요약 (일별 추이, 채널별, 시간대별)
     * GET /api/stats/reservation?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    @GetMapping("/reservation")
    public ResponseEntity<?> getReservationStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);

        return ResponseEntity.ok(StatsPanelSupport.requireData(
                statsService,
                service -> service.getStats(from, to)
        ));
    }

    /**
     * 연도별 월간 수술/외래/드림렌즈 (프론트 ReservationPage용)
     * GET /api/stats/reservation/monthly?years=2025,2026
     * 응답: { success: true, data: [{year, month, surgery, outpatient, dreamlens, total}, ...] }
     */
    @GetMapping("/reservation/monthly")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.resolve(
                false,
                statsService,
                service -> service.getMonthlyStats(years),
                List::of
        );
    }

}
