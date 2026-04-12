package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.IntakeConversionMonthlyItem;
import com.bviit.analytics.service.stats.IntakeConversionStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 유입(검사예약) API.
 * GET /api/stats/intake-conversion?years=2025,2026
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class IntakeConversionStatsController {

    private final IntakeConversionStatsService service;

    @GetMapping("/intake-conversion")
    public ResponseEntity<ApiResponse<List<IntakeConversionMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        if (years.isEmpty() || years.size() > 5) {
            throw new IllegalArgumentException("연도는 1~5개까지 지정할 수 있습니다.");
        }

        int currentYear = LocalDate.now().getYear();
        for (int year : years) {
            if (year < 2020 || year > currentYear + 1) {
                throw new IllegalArgumentException("유효하지 않은 연도: " + year);
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(service.getMonthlyStats(years)));
    }
}
