# 비앤빛 KPI 대시보드 기획서

> **비앤빛(B&VIIT) Analytics 대시보드** — 안과 KPI 대시보드 & 데이터 시각화 플랫폼
> **작성 기준일**: 2026-06-08 · **최종 갱신**: 2026-06-10 (검사 지표 정의 확정) · **상태**: 개발 진행 중 (통계 API 5종 연결 완료, 나머지 설계)

---

## 1. 개요

### 1.1 목적

안과(B&VIIT) 병원 운영의 핵심 지표(KPI)를 한 화면에서 확인하고, 현장의 수기·엑셀 집계를 시스템 통계로 대체하기 위한 대시보드 플랫폼.

### 1.2 기술 스택

- **백엔드**: Java 21 / Spring Boot 3.5 / Gradle
- **프론트**: React 19 / TypeScript / Vite 8
- **UI**: Tailwind CSS 4 + shadcn/ui (base-nova) + Recharts
- **상태관리**: Zustand(인증) + TanStack Query(서버 상태)
- **라우팅**: TanStack Router (인증 가드 포함)
- **폼**: react-hook-form + Zod
- **인증**: Spring Security + JWT (HMAC-SHA256)
- **DB**: H2(인증) / MSSQL(통계, READ ONLY)
- **모킹**: MSW (개발 환경 API 목업)

---

## 2. 데이터 소스 아키텍처

> ⚠️ **MSSQL 절대 규칙**
> - SELECT only — INSERT/UPDATE/DELETE 엄격 금지
> - 모든 통계 서비스 `@Transactional(readOnly = true)`
> - HikariCP `read-only=true`, `maximum-pool-size=3`
> - MSSQL 2014 호환 — `STRING_AGG`, `TRIM` 등 최신 함수 사용 불가

```
H2 DataSource (default)   → JPA EntityManager → users (인증)
MSSQL DataSource (mssql)  → JdbcTemplate      → RESERVATION, ExamCount 등 (통계, READ ONLY)
```

- **기본 부팅**: H2 인메모리 (MSSQL 불필요)
- **통계 쿼리**: `--spring.profiles.active=mssql` 일 때만 활성
- **MSSQL**: `220.85.109.247:1433 / SOFTCRM` (MSSQL 2014) — EyeChartPro와 공유하는 동일 DB

### 2.1 주요 코드 테이블

| 컬럼 | 의미 | 값 (실DB `MEDICAL_TIME_CFG` 확인, 2026-06-10) |
| --- | --- | --- |
| `RESERVE_FLAG` | 진료유형 | **M=검사(시력교정)**, H=백내장검사, D=렌즈센터, O=수술, F=외래, Z=백내장외래, E=OP.F/U, X=외국검사 |
| `RESERVE_JINRYO` | 진료 세부유형 | **flag별로 의미가 다름** (`MEDICAL_SUB_CFG`의 `RESERVE_FLAG`+`SUB_FLAG` 복합키). 예: M에서 `''`=검사·`2`=재검사·`4`=DNA검사·`5`=검사OP / D에서 `2`=D/L_FU·`7`=D/L_신규 |
| `RESERVE_STATE` | 예약 상태 | Y=예약, I=접수(내원), H=퇴원, C=취소 — 검사 예약은 사실상 `I`에서 멈춤(H≈0) |
| `RESERVE_PATH` | 유입 채널 | phone/naver/kakao/walkIn/referral |

> ⚠️ 과거 버전에 `F=검사` 로 잘못 기재돼 있었음 — `F`는 **외래**, 검사는 **`M`**. 코드/쿼리 작성 시 [../db/지표정의.md](../db/지표정의.md) 기준 사용.

---

## 3. 메뉴 구조 & 구현 상태

**구현 상태 범례** — 🟢 complete: 백엔드 API + 프론트 연결 완료 · 🟠 backend-only: 백엔드만 완료(프론트 placeholder) · 🔴 pending: 미착수(또는 목업 UI만)

사이드바는 9개 섹션(예약 · 검사 · 상담 건수 · 수술 · 마케팅 · 취소&부도 · 객단가 · 기타 + HOME)으로 구성되며, 각 메뉴는 `statsPages.ts`의 페이지 정의와 `navigation.ts`의 상태 맵에 따라 표시한다.

> 2026-06-10: 기존 "검사&예약" 섹션을 **예약**(유입·예약 건수)과 **검사**(검사 건수 + 카테고리별 4종)로 분리.

## 4. 화면(페이지) 목록

| 섹션 | 화면 | 라우트 | 설명 | 상태 |
| --- | --- | --- | --- | --- |
| 공통 | 로그인 | `/login` | JWT 로그인 (admin/1234 시드) | 🟢 |
| HOME | 메인 대시보드 | `/` | KPI 카드 4개 + 차트 5개 종합 개요 | 🟢 목업 |
| 예약 | 유입(검사예약) | `/stats/intake-conversion` | 인콜·아웃콜·카카오톡·네이버·홈페이지 채널별 검사예약 전환 | 🔴 |
| 예약 | 예약 건수 | `/stats/reservation` | 예약 유입 규모와 일자별 변화 추이 | 🟢 |
| 검사 | 검사 건수 (대메뉴) | `/stats/examination` | 시력교정(사람)·백내장(눈)·드림렌즈(사람) + 외래(참고) 종합 — 확정 정의 반영(§6.2) | 🟢 |
| 검사 | 시력교정 검사건수 | `/stats/examination/vision` | EXAM 행수 기준(사람), 드림렌즈 제외 — 전용 화면 | 🟠 |
| 검사 | 백내장 검사건수 | `/stats/examination/cataract` | Cataract_Exam 좌/우 눈 단위 — 전용 화면 | 🟠 |
| 검사 | 드림렌즈 검사건수 | `/stats/examination/dreamlens` | 렌즈센터(사람), 정기검진 FU 제외 — 전용 화면 | 🟠 |
| 검사 | 외래 검사건수 | `/stats/examination/outpatient` | RESERVATION 외래(F) 내원 행 — 전용 화면 | 🟠 |
| 상담 건수 | 상담 전환율 | `/stats/consultation-rate` | 시력교정 상담/수술 전환율, 백내장 수술 전환율 | 🟢 |
| 수술 | 수술 건수 | `/stats/surgery` | 수술 건수 총량과 기간별 비교 | 🟢 |
| 수술 | 주요 수술별 비중 | `/stats/surgery-ratio` | 주요 수술 종류별 비중과 분포 | 🟢 |
| 마케팅 | 해외 환자 관련 지표 | `/stats/overseas` | 해외 환자 유입·상담·수술 핵심 지표 | 🔴 |
| 마케팅 | 마케팅 유입 및 효율 | `/stats/marketing` | 채널별 유입과 효율 비교 | 🔴 |
| 취소&부도 | 예약취소율 | `/stats/cancel-rate` | 예약 취소 비율과 취소 패턴 | 🔴 |
| 취소&부도 | 부도율 | `/stats/no-show-rate` | 노쇼 발생 비율과 구간별 패턴 | 🔴 |
| 객단가 | 객단가 | `/stats/unit-price` | 환자당 평균 매출과 기간별 흐름 | 🔴 |
| 기타 | 드림렌즈 매출 | `/stats/dreamlens-revenue` | 드림렌즈 매출 추이/비교 | 🔴 |
| 기타 | B2B 매출 | `/stats/b2b-revenue` | B2B 채널 매출·거래처별 실적 | 🔴 |
| 기타 | 직원 포인트 | `/stats/staff-point` | 직원별 포인트 현황/추이 | 🔴 |
| 기타 | PRP 시술율 | `/stats/prp-rate` | PRP 시술 비율/변화 | 🔴 |
| 기타 | 재수술율 | `/stats/reoperation-rate` | 재수술 비율·유형별 패턴 | 🔴 |
| 기타 | 당일OP 비율 | `/stats/same-day-op` | 당일 수술 비율/변화 | 🔴 |
| 기타 | 지정의 수술 비율 | `/stats/designated-doctor` | 지정의 수술 비율·의사별 현황 | 🔴 |
| 기타 | 내원동기별 비중 | `/stats/visit-reason` | 내원동기(소개·광고·검색)별 비중/추이 | 🔴 |
| 기타 | 일일 접수/응대 건수 | `/stats/daily-reception` | 일일 접수·응대 건수와 시간대별 분포 | 🔴 |

---

## 5. 인증 & 응답 포맷

### 5.1 로그인

`POST /api/auth/login` — Request: `{ loginId, password }`

- 응답: `{ success, data: { token, user: { id, loginId, email, name } } }`
- 로컬 시드 계정은 `APP_SEED_ADMIN_LOGIN_ID` / `APP_SEED_ADMIN_PASSWORD` 환경변수로 지정
- 프론트 `authApi.login()` 이 `ApiResponse.data` 를 내부에서 언랩

### 5.2 응답 포맷

- 모든 엔드포인트는 `ApiResponse<T>` 또는 `ErrorResponse` 사용
- `errors` 필드는 validation 실패(400)에만 포함
- `/api/stats/**` 는 JWT 필수

```json
// 성공 (ApiResponse<T>)
{ "success": true, "data": {} }

// 에러 (ErrorResponse)
{
  "success": false,
  "status": 401,
  "message": "인증이 필요합니다.",
  "errors": { "field": "message" },
  "timestamp": "2026-04-11T12:00:00.000Z"
}
```

### 5.3 공통 통계 쿼리 파라미터

| 파라미터 | 타입 | 설명 |
| --- | --- | --- |
| from | LocalDate | 시작일 (필수) |
| to | LocalDate | 종료일 (필수) |
| groupBy | String | day / week / month (선택) |
| doctorId | Long | 의사 필터 (선택) |
| channel | String | 유입 채널 필터 (선택) |

---

## 6. 통계 API 설계

### 6.1 Phase 1 — 예약 통계

`GET /api/stats/reservation?from=YYYY-MM-DD&to=YYYY-MM-DD`

**데이터 소스 매핑**

| 필드 | 테이블 | 조건 |
| --- | --- | --- |
| totalReservations | RESERVATION | `RESERVE_STATE <> 'C'` |
| completedExaminations | RESERVATION | `RESERVE_FLAG = 'F'` |
| cancellations | RESERVATION | `RESERVE_STATE = 'C'` |
| walkInReservations | RESERVATION | `TODAY_FLAG = 'Y'` (확인 필요) |
| sourceBreakdown | RESERVATION | `RESERVE_PATH` 그룹핑 |

**실측치 (2026-03)**

| 지표 | 건수 |
| --- | --- |
| 예약 | 14,153 |
| 검사 완료 | 6,768 |
| 취소 | 1,546 |
| 시력교정 검사 | **850명** (EXAM 실측, 드림렌즈 제외 — §6.2 확정 정의) |
| 백내장 검사 | **254눈** / 128세션 (Cataract_Exam) |
| 드림렌즈 검사 | **45명** (렌즈센터, FU 제외) |
| 외래 내원 | 910명 / 955건 |

<details>
<summary>응답 구조 예시 (JSON)</summary>

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReservations": 14153,
      "reservationChangeRate": 12.6,
      "completedExaminations": 6768,
      "examinationConversionRate": 47.8,
      "cancellations": 1546,
      "cancellationRate": 10.9,
      "walkInReservations": 2406,
      "walkInShareRate": 17.0
    },
    "dailyTrend": [
      { "date": "2026-03-01", "reservations": 450, "examinations": 215, "cancellations": 52 }
    ],
    "sourceBreakdown": [
      { "source": "phone", "label": "전화", "count": 4104 },
      { "source": "naver", "label": "네이버", "count": 4670 }
    ],
    "hourlyDistribution": [
      { "slot": "09:00", "count": 18 }
    ]
  }
}
```

</details>

### 6.2 Phase 2 — 검사 통계 (✅ 지표 정의 확정, 2026-06-10)

`GET /api/stats/examination?from=YYYY-MM-DD&to=YYYY-MM-DD` — **검사 3종** (시력교정 / 백내장 / 드림렌즈). 외래는 검사 지표에서 제외.

**확정 정의** — 공식 기준: [../db/지표정의.md](../db/지표정의.md) §1

| 카테고리 | 소스 | 집계 단위 | 핵심 조건 |
| --- | --- | --- | --- |
| 시력교정 검사 | **`EXAM`** (검사결과) | **사람** | `EXAM_DATE` 범위, **행수 기준(측정값 무관)** + **드림렌즈 배제**(같은 날 렌즈센터 `D` 예약만 있고 검사 `M` 예약 없는 건) |
| 백내장 검사 | `Cataract_Exam` | **눈(좌/우 각각)** | 측정값 채워진 눈 합산(양안=2), `Stop_YN`/`Cancel_CD` 제외 |
| 드림렌즈 검사 | `RESERVATION` | **사람** | `RESERVE_FLAG='D'`(렌즈센터 전체) + `RESERVE_STATE IN ('I','H')` + 정기검진 FU(`2`,`4`,`11`) 제외 |

**검증 수치 (2026년)**

| 카테고리 | 02월 | 03월 | 04월 | 05월 |
| --- | ---: | ---: | ---: | ---: |
| 시력교정 (사람) | 1,601 | 855 | 810 | 901 |
| 백내장 (눈) | 200 | 254 | 214 | 256 |
| 드림렌즈 (사람) | 40 | 45 | 55 | 60 |

**병원 수기집계 대조 (시력교정)** — 정의값 vs 병원: 02월 1,601/1,604 · 03월 855/853 · 04월 810/807 → **잔차 ±3(≤0.4%)**. 행수 기준(측정값 무관) 채택으로 병원 검사자 리스트와 사실상 일치하며, 잔차는 EXAM 스냅샷 덮어쓰기·수기 노이즈 수준. 상세는 [../db/지표정의.md](../db/지표정의.md) §1.7.

> ✅ **코드 반영 완료** (2026-06-10): `ExaminationStatsRepository`가 본 확정 정의로 동작. 외래(`RESERVATION` flag `F`)는 UI 호환용 참고 카테고리로 유지, `total`은 단위 혼합 참고용 합산 (지표정의.md §1.8).

---

## 7. 백엔드 구조

```
backend/src/main/java/com/bviit/analytics/
├── config/
│   └── MssqlDataSourceConfig.java      ← MSSQL DataSource (profile: mssql)
├── controller/stats/
│   └── ReservationStatsController.java
├── service/stats/
│   └── ReservationStatsService.java    ← @Transactional(readOnly = true)
├── repository/stats/
│   └── ReservationStatsRepository.java ← NamedParameterJdbcTemplate
└── dto/stats/
    └── ReservationStatsResponse.java   ← 프론트 Zod 스키마와 일치
```

<details>
<summary>의존성 & 프로파일 설정</summary>

```groovy
// build.gradle
runtimeOnly 'com.microsoft.sqlserver:mssql-jdbc:12.8.1.jre11'
implementation 'org.springframework.boot:spring-boot-starter-jdbc'
```

```properties
# application-mssql.properties (자격증명은 파일에서 관리, 노출 금지)
spring.datasource.mssql.url=jdbc:sqlserver://220.85.109.247:1433;databaseName=SOFTCRM;encrypt=false
spring.datasource.mssql.username=<설정값>
spring.datasource.mssql.password=<설정값>
spring.datasource.mssql.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver
spring.datasource.mssql.hikari.maximum-pool-size=3
spring.datasource.mssql.hikari.read-only=true
```

</details>

---

## 8. 구현 현황 & 로드맵

- 🟢 **완료** (API + 프론트 연결): 메인 대시보드(목업), 예약 건수, 검사 건수, 상담 전환율, 수술 건수, 주요 수술별 비중 — 통계 API 5종
- 🔴 **미착수** (총 15종): 유입(검사예약), 해외 환자, 마케팅, 예약취소율, 부도율, 객단가, 기타 9종(드림렌즈 매출·B2B 매출·직원 포인트·PRP·재수술·당일OP·지정의·내원동기·일일접수)

### 8.1 신규 통계 API 추가 순서

1. Entity/DTO 정의 (`entity/`, `dto/request/`, `dto/response/`)
2. Repository 작성 (`repository/stats/`, NamedParameterJdbcTemplate)
3. Service 비즈니스 로직 (`service/stats/`, `@Transactional(readOnly = true)`)
4. Controller 엔드포인트 (`controller/stats/`)
5. 프론트 API 함수 + 페이지 연결 (목업은 MSW 핸들러로)

### 8.2 프론트 규칙

- 한 라우트 페이지는 하나의 주요 API 패밀리만 소유
- 목업 데이터는 API 준비 완료 시 MSW 핸들러로 이전
- 차트 라벨은 한국어, 데이터 키는 영어 유지
- API 클라이언트(`api/client.ts`)가 JWT Bearer 토큰 자동 주입

---

## 9. 보류된 결정 (Deferred)

- 토큰 갱신 / httpOnly 쿠키 마이그레이션
- 역할 기반 인가(RBAC)
- 의사·채널 마스터 데이터 소스
- 실시간 WebSocket 업데이트
- 타임존 정규화 (MSSQL 서버 vs Spring 서버)
