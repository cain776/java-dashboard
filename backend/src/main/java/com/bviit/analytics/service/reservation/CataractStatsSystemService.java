package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.repository.reservation.CataractStatsSystemRepository;
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
 * 예약통계_백내장 — 라이브 일자별 카운트 조회 + 월별 확정/증분 스냅샷 저장.
 * 시력교정(ReservationStatsSystemService)과 동일 패턴. 백내장=RESERVE_FLAG='H'.
 */
@Service
@Profile("mssql")
@RequiredArgsConstructor
public class CataractStatsSystemService {

    private final CataractStatsSystemRepository repository;
    private final CataractStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public List<CataractStatsDailyRow> getDailyCounts(String from, String to) {
        return repository.findDailyCounts(from, to);
    }

    /** 해당 월(period=YYYY-MM) 전체를 1회 조회해 JSON 스냅샷으로 확정 저장(월 전체 덮어쓰기). */
    @Transactional(readOnly = true)
    public CataractStatsSnapshot saveSnapshot(String period, String by) {
        LocalDate first = LocalDate.parse(period + "-01");
        if (first.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("미래 월은 스냅샷을 저장할 수 없습니다: " + period);
        }
        LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate to = monthEnd.isBefore(yesterday) ? monthEnd : yesterday;
        if (to.isBefore(first)) to = first;

        List<CataractStatsDailyRow> days = repository.findDailyCounts(first.toString(), to.toString());
        CataractStatsSnapshot snapshot =
                new CataractStatsSnapshot(period, LocalDateTime.now().toString(), by, false, days);
        snapshotStore.save(snapshot);
        return snapshot;
    }

    /**
     * 호출(증분 채움) — 해당 월을 D-1까지 조회해 기존 스냅샷에 <b>비어있는 날짜만</b> 추가한다.
     * 이미 있는 날짜(PDF 시드·이전 호출분)는 보존(덮어쓰기 금지).
     */
    @Transactional(readOnly = true)
    public CataractStatsSnapshot fillSnapshot(String period, String by) {
        LocalDate first = LocalDate.parse(period + "-01");
        if (first.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("미래 월은 호출(채움)할 수 없습니다: " + period);
        }
        LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate to = monthEnd.isBefore(yesterday) ? monthEnd : yesterday;
        if (to.isBefore(first)) to = first;

        Optional<CataractStatsSnapshot> existing = snapshotStore.find(period);
        Map<String, CataractStatsDailyRow> byDate = new LinkedHashMap<>();
        existing.ifPresent(s -> s.days().forEach(d -> byDate.put(d.date(), d)));

        List<CataractStatsDailyRow> fetched = repository.findDailyCounts(first.toString(), to.toString());
        for (CataractStatsDailyRow d : fetched) {
            byDate.putIfAbsent(d.date(), d);
        }

        List<CataractStatsDailyRow> merged = byDate.values().stream()
                .sorted(Comparator.comparing(CataractStatsDailyRow::date))
                .toList();
        boolean locked = existing.map(CataractStatsSnapshot::locked).orElse(false);
        String confirmedBy = existing.map(CataractStatsSnapshot::confirmedBy).orElse(by);
        CataractStatsSnapshot snapshot =
                new CataractStatsSnapshot(period, LocalDateTime.now().toString(), confirmedBy, locked, merged);
        snapshotStore.save(snapshot);
        return snapshot;
    }
}
