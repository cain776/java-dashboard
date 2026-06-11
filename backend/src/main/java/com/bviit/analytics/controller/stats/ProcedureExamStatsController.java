package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.ProcedureExamMonthlyItem;
import com.bviit.analytics.service.stats.ProcedureExamStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 시술별 검사 건수("검사수") 통계 API.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 등록 안 됨.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ProcedureExamStatsController {

    private final ProcedureExamStatsService procedureExamService;

    /**
     * 연도별 월간 검사수 (프론트 ProcedureExamPage용).
     * GET /api/stats/procedure-exam/monthly?years=2024,2025,2026
     *
     * 응답: { success: true, data: [{year, month, examCount, total}, ...] }
     */
    @GetMapping("/procedure-exam/monthly")
    public ResponseEntity<ApiResponse<List<ProcedureExamMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(procedureExamService.getMonthlyStats(years)));
    }
}
