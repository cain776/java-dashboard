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
import java.time.temporal.ChronoUnit;
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
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from은 to보다 이전이어야 합니다.");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("조회 기간은 최대 " + MAX_RANGE_DAYS + "일입니다.");
        }

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
        if (years.isEmpty() || years.size() > 5) {
            throw new IllegalArgumentException("연도는 1~5개까지 지정할 수 있습니다.");
        }
        int currentYear = LocalDate.now().getYear();
        for (int y : years) {
            if (y < 2020 || y > currentYear + 1) {
                throw new IllegalArgumentException("유효하지 않은 연도: " + y);
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(statsService.getMonthlyStats(years)));
    }
}
