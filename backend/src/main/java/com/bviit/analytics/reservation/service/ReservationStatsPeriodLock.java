package com.bviit.analytics.reservation.service;

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

    private final ConcurrentMap<String, LockHolder> locks = new ConcurrentHashMap<>();

    public <T> T withPeriodLock(String period, Supplier<T> action) {
        Objects.requireNonNull(period, "period");
        Objects.requireNonNull(action, "action");

        LockHolder holder = acquire(period);
        holder.lock.lock();
        try {
            return action.get();
        } finally {
            holder.lock.unlock();
            release(period, holder);
        }
    }

    public void withPeriodLock(String period, Runnable action) {
        withPeriodLock(period, () -> {
            action.run();
            return null;
        });
    }

    int activeLockCount() {
        return locks.size();
    }

    private LockHolder acquire(String period) {
        return locks.compute(period, (ignored, existing) -> {
            LockHolder holder = existing == null ? new LockHolder() : existing;
            holder.references++;
            return holder;
        });
    }

    private void release(String period, LockHolder holder) {
        locks.computeIfPresent(period, (ignored, current) -> {
            if (current != holder) {
                return current;
            }
            current.references--;
            return current.references == 0 ? null : current;
        });
    }

    private static final class LockHolder {
        private final ReentrantLock lock = new ReentrantLock(true);
        private int references;
    }
}
