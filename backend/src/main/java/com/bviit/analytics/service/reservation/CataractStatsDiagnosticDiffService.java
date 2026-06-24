package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownRow;
import com.bviit.analytics.repository.reservation.CataractStatsSystemRepository;
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
public class CataractStatsDiagnosticDiffService {

    private static final List<ReservationStatsDiffCalculator.Field<CataractStatsDailyRow>> FIELDS = List.of(
            new ReservationStatsDiffCalculator.Field<>("totalCataract", CataractStatsDailyRow::totalCataract),
            new ReservationStatsDiffCalculator.Field<>("totalPresbyopia", CataractStatsDailyRow::totalPresbyopia),
            new ReservationStatsDiffCalculator.Field<>("inboundCall", CataractStatsDailyRow::inboundCall),
            new ReservationStatsDiffCalculator.Field<>("answeredCall", CataractStatsDailyRow::answeredCall),
            new ReservationStatsDiffCalculator.Field<>("newExamInquiry", CataractStatsDailyRow::newExamInquiry),
            new ReservationStatsDiffCalculator.Field<>("newReInquiry", CataractStatsDailyRow::newReInquiry),
            new ReservationStatsDiffCalculator.Field<>("newPatient", CataractStatsDailyRow::newPatient),
            new ReservationStatsDiffCalculator.Field<>("tmTotalDb", CataractStatsDailyRow::tmTotalDb),
            new ReservationStatsDiffCalculator.Field<>("tmValidDb", CataractStatsDailyRow::tmValidDb),
            new ReservationStatsDiffCalculator.Field<>("tmReservation", CataractStatsDailyRow::tmReservation),
            new ReservationStatsDiffCalculator.Field<>("kakaoTotalInquiry", CataractStatsDailyRow::kakaoTotalInquiry),
            new ReservationStatsDiffCalculator.Field<>("kakaoCataractReservation", CataractStatsDailyRow::kakaoCataractReservation),
            new ReservationStatsDiffCalculator.Field<>("kakaoPresbyopiaReservation", CataractStatsDailyRow::kakaoPresbyopiaReservation),
            new ReservationStatsDiffCalculator.Field<>("onlineReservation", CataractStatsDailyRow::onlineReservation),
            new ReservationStatsDiffCalculator.Field<>("onlineNoShow", CataractStatsDailyRow::onlineNoShow),
            new ReservationStatsDiffCalculator.Field<>("cancelOnline", CataractStatsDailyRow::cancelOnline),
            new ReservationStatsDiffCalculator.Field<>("cancelCrm", CataractStatsDailyRow::cancelCrm),
            new ReservationStatsDiffCalculator.Field<>("cancelKakao", CataractStatsDailyRow::cancelKakao),
            new ReservationStatsDiffCalculator.Field<>("visit", CataractStatsDailyRow::visit),
            new ReservationStatsDiffCalculator.Field<>("noShowReservation", CataractStatsDailyRow::noShowReservation),
            new ReservationStatsDiffCalculator.Field<>("cancel", CataractStatsDailyRow::cancel)
    );

    private final CataractStatsSystemRepository repository;
    private final CataractStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        YearMonth yearMonth = YearMonth.parse(period);
        ReservationStatsDiffCalculator.LiveRange range = ReservationStatsDiffCalculator.liveRange(yearMonth);
        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isEmpty()) {
            return ReservationStatsDiffCalculator.missingSnapshot(period, range);
        }

        List<CataractStatsDailyRow> liveRows = repository.findDailyCounts(
                range.from().toString(),
                range.to().toString()
        );
        return ReservationStatsDiffCalculator.compare(
                period,
                range,
                snapshot.get().days(),
                liveRows,
                CataractStatsDailyRow::date,
                FIELDS
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate localDate = ReservationStatsDiffCalculator.requireDateInPeriod(yearMonth, date);
        ReservationStatsDiffCalculator.Field<CataractStatsDailyRow> target =
                ReservationStatsDiffCalculator.requireField(FIELDS, field);

        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
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
