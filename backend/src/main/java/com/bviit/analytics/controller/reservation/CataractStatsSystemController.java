package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.service.reservation.CataractStatsSnapshotStore;
import com.bviit.analytics.service.reservation.CataractStatsSystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 예약통계_백내장 API (백내장=RESERVE_FLAG='H').
 *
 *   GET  /api/stats/reservation-stats-cataract?from&to              확정 스냅샷 우선, 없으면 라이브 집계.
 *   POST /api/stats/reservation-stats-cataract/snapshot?period      해당 월 1회 조회해 확정 저장(월 전체 덮어쓰기).
 *   POST /api/stats/reservation-stats-cataract/fill?period          호출(증분 채움) — D-1까지 비어있는 날짜만 적재.
 *   GET  /api/stats/reservation-stats-cataract/snapshots            확정된 월 목록.
 *
 * 라이브 집계/저장은 mssql 프로파일에서만. 스냅샷 읽기는 프로파일 무관(스냅샷 없고 라이브도 없으면 503 → 프론트 시드 폴백).
 * 채울 수 없는 칸(인입콜·TM·노안)은 라이브에서 0 — docs/db/예약통계_백내장-데이터소스-분석.md.
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-cataract")
@RequiredArgsConstructor
public class CataractStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;
    private static final Pattern PERIOD = Pattern.compile("\\d{4}-\\d{2}");

    private final CataractStatsSnapshotStore snapshotStore;
    private final Optional<CataractStatsSystemService> service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CataractStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        String period = from.toString().substring(0, 7);

        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            return ResponseEntity.ok(ApiResponse.ok(snapshot.get().days()));
        }
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.getDailyCounts(from.toString(), to.toString()))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("확정 스냅샷·라이브 소스(MSSQL)가 없습니다.")));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> saveSnapshot(
            @RequestParam String period,
            Authentication authentication
    ) {
        if (period == null || !PERIOD.matcher(period).matches()) {
            throw new IllegalArgumentException("period must be YYYY-MM: " + period);
        }
        if (snapshotStore.isLocked(period)) {
            return ResponseEntity.status(409).body(ApiResponse.error("PDF 고정 스냅샷이라 재확정(덮어쓰기)할 수 없습니다: " + period));
        }
        String by = authentication != null ? authentication.getName() : "unknown";
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.saveSnapshot(period, by))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    /** 호출(증분 채움) — 선택 월을 D-1까지 조회해 비어있는 날짜만 적재(있으면 보존). PDF 고정월은 차단. */
    @PostMapping("/fill")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> fill(
            @RequestParam String period,
            Authentication authentication
    ) {
        if (period == null || !PERIOD.matcher(period).matches()) {
            throw new IllegalArgumentException("period must be YYYY-MM: " + period);
        }
        if (snapshotStore.isLocked(period)) {
            return ResponseEntity.status(409).body(ApiResponse.error("PDF 고정 스냅샷이라 호출(채움)할 수 없습니다: " + period));
        }
        String by = authentication != null ? authentication.getName() : "unknown";
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.fillSnapshot(period, by))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<CataractStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(snapshotStore.listSnapshots()));
    }
}
