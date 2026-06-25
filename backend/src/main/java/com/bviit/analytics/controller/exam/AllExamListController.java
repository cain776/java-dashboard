package com.bviit.analytics.controller.exam;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.exception.DataSourceUnavailableException;
import com.bviit.analytics.service.exam.AllExamListService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * GET /api/all-exam-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 전체 검사자(시력교정+백내장) 통합 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키).
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/all-exam-list")
@RequiredArgsConstructor
public class AllExamListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<AllExamListService> allExamListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllExamList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return allExamListService
                .map(service -> ResponseEntity.ok(ApiResponse.ok(service.getAllExamList(from.toString(), to.toString()))))
                .orElseThrow(AllExamListController::realDataUnavailable);
    }

    private static DataSourceUnavailableException realDataUnavailable() {
        return new DataSourceUnavailableException("실 데이터 소스(MSSQL)가 연결되지 않았습니다.");
    }
}
