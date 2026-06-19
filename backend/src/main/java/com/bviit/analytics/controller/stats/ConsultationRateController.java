package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.ConsultationRateItem;
import com.bviit.analytics.service.stats.ConsultationRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 상담 전환율 API.
 * GET /api/stats/consultation-rate?years=2025,2026
 *
 * 시력교정 수술전환율 = 수술예약(FLAG=O) / 검사(FLAG=M)
 * 백내장 수술전환율  = 백내장수술(FLAG=O,JINRYO=4) / 백내장검사(FLAG=H)
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ConsultationRateController {

    private final Optional<ConsultationRateService> service;

    @GetMapping("/consultation-rate")
    public ResponseEntity<ApiResponse<List<ConsultationRateItem>>> getConsultationRate(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.resolve(
                false,
                service,
                realService -> realService.getMonthlyRates(years),
                List::of
        );
    }
}
