package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.OutpatientCountMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 외래수 서비스.
 *
 * 1차 구현은 레거시 차트 확정값 입력 기반이다.
 * 운영 DB 기준이 확정되면 이 서비스에서 2026년 이후 월을 DB 산출값으로 대체한다.
 */
@Service
@RequiredArgsConstructor
public class OutpatientCountStatsService {

    private static final Map<Integer, int[]> LEGACY_OUTPATIENT_COUNT = Map.of(
            2024, new int[] {5257, 5080, 4721, 4133, 4159, 4092, 4760, 4720, 3696, 4201, 3948, 4711},
            2025, new int[] {5389, 5389, 4933, 4349, 4451, 4000, 4275, 4354, 3332, 3724, 3639, 4086},
            2026, new int[] {4822, 4339, 4247, 3653}
    );

    public List<OutpatientCountMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();
        List<OutpatientCountMonthlyItem> items = new ArrayList<>();

        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                Integer count = legacyOutpatientCount(year, month).orElse(null);
                items.add(OutpatientCountMonthlyItem.builder()
                        .year(year)
                        .month(month)
                        .outpatientCount(count)
                        .total(count)
                        .build());
            }
        }

        return items;
    }

    private Optional<Integer> legacyOutpatientCount(int year, int month) {
        int[] values = LEGACY_OUTPATIENT_COUNT.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }
}
