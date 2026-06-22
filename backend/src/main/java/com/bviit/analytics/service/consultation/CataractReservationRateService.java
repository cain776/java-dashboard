package com.bviit.analytics.service.consultation;

import com.bviit.analytics.dto.consultation.CataractReservationRateItem;
import com.bviit.analytics.repository.exam.ExaminationStatsRepository;
import com.bviit.analytics.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.util.NumberUtils.toInt;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class CataractReservationRateService {

    private final ExaminationStatsRepository repository;

    @Transactional(readOnly = true)
    public List<CataractReservationRateItem> getMonthlyRates(List<Integer> years, String category) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2026);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";

        LinkedHashMap<String, CataractReservationRateItem> map =
                MonthlyBuckets.initialize(normalizedYears, this::emptyItem);

        List<Map<String, Object>> rows = "vision".equalsIgnoreCase(category)
                ? repository.findVisionReservationRateMonthly(from, to)
                : repository.findCataractReservationRateMonthly(from, to);

        for (Map<String, Object> row : rows) {
            int year = toInt(row.get("yr"));
            int month = toInt(row.get("mo"));
            int examCount = toInt(row.get("examCount"));
            int surgeryBookedCount = toInt(row.get("surgeryBookedCount"));
            map.put(
                    MonthlyBuckets.key(year, month),
                    CataractReservationRateItem.builder()
                            .year(year)
                            .month(month)
                            .examCount(examCount)
                            .surgeryBookedCount(surgeryBookedCount)
                            .reservationRate(examCount > 0
                                    ? Math.ceil(surgeryBookedCount * 100.0 / examCount)
                                    : 0)
                            .build()
            );
        }

        return new ArrayList<>(map.values());
    }

    private CataractReservationRateItem emptyItem(int year, int month) {
        return CataractReservationRateItem.builder()
                .year(year)
                .month(month)
                .examCount(0)
                .surgeryBookedCount(0)
                .reservationRate(0)
                .build();
    }
}
