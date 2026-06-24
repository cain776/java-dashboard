package com.bviit.analytics.repository.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예약통계_백내장 — 일자별 원시 카운트 라이브 집계(백내장 = RESERVE_FLAG='H').
 *
 * 시력교정 RSS와 동일한 PK+예약날짜 LEFT JOIN 모델. 채널 소스:
 *   - 컨택센터 콜(신규문의/신환/재문의): CtiRptLst(+CtiClg) 백내장 코드
 *   - 카톡(검사예약/노안/취소/문의): HappyTalk 백내장검사·백내장외래
 *   - 온라인예약: RESERVATION(FLAG='H') + RESERVE_HISTORY(예약저장) RESERVE_PATH 온라인/네이버
 *   - 아웃바운드 TM: DB_CUSTOM(TM팀 4명 KC0307·BV1119·BV1207·BV0067 = 시력교정이 제외하던 직원, B2B 군 제외) — PDF값과 일치
 *   - 총예약(백내장): 채널 예약 합(콜 ★신환 + TM 예약 + 카톡 검사예약 + 온라인예약) — PDF 정의와 일치(캘리브레이션)
 *   - 내원(종합): Cataract_Exam(실제 검사기록, EXAM_DATE, 중단 제외) 중 같은 날 백내장 예약(FLAG='H' I/H) 보유분 — 협진/타과 의뢰 제외, PDF '내원'과 일치
 *   - 부도/취소(종합)·취소(온라인/CRM): RESERVATION(FLAG='H') 예약일 기준
 *
 * 데이터 미보유로 0 고정인 칸: inboundCall·answeredCall(EICN 백내장 큐 미확인), totalPresbyopia(노안 구분자 부재).
 * 근거: docs/db/예약통계_백내장-데이터소스-분석.md
 *
 * READ-ONLY · MSSQL 2014 호환(WITH(NOLOCK), 네임드 파라미터 :from/:to).
 */
@Repository
@Profile("mssql")
public class CataractStatsSystemRepository {

    private static final String SQL_LOCATION = "sql/reservation-stats/cataract-daily-counts.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;

    public CataractStatsSystemRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.sql = SqlLoader.load(SQL_LOCATION);
    }

    public List<CataractStatsDailyRow> findDailyCounts(String from, String to) {
        return jdbc.query(sql,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new CataractStatsDailyRow(
                        rs.getString("d"),
                        rs.getInt("totalCataract"), rs.getInt("totalPresbyopia"),
                        rs.getInt("inboundCall"), rs.getInt("answeredCall"),
                        rs.getInt("newExamInquiry"), rs.getInt("newReInquiry"), rs.getInt("newPatient"),
                        rs.getInt("tmTotalDb"), rs.getInt("tmValidDb"), rs.getInt("tmReservation"),
                        rs.getInt("kakaoTotalInquiry"), rs.getInt("kakaoCataractReservation"), rs.getInt("kakaoPresbyopiaReservation"),
                        rs.getInt("onlineReservation"), rs.getInt("onlineNoShow"),
                        rs.getInt("cancelOnline"), rs.getInt("cancelCrm"), rs.getInt("cancelKakao"),
                        rs.getInt("visit"), rs.getInt("noShowReservation"), rs.getInt("cancel")));
    }
}
