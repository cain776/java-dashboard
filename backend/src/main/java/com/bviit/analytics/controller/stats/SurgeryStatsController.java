package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.SurgeryMonthlyItem;
import com.bviit.analytics.service.stats.SurgeryStatsService;
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
 * 수술 통계 API.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 등록 안 됨.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class SurgeryStatsController {

    private final SurgeryStatsService surgeryService;

    /**
     * 연도별 월간 수술 유형별 건수 (프론트 SurgeryPage용).
     * GET /api/stats/surgery/monthly?years=2025,2026
     */
    @GetMapping("/surgery/monthly")
    public ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        return ResponseEntity.ok(ApiResponse.ok(getValidatedMonthlyStats(years)));
    }

    /**
     * 수술별 비중 (프론트 SurgeryRatioPage용).
     * GET /api/stats/surgery-ratio?years=2025,2026
     *
     * 응답 형태는 /surgery/monthly와 동일 — 프론트에서 비중(%) ��산.
     */
    @GetMapping("/surgery-ratio")
    public ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getSurgeryRatio(
            @RequestParam List<Integer> years
    ) {
        return ResponseEntity.ok(ApiResponse.ok(getValidatedMonthlyStats(years)));
    }

    private List<SurgeryMonthlyItem> getValidatedMonthlyStats(List<Integer> years) {
        if (years.isEmpty() || years.size() > 5) {
            throw new IllegalArgumentException("연도는 1~5개까지 지정할 수 있습니다.");
        }
        int currentYear = LocalDate.now().getYear();
        for (int y : years) {
            if (y < 2020 || y > currentYear + 1) {
                throw new IllegalArgumentException("유효하지 않은 연도: " + y);
            }
        }
        return surgeryService.getMonthlyStats(years);
    }
}
