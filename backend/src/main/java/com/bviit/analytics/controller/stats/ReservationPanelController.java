package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.stats.ReservationMonthlyItem;
import com.bviit.analytics.repository.MockReservationRepository;
import com.bviit.analytics.service.stats.ReservationStatsService;
import lombok.RequiredArgsConstructor;
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
 * 예약 패널 API — 프로파일 제한 없음.
 * mock=true → SQLite 더미 데이터, mock=false → 실 데이터 (mssql 프로파일 필요)
 */
@RestController
@RequestMapping("/api/stats/reservation")
@RequiredArgsConstructor
public class ReservationPanelController {

    private final MockReservationRepository mockRepository;
    private final Optional<ReservationStatsService> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        validateYears(years);
        if (!mock) {
            if (realService.isEmpty()) {
                return ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
            }
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        List<Map<String, Object>> rows = mockRepository.findKpiByYears(years);
        var kpi = rows.stream().map(r -> new KpiRow(
                toInt(r.get("year")),
                toInt(r.get("surgery")),
                toInt(r.get("outpatient")),
                toInt(r.get("dreamlens")),
                toInt(r.get("total"))
        )).toList();
        return ResponseEntity.ok(ApiResponse.ok(kpi));
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getTrend(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        validateYears(years);
        if (!mock) {
            if (realService.isEmpty()) {
                return ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
            }
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        return ResponseEntity.ok(ApiResponse.ok(toMonthlyItems(years)));
    }

    @GetMapping("/composition")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getComposition(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        validateYears(years);
        if (!mock) {
            if (realService.isEmpty()) {
                return ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
            }
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        return ResponseEntity.ok(ApiResponse.ok(toMonthlyItems(years)));
    }

    private List<ReservationMonthlyItem> toMonthlyItems(List<Integer> years) {
        return mockRepository.findMonthlyByYears(years).stream()
                .map(r -> ReservationMonthlyItem.builder()
                        .year(toInt(r.get("year"))).month(toInt(r.get("month")))
                        .surgery(toInt(r.get("surgery"))).outpatient(toInt(r.get("outpatient")))
                        .dreamlens(toInt(r.get("dreamlens"))).total(toInt(r.get("total")))
                        .build())
                .toList();
    }

    private void validateYears(List<Integer> years) {
        if (years.isEmpty() || years.size() > 5) {
            throw new IllegalArgumentException("연도는 1~5개까지 지정할 수 있습니다.");
        }
        int currentYear = LocalDate.now().getYear();
        for (int y : years) {
            if (y < 2020 || y > currentYear + 1) {
                throw new IllegalArgumentException("유효하지 않은 연도: " + y);
            }
        }
    }

    private static int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return Integer.parseInt(val.toString());
    }

    record KpiRow(int year, int surgery, int outpatient, int dreamlens, int total) {}
}
