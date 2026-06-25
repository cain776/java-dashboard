package com.bviit.analytics.reservation.dto;

/**
 * 예약통계_백내장 — 셀 수기 수정 1건의 이력(감사 로그 겸 화면 마커 근거).
 *
 * 휴가 등으로 라이브(EICN group_code) 집계가 어긋나는 날(예: 인입콜/응대콜)을 PDF/레거시 값으로
 * 손보정할 때 남긴다. 어떤 필드를 어떤 값으로, 누가, 언제 고쳤는지를 기록한다.
 * 실제 값은 해당 일자 row의 필드에 이미 반영되며, 이 이력은 "이 셀은 수기 보정됨" 표시·추적용이다.
 */
public record CataractStatsCellEdit(
        String field,     // 수정된 필드명 (inboundCall | answeredCall)
        int value,        // 적용된 값
        String editedBy,  // 수정한 사용자 로그인 ID
        String editedAt   // 수정 시각 ISO-8601
) {
}
