package com.bviit.analytics.controller.exam;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.service.exam.ExamListService;
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
 * GET /api/exam-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 검사자 리스트(상담사별) 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키).
 * 개발(H2)에서는 이 프로필이 비활성 → 프론트 MSW 목업이 응답.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/exam-list")
@RequiredArgsConstructor
public class ExamListController {

    private final ExamListService examListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getExamList(
            @RequestParam String from,
            @RequestParam String to
    ) {
        validateDate(from, "from");
        validateDate(to, "to");
        return ResponseEntity.ok(ApiResponse.ok(examListService.getExamList(from, to)));
    }

    private void validateDate(String value, String field) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException(field + " 파라미터는 'YYYY-MM-DD' 형식이어야 합니다.");
        }
    }
}
