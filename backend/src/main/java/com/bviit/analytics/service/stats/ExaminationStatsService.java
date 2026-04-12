package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.ExaminationMonthlyItem;
import com.bviit.analytics.repository.stats.ExaminationStatsRepository;
import com.bviit.analytics.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.util.NumberUtils.toInt;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class ExaminationStatsService {

    private final ExaminationStatsRepository repository;

    /**
     * 연도별 월간 검사 유형별 건수.
     * 빈 달은 0으로 채움.
     */
    @Transactional(readOnly = true)
    public List<ExaminationMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Map<String, Object>> rows = repository.findMonthlyByType(years);

        Map<String, ExaminationMonthlyItem> map = MonthlyBuckets.initialize(years, this::emptyMonthlyItem);

        for (Map<String, Object> row : rows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            String key = MonthlyBuckets.key(yr, mo);
            if (!map.containsKey(key)) continue;

            int vision = toInt(row.get("visionCorrection"));
            int cat = toInt(row.get("cataract"));
            int dl = toInt(row.get("dreamlens"));
            int op = toInt(row.get("outpatient"));

            map.put(key, ExaminationMonthlyItem.builder()
                    .year(yr).month(mo)
                    .visionCorrection(vision).cataract(cat).dreamlens(dl).outpatient(op)
                    .total(vision + cat + dl + op)
                    .build());
        }

        return new ArrayList<>(map.values());
    }

    private ExaminationMonthlyItem emptyMonthlyItem(int year, int month) {
        return ExaminationMonthlyItem.builder()
                .year(year)
                .month(month)
                .visionCorrection(0)
                .cataract(0)
                .dreamlens(0)
                .outpatient(0)
                .total(0)
                .build();
    }
}
