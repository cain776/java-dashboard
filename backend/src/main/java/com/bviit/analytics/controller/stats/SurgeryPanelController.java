package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.repository.MockSurgeryRepository;
import com.bviit.analytics.service.stats.SurgeryStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/surgery")
@RequiredArgsConstructor
public class SurgeryPanelController {

    private final MockSurgeryRepository mockRepository;
    private final Optional<SurgeryStatsService> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        if (!mock) {
            if (realService.isEmpty()) return err503();
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        return ResponseEntity.ok(ApiResponse.ok(mockRepository.findKpiByYears(years)));
    }

    @GetMapping("/panel/trend")
    public ResponseEntity<ApiResponse<List<?>>> getTrend(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        if (!mock) {
            if (realService.isEmpty()) return err503();
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        return ResponseEntity.ok(ApiResponse.ok(mockRepository.findMonthlyByYears(years)));
    }

    @GetMapping("/panel/composition")
    public ResponseEntity<ApiResponse<List<?>>> getComposition(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "true") boolean mock) {
        if (!mock) {
            if (realService.isEmpty()) return err503();
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        return ResponseEntity.ok(ApiResponse.ok(mockRepository.findMonthlyByYears(years)));
    }

    private ResponseEntity<ApiResponse<List<?>>> err503() {
        return ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
    }
}
