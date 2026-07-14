package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.common.stats.MonthlySnapshotStore;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsDailyRow;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 외래 예약통계 확정 스냅샷의 파일 저장소 — 월별 JSON 1개(원자적 쓰기).
 * 시력교정/백내장 스냅샷 스토어와 동일 구조(공용 MonthlySnapshotStore 위임). 파일 I/O뿐이라 프로파일 무관.
 * 저장 경로: stats.outpatient-reservation-stats.dir (기본 ./data/outpatient-reservation-stats).
 */
@Service
public class OutpatientReservationStatsSnapshotStore {

    private final MonthlySnapshotStore<OutpatientReservationStatsSnapshot, OutpatientReservationStatsDailyRow> store;

    public OutpatientReservationStatsSnapshotStore(
            ObjectMapper mapper,
            @Value("${stats.outpatient-reservation-stats.dir:./data/outpatient-reservation-stats}") String dir
    ) {
        this.store = new MonthlySnapshotStore<>(
                mapper,
                dir,
                OutpatientReservationStatsSnapshot.class,
                OutpatientReservationStatsSnapshot::period,
                OutpatientReservationStatsSnapshot::locked,
                OutpatientReservationStatsSnapshot::days,
                OutpatientReservationStatsDailyRow::date,
                OutpatientReservationStatsSnapshot::schemaVersion,
                OutpatientReservationStatsSnapshot.CURRENT_SCHEMA_VERSION,
                "외래 예약통계 스냅샷"
        );
    }

    /** 확정 월 1건의 요약(목록용) — 일자 데이터 없이 period·locked만. */
    public record SnapshotInfo(String period, boolean locked) {}

    public Optional<OutpatientReservationStatsSnapshot> find(String period) {
        return store.find(period);
    }

    /** 해당 월이 고정 스냅샷이라 재확정 금지인지. 없으면 false. */
    public boolean isLocked(String period) {
        return store.isLocked(period);
    }

    /** 원자적 저장(temp 작성 후 rename) — 동시/중단 시 부분 파일 방지. */
    public void save(OutpatientReservationStatsSnapshot snapshot) {
        store.save(snapshot);
    }

    /** 확정된 월 목록(period+locked) — 프론트가 "확정됨"·"고정" 표시에 사용. */
    public List<SnapshotInfo> listSnapshots() {
        return store.listSnapshots().stream()
                .map(info -> new SnapshotInfo(info.period(), info.locked()))
                .toList();
    }

    public List<OutpatientReservationStatsDailyRow> mergeDays(
            Optional<OutpatientReservationStatsSnapshot> existing,
            List<OutpatientReservationStatsDailyRow> fetched
    ) {
        return store.mergeDays(existing, fetched);
    }
}
