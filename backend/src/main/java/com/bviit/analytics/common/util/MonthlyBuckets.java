package com.bviit.analytics.common.util;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.function.BiFunction;

public final class MonthlyBuckets {

    private MonthlyBuckets() {
    }

    public static <T> LinkedHashMap<String, T> initialize(
            List<Integer> years,
            BiFunction<Integer, Integer, T> itemFactory
    ) {
        LinkedHashMap<String, T> buckets = new LinkedHashMap<>();
        for (int year : years) {
            for (int month = 1; month <= 12; month++) {
                buckets.put(key(year, month), itemFactory.apply(year, month));
            }
        }
        return buckets;
    }

    public static String key(int year, int month) {
        return year + "-" + month;
    }
}
