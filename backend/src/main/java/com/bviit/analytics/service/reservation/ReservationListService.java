package com.bviit.analytics.service.reservation;

import com.bviit.analytics.repository.reservation.ReservationListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트 조회 서비스. 날짜 범위(예약일) 기준 행 목록을 반환한다.
 * 주차 그룹·승인/체크 등 워크플로우는 프론트에서 클라이언트 사이드로 처리한다.
 */
@Service
@Profile("mssql")
@RequiredArgsConstructor
public class ReservationListService {

    private final ReservationListRepository repository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReservationList(String from, String to) {
        return repository.findReservationList(from, to);
    }
}
