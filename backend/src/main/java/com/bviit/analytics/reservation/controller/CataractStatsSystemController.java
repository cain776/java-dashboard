package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.service.CataractStatsSnapshotStore;
import com.bviit.analytics.reservation.service.CataractStatsSystemQueryService;
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

/**
 * 예약통계_백내장 API (백내장=RESERVE_FLAG='H').
 *
 *   GET  /api/stats/reservation-stats-cataract?from&to              확정 스냅샷 우선, 없으면 라이브 집계.
 *        조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움(있으면 보존) 후 반환.
 *   POST /api/stats/reservation-stats-cataract/snapshot?period      해당 월 1회 조회해 확정 저장(월 전체 덮어쓰기).
 *   POST /api/stats/reservation-stats-cataract/fill?period          호출(증분 채움) — D-1까지 비어있는 날짜만 적재.
 *   POST /api/stats/reservation-stats-cataract/cell?period&date&field&value  셀 손보정(인입콜/응대콜) — 휴가일 등 라이브 어긋남 교정.
 *   GET  /api/stats/reservation-stats-cataract/snapshots            확정된 월 목록.
 *
 * 라이브 집계/저장은 mssql 프로파일에서만. 스냅샷 읽기는 프로파일 무관(스냅샷 없고 라이브도 없으면 503 → 프론트 미연결 안내).
 * 채울 수 없는 칸은 라이브에서 0으로 남을 수 있음 — docs/db/예약통계_백내장-데이터소스-분석.md.
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-cataract")
@RequiredArgsConstructor
public class CataractStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;

    private final CataractStatsSystemQueryService queryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CataractStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        ReservationStatsResult<List<CataractStatsDailyRow>> result =
                queryService.getDailyCounts(from, to, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> saveSnapshot(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsResult<CataractStatsSnapshot> result =
                queryService.saveSnapshot(period, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    /** 호출(증분 채움) — 선택 월을 D-1까지 조회해 비어있는 날짜만 적재(있으면 보존). PDF 고정월은 차단. */
    @PostMapping("/fill")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> fill(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsResult<CataractStatsSnapshot> result =
                queryService.fillSnapshot(period, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    /**
     * 셀 손보정 — 특정 일자의 인입콜/응대콜을 PDF/레거시 값으로 직접 고친다(휴가 등 라이브 어긋남 교정).
     * 스냅샷 파일만 갱신(라이브/MSSQL 불필요)하며 수정 이력을 남긴다. locked 월도 허용(이력으로 추적).
     */
    @PostMapping("/cell")
    public ResponseEntity<ApiResponse<CataractStatsDailyRow>> editCell(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field,
            @RequestParam int value,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        CataractStatsDailyRow updated = queryService.editCell(
                period,
                date.toString(),
                field,
                value,
                username(authentication)
        );
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<CataractStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(queryService.listSnapshots()));
    }

    @GetMapping("/diagnostics/diff")
    public ResponseEntity<ApiResponse<ReservationStatsDiffResponse>> diff(@RequestParam String period) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.diff(period)));
    }

    @GetMapping("/diagnostics/drill-down")
    public ResponseEntity<ApiResponse<ReservationStatsDrillDownResponse>> drillDown(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.drillDown(period, date.toString(), field)));
    }

    @GetMapping("/diagnostics/parity")
    public ResponseEntity<ApiResponse<ReservationStatsParityResponse>> parity(
            @RequestParam String period,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.parity(period, field)));
    }

    @GetMapping("/diagnostics/health")
    public ResponseEntity<ApiResponse<ReservationStatsDiagnosticsHealthResponse>> health(@RequestParam String period) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.health(period)));
    }

    private static String username(Authentication authentication) {
        return authentication != null ? authentication.getName() : "unknown";
    }
}
