package com.bviit.analytics.controller.surgery;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.service.surgery.SurgeryListService;
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
 * GET /api/surgery-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 수술자 리스트 행 목록. 기준일은 수술일자, 보조일은 검사일자.
 */
@RestController
@Profile("mssql")
@RequestMapping("/api/surgery-list")
@RequiredArgsConstructor
public class SurgeryListController {

    private final SurgeryListService surgeryListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSurgeryList(
            @RequestParam String from,
            @RequestParam String to
    ) {
        validateDate(from, "from");
        validateDate(to, "to");
        return ResponseEntity.ok(ApiResponse.ok(surgeryListService.getSurgeryList(from, to)));
    }

    private void validateDate(String value, String field) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException(field + " 파라미터는 'YYYY-MM-DD' 형식이어야 합니다.");
        }
    }
}
