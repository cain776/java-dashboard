package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownRow;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.Supplier;

final class ReservationStatsDiagnosticSupport {

    private ReservationStatsDiagnosticSupport() {
    }

    static <T> ReservationStatsDiffResponse diff(
            String period,
            Supplier<Optional<List<T>>> snapshotRows,
            BiFunction<String, String, List<T>> liveRows,
            Function<T, String> dateExtractor,
            List<ReservationStatsField<T>> fields
    ) {
        YearMonth yearMonth = YearMonth.parse(period);
        ReservationStatsDiffCalculator.LiveRange range = ReservationStatsDiffCalculator.liveRange(yearMonth);
        Optional<List<T>> snapshot = snapshotRows.get();
        if (snapshot.isEmpty()) {
            return ReservationStatsDiffCalculator.missingSnapshot(period, range);
        }

        List<T> live = liveRows.apply(range.from().toString(), range.to().toString());
        return ReservationStatsDiffCalculator.compare(
                period,
                range,
                snapshot.get(),
                live,
                dateExtractor,
                fields
        );
    }

    static <T> ReservationStatsDrillDownResponse drillDown(
            String period,
            String date,
            String field,
            Supplier<Optional<List<T>>> snapshotRows,
            Function<T, String> dateExtractor,
            List<ReservationStatsField<T>> fields,
            BiFunction<String, String, List<ReservationStatsDrillDownRow>> drillDownRows
    ) {
        YearMonth yearMonth = YearMonth.parse(period);
        LocalDate localDate = ReservationStatsDiffCalculator.requireDateInPeriod(yearMonth, date);
        ReservationStatsField<T> target = ReservationStatsDiffCalculator.requireField(fields, field);

        Optional<List<T>> snapshot = snapshotRows.get();
        Integer snapshotValue = snapshot
                .flatMap(rows -> rows.stream()
                        .filter(row -> dateExtractor.apply(row).equals(localDate.toString()))
                        .findFirst())
                .map(row -> target.value().applyAsInt(row))
                .orElse(null);

        List<ReservationStatsDrillDownRow> rows = drillDownRows.apply(localDate.toString(), field);
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
