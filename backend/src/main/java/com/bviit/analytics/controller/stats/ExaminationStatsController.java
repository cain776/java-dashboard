package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.ExaminationMonthlyItem;
import com.bviit.analytics.service.stats.ExaminationStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 검사 건수 통계 API.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 등록 안 됨.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ExaminationStatsController {

    private final ExaminationStatsService examinationService;

    /**
     * 연도별 월간 검사 유형별 건수 (프론트 ExaminationPage용).
     * GET /api/stats/examination/monthly?years=2025,2026
     *
     * 응답: { success: true, data: [{year, month, visionCorrection,
     *         dreamlens, examTotal, total}, ...] }
     */
    @GetMapping("/examination/monthly")
    public ResponseEntity<ApiResponse<List<ExaminationMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(examinationService.getMonthlyStats(years)));
    }
}
