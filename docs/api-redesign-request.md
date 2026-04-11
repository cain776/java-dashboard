# 예약 건수 API 재설계 요청서

## 대상 메뉴

```
사이드바 > 검사&예약 > 예약 건수
라우트: /stats/reservation
페이지: frontend/src/pages/ReservationPage.tsx
```

## 문제

현재 `GET /api/stats/reservation` API는 총 예약/검사완료/취소/워크인 집계를 반환하지만,
프론트 화면(`/stats/reservation`)이 실제로 필요한 것은 **수술/외래/드림렌즈 유형별 예약 건수**입니다.

현재 API 응답과 프론트 화면이 요구하는 데이터가 불일치합니다.

---

## 운영팀 기획서 (지표 정의)

> 아래는 운영팀이 정의한 기획서 원본 내용입니다.

| 지표명 | 세부 지표명 | 지표 정의 | 관련 부서 | 담당자 | 활용 목적 | 업데이트 주기 | 통계 기준 | 기존 활용 방식 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 예약 건수 | 수술 예약수 | 검사자 중 수술을 예약한 사람 | 진료 | 정민지 | 수술 예약수 확인 | 매주 | 매주/매월 | CRM > 통계A > 검사자 리스트 > 수술예약등록일이 들어가 있는 수 |
| 예약 건수 | 외래 예약수 | 외래를 예약한 사람 | 진료 | 이승열 | 외래 예약수 확인 | 매주 | 매주/매월 | CRM > 통계A > 예약현황 > 진료명 외래로 변경 후 날짜 선택 > 검색 |
| 예약 건수 | 드림렌즈 예약수 | 드림렌즈를 예약한 사람 | 진료 | 권석진 | 드림렌즈 예약수 확인 | 매주 | 매주/매월 | CRM > 통계A > 예약자리스트 > 진료명 렌즈센터로 변경 후 날짜 선택 > 검색 |

---

## 기존 CRM 프로시저/SQL 근거 (softcrm)

### 1. 수술 예약수 — "검사자 중 수술을 예약한 사람"

**기존 활용 경로**: CRM > 통계A > 검사자 리스트 > 수술예약등록일이 들어가 있는 수

**레거시 SQL** (`softcrm/docs/db/sql-reference/통계_상담사.sql` 106~115행):
```sql
-- 'B' = 예약수 (검사자 중 수술 예약한 수)
SELECT EX.EXAM_DATE, EX.CUST_NUM, em.EMP_NAME, 'B' as ee,
       max(r.RESERVE_DATE) as RESERVE_DATE
  FROM EXAM EX
  JOIN RESERVATION R ON r.CUST_NUM = EX.CUST_NUM
  JOIN CUSTOM C ON C.CUST_NUM = EX.CUST_NUM
  LEFT JOIN EMPLOYEE EM ON EM.EMP_NUM = C.MY_COUNSELOR
 WHERE R.RESERVE_FLAG = 'O'              -- 수술
   AND R.RESERVE_STATE <> 'c'            -- 취소 제외
   AND NOT R.RESERVE_JINRYO IN ('4','7') -- 백내장(4), 검사OP(Re)(7) 제외
 GROUP BY EX.EXAM_DATE, EX.CUST_NUM, em.EMP_NAME
```

**핵심 조건**:
- `RESERVE_FLAG = 'O'` (수술)
- `RESERVE_STATE <> 'C'` (취소 제외)
- `RESERVE_JINRYO NOT IN ('4', '7')` — 백내장수술(4), 검사OP(Re)(7) 제외
- EXAM 테이블 JOIN → "검사자 중" 수술 예약한 사람

**단순화 가능 여부**: 대시보드 통계 목적이면 EXAM JOIN 없이 `RESERVATION` 단독 집계도 가능하나, 운영팀 정의가 "검사자 중 수술을 예약한 사람"이므로 EXAM JOIN이 정확한 지표.

### 2. 외래 예약수 — "외래를 예약한 사람"

**기존 활용 경로**: CRM > 통계A > 예약현황 > 진료명 외래로 변경 후 날짜 선택 > 검색

**관련 SQL** (`softcrm/routes/outpatient-counseling.js` 99, 134행):
```sql
-- 외래 진료현황
CASE WHEN r.RESERVE_JINRYO = '2' THEN N'일반외래' END
...
WHERE r.RESERVE_FLAG = 'F'               -- 외래
  AND r.RESERVE_STATE <> 'C'             -- 취소 제외
```

**또는** (`softcrm/docs/db/sql-reference/외래_진료현황.sql` 36행):
```sql
-- RESERVE_FLAG = 'F' (외래진료)
WHERE b.RESERVE_FLAG = 'F'
```

**핵심 조건**:
- `RESERVE_FLAG = 'F'` (외래)
- 기획서에 "취소+부도 포함"이라고 명시 → `RESERVE_STATE` 필터 없이 전체 카운트
- RESERVE_JINRYO = '2'는 "일반외래" 세부구분이며, 외래 전체는 `RESERVE_FLAG = 'F'`로 집계

**주의**: 기획서 "취소+부도 포함"과 레거시 SQL `RESERVE_STATE <> 'C'`(취소 제외)가 상충. 운영팀 확인 필요.

### 3. 드림렌즈 예약수 — "드림렌즈를 예약한 사람"

**기존 활용 경로**: CRM > 통계A > 예약자리스트 > 진료명 렌즈센터로 변경 후 날짜 선택 > 검색

**관련 SQL** (`softcrm/routes/dreamlens-chart-print.js` 20, 95~100행):
```sql
-- RESERVE_FLAG = 'D', RESERVE_STATE <> 'C'
WHERE rh.RESERVE_FLAG = 'D' AND rh.READER_CD IN ('000')
  AND r.RESERVE_FLAG = 'D'
  AND r.RESERVE_STATE <> 'C'
```

**관련 SQL** (`softcrm/routes/stats-lens-response.js` 28~50행):
```sql
-- 렌즈센터 직원별 응대 통계
SELECT ...
  SUM(CASE WHEN Z.RESERVE_JINRYO = '7' THEN 1 ELSE 0 END) AS dl_new,     -- D/L 신규
  SUM(CASE WHEN Z.RESERVE_JINRYO = '2' THEN 1 ELSE 0 END) AS dl_fu,      -- D/L FU
  ...
FROM RESERVATION R
WHERE R.RESERVE_FLAG = 'D'
  AND R.RESERVE_STATE <> 'C'
  AND R.RESERVE_JINRYO IN ('2','4','5','6','7','8')
```

**핵심 조건**:
- `RESERVE_FLAG = 'D'` (드림렌즈/상담)
- `RESERVE_STATE <> 'C'` (취소 제외)
- RESERVE_JINRYO 세부구분: '8'=D/L, '9'=D/L FU, '7'=검사OP(Re) 등 (렌즈센터 내 세부)

### 4. 예약 건수 월별현황 — 기존 CRM 화면 참고

**파일**: `softcrm/views/pages/reservation-monthly.ejs`

기존 CRM의 "예약건수 월별현황" 화면은 4가지 유형으로 분류:

| 유형 | RESERVE_FLAG | 비고 |
| --- | --- | --- |
| 검사 | `M` | |
| 수술 | `O` | |
| 외래 | `F` 또는 `Z` | Z=백내장외래 포함 |
| 기타 | 나머지 전부 | D, E, G, H 등 |

각 유형별로 4가지 지표 집계:
- 예약수: 전체 건수
- 비예약수: 예약 없이 내원한 건수
- 내원수: `RESERVE_STATE IN ('I', 'H')` 건수
- 취소수: `RESERVE_STATE = 'C'` 건수

**프로시저 NetReserveCnt** (`softcrm/docs/db/analysis/reservation-panel.md` 97~101행):
```sql
-- 당일 전체 예약 통계 (FLAG별, STATE별 집계)
SELECT COUNT(*) AS CNT, RESERVE_FLAG, RESERVE_STATE, TODAY_FLAG
FROM RESERVATION
WHERE RESERVE_DATE = @ReserveDT
  AND CUST_NUM <> '8888888888888'       -- 테스트 고객 제외
GROUP BY RESERVE_FLAG, RESERVE_STATE, TODAY_FLAG
```

---

## MSSQL 코드 테이블 전체 매핑 (softcrm 기준 확정)

### RESERVE_FLAG (예약종류)

| 코드 | 한글명 | 영문 Key | 비고 |
| --- | --- | --- | --- |
| F | 외래 | outpatient | |
| M | 검사 | exam | |
| O | 수술 | surgery | |
| D | 상담(드림렌즈) | dreamlens | 렌즈센터 |
| E | 검진(OPFU) | checkup | |
| G | 안경 | glasses | |
| H | 백내장검사 | cataract_exam | |
| Z | 백내장외래 | cataract_out | |

> 출처: `softcrm/js/customer-data.js` 10~19행

### RESERVE_STATE (예약상태)

| 코드 | 한글명 | 비고 |
| --- | --- | --- |
| Y | 예약 | 예약 등록 상태 |
| I | 접수/내원 | 실제 방문 |
| H | 수납/완료 | 귀가/완료 |
| C | 취소 | |

> 출처: `softcrm/js/customer-data.js` 20~25행

### RESERVE_JINRYO (진료구분) — 주요 값

| 코드 | 한글명 | 비고 |
| --- | --- | --- |
| '' | 검사 | 기본값 |
| 1 | 망막치료 | |
| 2 | 재검사/일반외래 | FLAG=F일 때 "일반외래" |
| 3 | 홍채절재술 | |
| 4 | DNA검사/백내장수술 | FLAG=O+JINRYO=4 → 백내장수술 |
| 5 | 검사OP | |
| 7 | 검사OP(Re) | FLAG=O에서 제외 대상 |
| 8 | D/L (드림렌즈) | |
| 9 | D/L FU | |
| 10,11,17 | 노안검사/FU | |
| 18 | 백내장 | |

> 출처: `softcrm/routes/stats-b-counsel-examiner.js` 17~24행

---

## 프론트 화면이 필요한 데이터

### 세부 지표별 SQL 조건 (확정)

| 세부 지표 | 테이블 | SQL 조건 | 근거 |
| --- | --- | --- | --- |
| 수술 예약수 | RESERVATION (+ EXAM JOIN) | `RESERVE_FLAG = 'O' AND RESERVE_STATE <> 'C' AND RESERVE_JINRYO NOT IN ('4','7')` | 통계_상담사.sql 'B' 예약수 |
| 외래 예약수 | RESERVATION | `RESERVE_FLAG = 'F'` (취소 포함 여부 확인 필요) | 외래_진료현황.sql, 기획서 "취소+부도 포함" |
| 드림렌즈 예약수 | RESERVATION | `RESERVE_FLAG = 'D' AND RESERVE_STATE <> 'C'` | dreamlens-chart-print.js |

### 확인 필요 사항

1. **수술 예약수** — "검사자 중 수술을 예약한 사람"이면 EXAM 테이블 JOIN 필요. 단순 RESERVATION만 카운트할지, EXAM JOIN할지 운영팀 확인
2. **외래 예약수** — 기획서는 "취소+부도 포함"이나 레거시 SQL은 `RESERVE_STATE <> 'C'`(취소 제외). 어느 쪽이 맞는지 확인
3. **백내장외래(Z)** — 외래 예약수에 `RESERVE_FLAG = 'Z'`(백내장외래)를 포함할지 여부

---

## 요구하는 API 응답 형태

### `GET /api/stats/reservation/monthly?year=2026&months=3,4`

월별 유형별 예약 건수를 반환합니다. 프론트에서 최대 4개 월을 비교합니다.

```json
{
  "success": true,
  "data": [
    {
      "year": 2026,
      "month": 3,
      "surgery": 55,
      "outpatient": 360,
      "dreamlens": 42,
      "total": 457
    },
    {
      "year": 2026,
      "month": 4,
      "surgery": 65,
      "outpatient": 384,
      "dreamlens": 48,
      "total": 497
    }
  ]
}
```

### 필드 정의

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| year | int | 연도 |
| month | int | 월 (1~12) |
| surgery | int | 수술 예약수 (검사자 중 수술 예약한 수) |
| outpatient | int | 외래 예약수 (취소+부도 포함) |
| dreamlens | int | 드림렌즈 예약수 |
| total | int | surgery + outpatient + dreamlens |

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| year | int | O | 조회 연도 (여러 연도 시 콤마 구분: `year=2025,2026`) |
| months | string | X | 조회 월 (콤마 구분: `months=3,4`). 생략 시 해당 연도 전체(1~12월) |

### 사용 예시

```
# 2026년 3월 vs 4월 비교
GET /api/stats/reservation/monthly?year=2026&months=3,4

# 2025년 vs 2026년 연간 비교
GET /api/stats/reservation/monthly?year=2025,2026

# 2026년 3월 vs 2025년 3월 (전년 동월)
GET /api/stats/reservation/monthly?year=2025,2026&months=3
```

---

## 백엔드 SQL 초안

### Option A: RESERVATION 단독 집계 (단순)

```sql
SELECT
    YEAR(r.RESERVE_DATE)  AS yr,
    MONTH(r.RESERVE_DATE) AS mo,
    SUM(CASE WHEN r.RESERVE_FLAG = 'O'
              AND r.RESERVE_STATE <> 'C'
              AND r.RESERVE_JINRYO NOT IN ('4','7')
         THEN 1 ELSE 0 END) AS surgery,
    SUM(CASE WHEN r.RESERVE_FLAG = 'F'
         THEN 1 ELSE 0 END) AS outpatient,        -- 취소 포함 (기획서 기준)
    SUM(CASE WHEN r.RESERVE_FLAG = 'D'
              AND r.RESERVE_STATE <> 'C'
         THEN 1 ELSE 0 END) AS dreamlens
FROM RESERVATION r
WHERE r.RESERVE_DATE >= :from
  AND r.RESERVE_DATE <= :to
  AND r.CUST_NUM <> '8888888888888'                -- 테스트 고객 제외
GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
ORDER BY yr, mo
```

### Option B: EXAM JOIN 포함 (운영팀 정의 "검사자 중")

```sql
SELECT
    YEAR(r.RESERVE_DATE)  AS yr,
    MONTH(r.RESERVE_DATE) AS mo,
    -- 수술: 검사자 중 수술 예약한 사람 (EXAM JOIN)
    COUNT(DISTINCT CASE
        WHEN r.RESERVE_FLAG = 'O'
         AND r.RESERVE_STATE <> 'C'
         AND r.RESERVE_JINRYO NOT IN ('4','7')
         AND ex.CUST_NUM IS NOT NULL
        THEN r.CUST_NUM END) AS surgery,
    -- 외래: 취소+부도 포함
    SUM(CASE WHEN r.RESERVE_FLAG = 'F'
         THEN 1 ELSE 0 END) AS outpatient,
    -- 드림렌즈: 취소 제외
    SUM(CASE WHEN r.RESERVE_FLAG = 'D'
              AND r.RESERVE_STATE <> 'C'
         THEN 1 ELSE 0 END) AS dreamlens
FROM RESERVATION r
LEFT JOIN EXAM ex ON ex.CUST_NUM = r.CUST_NUM
                  AND ex.EXAM_DATE <= r.RESERVE_DATE
WHERE r.RESERVE_DATE >= :from
  AND r.RESERVE_DATE <= :to
  AND r.CUST_NUM <> '8888888888888'
GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
ORDER BY yr, mo
```

> **권장**: 1차 구현은 Option A(단순)로 시작. 운영팀 피드백 후 EXAM JOIN 추가 검토.

---

## 프론트 화면 구성

```
┌──────────────────────────────────────────────────────────┐
│ [월별|연도별]  [2026.3] [2026.4] [+ 추가]       [조회]   │
├──────────────────────────────────────────────────────────┤
│ KPI 카드 4장: 전체 예약 | 수술 예약 | 외래 예약 | 드림렌즈  │
│ (기준값 + 비교값 + 증감률)                                │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐                 │
│ │ 유형별 비교       │ │ 건수 + 증감률    │                 │
│ │ (Grouped Bar)    │ │ (Composed)      │                 │
│ └─────────────────┘ └─────────────────┘                 │
└──────────────────────────────────────────────────────────┘
```

---

## 기존 API와의 관계

| 엔드포인트 | 용도 | 상태 |
| --- | --- | --- |
| `GET /api/stats/reservation` (기존) | 날짜 범위 기반 예약 현황 요약 (총예약/검사/취소/워크인/일별추이/채널/시간대) | 유지 — 대시보드 또는 별도 상세 화면에서 활용 가능 |
| `GET /api/stats/reservation/monthly` (신규) | 월별 유형별 예약 건수 비교 | **신규 구현 필요** |

기존 API는 삭제하지 않습니다. 대시보드 KPI나 향후 예약 상세 화면에서 활용할 수 있습니다.

---

## 절대 규칙 (기존과 동일)

- MSSQL SELECT만 — INSERT/UPDATE/DELETE 금지
- `@Transactional(readOnly = true)` 강제
- HikariCP `read-only=true`, `maximum-pool-size=3`
- `@Profile("mssql")`로 프로파일 분리
- JWT 인증 필수 (`/api/stats/**` permitAll 금지)
- SQL 파라미터 바인딩 필수 (문자열 결합 금지)
- MSSQL 2014 호환 (STRING_AGG, TRIM 등 사용 금지)
- `ApiResponse<T>` 래퍼로 응답 감싸기
- `./gradlew.bat compileJava` 통과 필수

---

## 참고 파일

### java-dashboard (이 프로젝트)
- 프론트 페이지: `frontend/src/pages/ReservationPage.tsx`
- 프론트 필터 훅: `frontend/src/components/filters/useFilterBar.ts`
- 프론트 API 클라이언트: `frontend/src/api/stats.ts`
- 기존 백엔드 컨트롤러: `backend/src/.../controller/stats/ReservationStatsController.java`
- 기존 백엔드 레포지토리: `backend/src/.../repository/stats/ReservationStatsRepository.java`

### softcrm (레거시 CRM) — SQL 근거
- 통계A 직원통계 라우트: `softcrm/routes/stats-a-staff.js` (피벗 쿼리 빌더)
- 상담 검사자 라우트: `softcrm/routes/stats-b-counsel-examiner.js` (JINRYO 코드맵)
- 외래 진료현황 SQL: `softcrm/docs/db/sql-reference/외래_진료현황.sql`
- 외래 상담 SQL: `softcrm/docs/db/sql-reference/외래_상담.sql`
- 통계 상담사 SQL: `softcrm/docs/db/sql-reference/통계_상담사.sql` (수술 예약수 핵심)
- 드림렌즈 차트: `softcrm/routes/dreamlens-chart-print.js`
- 렌즈센터 응대통계: `softcrm/routes/stats-lens-response.js`
- RESERVE_FLAG/STATE 상수: `softcrm/js/customer-data.js`
- 예약률 프로시저: `softcrm/docs/db/analysis/reservation-panel.md` (NetReserveCnt)
- 예약건수 월별현황 화면: `softcrm/views/pages/reservation-monthly.ejs`
