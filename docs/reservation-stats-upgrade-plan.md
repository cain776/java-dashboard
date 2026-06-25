# 예약통계 시스템 업그레이드 계획

작성일: 2026-06-24  
대상 화면:

- 시력교정 예약통계: `/stats/reservation-stats-system`
- 백내장 예약통계: `/stats/reservation-stats-cataract`

## 1. 목적

예약통계 화면은 단순한 UI가 아니라 레거시 RSS, PDF 고정값, 운영 DB 라이브 집계를 비교해야 하는 운영 통계 화면이다. 따라서 이번 업그레이드의 목적은 계산 공식을 임의로 변경하는 것이 아니라, 기존 공식을 보호하면서 코드 구조, 테스트, 스냅샷, 진단 체계를 정리하는 것이다.

핵심 방향:

1. 계산 공식은 먼저 고정하고 보호한다.
2. 시력교정과 백내장을 동시에 정리해 중복 구조가 굳지 않게 한다.
3. 리팩토링은 출력 불변을 전제로 한다.
4. 운영 데이터 미연결/오류 상태와 스냅샷/라이브 출처를 명확히 표시한다.
5. 오류가 나면 작은 단위로 되돌릴 수 있게 작업을 쪼갠다.

## 2. 범위와 비범위

### 범위

- 시력교정/백내장 예약통계의 프론트 공통 코어 추출
- 시력교정/백내장 예약통계의 백엔드 스냅샷 공통화
- 골든마스터 테스트 구축
- SQL 파일 분리
- 미연결 상태 표시 유지 및 스냅샷/라이브 출처 메타데이터 응답
- 테이블 컴포넌트 분리
- row-level 진단 및 diff 구현

### 비범위

아래 항목은 이번 "코드 품질 업그레이드"와 별도 승인/검증 후 진행한다. 공식은 그대로 두더라도 결과 숫자가 바뀔 수 있기 때문이다.

- 예약율/총예약/내원율 등 계산 공식 변경
- 네이버 원천 기준 변경
- 주차 기준 변경
- `GETDATE()` 기반 부도 계산 기준 변경

> **처리 완료(2026-06-24, commit 3ab17bc — 운영DB 영향 검증 후 반영. 비범위에서 제외):**
> - `C.ETC IS NULL OR NOT (...)` 제외필터 NULL 버그 → 모든 nullable LIKE를 `ISNULL(...,'')`로 감싸 `NOT(...)`로 정정. **수정 완료**(2026-06 영향 879→878행, 테스트/재검 마커 1건 제외).
> - `CH_04 TM_EMP NOT IN(...)` NULL 누락 → `(TM_EMP IS NULL OR TM_EMP NOT IN(...))`로 정정. **수정 완료**(2026-06 NULL 0건·현재 무변동, 미래 안전).
> - `PK + 날짜` 조인 `SRC` 추가 → 2026-06 충돌 62건 전부 RSV↔HIST(같은 예약 RESERVE_NUM≡HISTORY_NUM)이고 각 CH가 자기 GB 컬럼에 1회만 집계돼 **합계 불변** 검증 → **불필요(미반영)**. 라이브만 영향, 스냅샷 불변.

## 3. 현재 상태 요약

### 프론트

주요 파일:

- `frontend/src/pages/reservation/ReservationStatsSystemPage.tsx`
- `frontend/src/pages/reservation/reservationStatsSystemData.ts`
- `frontend/src/pages/reservation/ReservationStatsCataractPage.tsx`
- `frontend/src/pages/reservation/reservationStatsCataractData.ts`
- `frontend/src/pages/reservation/ReservationStatsToolbar.tsx`
- `frontend/src/hooks/reservation/useReservationStatsSystem.ts`
- `frontend/src/hooks/reservation/useReservationStatsCataract.ts`
- `frontend/src/api/reservation/reservationStatsSystem.ts`
- `frontend/src/api/reservation/reservationStatsCataract.ts`

현 상태의 문제:

- 시력교정과 백내장이 구조적으로 유사하지만 별도 파일로 복제되어 있다.
- 초기에는 컬럼 정의, 시드 데이터, 공식, row builder, CSV가 한 파일에 섞여 있었으나 현재는 shared/formulas/CSV 계층으로 분리했다.
- 화면 컴포넌트가 테이블, 상태, 이벤트, 데이터 변환을 함께 처리한다.
- 일부 `colSpan`과 UI 수치가 하드코딩되어 있다.
- 구 시드 상수/함수(`CHANNEL_ROWS`·`SUMMARY_ROWS`·`SEED_WEEKLY`·`getDisplayRows` 등)는 제거 완료했고, 공식/row builder/CSV 계층 분리도 완료했다.
- 데이터 출처(스냅샷/라이브/PDF 고정)는 `ApiResponse.meta`로 수신하고, 툴바 상태 배지로 표시한다.

### 백엔드

주요 파일:

- `backend/src/main/java/com/bviit/analytics/controller/reservation/ReservationStatsSystemController.java`
- `backend/src/main/java/com/bviit/analytics/service/reservation/ReservationStatsSystemService.java`
- `backend/src/main/java/com/bviit/analytics/service/reservation/ReservationStatsSnapshotStore.java`
- `backend/src/main/java/com/bviit/analytics/repository/reservation/ReservationStatsSystemRepository.java`
- `backend/src/main/java/com/bviit/analytics/dto/reservation/ReservationStatsDailyRow.java`
- `backend/src/main/java/com/bviit/analytics/controller/reservation/CataractStatsSystemController.java`
- `backend/src/main/java/com/bviit/analytics/service/reservation/CataractStatsSystemService.java`
- `backend/src/main/java/com/bviit/analytics/service/reservation/CataractStatsSnapshotStore.java`
- `backend/src/main/java/com/bviit/analytics/repository/reservation/CataractStatsSystemRepository.java`
- `backend/src/main/java/com/bviit/analytics/dto/reservation/CataractStatsDailyRow.java`

현 상태의 문제:

- 시력교정/백내장 controller, service, snapshot store 구조가 거의 동일하게 중복되어 있다.
- SQL이 Java 문자열에 길게 포함되어 있어 리뷰와 변경 추적이 어렵다.
- `fillSnapshot`은 read, merge, save가 비원자적이라 동시에 호출하면 lost update 가능성이 있다.
- 스냅샷 저장 경로가 상대경로 기본값이라 실행 위치에 따라 다른 폴더를 볼 수 있다.
- GET 응답은 `data: days[]` shape를 유지하면서 `meta`로 source/schemaVersion/formulaVersion/locked/confirmed 정보를 함께 내려준다.

### 스냅샷 파일 상태

현재 git 기준:

- 시력교정 `backend/data/reservation-stats/2026-01.json` ~ `2026-05.json`: 추적 대상, `locked: true`
- 시력교정 `backend/data/reservation-stats/2026-06.json`: **추적 대상(git 커밋됨), `locked: false`** (2026-06-24 검증 — `.gitignore` 대상 아님)
- 백내장 `backend/data/reservation-stats-cataract/2026-01.json` ~ `2026-05.json`: 추적 대상, `locked: true`
- 백내장 `backend/data/reservation-stats-cataract/2026-06.json`: 추적 대상, `locked: false`

골든마스터는 `locked: true`이고 provenance가 확인된 파일만 사용한다. 시력교정·백내장 2026-06은 **둘 다 추적 대상이지만 `locked: false`(라이브 호출로 드리프트 가능)** 이므로 골든마스터에서 제외한다. 즉 제외 사유는 gitignore가 아니라 **locked 여부**다.

### 이미 반영된 정리 (커밋별, 2026-06-24)

아래는 본 계획에 영향을 주는, 이미 적용된 수정이다(대부분 **출력 불변**). 각 단계에서 재구현하지 말고 "테스트 추가" 대상으로만 본다.

**commit f7242cc** — 착수 전 출력 불변 수정:

- GET 스냅샷 응답을 `[from, to]`로 필터 (4단계 검증의 "GET snapshot range filtering"은 구현 완료 → 테스트만 추가)
- `saveSnapshot`/`fillSnapshot` 미래 월 거부 가드
- period 검증을 `YearMonth.parse`로 일원화(`2026-13` 등 거부)
- 죽은 코드 제거: `saveSnapshot`/`isSaving`/`isConfirmed`(훅)
- 실패 표시 `alert()` → `toast.error()`
- stale 행 깜빡임: 스켈레톤 조건에 `isFetching` 포함
- 툴바 월 드롭다운: 현재 연도 미래 월 선택 차단

**본 계획 작성 후 추가로 반영된 것**(재구현 금지 — "테스트 추가" 대상으로만):

- **시드 폴백 제거**(commit c30e36c): 미연결/503 시 시드 미표시·‘미연결’ 안내만(잘못된 수치 방지). `new Date()` 모듈 상단 고정 해제(periodRange/currentMonth가 매 호출 평가). 시력교정 2026-06 스냅샷 git 추적(gitignore 예외).
- **시력교정 RSS 제외필터·TM_EMP NULL 정정**(commit 3ab17bc — §2 비범위의 처리 완료 항목 참조).
- **백내장 예약통계 캘리브레이션**(commit c1cf057·04f31a7): 내원 = `Cataract_Exam` ∩ 같은날 백내장(FLAG='H' I/H) 예약(협진/타과 의뢰 제외) · 부도/취소 = 수술당일(`JINRYO='13'`) 슬롯 제외 · 아웃바운드 TM 라이브(`DB_CUSTOM` TM팀 4명) · 예약 종합 **총예약건 = 내원+부도+취소**.
- **월 단위 lock 적용**(이번 작업): `saveSnapshot`/`fillSnapshot`의 read-merge-save 경합을 period별 lock으로 보호하고 동시성 테스트를 추가.
- **골든마스터 테스트 구축**(이번 작업): locked 스냅샷(시력교정·백내장 2026-01~05)을 입력으로 DisplayRow/CSV 스냅샷 테스트 추가. 2026-06은 `locked: false`라 제외.
- **프론트 shared core 1차 추출**(이번 작업): 조회 단위 타입, 월 라벨, 요일, 주차, 퍼센트 계산, count 합산 공통 유틸을 `shared/reservationStatsCore.ts`로 이동. 도메인별 공식(`computeChannelRow`, 네이버 clamp, 백내장 총예약)은 그대로 보존.
- **테이블 colSpan 1차 자동화**(이번 작업): 수동 `colSpan` 숫자를 컬럼 그룹 길이 기반으로 치환하고 `shared/reservationStatsTable.ts` 단위 테스트 추가. 헤더 메타 전체 데이터화는 다음 단계.
- **스냅샷 lock 개선**(이번 작업): period lock map 엔트리를 사용 후 회수하고, 무거운 라이브 조회는 lock 밖으로 이동. 파일 read/merge/save는 계속 lock 안에서 보호.
- **시드 dead code 제거**(이번 작업): 시드 폴백 제거 후 미사용이던 `CHANNEL_ROWS`/`SEED_WEEKLY`/구 `getDisplayRows` 경로와 stale export 제거.
- **프론트 row builder/CSV/summary 공통화**(이번 작업): `SummaryRow`·`SUMMARY_COLUMNS`·`computeSummaryRow`, 조회 단위 row builder, CSV builder, 날짜 범위, 숫자 포매터를 `shared/`로 이동. 백내장→시력교정 데이터 파일 import 결합 제거.
- **프론트 도메인별 formulas 계층화**(이번 작업): 시력교정/백내장 채널 공식과 채널 row 타입을 `formulas/`로 이동. 네이버 음수 클램프, 백내장 `totalCataract` 재계산 등 의도된 비대칭은 단위 테스트로 고정.
- **프론트 헤더 메타 전체 데이터화**(이번 작업): 시력교정/백내장 테이블 헤더 JSX를 `StatsHeaderNode` 트리와 `ReservationStatsTableHeader` 공통 렌더러로 이동. 후손 leaf 수 기반 `colSpan`과 남은 깊이 기반 `rowSpan`을 자동 계산한다.
- **백엔드 스냅샷 store 공통화**(이번 작업): `MonthlySnapshotStore<TSnapshot, TDaily>`를 추가하고 시력교정/백내장 snapshot store를 얇은 wrapper로 정리. 파일 기반 locked seed·원자적 write·응답 shape는 유지하고, 증분 fill의 날짜 merge도 공통 store를 사용한다.
- **SQL 파일 분리**(이번 작업): 시력교정/백내장 긴 Java SQL을 `src/main/resources/sql/reservation-stats/*.sql`로 이동하고 `SqlLoader`를 추가. system의 `OPENQUERY` placeholder(`__OQ_FROM__`, `__OQ_TO__`)와 MSSQL named parameter(`:from`, `:to`) 보존 테스트 추가.
- **진단/diff 구현**(이번 작업): 확정 스냅샷 vs 라이브 재조회 결과를 일자/필드별로 비교하는 API와 프론트 진단 CSV 다운로드를 추가. 날짜 누락은 `null`로 표시해 실제 0과 구분한다.
- **row-level drill-down 1차 구현**(이번 작업): diff가 난 일자/필드를 대상으로 원천 row 후보를 조회하는 API를 추가했다. 응답은 `source`, `GB`, `GB2`, `PK`, `contribution`을 포함하며, 프론트 진단 CSV에는 상세조회 URL을 함께 기재한다.
- **스냅샷 schemaVersion·저장 불변식 검증**(2026-06-25): 시력교정/백내장 스냅샷에 `schemaVersion`을 추가하고, 저장 직전 빈 days·period 밖 날짜·중복 날짜·날짜 형식을 검증한다.
- **API 메타 응답 1차 적용**(2026-06-25): `data` 배열 shape는 유지하고 `ApiResponse.meta`에 `source`, `period`, `schemaVersion`, `formulaVersion`, `locked`, `confirmedAt`, `confirmedBy`를 추가했다. 프론트는 툴바에 `PDF 고정`/`스냅샷`/`라이브` 배지를 표시한다.
- **공통 예외/에러 응답 정리**(2026-06-25): MSSQL 미연결, PDF 고정 스냅샷 차단, period/field 검증, SQL 리소스 로드 실패, 스냅샷 불변식 위반을 의미 있는 예외로 분리하고 `GlobalExceptionHandler`에서 400/409/500/503 응답을 일원화했다. `ErrorResponse.meta`는 미연결 응답의 출처 메타데이터를 보존한다.
- **SQL 파일 분리 2차 완료**(2026-06-25): `ReservationListRepository`, `ReservationOverallStatsRepository`, `ReservationStatsRepository`, `IntakeConversionStatsRepository`의 Java 문자열 SQL을 `src/main/resources/sql/**` 리소스로 이동했다. 날짜 바인딩과 주요 제외 필터/채널 매핑은 DB 없는 단위 테스트로 고정한다.

아직 남은 것은 구현 과제가 아니라 운영 검증/고도화다. (~~시드 폴백 제거~~·~~월 단위 lock~~·~~lock map 회수~~·~~골든마스터 테스트~~·~~shared core 1차~~·~~row builder/CSV/summary 공통화~~·~~도메인별 formulas 계층화~~·~~헤더 메타 전체 데이터화~~·~~백엔드 스냅샷 store 공통화~~·~~SQL 파일 분리~~·~~진단/diff~~·~~row-level drill-down 1차~~·~~colSpan 1차~~·~~시드 dead code 정리~~·~~스냅샷 schemaVersion/불변식 검증~~·~~API 메타 응답 1차~~·~~공통 예외/에러 응답 정리~~·~~예약 리스트/종합/기본/유입 통계 SQL 리소스 분리~~는 완료.)

## 4. 코드 품질 원칙

### 계산과 표시 분리

- 계산 공식은 `formulas` 계층 한 곳에만 둔다.
- 화면 컴포넌트는 계산을 모르게 한다.
- 화면은 `DisplayRow[]`를 받아 렌더링만 한다.
- CSV/export는 화면과 같은 row source를 사용한다.

### 도메인 공통화

- 시력교정/백내장처럼 쌍둥이 화면은 복붙 구조로 두지 않는다.
- shared core는 도메인 단어를 몰라야 한다.
- system/cataract 차이는 columns, seed, raw count schema, label config로 제한한다.

### 데이터 흐름 명명

데이터 변환 단계는 이름으로 구분한다.

```txt
rawCounts -> normalizedCounts -> displayRows -> csvRows
```

- raw: 백엔드 DTO와 거의 동일한 값
- normalized: 프론트 계산용으로 정규화한 값
- display: 테이블 표시용 row
- csv: 다운로드 직렬화용 row

### 순수 함수 유지

- 공식 함수는 순수 함수로 유지한다.
- 공식 함수 내부에서 `new Date()`, API 호출, localStorage, UI state를 사용하지 않는다.
- 날짜/기준일이 필요하면 인자로 받는다.

### 날짜/주차 계산 격리

- `periodRange`, `weekBucket`, `isClosedDay`는 별도 유틸로 분리한다.
- 날짜/주차 유틸은 별도 테스트를 둔다.
- 통계 화면에서 날짜 계산은 곧 숫자 오차로 이어질 수 있으므로 화면 안에 임시 계산을 두지 않는다.

### 상태 모델 명확화

화면 상태는 명시적으로 관리한다.

```txt
idle
loading
ready
unavailable
error
empty
```

- 조용한 fallback으로 숫자를 보여주지 않는다.
- 미연결, 오류, 시드 표시 여부는 사용자에게 명확히 드러낸다.
- `snapshot`/`live`/`pdfLocked` 같은 출처 기반 상태는 `ApiResponse.meta`를 기준으로 표시한다.

### 진단 가능한 실패

- 음수 clamp, 빈 배열 fallback, 시드 fallback처럼 숫자를 그럴듯하게 보정하는 코드는 진단 정보를 남긴다.
- 사용자가 보는 메시지와 개발자가 보는 로그를 분리한다.
- 로그에는 SQL 이름, 기간, source, trace id, 파라미터를 남긴다.

### 파일 크기와 책임

- 한 파일이 300~400줄을 넘으면 분리 후보로 본다.
- 주석은 "무엇"보다 "왜"를 설명한다.
- 매직 문자열은 상수화한다.
- `CH01`, `CH02` 같은 원천 코드명은 백엔드 raw DTO 또는 SQL 문맥까지만 허용한다.
- 프론트 내부에서는 의미 있는 이름을 쓴다.

### 복귀 가능한 리팩토링

- 코드 이동 커밋과 동작 변경 커밋을 섞지 않는다.
- 출력이 바뀔 수 있는 변경은 별도 커밋으로 분리한다.
- 각 단계는 build/test/diff로 검증한 뒤 다음 단계로 넘어간다.

## 5. 목표 구조

### 프론트 목표 구조

```txt
frontend/src/pages/reservation/reservation-stats/
├─ shared/
│  ├─ types.ts
│  ├─ formulas.ts
│  ├─ rowBuilder.ts
│  ├─ csv.ts
│  ├─ dateRange.ts
│  ├─ tableModel.ts
│  ├─ ReservationStatsTable.tsx
│  ├─ ReservationStatsTableHeader.tsx
│  ├─ ReservationStatsTableBody.tsx
│  ├─ ReservationStatsEmptyState.tsx
│  └─ ReservationStatsSkeleton.tsx
├─ system/
│  ├─ columns.ts
│  ├─ seed.ts
│  ├─ normalize.ts
│  └─ ReservationStatsSystemPage.tsx
└─ cataract/
   ├─ columns.ts
   ├─ seed.ts
   ├─ normalize.ts
   └─ ReservationStatsCataractPage.tsx
```

원칙:

- `shared`는 시력교정/백내장 도메인 단어를 모른다.
- `system`과 `cataract`는 config와 normalize만 가진다.
- 공식과 row builder는 shared에 둔다.
- 테이블은 컬럼 config를 받아 header/body/CSV를 생성한다.

### 백엔드 목표 구조

```txt
backend/src/main/java/com/bviit/analytics/reservationstats/
├─ common/
│  ├─ MonthlySnapshotStore.java
│  ├─ SnapshotMetadata.java
│  ├─ SnapshotInfo.java
│  ├─ ReservationStatsSqlLoader.java
│  ├─ ReservationStatsPeriodLock.java
│  └─ ReservationStatsHealthService.java
├─ system/
│  ├─ ReservationStatsSystemController.java
│  ├─ ReservationStatsSystemService.java
│  ├─ ReservationStatsSystemRepository.java
│  └─ ReservationStatsSystemSql.java
└─ cataract/
   ├─ CataractStatsSystemController.java
   ├─ CataractStatsSystemService.java
   ├─ CataractStatsSystemRepository.java
   └─ CataractStatsSystemSql.java
```

SQL 파일:

```txt
backend/src/main/resources/sql/reservation-stats/
├─ system-daily-counts.sql
├─ cataract-daily-counts.sql
├─ system-diagnostics.sql
└─ cataract-diagnostics.sql
```

원칙:

- repository는 SQL 로드, 파라미터 바인딩, row mapping만 담당한다.
- service는 조회 정책과 스냅샷 정책을 담당한다.
- controller는 request validation과 response wrapping만 담당한다.
- 스냅샷 store는 제네릭/공통화하되, locked PDF seed 파일의 git provenance는 유지한다.

> ✅ **패키지 컨벤션 — (B) 권장**: 위 `reservationstats/{common,system,cataract}`는 **피처(수직) 패키지**로, 현재 CLAUDE.md의 **레이어 우선**(`controller`/`service`/`repository` → 도메인 하위) 컨벤션과 어긋난다.
> - **(A) 비권장**: 이 모듈만 피처 패키지 예외 허용 → 나머지 코드베이스와 불일치·유지보수 혼선. CLAUDE.md 예외 명시+팀 합의가 필요하고, 그만한 이득이 없다.
> - **(B) ✅ 채택**: 기존 레이어 구조(`service/reservation/` 등) 유지 + 제네릭(`MonthlySnapshotStore<T>` 등)만 추출. 컨벤션 불변·중복만 제거. 4단계도 (B)로 동일 효과.
>
> 따라서 위 §5 목표 구조의 피처 패키지 트리는 **개념적 그룹핑(참고)**으로만 읽고, 실제 이전은 레이어 구조를 유지한다.

## 6. API 응답 계획

> ✅ **2026-06-25 구현 완료**: 응답의 `data: ReservationStatsDailyRow[]` shape는 유지하고, `ApiResponse.meta` 선택 필드로 출처 정보를 추가했다. 기존 소비자는 `data`를 그대로 읽을 수 있고, 예약통계 화면은 `meta`를 사용해 툴바에 `PDF 고정`/`스냅샷`/`라이브` 배지를 표시한다.

현재:

```json
{
  "success": true,
  "data": [
    { "date": "2026-06-01" }
  ]
}
```

목표:

```json
{
  "success": true,
  "data": [
    { "date": "2026-04-01" }
  ],
  "meta": {
    "source": "SNAPSHOT",
    "period": "2026-04",
    "schemaVersion": 1,
    "formulaVersion": "reservation-stats-system-v1",
    "locked": true,
    "confirmedAt": "2026-06-24T00:00:00",
    "confirmedBy": "PDF(골든와이즈 RSS 2026)"
  }
}
```

`source` 값:

| 값 | 의미 |
|----|------|
| `SNAPSHOT` | 확정 스냅샷. `locked=true`면 PDF 기반 고정 스냅샷 |
| `LIVE` | 운영 DB 라이브 조회 |
| `UNAVAILABLE` | 운영 DB 미연결 |

프론트는 이 메타데이터를 기준으로 툴바에 데이터 출처를 표시한다. `formulaVersion`은 시력교정 `reservation-stats-system-v1`, 백내장 `reservation-stats-cataract-v1`로 분리한다.

## 7. 단계별 계획

### 0단계. 퀵윈: 월 단위 스냅샷 lock

목적:

- `fillSnapshot` 동시 호출 시 lost update를 막는다.

작업:

- `ReservationStatsPeriodLock` 추가
- period 단위 lock map 구성
- `saveSnapshot`, `fillSnapshot`에 동일 lock 적용
- 시력교정/백내장 모두 적용

검증:

- 같은 period에 동시 fill 요청을 보내도 최종 JSON이 손상되지 않아야 한다.
- 기존 단일 호출 결과는 동일해야 한다.

출력 영향:

- 정상 단일 호출은 출력 영향 없음
- 동시 호출 시 저장 안정성만 개선

주의:

- 인메모리 lock map은 **단일 JVM 인스턴스 한정** — 다중 인스턴스 배포 시 무력화된다(현재 단일 인스턴스 가정). 저장 자체는 이미 atomic rename이라 파일 깨짐은 없고, lock이 막는 건 read-merge-save 경합으로 인한 lost update뿐이다. 다중 인스턴스가 필요해지면 파일 락(파일시스템) 또는 DB 기반 락으로 승격한다.

### 1단계. 골든마스터 테스트 구축

목적:

- 리팩토링 전후 출력 불변을 자동 검증한다.
- 이번 작업에서 1차 구축 완료. 이후 shared core 추출 시 이 테스트를 드리프트 가드로 사용한다.

입력:

- 시력교정 locked 스냅샷: 2026-01~2026-05
- 백내장 locked 스냅샷: 2026-01~2026-05
- 시력교정·백내장 2026-06은 둘 다 추적 대상이지만 `locked: false`(라이브 호출로 드리프트 가능)이므로 별도 검증 전 제외 (제외 사유는 gitignore가 아니라 locked 여부)

작업:

- 프론트 순수 함수 테스트 추가
- locked raw JSON을 fixture로 로드
- `getDisplayRowsFromCounts` 또는 새 `buildDisplayRows` 결과를 snapshot assert
- CSV 문자열도 fixture로 고정
- 날짜/주차 유틸 단위 테스트 추가

검증:

- 같은 locked JSON을 넣으면 항상 같은 DisplayRow와 CSV가 나와야 한다.
- 공식 또는 row builder가 바뀌면 테스트가 실패해야 한다.

출력 영향:

- 없음

주의:

- 6월 라이브 API 응답은 골든마스터로 쓰지 않는다.
- unlocked 스냅샷은 상태 변경에 따라 드리프트될 수 있으므로 골든마스터에서 제외한다.

### 2단계. 프론트 shared core 추출

목적:

- 시력교정/백내장 중복 구조를 공통 코어로 통합한다.
- 공식 위치를 한 곳으로 모은다.

작업:

- `types.ts` 작성
- `formulas.ts` 작성
- `rowBuilder.ts` 작성
- `csv.ts` 작성
- `dateRange.ts` 작성
- `tableModel.ts` 작성
- system/cataract별 `columns.ts`, `seed.ts`, `normalize.ts` 작성

검증:

- 골든마스터 DisplayRow diff 없음
- CSV diff 없음
- `npm run build` 통과

출력 영향:

- 없어야 한다.

금지:

- 이 단계에서는 공식 변경 금지
- 네이버/주차/필터 정합성 변경 금지

### 3단계. 테이블 컴포넌트 분리

목적:

- 화면 컴포넌트에서 렌더링 책임을 분리한다.
- 컬럼 기반 렌더링으로 `colSpan` 하드코딩을 제거한다.

작업:

- `ReservationStatsTable.tsx`
- `ReservationStatsTableHeader.tsx`
- `ReservationStatsTableBody.tsx`
- `ReservationStatsEmptyState.tsx`
- `ReservationStatsSkeleton.tsx`
- 컬럼 config 기반 group span 계산

검증:

- 기존 화면과 동일한 rows 렌더링
- CSV 결과 동일
- 데스크톱/모바일 주요 viewport에서 header/body alignment 확인

출력 영향:

- 계산값 영향 없음
- UI 구조는 동일해야 한다.

### 4단계. 백엔드 스냅샷 공통화

목적:

- 시력교정/백내장 snapshot store 중복을 제거한다(제네릭 추출).

작업:

- 공통 `MonthlySnapshotStore<T>` + `SnapshotInfo`(목록용) 추출 — 기존 레이어(`service/reservation/`) 유지(§5 (B))
- `schemaVersion`은 스냅샷 JSON에 보존하고, source/locked/confirmed 정보는 `ApiResponse.meta`로 노출한다. `SnapshotResponse<T>`처럼 `data` shape를 바꾸는 wrapper는 만들지 않는다.
- 파일 저장 경로는 현행 유지(`stats.snapshot.dir` 설정값 + 서버시작.bat이 작업 디렉터리를 `backend`로 고정 → 절대경로 불필요로 정리됨, 2026-06-24)
- locked PDF seed 파일은 계속 git에 유지
- 런타임 확정값은 **파일 저장 유지(원자적 rename)** — DB 이관은 마이그레이션·정합성 부담만 큰 YAGNI라 보류

검증:

- 기존 locked 스냅샷 조회 결과의 days는 동일
- snapshot list 조회 동일
- `gradlew.bat compileJava` 통과

출력 영향:

- days 값 영향 없음
- **응답 data shape 불변**: GET은 `data: ReservationStatsDailyRow[]` 그대로 유지하고 `meta`만 선택 추가한다.

### 5단계. API 메타 응답 적용

> ✅ 2026-06-25 구현 완료: `data` 배열은 유지하고 `ApiResponse.meta` 선택 필드로 source/schemaVersion/formulaVersion/locked/confirmed 정보를 추가했다. 프론트는 예약통계 툴바에 출처 배지를 표시한다.

목적:

- 프론트가 데이터 출처를 정확히 표시할 수 있게 한다.

작업:

- ~~GET 응답의 `data: days[]` shape 유지 + `meta` 선택 필드 추가~~
- ~~source 값 계산 (`SNAPSHOT`/`LIVE`/`UNAVAILABLE`)~~
- ~~`schemaVersion`, `formulaVersion` 포함~~
- ~~`confirmedAt`, `confirmedBy`, `locked` 포함~~
- ~~API 클라이언트 Zod schema 수정~~
- ~~toolbar/status 영역에 출처 표시~~

검증:

- locked 스냅샷 조회 시 `source=SNAPSHOT`, `locked=true` 표시
- runtime snapshot 조회 시 `SNAPSHOT` 표시
- snapshot이 없고 mssql 연결 시 `LIVE` 표시
- mssql 미연결 시 `UNAVAILABLE` 또는 오류 상태 표시

출력 영향:

- 표시되는 숫자는 동일해야 한다.
- 화면에 데이터 출처 정보가 추가된다.

### 6단계. SQL 파일 분리

> ✅ 2026-06-24 구현 완료: `SqlLoader` + `system-daily-counts.sql` / `cataract-daily-counts.sql` 리소스 분리. DB 없는 문자열 테스트로 UTF-8, OPENQUERY 치환, named parameter 보존, cataract 핵심 마커를 검증했다. 실제 MSSQL/work DB row diff(C2)는 후속 운영 검증으로 남긴다.

목적:

- Java 문자열 SQL을 분리해 리뷰와 변경 추적을 쉽게 한다.

작업:

- 사전 체크리스트: `docs/db/예약통계-SQL-분리-체크리스트.md`
- `src/main/resources/sql/reservation-stats/system-daily-counts.sql`
- `src/main/resources/sql/reservation-stats/cataract-daily-counts.sql`
- SQL loader 추가
- OPENQUERY 치환 가드 유지
- 네임드 파라미터 바인딩 유지
- SQL 파일 상단에 목적/원천/제약 주석 추가

검증:

- 동일 기간 조회 결과가 기존과 동일
- SQL 로드 실패 시 명확한 오류 메시지
- `gradlew.bat compileJava` 통과

출력 영향:

- 없어야 한다.

주의:

- 단일 CTE 쿼리 구조에서는 채널별 실패 격리가 어렵다.
- 이 단계에서는 실패 SQL 이름과 params 로깅, EICN 헬스 프로브 수준까지만 목표로 한다.
- 채널 분리 실행은 성능과 구조가 바뀌므로 별도 과제로 둔다.

daily SQL과 drill-down SQL 분리 유지 결정:

- daily SQL은 일자별 운영 집계값을 반환하는 화면/스냅샷용 쿼리이고, drill-down SQL은 특정 날짜·필드의 원천 row 후보를 펼치는 진단용 쿼리다. 반환 단위와 사용 목적이 다르므로 하나의 거대한 SQL/DSL로 합치면 오히려 변경 위험이 커진다.
- `OPENQUERY`, 임시 테이블, 다중 CTE, 원천별 pseudo row가 섞여 있어 SQL 생성 DSL을 만들면 “예쁜 구조”보다 디버깅 난도가 먼저 올라간다.
- 중복은 완전 제거 대신 `ReservationStatsFieldRegistry`, SQL `FIELD_MAP`, registry/SQL parity 테스트, 운영 parity API로 통제한다.
- 통합 재검토 조건은 동일 CASE 공식 수정이 반복되거나, daily와 drill-down 기준 차이가 parity에서 자주 검출되는 경우로 둔다.

### 7단계. 진단/diff 및 row-level drill-down 기능 구현

> ✅ 2026-06-24 구현 완료: snapshot vs live 일자/컬럼별 diff API, 프론트 진단 CSV 다운로드, row-level drill-down API, daily/drill-down parity API를 추가했다. drill-down 1차 응답은 집계 쿼리와 같은 기준으로 `source`, `GB`, `GB2`, `PK`, `contribution`을 내려준다. `CUST_NUM`, `RESERVE_NUM`, 예약상태, 제외 사유 후보는 운영 DB 검증 후 필요할 때 확장하는 고도화 항목으로 둔다.

목적:

- 레거시와 1건 차이가 날 때 row-level로 원인을 추적할 수 있게 한다.

작업:

- ~~snapshot vs live 일자/컬럼별 diff API~~
- ~~row-level drill-down API 설계 및 1차 구현~~
- ~~drill-down 응답 1차: `source`, `GB`, `GB2`, `PK`, `contribution` 포함~~
- ~~daily 집계값과 drill-down 기여도 합계 parity API~~
- ~~진단 UI field label 표시 및 parity CSV export~~
- 운영 고도화 후보: `CUST_NUM`, `RESERVE_NUM`, 예약상태, 제외 사유 후보 확장
- ~~프론트 diff CSV export~~
- ~~프론트 diff CSV에 drill-down 상세조회 URL 기재~~

검증:

- 특정 일자/컬럼에서 차이 발생 시 원천 row 후보를 확인할 수 있어야 한다.
- 집계 쿼리와 drill-down 쿼리의 기준이 문서화되어야 하며, 대표 필드는 parity API로 daily 값과 row 기여도 합계를 대조한다.
- DB 없는 단위 테스트에서는 SQL 리소스 로드, OPENQUERY placeholder 치환, `:date`/`:field` 바인딩 보존, 서비스의 snapshot/live 합계 계산을 검증한다.
- 실제 MSSQL/work DB에서는 대표 일자/필드(예: `visit`, `naverReservation`, 백내장 `totalCataract`)를 운영 검증으로 대조한다.

출력 영향:

- 기존 통계 화면의 계산값 영향 없음
- 진단 기능 추가

## 8. 테스트 전략

### 프론트 테스트

필수:

- locked 스냅샷 JSON -> DisplayRow snapshot
- locked 스냅샷 JSON -> CSV snapshot
- 날짜 범위 계산
- 주차 bucket 계산
- 미연결/오류/empty 상태별 화면 상태(시드 폴백 없음 확인)
- colSpan 자동 계산

권장:

- system/cataract 동일 shared row builder 적용 테스트
- empty/error/unavailable 상태 렌더링 테스트
- CSV와 화면 row source 동일성 테스트

### 백엔드 테스트

필수:

- snapshot store read/write
- period lock 동시성
- locked snapshot overwrite 거부
- GET snapshot range filtering
- SQL loader

권장:

- mssql profile 미활성 시 snapshot 조회 가능 여부
- live service 미사용 시 공통 예외 핸들러의 503 응답 정책(미연결 표시, meta 보존)

### CI 드리프트 가드

목표:

- locked raw JSON을 현재 공식으로 재계산하고 expected DisplayRow/CSV fixture와 비교한다.
- diff가 나면 build를 실패시킨다.

의미:

- 공식 변경을 1회성 검증이 아니라 영구 감시 장치로 만든다.

## 9. 복귀 전략

작업은 아래처럼 커밋을 분리한다.

1. `test: 예약통계 골든마스터 테스트 추가`
2. `fix: 예약통계 스냅샷 월 단위 락 추가`
3. `refactor: 예약통계 프론트 shared core 추출`
4. `refactor: 예약통계 테이블 컴포넌트 분리`
5. `refactor: 예약통계 백엔드 스냅샷 공통화`
6. `chore: 예약통계 stale 주석·시드 dead code 정리`
7. `refactor: 예약통계 SQL 파일 분리`
8. `feat: 예약통계 진단 diff 추가`
9. `feat: 예약통계 row drill-down 진단 추가`

원칙:

- 각 커밋은 독립적으로 되돌릴 수 있어야 한다.
- 코드 이동만 한 커밋과 출력이 바뀔 수 있는 커밋을 섞지 않는다.
- 골든마스터 diff가 발생하면 다음 단계로 넘어가지 않는다.
- 오류 발생 시 마지막 커밋만 revert한다.

## 10. 단계별 검증 명령

프론트:

```bash
cd frontend
npm run build
npm run test
```

백엔드:

```bash
cd backend
gradlew.bat compileJava
gradlew.bat test
```

수동 검증:

- `/stats/reservation-stats-system`
- `/stats/reservation-stats-cataract`
- 월별/주별/일별/전체 전환
- CSV 다운로드
- locked 스냅샷 조회
- mssql 미연결 상태

## 11. 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| 리팩토링 중 숫자 변경 | 골든마스터 DisplayRow/CSV diff로 차단 |
| 시력교정만 정리되고 백내장 중복이 남음 | shared core를 먼저 만들고 system/cataract를 동시에 이전 |
| 스냅샷 파일 경로 혼선 | `stats.snapshot.dir` 설정값 + 서버시작.bat이 작업 디렉터리를 `backend`로 고정(절대경로 불필요로 정리), locked seed는 git 유지 |
| 6월 데이터 드리프트 | unlocked/live 데이터는 골든마스터에서 제외 |
| 동시 fill로 저장 유실 | period lock 선적용 |
| 데이터 출처 표시 불일치 | `ApiResponse.meta` source/locked/formulaVersion을 기준으로 표시하고, `data` 배열 shape는 유지 |
| 미연결/잠금/검증 실패 응답 불일치 | 의미 있는 예외 타입과 `GlobalExceptionHandler`로 400/409/500/503 응답을 일원화 |
| SQL 분리 중 파라미터 누락 | SQL loader 테스트와 기존 결과 diff |
| 진단 기능이 집계와 다른 기준 사용 | drill-down SQL 기준을 문서화하고 registry/SQL 테스트 + parity API로 대조 |

## 12. 완료 기준

이번 업그레이드는 아래 조건을 만족하면 완료로 본다.

- 시력교정/백내장이 shared core를 사용한다.
- 공식 함수가 한 계층에 모여 있다.
- 화면 컴포넌트는 계산을 직접 수행하지 않는다.
- locked 스냅샷 기반 골든마스터 테스트가 있다.
- DisplayRow와 CSV 드리프트를 CI에서 감지한다.
- 스냅샷/라이브 응답 메타데이터(source/locked/confirmedBy/formulaVersion/schemaVersion)가 있다.
- 테이블 header/body/CSV가 같은 column config를 사용한다.
- `fillSnapshot` 동시 호출이 안전하다.
- SQL은 파일로 분리되어 있다.
- snapshot vs live diff와 row-level drill-down으로 일자/필드 차이의 원천 row 후보를 추적할 수 있다.
- daily SQL과 drill-down SQL의 기준 차이는 parity API/CSV로 운영 검증할 수 있다.
- MSSQL 미연결, PDF 고정, 검증 실패, SQL 리소스 실패는 공통 예외 핸들러를 통해 일관된 `ErrorResponse`로 응답한다.
- 오류 발생 시 커밋 단위로 복귀 가능하다.

## 13. 최종 원칙

숫자 공식은 순수하게, 화면은 선언적으로, 상태는 명시적으로, 리팩토링은 되돌릴 수 있게 만든다.
