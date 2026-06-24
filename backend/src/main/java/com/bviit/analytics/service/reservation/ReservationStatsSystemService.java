package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.repository.reservation.ReservationStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 예약통계시스템 — BCRM RSS 컨택통계 일자별 원시 카운트 조회 + 월별 확정 스냅샷 저장.
 * 주/월/전체 집계와 비율 계산은 프론트(reservationStatsSystemData)가 동일 공식으로 처리한다.
 */
@Service
@Profile("mssql")
@RequiredArgsConstructor
public class ReservationStatsSystemService {

    private final ReservationStatsSystemRepository repository;
    private final ReservationStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public List<ReservationStatsDailyRow> getDailyCounts(String from, String to) {
        return repository.findDailyCounts(from, to);
    }

    /**
     * 해당 월(period=YYYY-MM) 전체를 1회 조회해 JSON 스냅샷으로 확정 저장한다.
     * 진행 중인 달은 전일까지, 지난 달은 말일까지 동결한다.
     */
    @Transactional(readOnly = true)
    public ReservationStatsSnapshot saveSnapshot(String period, String by) {
        LocalDate first = LocalDate.parse(period + "-01");
        LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate to = monthEnd.isBefore(yesterday) ? monthEnd : yesterday;
        if (to.isBefore(first)) to = first;

        List<ReservationStatsDailyRow> days = repository.findDailyCounts(first.toString(), to.toString());
        // 라이브로 저장한 스냅샷은 고정(locked) 아님 — 언제든 재확정 가능.
        ReservationStatsSnapshot snapshot =
                new ReservationStatsSnapshot(period, LocalDateTime.now().toString(), by, false, days);
        snapshotStore.save(snapshot);
        return snapshot;
    }
}
