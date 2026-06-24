package com.bviit.analytics.service.reservation;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationStatsPeriodLockTest {

    private final ReservationStatsPeriodLock periodLock = new ReservationStatsPeriodLock();

    @Test
    void releasesLockEntryAfterUse() {
        periodLock.withPeriodLock("2026-06", () -> assertThat(periodLock.activeLockCount()).isEqualTo(1));

        assertThat(periodLock.activeLockCount()).isZero();
    }

    @Test
    void samePeriodRunsOneAtATime() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondEntered = new CountDownLatch(1);

        try {
            Future<?> first = executor.submit(() -> periodLock.withPeriodLock("2026-06", () -> {
                firstEntered.countDown();
                await(releaseFirst);
            }));
            assertThat(firstEntered.await(1, TimeUnit.SECONDS)).isTrue();

            Future<?> second = executor.submit(() -> periodLock.withPeriodLock("2026-06", secondEntered::countDown));

            assertThat(secondEntered.await(150, TimeUnit.MILLISECONDS)).isFalse();
            assertThat(periodLock.activeLockCount()).isEqualTo(1);
            releaseFirst.countDown();

            first.get(1, TimeUnit.SECONDS);
            second.get(1, TimeUnit.SECONDS);
            assertThat(secondEntered.getCount()).isZero();
            assertThat(periodLock.activeLockCount()).isZero();
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void differentPeriodsCanRunConcurrently() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondEntered = new CountDownLatch(1);
        CountDownLatch releaseSecond = new CountDownLatch(1);

        try {
            Future<?> first = executor.submit(() -> periodLock.withPeriodLock("2026-06", () -> {
                firstEntered.countDown();
                await(releaseFirst);
            }));
            assertThat(firstEntered.await(1, TimeUnit.SECONDS)).isTrue();

            Future<?> second = executor.submit(() -> periodLock.withPeriodLock("2026-07", () -> {
                secondEntered.countDown();
                await(releaseSecond);
            }));

            assertThat(secondEntered.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(periodLock.activeLockCount()).isEqualTo(2);
            releaseFirst.countDown();
            releaseSecond.countDown();

            first.get(1, TimeUnit.SECONDS);
            second.get(1, TimeUnit.SECONDS);
            assertThat(periodLock.activeLockCount()).isZero();
        } finally {
            executor.shutdownNow();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(2, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out waiting for latch");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError(e);
        }
    }
}
