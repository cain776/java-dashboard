package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsParityResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsResponseMeta;
import com.bviit.analytics.exception.DataSourceUnavailableException;
import com.bviit.analytics.exception.SnapshotLockedException;
import com.bviit.analytics.service.reservation.CataractStatsDiagnosticDiffService;
import com.bviit.analytics.service.reservation.CataractStatsSnapshotStore;
import com.bviit.analytics.service.reservation.CataractStatsSystemService;
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
 * 예약통계_백내장 API (백내장=RESERVE_FLAG='H').
 *
 *   GET  /api/stats/reservation-stats-cataract?from&to              확정 스냅샷 우선, 없으면 라이브 집계.
 *        조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움(있으면 보존) 후 반환.
 *   POST /api/stats/reservation-stats-cataract/snapshot?period      해당 월 1회 조회해 확정 저장(월 전체 덮어쓰기).
 *   POST /api/stats/reservation-stats-cataract/fill?period          호출(증분 채움) — D-1까지 비어있는 날짜만 적재.
 *   GET  /api/stats/reservation-stats-cataract/snapshots            확정된 월 목록.
 *
 * 라이브 집계/저장은 mssql 프로파일에서만. 스냅샷 읽기는 프로파일 무관(스냅샷 없고 라이브도 없으면 503 → 프론트 미연결 안내).
 * 채울 수 없는 칸은 라이브에서 0으로 남을 수 있음 — docs/db/예약통계_백내장-데이터소스-분석.md.
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-cataract")
@RequiredArgsConstructor
@Slf4j
public class CataractStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;
    private static final String FORMULA_VERSION = "reservation-stats-cataract-v1";

    private final CataractStatsSnapshotStore snapshotStore;
    private final Optional<CataractStatsSystemService> service;
    private final Optional<CataractStatsDiagnosticDiffService> diagnosticDiffService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CataractStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        String period = from.toString().substring(0, 7);

        // 조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움(있으면 보존).
        if (service.isPresent() && needsAutoFill(period)) {
            try {
                service.get().fillSnapshot(period, authentication != null ? authentication.getName() : "auto");
            } catch (RuntimeException e) {
                log.warn("조회 중 자동 채움 실패(기존 데이터로 계속): period={}, err={}", period, e.getMessage());
            }
        }

        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            String fromStr = from.toString();
            String toStr = to.toString();
            List<CataractStatsDailyRow> days = snapshot.get().days().stream()
                    .filter(d -> d.date().compareTo(fromStr) >= 0 && d.date().compareTo(toStr) <= 0)
                    .toList();
            return ResponseEntity.ok(ApiResponse.ok(days, snapshotMeta(period, snapshot.get())));
        }
        CataractStatsSystemService liveService = requireLiveService(period, "확정 스냅샷·라이브 소스(MSSQL)가 없습니다.");
        return ResponseEntity.ok(ApiResponse.ok(
                liveService.getDailyCounts(from.toString(), to.toString()),
                liveMeta(period)
        ));
    }

    /** 조회 시 자동 채움 필요 여부 — 당월·미잠금이고 오늘 아직 안 채운 경우만(하루 1회). */
    private boolean needsAutoFill(String period) {
        LocalDate today = LocalDate.now();
        if (!period.equals(today.toString().substring(0, 7))) return false; // 당월만
        if (snapshotStore.isLocked(period)) return false;                   // PDF 고정월 제외
        Optional<CataractStatsSnapshot> snap = snapshotStore.find(period);
        if (snap.isEmpty()) return true;                                    // 스냅샷 없으면 채움
        String confirmedAt = snap.get().confirmedAt();
        String confirmedDate = confirmedAt != null && confirmedAt.length() >= 10 ? confirmedAt.substring(0, 10) : "";
        return confirmedDate.compareTo(today.toString()) < 0;               // 오늘 안 채웠으면 채움
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> saveSnapshot(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ensureWritable(period, "재확정(덮어쓰기)");
        String by = authentication != null ? authentication.getName() : "unknown";
        CataractStatsSnapshot snapshot = requireLiveService(period).saveSnapshot(period, by);
        return ResponseEntity.ok(ApiResponse.ok(snapshot, snapshotMeta(period, snapshot)));
    }

    /** 호출(증분 채움) — 선택 월을 D-1까지 조회해 비어있는 날짜만 적재(있으면 보존). PDF 고정월은 차단. */
    @PostMapping("/fill")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> fill(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ensureWritable(period, "호출(채움)");
        String by = authentication != null ? authentication.getName() : "unknown";
        CataractStatsSnapshot snapshot = requireLiveService(period).fillSnapshot(period, by);
        return ResponseEntity.ok(ApiResponse.ok(snapshot, snapshotMeta(period, snapshot)));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<CataractStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(snapshotStore.listSnapshots()));
    }

    @GetMapping("/diagnostics/diff")
    public ResponseEntity<ApiResponse<ReservationStatsDiffResponse>> diff(@RequestParam String period) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(requireDiagnosticService(period).diff(period)));
    }

    @GetMapping("/diagnostics/drill-down")
    public ResponseEntity<ApiResponse<ReservationStatsDrillDownResponse>> drillDown(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(requireDiagnosticService(period).drillDown(period, date.toString(), field)));
    }

    @GetMapping("/diagnostics/parity")
    public ResponseEntity<ApiResponse<ReservationStatsParityResponse>> parity(
            @RequestParam String period,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(requireDiagnosticService(period).parity(period, field)));
    }

    private void ensureWritable(String period, String action) {
        if (snapshotStore.isLocked(period)) {
            throw new SnapshotLockedException("PDF 고정 스냅샷이라 " + action + "할 수 없습니다: " + period);
        }
    }

    private CataractStatsSystemService requireLiveService(String period) {
        return requireLiveService(period, "실 데이터 소스(MSSQL)가 연결되지 않았습니다.");
    }

    private CataractStatsSystemService requireLiveService(String period, String message) {
        return service.orElseThrow(() -> dataSourceUnavailable(period, message));
    }

    private CataractStatsDiagnosticDiffService requireDiagnosticService(String period) {
        return diagnosticDiffService.orElseThrow(() -> dataSourceUnavailable(
                period,
                "실 데이터 소스(MSSQL)가 연결되지 않았습니다."
        ));
    }

    private static ReservationStatsResponseMeta snapshotMeta(String period, CataractStatsSnapshot snapshot) {
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
                CataractStatsSnapshot.CURRENT_SCHEMA_VERSION
        );
    }

    private static DataSourceUnavailableException dataSourceUnavailable(String period, String message) {
        return new DataSourceUnavailableException(
                message,
                ReservationStatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        CataractStatsSnapshot.CURRENT_SCHEMA_VERSION
                )
        );
    }
}
