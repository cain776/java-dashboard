package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.common.stats.SnapshotWindow;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsDailyRow;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsSnapshot;
import com.bviit.analytics.outpatient.repository.OutpatientReservationStatsRepository;
import com.bviit.analytics.reservation.service.ReservationStatsPeriodLock;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 외래 예약통계 — 라이브 일자별 카운트 조회 + 월별 확정/증분 스냅샷 저장.
 * 시력교정(ReservationStatsSystemService)·백내장과 동일 패턴. 외래 = RESERVE_FLAG='F'.
 * 월별 락은 시력교정과 공용(ReservationStatsPeriodLock, 스냅샷 파일 경로가 달라 충돌 없음).
 */
@Service
@Profile("mssql")
@RequiredArgsConstructor
public class OutpatientReservationStatsService {

    private final OutpatientReservationStatsRepository repository;
    private final OutpatientReservationStatsSnapshotStore snapshotStore;
    private final ReservationStatsPeriodLock periodLock;

    @Transactional(readOnly = true)
    public List<OutpatientReservationStatsDailyRow> getDailyCounts(String from, String to) {
        return repository.findDailyCounts(from, to);
    }

    /** 해당 월(period=YYYY-MM) 전체를 1회 조회해 JSON 스냅샷으로 확정 저장(월 전체 덮어쓰기). */
    @Transactional(readOnly = true)
    public OutpatientReservationStatsSnapshot saveSnapshot(String period, String by) {
        Optional<LocalDate> end = SnapshotWindow.completedEnd(period, LocalDate.now());
        if (end.isEmpty()) {
            return snapshotStore.find(period).orElseGet(() -> emptySnapshot(period, by));
        }

        List<OutpatientReservationStatsDailyRow> days =
                repository.findDailyCounts(period + "-01", end.get().toString());
        return periodLock.withPeriodLock(period, () -> {
            OutpatientReservationStatsSnapshot snapshot =
                    new OutpatientReservationStatsSnapshot(period, LocalDateTime.now().toString(), by, false, days);
            snapshotStore.save(snapshot);
            return snapshot;
        });
    }

    /**
     * 호출(증분 채움) — 해당 월을 D-1까지 조회해 기존 스냅샷에 <b>비어있는 날짜만</b> 추가한다.
     * 이미 있는 날짜(시드·이전 호출분)는 보존(덮어쓰기 금지).
     */
    @Transactional(readOnly = true)
    public OutpatientReservationStatsSnapshot fillSnapshot(String period, String by) {
        Optional<LocalDate> end = SnapshotWindow.completedEnd(period, LocalDate.now());
        if (end.isEmpty()) {
            return snapshotStore.find(period).orElseGet(() -> emptySnapshot(period, by));
        }

        // 라이브 조회는 무거울 수 있으므로 period lock 밖에서 끝내고, 파일 read/merge/save만 잠근다.
        List<OutpatientReservationStatsDailyRow> fetched =
                repository.findDailyCounts(period + "-01", end.get().toString());
        return periodLock.withPeriodLock(period, () -> {
            Optional<OutpatientReservationStatsSnapshot> existing = snapshotStore.find(period);
            List<OutpatientReservationStatsDailyRow> merged = snapshotStore.mergeDays(existing, fetched);
            boolean locked = existing.map(OutpatientReservationStatsSnapshot::locked).orElse(false);
            String confirmedBy = existing.map(OutpatientReservationStatsSnapshot::confirmedBy).orElse(by);
            OutpatientReservationStatsSnapshot snapshot = new OutpatientReservationStatsSnapshot(
                    period, LocalDateTime.now().toString(), confirmedBy, locked, merged);
            snapshotStore.save(snapshot);
            return snapshot;
        });
    }

    /** 적재할 완료일이 없을 때(월초) 저장 없이 돌려주는 빈 스냅샷. */
    private static OutpatientReservationStatsSnapshot emptySnapshot(String period, String by) {
        return new OutpatientReservationStatsSnapshot(period, LocalDateTime.now().toString(), by, false, List.of());
    }
}
