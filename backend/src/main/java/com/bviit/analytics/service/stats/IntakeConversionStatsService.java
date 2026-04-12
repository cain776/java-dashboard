package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.IntakeConversionMonthlyItem;
import com.bviit.analytics.repository.stats.IntakeConversionStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class IntakeConversionStatsService {

    private final IntakeConversionStatsRepository repository;

    /**
     * 연도별 월간 유입(검사예약) 건수.
     * 빈 달은 0으로 채운다.
     */
    @Transactional(readOnly = true)
    public List<IntakeConversionMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Map<String, Object>> rows = repository.findMonthlyStats(years);

        Map<String, IntakeConversionMonthlyItem> map = new LinkedHashMap<>();
        for (int year : years) {
            for (int month = 1; month <= 12; month++) {
                map.put(year + "-" + month, IntakeConversionMonthlyItem.builder()
                        .year(year)
                        .month(month)
                        .incall(0)
                        .outcall(0)
                        .kakao(0)
                        .naver(0)
                        .homepage(0)
                        .total(0)
                        .build());
            }
        }

        for (Map<String, Object> row : rows) {
            int year = toInt(row.get("yr"));
            int month = toInt(row.get("mo"));
            String key = year + "-" + month;
            if (!map.containsKey(key)) {
                continue;
            }

            int incall = toInt(row.get("incall"));
            int outcall = toInt(row.get("outcall"));
            int kakao = toInt(row.get("kakao"));
            int naver = toInt(row.get("naver"));
            int homepage = toInt(row.get("homepage"));

            map.put(key, IntakeConversionMonthlyItem.builder()
                    .year(year)
                    .month(month)
                    .incall(incall)
                    .outcall(outcall)
                    .kakao(kakao)
                    .naver(naver)
                    .homepage(homepage)
                    .total(incall + outcall + kakao + naver + homepage)
                    .build());
        }

        return new ArrayList<>(map.values());
    }

    private static int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }
}
