package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.repository.MockConsultationRateRepository;
import com.bviit.analytics.service.stats.ConsultationRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/consultation-rate")
@RequiredArgsConstructor
public class ConsultationRatePanelController {

    private final MockConsultationRateRepository mockRepository;
    private final Optional<ConsultationRateService> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyRates(years),
                () -> mockRepository.findKpiByYears(years)
        );
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<?>>> getTrend(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyRates(years),
                () -> mockRepository.findMonthlyByYears(years)
        );
    }

    @GetMapping("/composition")
    public ResponseEntity<ApiResponse<List<?>>> getComposition(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyRates(years),
                () -> mockRepository.findMonthlyByYears(years)
        );
    }
}
