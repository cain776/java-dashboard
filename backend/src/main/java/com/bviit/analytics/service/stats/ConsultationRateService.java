package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.ConsultationRateItem;
import com.bviit.analytics.repository.stats.ConsultationRateRepository;
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
public class ConsultationRateService {

    private final ConsultationRateRepository repository;

    @Transactional(readOnly = true)
    public List<ConsultationRateItem> getMonthlyRates(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String fromDate = minYear + "-01-01";
        String toDate = maxYear + "-12-31";

        List<Map<String, Object>> visionRows = repository.findMonthlyVisionRates(fromDate, toDate);
        List<Map<String, Object>> cataractRows = repository.findMonthlyCataractRates(fromDate, toDate);

        // 연도×12 초기화
        Map<String, Builder> result = new LinkedHashMap<>();
        for (int year : years) {
            for (int m = 1; m <= 12; m++) {
                result.put(year + "-" + m, new Builder(year, m));
            }
        }

        // 시력교정 병합
        for (Map<String, Object> row : visionRows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            Builder b = result.get(yr + "-" + mo);
            if (b == null) continue;

            int exam = toInt(row.get("examCount"));
            int counsel = toInt(row.get("counselCount"));
            int booked = toInt(row.get("surgeryBookedCount"));
            int actual = toInt(row.get("actualSurgeryCount"));

            b.visionExamCount = exam;
            b.visionCounselCount = counsel;
            b.visionSurgeryBooked = booked;
            b.visionActualSurgery = actual;
            b.visionSurgeryRate = exam > 0 ? round(booked * 100.0 / exam) : 0;
            b.visionCounselRate = counsel > 0 ? round(booked * 100.0 / counsel) : 0;
        }

        // 백내장 병합
        for (Map<String, Object> row : cataractRows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            Builder b = result.get(yr + "-" + mo);
            if (b == null) continue;

            int exam = toInt(row.get("examCount"));
            int booked = toInt(row.get("surgeryBookedCount"));
            int stopped = toInt(row.get("stoppedCount"));

            b.cataractExamCount = exam;
            b.cataractSurgeryBooked = booked;
            b.cataractStoppedCount = stopped;
            b.cataractSurgeryRate = exam > 0 ? round(booked * 100.0 / exam) : 0;
        }

        List<ConsultationRateItem> items = new ArrayList<>();
        for (Builder b : result.values()) {
            items.add(b.build());
        }
        return items;
    }

    private static int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return Integer.parseInt(val.toString());
    }

    private static double round(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    /** 가변 빌더 — 시력교정/백내장 두 소스 병합용 */
    private static class Builder {
        final int year;
        final int month;
        int visionExamCount;
        int visionCounselCount;
        int visionSurgeryBooked;
        int visionActualSurgery;
        double visionSurgeryRate;
        double visionCounselRate;
        int cataractExamCount;
        int cataractSurgeryBooked;
        int cataractStoppedCount;
        double cataractSurgeryRate;

        Builder(int year, int month) {
            this.year = year;
            this.month = month;
        }

        ConsultationRateItem build() {
            return ConsultationRateItem.builder()
                    .year(year).month(month)
                    .visionExamCount(visionExamCount)
                    .visionCounselCount(visionCounselCount)
                    .visionSurgeryBooked(visionSurgeryBooked)
                    .visionActualSurgery(visionActualSurgery)
                    .visionSurgeryRate(visionSurgeryRate)
                    .visionCounselRate(visionCounselRate)
                    .cataractExamCount(cataractExamCount)
                    .cataractSurgeryBooked(cataractSurgeryBooked)
                    .cataractStoppedCount(cataractStoppedCount)
                    .cataractSurgeryRate(cataractSurgeryRate)
                    .build();
        }
    }
}
