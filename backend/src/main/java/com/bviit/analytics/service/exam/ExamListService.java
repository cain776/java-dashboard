package com.bviit.analytics.service.exam;

import com.bviit.analytics.repository.exam.ExamListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 검사자 리스트 조회 서비스. 날짜 범위(검사일) 기준으로 행 목록을 반환한다.
 * 진료구분·검색 등 세부 필터는 프론트에서 클라이언트 사이드로 처리(월 단위 ~800행).
 */
@Service
@Profile("mssql")
@RequiredArgsConstructor
public class ExamListService {

    private final ExamListRepository repository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExamList(String from, String to) {
        return repository.findExamList(from, to);
    }
}
