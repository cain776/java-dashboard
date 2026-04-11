package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.ConsultationRateItem;
import com.bviit.analytics.service.stats.ConsultationRateService;
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
 * 상담 전환율 API.
 * GET /api/stats/consultation-rate?years=2025,2026
 *
 * 시력교정 수술전환율 = 수술예약(FLAG=O) / 검사(FLAG=M)
 * 백내장 수술전환율  = 백내장수술(FLAG=O,JINRYO=4) / 백내장검사(FLAG=H)
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ConsultationRateController {

    private final ConsultationRateService service;

    @GetMapping("/consultation-rate")
    public ResponseEntity<ApiResponse<List<ConsultationRateItem>>> getConsultationRate(
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

        return ResponseEntity.ok(ApiResponse.ok(service.getMonthlyRates(years)));
    }
}
