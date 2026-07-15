package com.bviit.analytics.consultation.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 중단 사유 통계 쿼리.
 *
 * 검사 중단(EXAM.STOP_YN='Y') 건을 정형 중단사유 코드(EXAM.CANCEL_CD)로 분류한 월별 사유별 건수.
 * 코드 마스터 CANCEL_CFG(CANCEL_CD → CANCEL_REASON) 기준이며 상담사 드롭다운 선택값이라 골든/PDF와 정합.
 * (구: EXAM_MEMO 자유텍스트 키워드 LIKE 추정 → 수술권유X 과소·기타 과다로 어긋났음. 2026-06 검증으로 교체.)
 *   매핑: recommendX=121·305 / visionChange=111·302 / glaucoma=114·303 / lensImpossible=122·306·399 /
 *        keratoconus=124·125·308·309 / avellino=126·310 / other=그 외(107 전안부재검·199·코드없음 등).
 *
 * 매핑 규칙·수정 방법·검증 쿼리·함정은 docs/기획/중단사유-분류-정의.md 참조.
 * 분류는 find-stop-reason-monthly.sql의 CASE 한 곳 — 코드 재매핑은 SQL만 고치면 되고 DTO·프론트 계약은 불변.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 * ⚠️ EXAM은 고객당 1행 덮어쓰기라 과거월 중단건수는 소급 변동 가능(당월 기준은 정합).
 * ⚠️ other는 잔차 — 미매핑 코드가 조용히 기타로 새므로 골든 대조 시 기타 과다를 먼저 의심할 것.
 */
@Repository
@Profile("mssql")
public class StopReasonStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String FIND_STOP_REASON_MONTHLY_SQL = "sql/consultation/find-stop-reason-monthly.sql";

    private final String findStopReasonMonthlySql;

    public StopReasonStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.findStopReasonMonthlySql = SqlLoader.load(FIND_STOP_REASON_MONTHLY_SQL);
    }

    /** 월별 중단 사유 분류 건수. */
    public List<Map<String, Object>> findStopReasonMonthly(String from, String to) {
        String sql = findStopReasonMonthlySql;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
