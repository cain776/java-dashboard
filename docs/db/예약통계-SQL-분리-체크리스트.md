# 예약통계 SQL 분리 체크리스트

> 목적: `ReservationStatsSystemRepository`와 `CataractStatsSystemRepository`의 긴 Java 문자열 SQL을 `.sql` 리소스로 분리할 때 계산 결과를 바꾸지 않기 위한 사전 점검표.

## 1. 1차 분리 대상

| 대상 | 현재 위치 | 예정 리소스 |
|---|---|---|
| 예약통계_시력교정 일자별 원시 카운트 | `backend/src/main/java/com/bviit/analytics/repository/reservation/ReservationStatsSystemRepository.java` | `backend/src/main/resources/sql/reservation-stats/system-daily-counts.sql` |
| 예약통계_백내장 일자별 원시 카운트 | `backend/src/main/java/com/bviit/analytics/repository/reservation/CataractStatsSystemRepository.java` | `backend/src/main/resources/sql/reservation-stats/cataract-daily-counts.sql` |

후속 대상은 `ReservationListRepository`, `ReservationOverallStatsRepository`, `ReservationStatsRepository`, `IntakeConversionStatsRepository` 순서로 별도 분리한다.

## 2. 치환/바인딩 규칙

### 공통

- MSSQL 조건은 기존처럼 `:from`, `:to` 네임드 파라미터를 유지한다.
- 날짜 범위 의미를 바꾸지 않는다.
  - 등록/이력/예약일 범위: `>= :from AND < DATEADD(DAY,1,CONVERT(datetime,:to))`
  - 백내장 `Cataract_Exam.EXAM_DATE`: 현재 SQL의 `>= :from AND <= :to` 의미 유지
- SQL 리소스는 UTF-8로 저장한다. 한글 alias, 한글 리터럴, 주석이 많기 때문이다.
- `.formatted(...)` 방식은 피한다. SQL 안의 `%테스트%`, `%TEST%`, `%+1%` 같은 패턴과 충돌할 수 있다.

### 시력교정 전용

- `OPENQUERY(EICN_MySQL, '...')` 내부는 JDBC 네임드 파라미터가 동작하지 않는다.
- 현재 placeholder `__OQ_FROM__`, `__OQ_TO__`를 그대로 유지한다.
- 리소스 로드 후 ISO 날짜 재검증을 통과한 `yyyy-MM-dd` 값만 `replace`한다.
- `ISO_DATE = "\\d{4}-\\d{2}-\\d{2}"` 이중 가드는 제거하지 않는다.
- `#naver` temp table과 `SET NOCOUNT ON`은 같은 SQL 실행 문자열 안에 있어야 한다.

### 백내장 전용

- 현재는 `OPENQUERY`가 없으므로 `:from`, `:to` 네임드 파라미터만 유지하면 된다.
- 데이터 미확정 컬럼의 0 고정 의미를 바꾸지 않는다.
  - `totalPresbyopia`
  - `inboundCall`
  - `answeredCall`
  - `onlineNoShow`
- `GETDATE()` 기준 부도 판정은 그대로 유지한다.

## 3. SQL loader 요구사항

- classpath resource에서 UTF-8 문자열로 읽는다.
- 로드 실패 시 파일 경로가 포함된 명확한 예외 메시지를 낸다.
- 로드한 SQL을 임의 trim/정규화하지 않는다.
- `ReservationStatsSystemRepository`는 로드한 SQL에 대해 `__OQ_FROM__`, `__OQ_TO__` 치환 후 실행한다.
- `CataractStatsSystemRepository`는 로드한 SQL을 그대로 실행한다.

권장 형태:

```java
String sql = sqlLoader.load("sql/reservation-stats/system-daily-counts.sql");
```

## 4. 테스트 케이스

### SQL loader 단위 테스트

- 존재하는 SQL 리소스를 UTF-8로 읽는다.
- 없는 리소스는 파일명이 포함된 예외를 낸다.
- 한글 alias/리터럴이 깨지지 않는다.

### Repository 문자열 테스트

DB 없이 가능한 수준에서 아래를 검증한다.

- 시력교정 SQL 로드 후 `__OQ_FROM__`, `__OQ_TO__`가 남지 않는다.
- 시력교정 SQL에는 `:from`, `:to`가 남아 있다.
- 시력교정 SQL에는 `OPENQUERY(EICN_MySQL`와 `#naver`가 남아 있다.
- 백내장 SQL에는 `:from`, `:to`가 남아 있다.
- 백내장 SQL에는 `Cataract_Exam`, `DB_CUSTOM`, `HappyTalk_Counsel_List`가 남아 있다.

### 회귀 테스트

- locked 스냅샷 기반 프론트 골든마스터 테스트는 반드시 통과해야 한다.
- 가능하면 mssql profile 연결 환경에서 같은 기간 조회 결과를 분리 전/후 비교한다.
- 최소 검증 기간:
  - 시력교정: locked 과거월 1개, 진행월 1개
  - 백내장: locked 과거월 1개, 진행월 1개

## 5. 작업 순서

1. SQL loader와 loader 단위 테스트를 먼저 추가한다.
2. 시력교정 SQL을 리소스로 복사한다.
3. 시력교정 repository가 리소스를 읽도록 변경한다.
4. 문자열/치환 테스트를 추가한다.
5. 백내장 SQL을 리소스로 복사한다.
6. 백내장 repository가 리소스를 읽도록 변경한다.
7. 문자열/치환 테스트를 추가한다.
8. 프론트 골든마스터, 프론트 전체 테스트, 백엔드 전체 테스트를 실행한다.

## 6. 보류 항목

- 채널별 SQL 분리 실행은 이번 단계에서 하지 않는다. 현재 쿼리는 CTE와 temp table이 결합되어 있어 한 채널 실패를 독립적으로 격리하기 어렵다.
- `source`, `formulaVersion` 등 API 응답 메타데이터 추가는 현재 계획상 보류다.
- EICN 헬스 프로브는 SQL 파일 분리와 별도 작업으로 둔다.

## 7. 완료 기준

- Java 문자열 SQL이 repository에서 사라지고 `.sql` 리소스로 이동한다.
- `:from`, `:to`, `__OQ_FROM__`, `__OQ_TO__` 규칙이 보존된다.
- 한글 alias/리터럴이 깨지지 않는다.
- SQL loader 실패 메시지가 디버깅 가능한 수준이다.
- 분리 전후 결과가 동일하다.
