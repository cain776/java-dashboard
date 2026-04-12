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
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(service.getMonthlyStats(years)));
    }
}
