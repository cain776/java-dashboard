package com.bviit.analytics.controller.reservation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.service.reservation.CataractStatsSnapshotStore;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 예약통계_백내장 API.
 *
 *   GET  /api/stats/reservation-stats-cataract?from&to   일자별 원시 카운트 — 확정 스냅샷이 있으면 반환.
 *   POST /api/stats/reservation-stats-cataract/snapshot?period=YYYY-MM   (라이브 소스 미연결 — 503)
 *   GET  /api/stats/reservation-stats-cataract/snapshots   확정된 월 목록.
 *
 * 라이브 BCRM 집계 쿼리는 아직 없으므로(시력교정과 달리) 데이터는 PDF 스냅샷(JSON)으로 채운다.
 * 스냅샷 읽기는 프로파일 무관 — 스냅샷이 없으면 503(프론트는 시드로 폴백).
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-cataract")
@RequiredArgsConstructor
public class CataractStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;

    private final CataractStatsSnapshotStore snapshotStore;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CataractStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        String period = from.toString().substring(0, 7);

        return snapshotStore.find(period)
                .map(snap -> ResponseEntity.ok(ApiResponse.ok(snap.days())))
                .orElseGet(() -> ResponseEntity.status(503).body(ApiResponse.error("확정 스냅샷이 없습니다(라이브 소스 미연결). PDF 스냅샷으로 채워주세요.")));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<CataractStatsSnapshot>> saveSnapshot(@RequestParam String period) {
        // 백내장은 라이브 집계 쿼리가 없어 자동 확정 저장을 지원하지 않는다(PDF 스냅샷 JSON으로 채움).
        return ResponseEntity.status(503).body(ApiResponse.error("백내장은 라이브 확정 저장을 지원하지 않습니다(PDF 스냅샷으로 채웁니다)."));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<CataractStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(snapshotStore.listSnapshots()));
    }
}
