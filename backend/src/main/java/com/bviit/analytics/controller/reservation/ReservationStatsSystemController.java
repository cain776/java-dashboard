package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.service.reservation.ReservationStatsDiagnosticDiffService;
import com.bviit.analytics.service.reservation.ReservationStatsSnapshotStore;
import com.bviit.analytics.service.reservation.ReservationStatsSystemService;
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

/**
 * 예약통계시스템(BCRM RSS 컨택통계) API.
 *
 *   GET  /api/stats/reservation-stats-system?from&to   일자별 원시 카운트 — 확정 스냅샷 있으면 그걸, 없으면 라이브.
 *   POST /api/stats/reservation-stats-system/snapshot?period=YYYY-MM   해당 월을 1회 조회해 JSON 스냅샷 확정 저장.
 *   GET  /api/stats/reservation-stats-system/snapshots   확정된 월 목록.
 *
 * 라이브 조회·저장은 mssql 프로파일에서만(EICN_MySQL 링크드서버 경유). 스냅샷 읽기는 프로파일 무관.
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-system")
@RequiredArgsConstructor
public class ReservationStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;

    private final ReservationStatsSnapshotStore snapshotStore;
    private final Optional<ReservationStatsSystemService> service;
    private final Optional<ReservationStatsDiagnosticDiffService> diagnosticDiffService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReservationStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        String period = from.toString().substring(0, 7);

        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            String fromStr = from.toString();
            String toStr = to.toString();
            List<ReservationStatsDailyRow> days = snapshot.get().days().stream()
                    .filter(d -> d.date().compareTo(fromStr) >= 0 && d.date().compareTo(toStr) <= 0)
                    .toList();
            return ResponseEntity.ok(ApiResponse.ok(days));
        }
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.getDailyCounts(from.toString(), to.toString()))))
                .orElseGet(ReservationStatsSystemController::realDataUnavailable);
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<ReservationStatsSnapshot>> saveSnapshot(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        // PDF 고정 스냅샷(예: 2026-01~05)은 라이브 재확정으로 덮어쓰지 않는다.
        if (snapshotStore.isLocked(period)) {
            return ResponseEntity.status(409).body(ApiResponse.error("PDF 고정 스냅샷이라 재확정(덮어쓰기)할 수 없습니다: " + period));
        }
        String by = authentication != null ? authentication.getName() : "unknown";
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.saveSnapshot(period, by))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    /**
     * 호출(증분 채움) — 해당 월을 D-1까지 라이브 조회해 기존 스냅샷의 비어있는 날짜만 채운다(있으면 보존).
     * 진행 중인 달을 매일 이어붙이는 용도. PDF 고정월은 차단.
     */
    @PostMapping("/fill")
    public ResponseEntity<ApiResponse<ReservationStatsSnapshot>> fill(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        if (snapshotStore.isLocked(period)) {
            return ResponseEntity.status(409).body(ApiResponse.error("PDF 고정 스냅샷이라 호출(채움)할 수 없습니다: " + period));
        }
        String by = authentication != null ? authentication.getName() : "unknown";
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.fillSnapshot(period, by))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<ReservationStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(snapshotStore.listSnapshots()));
    }

    @GetMapping("/diagnostics/diff")
    public ResponseEntity<ApiResponse<ReservationStatsDiffResponse>> diff(@RequestParam String period) {
        StatsRequestValidator.validatePeriod(period);
        return diagnosticDiffService
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.diff(period))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    @GetMapping("/diagnostics/drill-down")
    public ResponseEntity<ApiResponse<ReservationStatsDrillDownResponse>> drillDown(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return diagnosticDiffService
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.drillDown(period, date.toString(), field))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    private static ResponseEntity<ApiResponse<List<ReservationStatsDailyRow>>> realDataUnavailable() {
        return ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
    }
}
