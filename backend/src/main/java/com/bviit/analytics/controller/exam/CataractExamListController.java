package com.bviit.analytics.controller.exam;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.service.exam.CataractExamListService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * GET /api/cataract-exam-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 백내장 검사자 리스트 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키, 검사자 리스트와 동일 계약).
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/cataract-exam-list")
@RequiredArgsConstructor
public class CataractExamListController {

    private final CataractExamListService cataractExamListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCataractExamList(
            @RequestParam String from,
            @RequestParam String to
    ) {
        validateDate(from, "from");
        validateDate(to, "to");
        return ResponseEntity.ok(ApiResponse.ok(cataractExamListService.getCataractExamList(from, to)));
    }

    private void validateDate(String value, String field) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException(field + " 파라미터는 'YYYY-MM-DD' 형식이어야 합니다.");
        }
    }
}
