package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownRow;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.repository.reservation.ReservationStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class ReservationStatsDiagnosticDiffService {

    private static final List<ReservationStatsDiffCalculator.Field<ReservationStatsDailyRow>> FIELDS = List.of(
            new ReservationStatsDiffCalculator.Field<>("inboundCall", ReservationStatsDailyRow::inboundCall),
            new ReservationStatsDiffCalculator.Field<>("answeredCall", ReservationStatsDailyRow::answeredCall),
            new ReservationStatsDiffCalculator.Field<>("newInquiry", ReservationStatsDailyRow::newInquiry),
            new ReservationStatsDiffCalculator.Field<>("callReservation", ReservationStatsDailyRow::callReservation),
            new ReservationStatsDiffCalculator.Field<>("tmTotalDb", ReservationStatsDailyRow::tmTotalDb),
            new ReservationStatsDiffCalculator.Field<>("tmValidDb", ReservationStatsDailyRow::tmValidDb),
            new ReservationStatsDiffCalculator.Field<>("tmReservation", ReservationStatsDailyRow::tmReservation),
            new ReservationStatsDiffCalculator.Field<>("tmRecounsel", ReservationStatsDailyRow::tmRecounsel),
            new ReservationStatsDiffCalculator.Field<>("tmRecounselValid", ReservationStatsDailyRow::tmRecounselValid),
            new ReservationStatsDiffCalculator.Field<>("tmRecounselReservation", ReservationStatsDailyRow::tmRecounselReservation),
            new ReservationStatsDiffCalculator.Field<>("homeReceived", ReservationStatsDailyRow::homeReceived),
            new ReservationStatsDiffCalculator.Field<>("homeReservation", ReservationStatsDailyRow::homeReservation),
            new ReservationStatsDiffCalculator.Field<>("naverReceived", ReservationStatsDailyRow::naverReceived),
            new ReservationStatsDiffCalculator.Field<>("naverRejected", ReservationStatsDailyRow::naverRejected),
            new ReservationStatsDiffCalculator.Field<>("naverValid", ReservationStatsDailyRow::naverValid),
            new ReservationStatsDiffCalculator.Field<>("naverReservation", ReservationStatsDailyRow::naverReservation),
            new ReservationStatsDiffCalculator.Field<>("kakaoInquiry", ReservationStatsDailyRow::kakaoInquiry),
            new ReservationStatsDiffCalculator.Field<>("kakaoReservation", ReservationStatsDailyRow::kakaoReservation),
            new ReservationStatsDiffCalculator.Field<>("cancelCallNaver", ReservationStatsDailyRow::cancelCallNaver),
            new ReservationStatsDiffCalculator.Field<>("cancelHome", ReservationStatsDailyRow::cancelHome),
            new ReservationStatsDiffCalculator.Field<>("cancelKakao", ReservationStatsDailyRow::cancelKakao),
            new ReservationStatsDiffCalculator.Field<>("visit", ReservationStatsDailyRow::visit),
            new ReservationStatsDiffCalculator.Field<>("noShowReservation", ReservationStatsDailyRow::noShowReservation),
            new ReservationStatsDiffCalculator.Field<>("cancel", ReservationStatsDailyRow::cancel)
    );

    private final ReservationStatsSystemRepository repository;
    private final ReservationStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        YearMonth yearMonth = YearMonth.parse(period);
        ReservationStatsDiffCalculator.LiveRange range = ReservationStatsDiffCalculator.liveRange(yearMonth);
        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isEmpty()) {
            return ReservationStatsDiffCalculator.missingSnapshot(period, range);
        }

        List<ReservationStatsDailyRow> liveRows = repository.findDailyCounts(
                range.from().toString(),
                range.to().toString()
        );
        return ReservationStatsDiffCalculator.compare(
                period,
                range,
                snapshot.get().days(),
                liveRows,
                ReservationStatsDailyRow::date,
                FIELDS
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate localDate = ReservationStatsDiffCalculator.requireDateInPeriod(yearMonth, date);
        ReservationStatsDiffCalculator.Field<ReservationStatsDailyRow> target =
                ReservationStatsDiffCalculator.requireField(FIELDS, field);

        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        Integer snapshotValue = snapshot
                .flatMap(value -> value.days().stream()
                        .filter(row -> row.date().equals(localDate.toString()))
                        .findFirst())
                .map(row -> target.value().applyAsInt(row))
                .orElse(null);

        List<ReservationStatsDrillDownRow> rows = repository.findDrillDownRows(localDate.toString(), field);
        Integer liveValue = rows.stream()
                .map(ReservationStatsDrillDownRow::contribution)
                .reduce(0, Integer::sum);

        return new ReservationStatsDrillDownResponse(
                period,
                localDate.toString(),
                field,
                snapshot.isPresent(),
                snapshotValue,
                liveValue,
                ReservationStatsDiffCalculator.delta(snapshotValue, liveValue),
                rows.size(),
                rows
        );
    }
}
