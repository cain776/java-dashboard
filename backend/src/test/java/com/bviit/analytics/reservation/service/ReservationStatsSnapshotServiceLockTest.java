package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import com.bviit.analytics.reservation.repository.CataractStatsSystemRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemRepository;
import com.bviit.analytics.testsupport.CataractDailyRowBuilder;
import com.bviit.analytics.testsupport.ReservationDailyRowBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationStatsSnapshotServiceLockTest {

    @Mock
    private ReservationStatsSystemRepository reservationRepository;

    @Mock
    private ReservationStatsSnapshotStore reservationSnapshotStore;

    @Mock
    private CataractStatsSystemRepository cataractRepository;

    @Mock
    private CataractStatsSnapshotStore cataractSnapshotStore;

    @Test
    void systemFillSnapshotSerializesReadMergeSaveForSamePeriod() throws Exception {
        String period = previousPeriod();
        ReservationStatsSystemService service = new ReservationStatsSystemService(
                reservationRepository,
                reservationSnapshotStore,
                new ReservationStatsPeriodLock()
        );
        AtomicInteger findCalls = new AtomicInteger();
        AtomicInteger repositoryCalls = new AtomicInteger();
        AtomicBoolean firstSaveFinished = new AtomicBoolean(false);
        AtomicBoolean secondFindBeforeFirstSave = new AtomicBoolean(false);
        CountDownLatch firstFindEntered = new CountDownLatch(1);
        CountDownLatch releaseFirstFind = new CountDownLatch(1);
        CountDownLatch secondRepositoryEntered = new CountDownLatch(1);

        when(reservationSnapshotStore.find(period)).thenAnswer(invocation -> {
            int call = findCalls.incrementAndGet();
            if (call == 1) {
                firstFindEntered.countDown();
                await(releaseFirstFind);
            } else if (!firstSaveFinished.get()) {
                secondFindBeforeFirstSave.set(true);
            }
            return Optional.empty();
        });
        when(reservationRepository.findDailyCounts(anyString(), anyString()))
                .thenAnswer(invocation -> {
                    if (repositoryCalls.incrementAndGet() == 2) {
                        secondRepositoryEntered.countDown();
                    }
                    return List.of(reservationRow(invocation.getArgument(0)));
                });
        doAnswer(invocation -> {
            firstSaveFinished.compareAndSet(false, true);
            return null;
        }).when(reservationSnapshotStore).save(any(ReservationStatsSnapshot.class));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch secondTaskStarted = new CountDownLatch(1);
        try {
            Future<ReservationStatsSnapshot> first = executor.submit(() -> service.fillSnapshot(period, "worker-1"));
            assertThat(firstFindEntered.await(1, TimeUnit.SECONDS)).isTrue();

            Future<ReservationStatsSnapshot> second = executor.submit(() -> {
                secondTaskStarted.countDown();
                return service.fillSnapshot(period, "worker-2");
            });
            assertThat(secondTaskStarted.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(secondRepositoryEntered.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(repositoryCalls).hasValue(2);
            assertThat(findCalls.get()).isEqualTo(1);

            releaseFirstFind.countDown();

            first.get(2, TimeUnit.SECONDS);
            second.get(2, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(secondFindBeforeFirstSave.get()).isFalse();
        assertThat(findCalls).hasValue(2);
        verify(reservationSnapshotStore, times(2)).save(any(ReservationStatsSnapshot.class));
    }

    @Test
    void systemSaveAndFillSnapshotShareSamePeriodLock() throws Exception {
        String period = previousPeriod();
        ReservationStatsSystemService service = new ReservationStatsSystemService(
                reservationRepository,
                reservationSnapshotStore,
                new ReservationStatsPeriodLock()
        );
        AtomicInteger repositoryCalls = new AtomicInteger();
        AtomicInteger saveCalls = new AtomicInteger();
        AtomicBoolean saveStoreFinished = new AtomicBoolean(false);
        AtomicBoolean fillReadBeforeSaveFinished = new AtomicBoolean(false);
        CountDownLatch saveStoreEntered = new CountDownLatch(1);
        CountDownLatch releaseSaveStore = new CountDownLatch(1);
        CountDownLatch fillRepositoryEntered = new CountDownLatch(1);

        when(reservationRepository.findDailyCounts(anyString(), anyString())).thenAnswer(invocation -> {
            int call = repositoryCalls.incrementAndGet();
            if (call == 2) {
                fillRepositoryEntered.countDown();
            }
            return List.of(reservationRow(invocation.getArgument(0)));
        });
        when(reservationSnapshotStore.find(period)).thenAnswer(invocation -> {
            if (!saveStoreFinished.get()) {
                fillReadBeforeSaveFinished.set(true);
            }
            return Optional.empty();
        });
        doAnswer(invocation -> {
            if (saveCalls.incrementAndGet() == 1) {
                saveStoreEntered.countDown();
                await(releaseSaveStore);
                saveStoreFinished.set(true);
            }
            return null;
        }).when(reservationSnapshotStore).save(any(ReservationStatsSnapshot.class));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch fillTaskStarted = new CountDownLatch(1);
        try {
            Future<ReservationStatsSnapshot> save = executor.submit(() -> service.saveSnapshot(period, "save-worker"));
            assertThat(saveStoreEntered.await(1, TimeUnit.SECONDS)).isTrue();

            Future<ReservationStatsSnapshot> fill = executor.submit(() -> {
                fillTaskStarted.countDown();
                return service.fillSnapshot(period, "fill-worker");
            });
            assertThat(fillTaskStarted.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(fillRepositoryEntered.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(repositoryCalls).hasValue(2);
            assertThat(fillReadBeforeSaveFinished.get()).isFalse();

            releaseSaveStore.countDown();

            save.get(2, TimeUnit.SECONDS);
            fill.get(2, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(fillReadBeforeSaveFinished.get()).isFalse();
        assertThat(repositoryCalls).hasValue(2);
        assertThat(saveCalls).hasValue(2);
    }

    @Test
    void cataractFillSnapshotSerializesReadMergeSaveForSamePeriod() throws Exception {
        String period = previousPeriod();
        CataractStatsSystemService service = new CataractStatsSystemService(
                cataractRepository,
                cataractSnapshotStore,
                new ReservationStatsPeriodLock()
        );
        AtomicInteger findCalls = new AtomicInteger();
        AtomicInteger repositoryCalls = new AtomicInteger();
        AtomicBoolean firstSaveFinished = new AtomicBoolean(false);
        AtomicBoolean secondFindBeforeFirstSave = new AtomicBoolean(false);
        CountDownLatch firstFindEntered = new CountDownLatch(1);
        CountDownLatch releaseFirstFind = new CountDownLatch(1);
        CountDownLatch secondRepositoryEntered = new CountDownLatch(1);

        when(cataractSnapshotStore.find(period)).thenAnswer(invocation -> {
            int call = findCalls.incrementAndGet();
            if (call == 1) {
                firstFindEntered.countDown();
                await(releaseFirstFind);
            } else if (!firstSaveFinished.get()) {
                secondFindBeforeFirstSave.set(true);
            }
            return Optional.empty();
        });
        when(cataractRepository.findDailyCounts(anyString(), anyString()))
                .thenAnswer(invocation -> {
                    if (repositoryCalls.incrementAndGet() == 2) {
                        secondRepositoryEntered.countDown();
                    }
                    return List.of(cataractRow(invocation.getArgument(0)));
                });
        doAnswer(invocation -> {
            firstSaveFinished.compareAndSet(false, true);
            return null;
        }).when(cataractSnapshotStore).save(any(CataractStatsSnapshot.class));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch secondTaskStarted = new CountDownLatch(1);
        try {
            Future<CataractStatsSnapshot> first = executor.submit(() -> service.fillSnapshot(period, "worker-1"));
            assertThat(firstFindEntered.await(1, TimeUnit.SECONDS)).isTrue();

            Future<CataractStatsSnapshot> second = executor.submit(() -> {
                secondTaskStarted.countDown();
                return service.fillSnapshot(period, "worker-2");
            });
            assertThat(secondTaskStarted.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(secondRepositoryEntered.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(repositoryCalls).hasValue(2);
            assertThat(findCalls).hasValue(1);

            releaseFirstFind.countDown();

            first.get(2, TimeUnit.SECONDS);
            second.get(2, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(secondFindBeforeFirstSave.get()).isFalse();
        assertThat(findCalls).hasValue(2);
        verify(cataractSnapshotStore, times(2)).save(any(CataractStatsSnapshot.class));
    }

    private static String previousPeriod() {
        return YearMonth.now().minusMonths(1).toString();
    }

    private static ReservationStatsDailyRow reservationRow(String date) {
        return ReservationDailyRowBuilder.row(date).build();
    }

    private static CataractStatsDailyRow cataractRow(String date) {
        return CataractDailyRowBuilder.row(date).build();
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
