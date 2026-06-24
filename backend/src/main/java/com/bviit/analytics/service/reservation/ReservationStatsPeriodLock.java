package com.bviit.analytics.service.reservation;

import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Single-JVM period lock for monthly reservation snapshot read/merge/save sections.
 */
@Component
public class ReservationStatsPeriodLock {

    private final ConcurrentMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public <T> T withPeriodLock(String period, Supplier<T> action) {
        Objects.requireNonNull(period, "period");
        Objects.requireNonNull(action, "action");

        ReentrantLock lock = locks.computeIfAbsent(period, ignored -> new ReentrantLock(true));
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }

    public void withPeriodLock(String period, Runnable action) {
        withPeriodLock(period, () -> {
            action.run();
            return null;
        });
    }
}
