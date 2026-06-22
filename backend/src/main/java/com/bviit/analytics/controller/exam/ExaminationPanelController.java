package com.bviit.analytics.controller.exam;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.repository.exam.MockExaminationRepository;
import com.bviit.analytics.service.exam.ExaminationStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/examination")
@RequiredArgsConstructor
public class ExaminationPanelController {

    private final MockExaminationRepository mockRepository;
    private final Optional<ExaminationStatsService> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
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
                service -> service.getMonthlyStats(years),
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
                service -> service.getMonthlyStats(years),
                () -> mockRepository.findMonthlyByYears(years)
        );
    }
}
