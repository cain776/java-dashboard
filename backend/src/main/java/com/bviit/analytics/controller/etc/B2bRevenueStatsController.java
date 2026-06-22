package com.bviit.analytics.controller.etc;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.etc.B2bRevenueMonthlyItem;
import com.bviit.analytics.service.etc.B2bRevenueStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class B2bRevenueStatsController {

    private final Optional<B2bRevenueStatsService> b2bRevenueStatsService;

    @GetMapping("/b2b-revenue")
    public ResponseEntity<ApiResponse<List<B2bRevenueMonthlyItem>>> getMonthlyRevenue(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.resolve(
                false,
                b2bRevenueStatsService,
                service -> service.getMonthlyRevenue(years),
                List::of
        );
    }
}
