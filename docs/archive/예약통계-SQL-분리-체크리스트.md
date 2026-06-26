# 예약통계 SQL 분리 체크리스트

> 🗄️ **보관(archive)**: SQL 리소스 분리 완료(2026-06, reservation 도메인 전 repository `.sql` 외부화). 사전 점검표 역할이 끝나 설계 근거 참고용으로 보관.

> 목적: `ReservationStatsSystemRepository`와 `CataractStatsSystemRepository`의 긴 Java 문자열 SQL을 `.sql` 리소스로 분리할 때 계산 결과를 바꾸지 않기 위한 사전 점검표.
>
> 갱신: 2026-06-24 — 사전 구현안/리스크 리뷰 반영(loader 시그니처·`resolveSystemSql` 추출·리스크 H/M/L·피해야 할 것·작업 순서 cataract 우선). **이 작업은 위치 이동/로딩 구조 변경만 허용하며 SQL 의미·계산 공식은 불변이다.**

## 1. 1차 분리 대상

| 대상 | 현재 위치 | 예정 리소스 |
|---|---|---|
| 예약통계_시력교정 일자별 원시 카운트 | `backend/src/main/java/com/bviit/analytics/reservation/repository/ReservationStatsSystemRepository.java` | `backend/src/main/resources/sql/reservation-stats/system-daily-counts.sql` |
| 예약통계_백내장 일자별 원시 카운트 | `backend/src/main/java/com/bviit/analytics/reservation/repository/CataractStatsSystemRepository.java` | `backend/src/main/resources/sql/reservation-stats/cataract-daily-counts.sql` |
| SQL 로더(신규) | — | `backend/src/main/java/com/bviit/analytics/common/util/SqlLoader.java` |

> **2차 진행 상태(2026-06-25)**: 후속 대상 4종 SQL 분리 완료. `ReservationListRepository`, `ReservationOverallStatsRepository`, `ReservationStatsRepository`, `IntakeConversionStatsRepository`의 Java 문자열 SQL을 `src/main/resources/sql/**` 리소스로 이동했다. 각 Repository의 리소스 마커와 날짜 바인딩은 DB 없는 단위 테스트로 검증한다.

> **verbatim 원칙**: `.sql`은 **손으로 재타이핑하지 말고 현재 Java `SQL` 상수 값을 그대로 덤프**해서 만든다. 한글 alias·`%` LIKE 패턴·이중따옴표 오타 리스크를 원천 차단한다.

## 2. 치환/바인딩 규칙

### 공통

- MSSQL 조건은 기존처럼 `:from`, `:to` 네임드 파라미터를 유지한다.
- 날짜 범위 의미를 바꾸지 않는다.
  - 등록/이력/예약일 범위: `>= :from AND < DATEADD(DAY,1,CONVERT(datetime,:to))`
  - 백내장 `Cataract_Exam.EXAM_DATE`: 현재 SQL의 `>= :from AND <= :to`(inclusive) 의미 유지
- SQL 리소스는 **UTF-8**로 저장한다. 한글 alias(`[예약날짜]`·`인입콜`·`응대콜`), 한글 리터럴(`검사_예약`·`백내장_내원` 등), 주석이 많다. 에디터 인코딩·`.gitattributes`도 UTF-8로 확인.
- `.formatted(...)` / `String.format` 금지. SQL 안의 `%테스트%`·`%TEST%`·`%+1%`~`%+5%`·`%중복DB%`·`B2B%` 등 **`%` 패턴이 두 repo 모두에 다수** 있어 포맷 지정자와 충돌한다.
- 빌드 확인: `build.gradle`의 `processResources`가 `sql/`에 토큰 필터링/치환을 적용하지 않는지 확인(현재 SQL엔 `${}` 없음, Spring Boot 기본은 properties만 필터링이라 가능성 낮으나 점검).

### 시력교정 전용

- `OPENQUERY(EICN_MySQL, '...')` 내부는 JDBC 네임드 파라미터가 동작하지 않는다.
- 현재 placeholder `__OQ_FROM__`, `__OQ_TO__`(OPENQUERY 내부 `''__OQ_FROM__''` 이중 단일따옴표 형태)를 그대로 유지한다.
- 리소스 로드 후 ISO 날짜 재검증을 통과한 `yyyy-MM-dd` 값만 `replace`한다.
- `ISO_DATE = "\\d{4}-\\d{2}-\\d{2}"` 이중 가드는 제거하지 않으며, **검증 → replace 순서**를 유지한다(검증을 replace 뒤로 옮기지 말 것).
- `#naver` temp table, `SET NOCOUNT ON`, CTE, 최종 SELECT는 **같은 SQL 실행 문자열(한 배치)** 안에 있어야 한다.

### 백내장 전용

- 현재는 `OPENQUERY`가 없으므로 `:from`, `:to` 네임드 파라미터만 유지하면 된다. **`__OQ_` placeholder를 추가하지 말 것.**
- 데이터 미확정 컬럼의 0 고정 의미를 바꾸지 않는다: `totalPresbyopia`, `inboundCall`, `answeredCall`, `onlineNoShow` (최종 SELECT의 `0 AS …`).
- `GETDATE()` 기준 부도 판정(`RESERVE_STATE='Y' AND RESERVE_DATE < CAST(GETDATE() AS DATE)`)은 그대로 유지한다.
- `EXAM_DATE <= :to`(inclusive)를 half-open으로 "정리"하지 말 것(결과 변동).

## 3. SQL loader 요구사항

- 위치: `com.bviit.analytics.common.util.SqlLoader` (레이어 중립 util — CLAUDE.md `util/` 컨벤션).
- 형태: **정적 유틸** 권장(Spring 컨텍스트 없이 단위테스트 가능). 시그니처:
  ```java
  public static String load(String classpathLocation);
  ```
  - classpath resource를 **UTF-8 문자열**로 읽는다: `new ClassPathResource(location).getInputStream()` → `StreamUtils.copyToString(is, StandardCharsets.UTF_8)`, **try-with-resources**.
  - **`getFile()` 금지** — JAR 배포 시 깨진다(이 코드베이스의 `MockDataSourceConfig`가 실제로 `getFile()`→임시파일 폴백 함정에 빠져 있음). `getInputStream()`만 사용해 JAR-safe.
  - 로드 실패 시 **경로가 포함된** 명확한 예외(`IllegalStateException("SQL resource not found: " + location", cause)`).
  - 로드한 SQL을 임의 **trim/정규화/세미콜론 split 하지 않는다**. 내용 그대로 반환.
  - (대안) `@Component SqlLoader` + DI도 가능하나 두 repo가 mssql 프로파일 전용이라 정적 유틸이 단순.
- repo 로딩 전략: SQL을 **인스턴스 final 필드로 생성자에서 1회 로드**(정적 초기화 `static final = load()`는 누락 시 `ExceptionInInitializerError`로 메시지가 흐려지므로 회피). mssql 프로파일에서만 빈 생성 시 fail-fast.
  - 두 repo는 이미 **명시적 생성자**(`@Qualifier("statsJdbcTemplate")` 주입)이므로 `this.sql = SqlLoader.load(...)` 한 줄만 추가한다. **`@RequiredArgsConstructor`로 바꾸지 말 것**(로드 로직을 넣을 수 없다).
- `ReservationStatsSystemRepository`: 로드한 base SQL에 대해 **순수 정적 메서드로 추출**해 DB 없이 테스트 가능하게 한다.
  ```java
  static String resolveSystemSql(String baseSql, String from, String to); // ISO 검증 → __OQ_ replace
  ```
  `findDailyCounts`는 `jdbc.query(resolveSystemSql(sql, from, to), params, mapper)`. ISO 가드·`.replace` 2회·row mapper는 그대로.
- `CataractStatsSystemRepository`: 로드한 SQL을 그대로 실행(`jdbc.query(sql, params, mapper)`, replace 없음).

권장 형태:

```java
// 생성자 1회 로드
this.sql = SqlLoader.load("sql/reservation-stats/system-daily-counts.sql");
// system findDailyCounts 내부
jdbc.query(resolveSystemSql(sql, from, to), params, mapper);
// cataract findDailyCounts 내부
jdbc.query(sql, params, mapper);
```

## 4. 테스트 케이스

### A. SQL loader 단위 테스트 (`SqlLoaderTest`, Spring·DB 불필요)

- A1 존재하는 SQL 리소스를 UTF-8로 읽고 비어있지 않으며 `"SET NOCOUNT ON"`을 포함한다.
- A2 없는 리소스(`sql/none.sql`)는 **파일 경로가 포함된** 예외를 낸다.
- A3 UTF-8: system 결과에 `예약날짜`·`인입콜`·`응대콜`, cataract 결과에 `백내장_내원`이 깨지지 않고 포함된다.
- A4 무가공: 결과가 `SET NOCOUNT ON`으로 시작하고 `ORDER BY`로 끝부분까지 포함(앞/뒤 trim·절단 없음).

> 경로: Gradle이 `src/main/resources`를 test 런타임 클래스패스에 올리므로 `ClassPathResource("sql/reservation-stats/system-daily-counts.sql")`(**앞 슬래시 없음**)가 테스트에서 그대로 해석된다. A1/A2가 이를 자연히 검증.

### B. repository 문자열 테스트 (DB 불필요 — `resolveSystemSql`/`SqlLoader` 직접 호출)

시력교정:
- B1 `resolveSystemSql(load(...), "2026-06-01", "2026-06-23")`에 `'2026-06-01'`·`'2026-06-23'` 포함(OPENQUERY 치환됨).
- B2 결과에 `__OQ_FROM__`/`__OQ_TO__` **0건**.
- B3 결과에 `:from`·`:to` **여전히 존재**.
- B4 결과에 `OPENQUERY(EICN_MySQL`·`#naver`·`SET NOCOUNT ON` 존재.
- B5 잘못된 `from`(`"2026-6-1"`, `"2026-06-01'; DROP"`) → `IllegalArgumentException`(치환 전 거부).
- B6 `:from` 등장 횟수: 원본 리소스 == 치환 결과(치환이 named param 미훼손).

백내장:
- B7 로드 SQL에 `:from`·`:to`·`Cataract_Exam`·`DB_CUSTOM`·`HappyTalk_Counsel_List` 포함, **`<= :to`(EXAM_DATE inclusive) 보존**, `0 AS totalPresbyopia`·`0 AS inboundCall` 포함.
- B8 cataract SQL에 `OPENQUERY`·`__OQ_` **0건**(교차오염 방지).

### C. 회귀 테스트

> ⚠️ **마커(B)는 필요조건이지 충분조건이 아니다.** 골든마스터는 프론트 변환(rawCounts→display/CSV)만 검증하고 **백엔드 SQL 출력(SQL→rawCounts)은 전혀 커버하지 않는다.** B는 부분 문자열 존재만 보므로, CASE 분기 한 글자 드리프트(`CtiDtlCod2='21'→'12'`, JINRYO 코드, 날짜 연산자 `<=`↔`<`)는 **모든 마커를 통과하면서 결과만** 바꾼다.

- **C0 (필수 · 바이트 동치 게이트)**: 마이그레이션 중 구 `SQL` 상수를 잠깐 남겨두고 한 줄로 **"구 상수 == 분리된 .sql"**을 못박는다.
  ```java
  assertThat(normEol(SqlLoader.load("sql/reservation-stats/system-daily-counts.sql")))
      .isEqualTo(normEol(OLD_SQL));   // normEol = s -> s.replace("\r\n", "\n")
  ```
  - **EOL만** 정규화(CRLF↔LF는 SQL 무해(L1) → false 실패 방지). **그 외 공백은 정규화하지 말 것**(드리프트를 그대로 잡아야 함).
  - 비교 대상은 **상수의 런타임 값**(텍스트블록이 incidental whitespace를 제거한 실제 문자열). `.sql`을 그 값에서 덤프해 만들면 by-construction 동일 → 테스트가 그것을 잠근다.
  - green 확인 후 **구 상수 + 이 C0 테스트를 삭제**(마이그레이션 완료 시점). 이후 정전(正典)은 `.sql`이며, 향후 변경은 git diff 리뷰 + (있으면) C2가 지킨다.
  - work DB 유무와 무관하게 모든 드리프트를 잡는 **무료·결정적** 게이트. 마커(B)·골든마스터(C1)로는 못 잡는 SQL 의미 드리프트의 1차 방어선.
- C1 locked 스냅샷 기반 프론트 골든마스터 + 프론트 전체 테스트 통과(백엔드 무관 sanity).
- C2 (mssql/work 연결 시 · belt-and-suspenders) 분리 **전/후** 같은 기간 조회 결과를 **row 단위 diff=0**으로 비교.
  - 최소 기간: 시력교정·백내장 각각 locked 과거월(2026-04) + 진행월(2026-06). work DB가 있으면 추가 하드 게이트.

## 5. 리스크 목록

### HIGH

- **H1 OPENQUERY ↔ named param 혼동**: OPENQUERY 내부를 `:from`로 바꾸면 MySQL 바인딩 불가 → 깨짐. 방지: `__OQ_` placeholder + Java replace 유지, B2/B3.
- **H2 세미콜론 split / 배치 분해**: `SET NOCOUNT;…INTO #naver;…WITH…SELECT`가 한 배치로 가야 함. loader가 `;`로 쪼개면 `#naver` 미존재로 실패. 방지: loader 통짜 반환·split 금지, B4 + C2.
- **H3 ISO 가드 제거/위치 이동**: 검증을 replace 뒤로 옮기거나 삭제 시 OPENQUERY 리터럴 주입 위험. 방지: `resolveSystemSql` 안에서 검증 → replace 순서 고정, B5.

### MED

- **M1 인코딩(UTF-8 미지정)**: 플랫폼 기본(Windows CP949)으로 읽으면 한글 alias 깨져 SQL 오류. 방지: `StandardCharsets.UTF_8` 명시 + 파일 UTF-8 저장, A3.
- **M2 verbatim 드리프트**: 수기 복사로 따옴표/한글/CASE 한 글자 변질. 방지: 상수 덤프로 생성 + C2 + B 마커.
- **M3 Gradle resource filtering**: `processResources` 토큰 치환이 켜져 있으면 SQL 변질 가능. 방지: `build.gradle`에서 `sql/` 필터링 없음 확인.
- **M4 정적 초기화 실패 메시지**: `static final = load()` 누락 시 `ExceptionInInitializerError`(흐린 메시지). 방지: 생성자 로드(인스턴스 필드).
- **M5 NamedParameterJdbcTemplate 파싱**: 치환 후 OPENQUERY 이중따옴표/잔여 `:` 오파싱 가능성(낮음 — 다른 `:` 없음). 방지: C2 1회 실행으로 확정.

### LOW

- **L1 공백/개행 차이**(텍스트블록↔파일, OPENQUERY 리터럴 내부 포함): SQL/MySQL 모두 공백 무의미 → 결과 불변.
- **L2 EOF 개행/끝공백**: 무해.
- **L3 cataract `<= :to` 정리 유혹**: half-open으로 바꾸면 결과 변동. 방지: verbatim + B7.
- **L4 경로 오타/클래스패스 누락**: 생성자 로드 + A1/A2로 기동 시 즉시 발각.

## 6. 구현 시 피해야 할 것

- ❌ `.formatted(...)` / `String.format`: SQL의 `%…%`·`%+1%`·`B2B%`(양쪽 repo)와 충돌.
- ❌ `${}` 보간/템플릿 엔진: 허용 치환은 system의 `.replace("__OQ_FROM__"/"__OQ_TO__")` 둘뿐.
- ❌ trim / stripIndent / 공백 정규화: loader·repo 모두 로드 SQL 무가공.
- ❌ 세미콜론 split: 배치 분해 금지(H2).
- ❌ `:from/:to` ↔ `__OQ_FROM__/__OQ_TO__` 혼동: `:from/:to`=MSSQL 바깥(named param, 유지) / `__OQ_*__`=OPENQUERY MySQL 리터럴(Java replace, `.sql`엔 placeholder 유지). 서로 변환 금지. cataract엔 `__OQ_` 추가 금지.
- ❌ ISO 가드 약화/이동(H3).

## 7. 작업 순서

> **cataract 먼저**(OPENQUERY·temp 없음 → 저위험)로 정정. 각 단계는 게이트 통과 후 다음으로.

| # | 작업 | 게이트 |
|---|---|---|
| 0 | `build.gradle` sql 리소스 필터링 없음 확인 / (가능하면) work DB 준비(C2용) | 확인 |
| 1 | `util/SqlLoader` + `SqlLoaderTest`(A1~A4) 추가 | `compileJava` + test |
| 2 | **cataract**: 구 `SQL` 상수 값을 덤프해 `cataract-daily-counts.sql` 생성(verbatim, UTF-8). **구 상수는 일단 유지** | 파일 인코딩 확인 |
| 3 | `CataractStatsSystemRepository` 생성자 로드 전환(mapper 불변) + **C0 바이트 동치(normEol)** + B7/B8 | **C0 green → 구 상수·C0 삭제** / (work DB면 C2: 2026-04·06 diff=0) |
| 4 | **system**: 구 `SQL` 상수 값을 덤프해 `system-daily-counts.sql` 생성(`__OQ_`/`:from` 유지). **구 상수 유지** | 파일 인코딩 확인 |
| 5 | `ReservationStatsSystemRepository`: `resolveSystemSql` 추출 + 생성자 로드(ISO·replace·mapper 불변) + **C0 바이트 동치** + B1~B6 | **C0 green → 구 상수·C0 삭제** / (work DB면 C2) |
| 6 | 백엔드 `gradlew.bat compileJava test` + 프론트 골든마스터/`npm test`(C1) | 전부 green |
| 7 | 커밋 2개 분리(cataract → system): "refactor: 예약통계 SQL `.sql` 리소스 분리(의미 불변)" | 단계별 revert 가능 |

원칙: 각 단계 green 전 다음 금지 / work DB 있으면 C2 row diff=0이 최종 하드 게이트 / 실패 시 마지막 커밋만 revert / 코드 이동 커밋과 동작 변경 커밋을 섞지 않는다.

## 8. 보류 항목

- 채널별 SQL 분리 실행은 이번 단계에서 하지 않는다. 현재 쿼리는 CTE와 temp table이 결합되어 있어 한 채널 실패를 독립적으로 격리하기 어렵다.
- `source`, `formulaVersion` 등 API 응답 메타데이터는 예약통계 API 1차 범위에서 별도 완료됐다. SQL 파일 분리 자체의 필수 게이트는 아니다.
- EICN 헬스 프로브는 SQL 파일 분리와 별도 작업으로 둔다.

## 9. 완료 기준

- Java 문자열 SQL이 repository에서 사라지고 `.sql` 리소스로 이동한다.
- `:from`, `:to`, `__OQ_FROM__`, `__OQ_TO__` 규칙이 보존된다(시력교정 `resolveSystemSql`이 검증→치환 순서 유지, cataract는 `__OQ_` 없음).
- 한글 alias/리터럴이 깨지지 않는다(UTF-8).
- SQL loader 실패 메시지가 경로 포함으로 디버깅 가능하다.
- **마이그레이션 중 C0 바이트 동치(구 상수 == `.sql`, EOL만 정규화)가 green이었고, 확인 후 구 상수·C0 테스트를 제거했다.**
- DB 없는 문자열 테스트(A·B)와 회귀(C1, 가능 시 C2 diff=0)가 통과한다.
- 분리 전후 결과가 동일하다.
