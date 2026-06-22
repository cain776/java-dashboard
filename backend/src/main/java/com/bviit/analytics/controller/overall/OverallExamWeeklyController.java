package com.bviit.analytics.controller.overall;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.overall.OverallExamWeeklyItem;
import com.bviit.analytics.service.overall.OverallExamWeeklyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 검사자 종합표 주간 집계 API.
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class OverallExamWeeklyController {

    private final Optional<OverallExamWeeklyService> overallExamWeeklyService;

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

        return StatsPanelSupport.resolve(
                false,
                overallExamWeeklyService,
                service -> service.getWeeklyStats(years),
                List::of
        );
    }
}
