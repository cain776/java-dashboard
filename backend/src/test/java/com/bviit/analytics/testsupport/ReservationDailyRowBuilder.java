package com.bviit.analytics.testsupport;

import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;

/**
 * 테스트용 {@link ReservationStatsDailyRow} 빌더 — 모든 카운트는 0 기본, 필요한 필드만 설정한다.
 * 24-인자 생성자 호출을 한 곳으로 모아 테스트 간 중복을 없앤다.
 */
public final class ReservationDailyRowBuilder {

    private final String date;
    private int inboundCall, answeredCall, newInquiry, callReservation,
            tmTotalDb, tmValidDb, tmReservation, tmRecounsel, tmRecounselValid, tmRecounselReservation,
            homeReceived, homeReservation,
            naverReceived, naverRejected, naverValid, naverReservation,
            kakaoInquiry, kakaoReservation,
            cancelCallNaver, cancelHome, cancelKakao,
            visit, noShowReservation, cancel;

    private ReservationDailyRowBuilder(String date) {
        this.date = date;
    }

    public static ReservationDailyRowBuilder row(String date) {
        return new ReservationDailyRowBuilder(date);
    }

    public ReservationDailyRowBuilder inboundCall(int v) { this.inboundCall = v; return this; }
    public ReservationDailyRowBuilder answeredCall(int v) { this.answeredCall = v; return this; }
    public ReservationDailyRowBuilder newInquiry(int v) { this.newInquiry = v; return this; }
    public ReservationDailyRowBuilder callReservation(int v) { this.callReservation = v; return this; }
    public ReservationDailyRowBuilder tmTotalDb(int v) { this.tmTotalDb = v; return this; }
    public ReservationDailyRowBuilder tmValidDb(int v) { this.tmValidDb = v; return this; }
    public ReservationDailyRowBuilder tmReservation(int v) { this.tmReservation = v; return this; }
    public ReservationDailyRowBuilder tmRecounsel(int v) { this.tmRecounsel = v; return this; }
    public ReservationDailyRowBuilder tmRecounselValid(int v) { this.tmRecounselValid = v; return this; }
    public ReservationDailyRowBuilder tmRecounselReservation(int v) { this.tmRecounselReservation = v; return this; }
    public ReservationDailyRowBuilder homeReceived(int v) { this.homeReceived = v; return this; }
    public ReservationDailyRowBuilder homeReservation(int v) { this.homeReservation = v; return this; }
    public ReservationDailyRowBuilder naverReceived(int v) { this.naverReceived = v; return this; }
    public ReservationDailyRowBuilder naverRejected(int v) { this.naverRejected = v; return this; }
    public ReservationDailyRowBuilder naverValid(int v) { this.naverValid = v; return this; }
    public ReservationDailyRowBuilder naverReservation(int v) { this.naverReservation = v; return this; }
    public ReservationDailyRowBuilder kakaoInquiry(int v) { this.kakaoInquiry = v; return this; }
    public ReservationDailyRowBuilder kakaoReservation(int v) { this.kakaoReservation = v; return this; }
    public ReservationDailyRowBuilder cancelCallNaver(int v) { this.cancelCallNaver = v; return this; }
    public ReservationDailyRowBuilder cancelHome(int v) { this.cancelHome = v; return this; }
    public ReservationDailyRowBuilder cancelKakao(int v) { this.cancelKakao = v; return this; }
    public ReservationDailyRowBuilder visit(int v) { this.visit = v; return this; }
    public ReservationDailyRowBuilder noShowReservation(int v) { this.noShowReservation = v; return this; }
    public ReservationDailyRowBuilder cancel(int v) { this.cancel = v; return this; }

    public ReservationStatsDailyRow build() {
        return new ReservationStatsDailyRow(
                date, inboundCall, answeredCall, newInquiry, callReservation,
                tmTotalDb, tmValidDb, tmReservation, tmRecounsel, tmRecounselValid, tmRecounselReservation,
                homeReceived, homeReservation,
                naverReceived, naverRejected, naverValid, naverReservation,
                kakaoInquiry, kakaoReservation,
                cancelCallNaver, cancelHome, cancelKakao,
                visit, noShowReservation, cancel);
    }
}
