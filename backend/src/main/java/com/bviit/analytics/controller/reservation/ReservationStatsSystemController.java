package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsParityResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsResponseMeta;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.service.reservation.ReservationStatsDiagnosticDiffService;
import com.bviit.analytics.service.reservation.ReservationStatsSnapshotStore;
import com.bviit.analytics.service.reservation.ReservationStatsSystemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 *   GET  /api/stats/reservation-stats-system?from&to   일자별 원시 카운트 — 확정 스냅샷 우선.
 *        조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움(있으면 보존) 후 반환.
 *   POST /api/stats/reservation-stats-system/snapshot?period=YYYY-MM   해당 월을 1회 조회해 JSON 스냅샷 확정 저장.
 *   GET  /api/stats/reservation-stats-system/snapshots   확정된 월 목록.
 *
 * 라이브 조회·저장은 mssql 프로파일에서만(EICN_MySQL 링크드서버 경유). 스냅샷 읽기는 프로파일 무관.
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-system")
@RequiredArgsConstructor
@Slf4j
public class ReservationStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;
    private static final String FORMULA_VERSION = "reservation-stats-system-v1";

    private final ReservationStatsSnapshotStore snapshotStore;
    private final Optional<ReservationStatsSystemService> service;
    private final Optional<ReservationStatsDiagnosticDiffService> diagnosticDiffService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReservationStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        String period = from.toString().substring(0, 7);

        // 조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움(있으면 보존).
        // 무거운 라이브 쿼리(OPENQUERY)는 이 조건에서만 1일 1회 — 이미 최신(오늘 채움)이면 skip.
        if (service.isPresent() && needsAutoFill(period)) {
            try {
                service.get().fillSnapshot(period, authentication != null ? authentication.getName() : "auto");
            } catch (RuntimeException e) {
                log.warn("조회 중 자동 채움 실패(기존 데이터로 계속): period={}, err={}", period, e.getMessage());
            }
        }

        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            String fromStr = from.toString();
            String toStr = to.toString();
            List<ReservationStatsDailyRow> days = snapshot.get().days().stream()
                    .filter(d -> d.date().compareTo(fromStr) >= 0 && d.date().compareTo(toStr) <= 0)
                    .toList();
            return ResponseEntity.ok(ApiResponse.ok(days, snapshotMeta(period, snapshot.get())));
        }
        return service
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(
                        svc.getDailyCounts(from.toString(), to.toString()),
                        liveMeta(period)
                )))
                .orElseGet(() -> realDataUnavailable(period));
    }

    /**
     * 조회 시 자동 채움이 필요한가 — 당월·미잠금이고 오늘 아직 안 채운 경우만(하루 1회).
     * D-1은 하루 내내 고정이라, 같은 날 재조회는 무거운 라이브 쿼리를 skip한다.
     */
    private boolean needsAutoFill(String period) {
        LocalDate today = LocalDate.now();
        if (!period.equals(today.toString().substring(0, 7))) return false; // 당월만
        if (snapshotStore.isLocked(period)) return false;                   // PDF 고정월 제외
        Optional<ReservationStatsSnapshot> snap = snapshotStore.find(period);
        if (snap.isEmpty()) return true;                                    // 스냅샷 없으면 채움
        String confirmedAt = snap.get().confirmedAt();
        String confirmedDate = confirmedAt != null && confirmedAt.length() >= 10 ? confirmedAt.substring(0, 10) : "";
        return confirmedDate.compareTo(today.toString()) < 0;               // 오늘 안 채웠으면 채움
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
                .map(svc -> {
                    ReservationStatsSnapshot snapshot = svc.saveSnapshot(period, by);
                    return ResponseEntity.ok(ApiResponse.ok(snapshot, snapshotMeta(period, snapshot)));
                })
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
                .map(svc -> {
                    ReservationStatsSnapshot snapshot = svc.fillSnapshot(period, by);
                    return ResponseEntity.ok(ApiResponse.ok(snapshot, snapshotMeta(period, snapshot)));
                })
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

    @GetMapping("/diagnostics/parity")
    public ResponseEntity<ApiResponse<ReservationStatsParityResponse>> parity(
            @RequestParam String period,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return diagnosticDiffService
                .map(svc -> ResponseEntity.ok(ApiResponse.ok(svc.parity(period, field))))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다.")));
    }

    private static ReservationStatsResponseMeta snapshotMeta(String period, ReservationStatsSnapshot snapshot) {
        return ReservationStatsResponseMeta.snapshot(
                period,
                FORMULA_VERSION,
                snapshot.locked(),
                snapshot.confirmedAt(),
                snapshot.confirmedBy(),
                snapshot.schemaVersion()
        );
    }

    private static ReservationStatsResponseMeta liveMeta(String period) {
        return ReservationStatsResponseMeta.live(
                period,
                FORMULA_VERSION,
                ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION
        );
    }

    private static ResponseEntity<ApiResponse<List<ReservationStatsDailyRow>>> realDataUnavailable(String period) {
        return ResponseEntity.status(503).body(ApiResponse.error(
                "실 데이터 소스(MSSQL)가 연결되지 않았습니다.",
                ReservationStatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION
                )
        ));
    }
}
