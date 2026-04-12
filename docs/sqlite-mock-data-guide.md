# SQLite 더미 데이터 가이드

> 작성: 2026-04-12 | 작성자: Claude Opus  
> 목적: 새로운 통계 페이지를 추가할 때 SQLite 더미 데이터를 세팅하는 방법

---

## 1. 왜 SQLite인가

| 방식 | 문제점 |
|------|--------|
| MSW (JSON 목업) | 브라우저 전용, 백엔드 로직 검증 불가 |
| H2 인메모리 | 재시작마다 소멸, 외부 도구로 확인 불가 |
| **SQLite** | `.db` 파일 영속, git 추적 가능, DB Browser 등으로 직접 편집 가능 |

- H2는 인증(User 엔티티) 전용으로 유지
- 통계 더미 데이터는 모두 SQLite `.db` 파일로 관리

---

## 2. 현재 구조

```
backend/
├── build.gradle                          ← sqlite-jdbc 의존성
├── src/main/resources/
│   └── mock/
│       └── mock-data.db                  ← SQLite 파일 (git 추적)
├── src/main/java/com/bviit/analytics/
│   ├── config/
│   │   └── MockDataSourceConfig.java     ← SQLite JdbcTemplate 빈
│   ├── repository/
│   │   └── MockReservationRepository.java← SQLite 쿼리
│   └── controller/stats/
│       └── ReservationPanelController.java← ?mock=true/false 분기
```

---

## 3. 새 통계 페이지 더미 데이터 추가 절차

### 3-1. SQLite 테이블 + 데이터 추가

```bash
# mock-data.db 열기
sqlite3 backend/src/main/resources/mock/mock-data.db
```

```sql
-- 예: 수술 건수 통계 테이블
CREATE TABLE IF NOT EXISTS surgery_monthly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  lasek INTEGER NOT NULL DEFAULT 0,
  lasik INTEGER NOT NULL DEFAULT 0,
  smile INTEGER NOT NULL DEFAULT 0,
  cataract INTEGER NOT NULL DEFAULT 0
);

-- 시드 데이터
INSERT INTO surgery_monthly (year, month, lasek, lasik, smile, cataract) VALUES
(2025, 1, 12, 18, 25, 15),
(2025, 2, 14, 20, 28, 17),
-- ... 12개월 × 연도 수
;
```

```bash
# 확인
sqlite3 backend/src/main/resources/mock/mock-data.db "SELECT count(*) FROM surgery_monthly;"
```

> DB Browser for SQLite로 GUI 편집도 가능합니다.

### 3-2. Repository 작성

```java
package com.bviit.analytics.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class MockSurgeryRepository {

    private final NamedParameterJdbcTemplate jdbc;

    // 반드시 "mockJdbcTemplate" 주입 (H2가 아닌 SQLite)
    public MockSurgeryRepository(
            @Qualifier("mockJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findMonthlyByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        return jdbc.queryForList(
            """
            SELECT year, month, lasek, lasik, smile, cataract,
                   (lasek + lasik + smile + cataract) AS total
            FROM surgery_monthly
            WHERE year >= :minYear AND year <= :maxYear
            ORDER BY year, month
            """,
            new MapSqlParameterSource()
                .addValue("minYear", minYear)
                .addValue("maxYear", maxYear)
        );
    }

    public List<Map<String, Object>> findKpiByYears(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        return jdbc.queryForList(
            """
            SELECT year,
                   SUM(lasek) AS lasek, SUM(lasik) AS lasik,
                   SUM(smile) AS smile, SUM(cataract) AS cataract,
                   SUM(lasek + lasik + smile + cataract) AS total
            FROM surgery_monthly
            WHERE year >= :minYear AND year <= :maxYear
            GROUP BY year ORDER BY year
            """,
            new MapSqlParameterSource()
                .addValue("minYear", minYear)
                .addValue("maxYear", maxYear)
        );
    }
}
```

### 3-3. Controller 작성

```java
@RestController
@RequestMapping("/api/stats/surgery")
@RequiredArgsConstructor
public class SurgeryPanelController {

    private final MockSurgeryRepository mockRepository;
    private final Optional<SurgeryStatsService> realService; // mssql 전용

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        if (!mock) {
            if (realService.isEmpty()) {
                return ResponseEntity.status(503)
                    .body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
            }
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        // SQLite 더미 데이터
        return ResponseEntity.ok(ApiResponse.ok(mockRepository.findKpiByYears(years)));
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<?>>> getTrend(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        if (!mock) {
            if (realService.isEmpty()) {
                return ResponseEntity.status(503)
                    .body(ApiResponse.error("실 데이터 소스(MSSQL)가 연결되지 않았습니다."));
            }
            return ResponseEntity.ok(ApiResponse.ok(realService.get().getMonthlyStats(years)));
        }
        return ResponseEntity.ok(ApiResponse.ok(mockRepository.findMonthlyByYears(years)));
    }

    // /composition도 동일 패턴
}
```

### 3-4. 프론트엔드 연동

```typescript
// api/stats.ts — API 함수 추가
getSurgeryKpi: async (years: number[], mock = true) => {
  const res = await api.get<ApiResponse<SurgeryKpiItem[]>>(
    `/stats/surgery/kpi?years=${years.join(',')}&mock=${mock}`
  )
  return res.data
},

// hooks/useSurgeryKpi.ts — 훅 추가
export function useSurgeryKpi(queryYears: number[]) {
  const source = useDataSourceStore((s) => s.source)
  const isMock = source === 'mock'
  return useQuery({
    queryKey: ['surgery-kpi', queryYears, source],  // source 포함 필수
    queryFn: () => statsApi.getSurgeryKpi(queryYears, isMock),
  })
}
```

---

## 4. 핵심 규칙

### 반드시 지킬 것

1. **`@Qualifier("mockJdbcTemplate")`** — Repository에서 반드시 이 이름으로 주입. 생략하면 H2 JdbcTemplate이 주입됨
2. **`Optional<RealService>`** — Controller에서 실 서비스는 `Optional`로 주입. mssql 프로파일 없으면 empty
3. **`mock=false` + 실 서비스 없음 → 503 에러** — 절대 더미 데이터로 fallback하지 않음
4. **React Query 키에 `source` 포함** — 토글 전환 시 자동 refetch

### SQLite 파일 관리

- 파일 위치: `backend/src/main/resources/mock/mock-data.db`
- **git에 커밋** — 다른 개발자도 바로 사용
- 데이터 추가/수정 후 반드시 커밋
- 테이블명 컨벤션: `{페이지ID}_monthly` (예: `reservation_monthly`, `surgery_monthly`)
- H2 예약어(`MONTH`, `YEAR`) 주의 — SQLite는 괜찮지만 일관성을 위해 피하기

### MockDataSourceConfig 구조

```
MockDataSourceConfig
  └─ "mockJdbcTemplate" (Bean)
       └─ SimpleDriverDataSource (org.sqlite.JDBC)
            └─ jdbc:sqlite:{resources/mock/mock-data.db 경로}
```

- `DataSource`를 빈으로 등록하지 않음 → JPA/Hibernate에 영향 없음
- `SimpleDriverDataSource` 사용 → 커넥션 풀 불필요 (읽기 전용 더미)
- JAR 배포 시 classpath에서 임시 파일로 자동 복사

---

## 5. 데이터소스 토글 (프론트엔드)

### Zustand 스토어

```
stores/dataSourceStore.ts
  source: 'mock' | 'real'  (localStorage 연동)
  toggle()                  (전환 함수)
```

### Topbar 토글 버튼

| 상태 | 색상 | 아이콘 | 레이블 |
|------|------|--------|--------|
| 더미 | amber (경고색) | Database | "더미" |
| 리얼 | emerald (성공색) | Server | "리얼" |

### 전환 흐름

```
사용자가 토글 클릭
  → dataSourceStore.toggle()
  → source 변경 ('mock' ↔ 'real')
  → localStorage 저장
  → React Query 키에 source 포함되어 있으므로 자동 refetch
  → API 호출 시 ?mock=true/false 파라미터 전달
  → 백엔드가 SQLite 또는 MSSQL로 분기
```

---

## 6. 체크리스트

새 통계 페이지 더미 데이터 추가 시:

- [ ] `mock-data.db`에 테이블 생성 + 시드 데이터 INSERT
- [ ] `MockXxxRepository.java` 작성 (`@Qualifier("mockJdbcTemplate")`)
- [ ] `XxxPanelController.java` 작성 (`?mock=true/false` 분기, 503 에러 처리)
- [ ] `api/stats.ts`에 API 함수 추가 (`mock` 파라미터)
- [ ] `hooks/useXxxKpi.ts` 등 훅 추가 (`queryKey`에 `source` 포함)
- [ ] `mock-data.db` 변경사항 git 커밋

---

## 7. 참고: SQLite CLI 치트시트

```bash
# DB 열기
sqlite3 backend/src/main/resources/mock/mock-data.db

# 테이블 목록
.tables

# 스키마 확인
.schema reservation_monthly

# 데이터 확인
SELECT * FROM reservation_monthly WHERE year = 2026;

# CSV import
.mode csv
.import data.csv surgery_monthly

# 종료
.quit
```
