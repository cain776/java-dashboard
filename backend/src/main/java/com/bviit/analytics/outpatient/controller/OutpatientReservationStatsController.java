package com.bviit.analytics.outpatient.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsDailyRow;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsSnapshot;
import com.bviit.analytics.outpatient.service.OutpatientReservationStatsSnapshotStore;
import com.bviit.analytics.outpatient.service.OutpatientReservationStatsQueryService;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
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
 * 외래 예약통계 API (외래 = RESERVE_FLAG='F').
 *
 *   GET  /api/stats/outpatient-reservation-stats?from&to     확정 스냅샷 우선, 없으면 라이브 집계.
 *        조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움 후 반환.
 *   POST /api/stats/outpatient-reservation-stats/snapshot?period   해당 월 1회 조회해 확정 저장(월 전체 덮어쓰기).
 *   POST /api/stats/outpatient-reservation-stats/fill?period       호출(증분 채움) — D-1까지 비어있는 날짜만 적재.
 *   GET  /api/stats/outpatient-reservation-stats/snapshots         확정된 월 목록.
 *
 * 라이브 집계/저장은 mssql 프로파일에서만. 스냅샷 읽기는 프로파일 무관(스냅샷 없고 라이브도 없으면 503).
 * 미배선 칸(인입/응대콜·문의만·카톡)은 라이브에서 0으로 남는다 — SQL 주석 참조.
 */
@RestController
@RequestMapping("/api/stats/outpatient-reservation-stats")
@RequiredArgsConstructor
public class OutpatientReservationStatsController {

    private static final int MAX_RANGE_DAYS = 92;

    private final OutpatientReservationStatsQueryService queryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OutpatientReservationStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        ReservationStatsResult<List<OutpatientReservationStatsDailyRow>> result =
                queryService.getDailyCounts(from, to, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<OutpatientReservationStatsSnapshot>> saveSnapshot(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsResult<OutpatientReservationStatsSnapshot> result =
                queryService.saveSnapshot(period, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    @PostMapping("/fill")
    public ResponseEntity<ApiResponse<OutpatientReservationStatsSnapshot>> fill(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsResult<OutpatientReservationStatsSnapshot> result =
                queryService.fillSnapshot(period, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<OutpatientReservationStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(queryService.listSnapshots()));
    }

    private static String username(Authentication authentication) {
        return authentication != null ? authentication.getName() : "unknown";
    }
}
