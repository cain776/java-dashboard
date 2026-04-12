package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.B2bRevenueMonthlyItem;
import com.bviit.analytics.service.stats.B2bRevenueStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class B2bRevenueStatsController {

    private final B2bRevenueStatsService b2bRevenueStatsService;

    @GetMapping("/b2b-revenue")
    public ResponseEntity<ApiResponse<List<B2bRevenueMonthlyItem>>> getMonthlyRevenue(
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

        return ResponseEntity.ok(ApiResponse.ok(b2bRevenueStatsService.getMonthlyRevenue(years)));
    }
}
