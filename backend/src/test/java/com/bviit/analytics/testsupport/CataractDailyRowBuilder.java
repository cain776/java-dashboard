package com.bviit.analytics.testsupport;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;

/**
 * 테스트용 {@link CataractStatsDailyRow} 빌더 — 모든 카운트는 0 기본, 필요한 필드만 설정한다.
 * 22-인자 생성자 호출을 한 곳으로 모아 테스트 간 중복을 없앤다.
 */
public final class CataractDailyRowBuilder {

    private final String date;
    private int totalCataract, totalPresbyopia, inboundCall, answeredCall,
            newExamInquiry, newReInquiry, newPatient,
            tmTotalDb, tmValidDb, tmReservation,
            kakaoTotalInquiry, kakaoCataractReservation, kakaoPresbyopiaReservation,
            onlineReservation, onlineNoShow, cancelOnline, cancelCrm, cancelKakao,
            visit, noShowReservation, cancel;

    private CataractDailyRowBuilder(String date) {
        this.date = date;
    }

    public static CataractDailyRowBuilder row(String date) {
        return new CataractDailyRowBuilder(date);
    }

    public CataractDailyRowBuilder totalCataract(int v) { this.totalCataract = v; return this; }
    public CataractDailyRowBuilder totalPresbyopia(int v) { this.totalPresbyopia = v; return this; }
    public CataractDailyRowBuilder inboundCall(int v) { this.inboundCall = v; return this; }
    public CataractDailyRowBuilder answeredCall(int v) { this.answeredCall = v; return this; }
    public CataractDailyRowBuilder newExamInquiry(int v) { this.newExamInquiry = v; return this; }
    public CataractDailyRowBuilder newReInquiry(int v) { this.newReInquiry = v; return this; }
    public CataractDailyRowBuilder newPatient(int v) { this.newPatient = v; return this; }
    public CataractDailyRowBuilder tmTotalDb(int v) { this.tmTotalDb = v; return this; }
    public CataractDailyRowBuilder tmValidDb(int v) { this.tmValidDb = v; return this; }
    public CataractDailyRowBuilder tmReservation(int v) { this.tmReservation = v; return this; }
    public CataractDailyRowBuilder kakaoTotalInquiry(int v) { this.kakaoTotalInquiry = v; return this; }
    public CataractDailyRowBuilder kakaoCataractReservation(int v) { this.kakaoCataractReservation = v; return this; }
    public CataractDailyRowBuilder kakaoPresbyopiaReservation(int v) { this.kakaoPresbyopiaReservation = v; return this; }
    public CataractDailyRowBuilder onlineReservation(int v) { this.onlineReservation = v; return this; }
    public CataractDailyRowBuilder onlineNoShow(int v) { this.onlineNoShow = v; return this; }
    public CataractDailyRowBuilder cancelOnline(int v) { this.cancelOnline = v; return this; }
    public CataractDailyRowBuilder cancelCrm(int v) { this.cancelCrm = v; return this; }
    public CataractDailyRowBuilder cancelKakao(int v) { this.cancelKakao = v; return this; }
    public CataractDailyRowBuilder visit(int v) { this.visit = v; return this; }
    public CataractDailyRowBuilder noShowReservation(int v) { this.noShowReservation = v; return this; }
    public CataractDailyRowBuilder cancel(int v) { this.cancel = v; return this; }

    public CataractStatsDailyRow build() {
        return new CataractStatsDailyRow(
                date, totalCataract, totalPresbyopia, inboundCall, answeredCall,
                newExamInquiry, newReInquiry, newPatient,
                tmTotalDb, tmValidDb, tmReservation,
                kakaoTotalInquiry, kakaoCataractReservation, kakaoPresbyopiaReservation,
                onlineReservation, onlineNoShow, cancelOnline, cancelCrm, cancelKakao,
                visit, noShowReservation, cancel);
    }
}
