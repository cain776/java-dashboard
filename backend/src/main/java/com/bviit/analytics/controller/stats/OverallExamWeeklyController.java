package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.OverallExamWeeklyItem;
import com.bviit.analytics.service.stats.OverallExamWeeklyService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 검사자 종합표 주간 집계 API.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 등록 안 됨.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class OverallExamWeeklyController {

    private final OverallExamWeeklyService overallExamWeeklyService;

    /**
     * 연도별 주간 검사자 종합지표 (프론트 주간 검사자 종합지표 페이지용).
     * GET /api/stats/overall-exam/weekly?years=2025,2026
     *
     * 응답: { success: true, data: [{year, month, week, partial, startDate, endDate, ...원시 집계}, ...] }
     */
    @GetMapping("/overall-exam/weekly")
    public ResponseEntity<ApiResponse<List<OverallExamWeeklyItem>>> getWeeklyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(overallExamWeeklyService.getWeeklyStats(years)));
    }
}
