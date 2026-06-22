package com.bviit.analytics.controller.exam;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.exam.ProcedureExamMonthlyItem;
import com.bviit.analytics.service.exam.ProcedureExamStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 시술별 검사 건수("검사수") 통계 API.
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ProcedureExamStatsController {

    private final Optional<ProcedureExamStatsService> procedureExamService;

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

        return StatsPanelSupport.resolve(
                false,
                procedureExamService,
                service -> service.getMonthlyStats(years),
                List::of
        );
    }
}
