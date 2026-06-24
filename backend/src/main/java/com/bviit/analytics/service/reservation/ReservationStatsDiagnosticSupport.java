package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownRow;
import com.bviit.analytics.dto.reservation.ReservationStatsParityItem;
import com.bviit.analytics.dto.reservation.ReservationStatsParityResponse;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

        List<ReservationStatsDrillDownRow> rows = target.drillDownMapped()
                ? Optional.ofNullable(drillDownRows.apply(localDate.toString(), field)).orElse(List.of())
                : List.of();
        Integer liveValue = rows.stream()
                .map(ReservationStatsDrillDownRow::contribution)
                .reduce(0, Integer::sum);

        return new ReservationStatsDrillDownResponse(
                period,
                localDate.toString(),
                field,
                target.label(),
                snapshot.isPresent(),
                snapshotValue,
                liveValue,
                ReservationStatsDiffCalculator.delta(snapshotValue, liveValue),
                rows.size(),
                rows
        );
    }

    static <T> ReservationStatsParityResponse parity(
            String period,
            String field,
            BiFunction<String, String, List<T>> dailyRows,
            Function<T, String> dateExtractor,
            List<ReservationStatsField<T>> fields,
            BiFunction<String, String, List<ReservationStatsDrillDownRow>> drillDownRows
    ) {
        YearMonth yearMonth = YearMonth.parse(period);
        ReservationStatsField<T> target = ReservationStatsDiffCalculator.requireField(fields, field);
        ReservationStatsDiffCalculator.LiveRange range = ReservationStatsDiffCalculator.liveRange(yearMonth);

        List<T> daily = Optional.ofNullable(dailyRows.apply(range.from().toString(), range.to().toString()))
                .orElse(List.of());
        Map<String, T> dailyByDate = byDateWithin(daily, dateExtractor, range);

        List<ReservationStatsParityItem> items = new ArrayList<>();
        int mismatchCount = 0;
        for (LocalDate date = range.from(); !date.isAfter(range.to()); date = date.plusDays(1)) {
            String dateText = date.toString();
            T dailyRow = dailyByDate.get(dateText);
            int dailyValue = dailyRow == null ? 0 : target.value().applyAsInt(dailyRow);

            List<ReservationStatsDrillDownRow> rows = target.drillDownMapped()
                    ? Optional.ofNullable(drillDownRows.apply(dateText, field)).orElse(List.of())
                    : List.of();
            int drillDownValue = rows.stream()
                    .map(ReservationStatsDrillDownRow::contribution)
                    .reduce(0, Integer::sum);
            int delta = drillDownValue - dailyValue;
            if (delta != 0) {
                mismatchCount++;
            }
            items.add(new ReservationStatsParityItem(
                    dateText,
                    target.name(),
                    target.label(),
                    dailyValue,
                    drillDownValue,
                    delta,
                    rows.size()
            ));
        }

        return new ReservationStatsParityResponse(
                period,
                target.name(),
                target.label(),
                range.from().toString(),
                range.to().toString(),
                mismatchCount,
                items
        );
    }

    private static <T> Map<String, T> byDateWithin(
            List<T> rows,
            Function<T, String> dateExtractor,
            ReservationStatsDiffCalculator.LiveRange range
    ) {
        Map<String, T> byDate = new HashMap<>();
        for (T row : rows) {
            String date = dateExtractor.apply(row);
            if (date.compareTo(range.from().toString()) >= 0 && date.compareTo(range.to().toString()) <= 0) {
                byDate.put(date, row);
            }
        }
        return byDate;
    }
}
