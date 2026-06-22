package com.bviit.analytics.controller.surgery;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.surgery.SurgeryMonthlyItem;
import com.bviit.analytics.service.surgery.SurgeryStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 수술 통계 API.
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class SurgeryStatsController {

    private final Optional<SurgeryStatsService> surgeryService;

    /**
     * 연도별 월간 수술 유형별 건수 (프론트 SurgeryPage용).
     * GET /api/stats/surgery/monthly?years=2025,2026
     */
    @GetMapping("/surgery/monthly")
    public ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        return getValidatedMonthlyStats(years);
    }

    /**
     * 수술별 비중 (프론트 SurgeryRatioPage용).
     * GET /api/stats/surgery-ratio?years=2025,2026
     *
     * 응답 형태는 /surgery/monthly와 동일 — 프론트에서 비중(%) 계산.
     */
    @GetMapping("/surgery-ratio")
    public ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getSurgeryRatio(
            @RequestParam List<Integer> years
    ) {
        return getValidatedMonthlyStats(years);
    }

    private ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getValidatedMonthlyStats(List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                false,
                surgeryService,
                service -> service.getMonthlyStats(years),
                List::of
        );
    }
}
