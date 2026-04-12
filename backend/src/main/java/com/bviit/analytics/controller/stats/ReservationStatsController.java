package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.ReservationMonthlyItem;
import com.bviit.analytics.dto.stats.ReservationStatsResponse;
import com.bviit.analytics.service.stats.ReservationStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 예약 통계 API.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 등록 안 됨.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ReservationStatsController {

    private static final int MAX_RANGE_DAYS = 366;

    private final ReservationStatsService statsService;

    /**
     * 기간 기반 예약 요약 (일별 추이, 채널별, 시간대별)
     * GET /api/stats/reservation?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    @GetMapping("/reservation")
    public ResponseEntity<ReservationStatsResponse> getReservationStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);

        return ResponseEntity.ok(statsService.getStats(from, to));
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

        return ResponseEntity.ok(ApiResponse.ok(statsService.getMonthlyStats(years)));
    }
}
