# Menu, Route, and API Draft

## Purpose

This document is the contract draft for frontend-backend parallel development.
It covers menu structure, route mapping, API shape, and data source details.

---

## Data Source

### Dual DataSource Architecture

```
H2 DataSource (default)   → JPA EntityManager → users table (auth)
MSSQL DataSource (mssql)  → JdbcTemplate      → RESERVATION, ExamCount, etc. (stats, READ ONLY)
```

- **Default boot**: H2 in-memory (no MSSQL required)
- **Stats queries**: Activated only with `--spring.profiles.active=mssql`
- **MSSQL**: `220.85.109.247:1433 / SOFTCRM` (MSSQL 2014)

### Absolute Rules

- MSSQL SELECT only — INSERT/UPDATE/DELETE strictly prohibited
- `@Transactional(readOnly = true)` enforced on all stats services
- HikariCP `read-only=true`, `maximum-pool-size=3`
- MSSQL 2014 compatibility — no `STRING_AGG`, `TRIM`, modern functions

### Key Code Tables

| Column | Meaning | Values |
| --- | --- | --- |
| RESERVE_FLAG | Reservation type | F=exam, O=surgery, H=cataract exam, D=dreamlens, Z=cancel |
| RESERVE_JINRYO | Treatment category | 1=refractive, 2=outpatient, 4=cataract, 7/26=dreamlens |
| RESERVE_STATE | Reservation state | C=cancelled |
| RESERVE_PATH | Intake channel | phone/naver/kakao/walkIn/referral |

Reference: `MEDICAL_SUB_CFG` table (`SUB_FLAG` ↔ `SUB_NAME`)

---

## Menu Structure

### Home

- Label: `HOME`
- Route: `/`

### Intake (검사&예약)

- Children:
  - `유입(검사예약)` → `/stats/intake-conversion`
  - `예약 건수` → `/stats/reservation`
  - `검사 건수` → `/stats/examination`

### Consultation (상담 건수)

- Children:
  - `상담 전환율` → `/stats/consultation-rate`

### Surgery (수술)

- Children:
  - `수술 건수` → `/stats/surgery`
  - `주요 수술별 비중` → `/stats/surgery-ratio`

### Marketing (마케팅)

- Children:
  - `해외 환자 관련 지표` → `/stats/overseas`
  - `마케팅 유입 및 효율 지표` → `/stats/marketing`

### Cancel & No-show (취소&부도)

- Children:
  - `예약취소율` → `/stats/cancel-rate`
  - `부도율` → `/stats/no-show-rate`

### Standalone

- `객단가` → `/stats/unit-price`

### Etc (기타)

- Children: 드림렌즈 매출, B2B 매출, 직원 포인트, PRP 시술율, 재수술율, 당일OP 비율, 지정의 수술 비율, 내원동기별 비중, 일일 접수/응대 건수

---

## Response Format

### Success (`ApiResponse<T>`)

```json
{
  "success": true,
  "data": { ... }
}
```

### Error (`ErrorResponse`)

```json
{
  "success": false,
  "status": 401,
  "message": "인증이 필요합니다.",
  "errors": { "field": "message" },
  "timestamp": "2026-04-11T12:00:00.000Z"
}
```

- All endpoints use `ApiResponse<T>` or `ErrorResponse`.
- `errors` field appears only on validation failures (400).
- JWT auth required on all `/api/stats/**` endpoints.

---

## Auth Endpoints

### POST `/api/auth/login`

Request:

```json
{
  "loginId": "admin",
  "password": "1234"
}
```

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "loginId": "admin",
      "email": "admin@bviit.com",
      "name": "관리자"
    }
  }
}
```

- Default local seed account was removed; local credentials now come from `APP_SEED_ADMIN_LOGIN_ID` / `APP_SEED_ADMIN_PASSWORD`.
- Frontend `authApi.login()` unwraps `res.data` internally.

---

## Stats API — Phase 1: Reservation

### GET `/api/stats/reservation?from=YYYY-MM-DD&to=YYYY-MM-DD`

Parameters: `from` (required), `to` (required). Date format: `LocalDate` (ISO).

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

Data source mapping:

| Field | Table | Condition |
| --- | --- | --- |
| totalReservations | RESERVATION | `RESERVE_STATE <> 'C'` |
| completedExaminations | RESERVATION | `RESERVE_FLAG = 'F'` |
| cancellations | RESERVATION | `RESERVE_STATE = 'C'` |
| walkInReservations | RESERVATION | `TODAY_FLAG = 'Y'` (confirm) |
| sourceBreakdown | RESERVATION | Group by `RESERVE_PATH` |

### Verified actuals (2026-03)

| Metric | Count |
| --- | --- |
| Reservations | 14,153 |
| Exam completed | 6,768 |
| Cancelled | 1,546 |
| Refractive exam | 866 persons / 3,749 cases |
| Cataract exam | 127 persons / 128 cases |
| Dreamlens | 838 |
| Outpatient visit | 910 persons / 955 cases |

---

## Stats API — Phase 2: Examination

### GET `/api/stats/examination?from=YYYY-MM-DD&to=YYYY-MM-DD`

4 categories: refractive / cataract / dreamlens / outpatient.

Data source mapping:

| Category | Table | Key condition |
| --- | --- | --- |
| Refractive exam | ExamCount | `Exam_Date` range |
| Cataract exam | Cataract_Exam | `Cancel_CD` is empty |
| Dreamlens | RESERVATION | `RESERVE_FLAG = 'D'` |
| Outpatient | RESERVATION | `RESERVE_JINRYO = '2'` |

---

## Backend Structure

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
    └── ReservationStatsResponse.java   ← matches frontend Zod schema
```

### Dependencies (build.gradle)

```groovy
runtimeOnly 'com.microsoft.sqlserver:mssql-jdbc:12.8.1.jre11'
implementation 'org.springframework.boot:spring-boot-starter-jdbc'
```

### Profile: `application-mssql.properties`

```properties
spring.datasource.mssql.url=jdbc:sqlserver://220.85.109.247:1433;databaseName=SOFTCRM;encrypt=false
spring.datasource.mssql.username=...
spring.datasource.mssql.password=...
spring.datasource.mssql.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver
spring.datasource.mssql.hikari.maximum-pool-size=3
spring.datasource.mssql.hikari.read-only=true
```

---

## Shared Stats Query Params

| Param | Type | Description |
| --- | --- | --- |
| from | LocalDate | Start date (required) |
| to | LocalDate | End date (required) |
| groupBy | String | day / week / month (optional) |
| doctorId | Long | Filter by doctor (optional) |
| channel | String | Filter by intake channel (optional) |

---

## Route List

| Route | Page | Status |
| --- | --- | --- |
| `/` | DashboardPage | implemented |
| `/login` | LoginPage | implemented |
| `/stats/intake-conversion` | IntakeConversionPage | implemented (mock) |
| `/stats/reservation` | ReservationPage | implemented (mock) |
| `/stats/examination` | ExaminationPage | implemented (mock) |
| `/stats/consultation-rate` | ConsultationRatePage | implemented (mock) |
| `/stats/surgery` | SurgeryPage | implemented (mock) |
| `/stats/surgery-ratio` | SurgeryRatioPage | implemented (mock) |
| `/stats/overseas` | OverseasPage | implemented (mock) |
| `/stats/marketing` | MarketingPage | implemented (mock) |
| `/stats/cancel-rate` | CancelRatePage | implemented (mock) |
| `/stats/no-show-rate` | NoShowRatePage | implemented (mock) |
| `/stats/unit-price` | UnitPricePage | implemented (mock) |

---

## Frontend Rules

- One route page owns one primary API family.
- Mock data should move to MSW handlers once API is ready.
- Chart labels can be Korean, data keys stay English.
- API client (`api/client.ts`) auto-injects JWT Bearer token.
- `authApi.login()` unwraps `ApiResponse.data` internally.

---

## Deferred Decisions

- Token refresh / httpOnly cookie migration
- Role-based authorization
- Doctor and channel master data source
- Real-time WebSocket updates
- Timezone normalization (MSSQL server vs Spring server)
