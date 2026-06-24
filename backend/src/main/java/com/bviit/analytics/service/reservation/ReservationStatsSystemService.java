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
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
    private final ReservationStatsPeriodLock periodLock;

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
        if (first.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("미래 월은 스냅샷을 저장할 수 없습니다: " + period);
        }
        LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate to = monthEnd.isBefore(yesterday) ? monthEnd : yesterday;
        if (to.isBefore(first)) to = first;

        LocalDate snapshotTo = to;
        return periodLock.withPeriodLock(period, () -> {
            List<ReservationStatsDailyRow> days = repository.findDailyCounts(first.toString(), snapshotTo.toString());
            // 라이브로 저장한 스냅샷은 고정(locked) 아님 — 언제든 재확정 가능.
            ReservationStatsSnapshot snapshot =
                    new ReservationStatsSnapshot(period, LocalDateTime.now().toString(), by, false, days);
            snapshotStore.save(snapshot);
            return snapshot;
        });
    }

    /**
     * 호출(증분 채움) — 해당 월을 D-1(어제)까지 라이브 조회해 기존 스냅샷에 <b>비어있는 날짜만</b> 추가한다.
     * 이미 있는 날짜(PDF 시드·이전 호출분)는 그대로 보존(덮어쓰기 금지). 머지 결과를 저장하고 반환한다.
     * 확정저장(saveSnapshot, 월 전체 덮어쓰기)과 달리 누적식이라 진행 중인 달을 매일 이어붙이는 데 쓴다.
     */
    @Transactional(readOnly = true)
    public ReservationStatsSnapshot fillSnapshot(String period, String by) {
        LocalDate first = LocalDate.parse(period + "-01");
        if (first.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("미래 월은 호출(채움)할 수 없습니다: " + period);
        }
        LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate to = monthEnd.isBefore(yesterday) ? monthEnd : yesterday;
        if (to.isBefore(first)) to = first;

        LocalDate snapshotTo = to;
        return periodLock.withPeriodLock(period, () -> {
            // 기존 스냅샷의 날짜는 보존(머지 기준).
            Optional<ReservationStatsSnapshot> existing = snapshotStore.find(period);
            Map<String, ReservationStatsDailyRow> byDate = new LinkedHashMap<>();
            existing.ifPresent(s -> s.days().forEach(d -> byDate.put(d.date(), d)));

            // D-1까지 라이브 조회 후 "없는 날짜만" 채운다(있으면 보존).
            List<ReservationStatsDailyRow> fetched = repository.findDailyCounts(first.toString(), snapshotTo.toString());
            for (ReservationStatsDailyRow d : fetched) {
                byDate.putIfAbsent(d.date(), d);
            }

            List<ReservationStatsDailyRow> merged = byDate.values().stream()
                    .sorted(Comparator.comparing(ReservationStatsDailyRow::date))
                    .toList();
            // 잠금·확정자는 기존 값 유지(없으면 이번 호출자). PDF 고정월은 컨트롤러가 미리 차단.
            boolean locked = existing.map(ReservationStatsSnapshot::locked).orElse(false);
            String confirmedBy = existing.map(ReservationStatsSnapshot::confirmedBy).orElse(by);
            ReservationStatsSnapshot snapshot =
                    new ReservationStatsSnapshot(period, LocalDateTime.now().toString(), confirmedBy, locked, merged);
            snapshotStore.save(snapshot);
            return snapshot;
        });
    }
}
