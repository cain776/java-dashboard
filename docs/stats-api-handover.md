# Stats API 구현 핸드오버

> 작성: 2026-04-11 | 작성자: Claude Opus
> 목적: 병렬 작업 에이전트(Codex, Gemini)가 나머지 통계 페이지를 구현하기 위한 인프라·DB·컨벤션 문서

---

## 프로젝트 위치

```
C:\workspace\java-dashboard\
├── backend\     ← Spring Boot 3.5 (Java 21)
├── frontend\    ← React 19 + TypeScript + Vite 8
└── CLAUDE.md    ← 프로젝트 코딩 표준
```

---

## 현재 완료

| API | 엔드포인트 | 용도 |
|-----|----------|------|
| 기간 기반 요약 | `GET /api/stats/reservation?from=&to=` | 일별 추이, 채널별, 시간대별 |
| 월별 유형별 | `GET /api/stats/reservation/monthly?years=2025,2026` | 수술/외래/드림렌즈 월별 (프론트 ReservationPage용) |
| 수술 건수 | `GET /api/stats/surgery/monthly?years=2025,2026` | 12개 수술 유형별 월별 건수 (프론트 SurgeryPage용) |
| 수술별 비중 | `GET /api/stats/surgery-ratio?years=2025,2026` | 수술 유형별 비중 (프론트 SurgeryRatioPage용, 동일 데이터) |

---

## 절대 규칙

1. **운영 DB SELECT만** — INSERT/UPDATE/DELETE 절대 금지
2. **H2 기본 부팅 깨지면 안 됨** — 모든 stats 빈에 `@Profile("mssql")` 필수
3. **`gradlew.bat test` 통과** 필수
4. **MSSQL 2014 호환** — `STRING_AGG`, `TRIM`, `FORMAT` 사용 금지
5. **JTDS 드라이버 주의** — `YEAR(RESERVE_DATE)` 같은 괄호 표현이 테이블 힌트로 오인됨 → 테이블 별칭 `r.` 사용
6. **ApiResponse 래퍼** — `ResponseEntity.ok(ApiResponse.ok(data))` 형태
7. **JWT 인증 필수** — permitAll 절대 금지
8. **민감정보 하드코딩 금지** — DB 접속정보는 환경변수로만

---

## 실행 방법

```bash
# H2 기본 (기존 로그인만)
cd backend && gradlew.bat bootRun

# MSSQL 통계 활성화
STATS_DB_URL="jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM" \
STATS_DB_USERNAME="sungmin" \
STATS_DB_PASSWORD="0691" \
gradlew.bat bootRun --args="--spring.profiles.active=mssql"
```

---

## 인프라 구조 (듀얼 DataSource)

```
H2 DataSource (@Primary)  → JPA EntityManager → User 테이블 (인증)
MSSQL DataSource (stats)   → JdbcTemplate      → RESERVATION, ExamCount 등 (통계)
```

- H2: `application.properties` (기본)
- MSSQL: `application-mssql.properties` (프로파일)
- HikariCP: `readOnly=true`, `maxPoolSize=3`, `connectionTestQuery=SELECT 1`

---

## 새 통계 API 추가 템플릿

### 1. DTO (`dto/stats/XxxItem.java`)

```java
package com.bviit.analytics.dto.stats;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class XxxItem {
    private final int year;
    private final int month;
    // 지표별 필드
    private final int total;
}
```

### 2. Repository (`repository/stats/XxxRepository.java`)

```java
package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("mssql")
public class XxxRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public XxxRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // SELECT 쿼리만 작성, 테이블 별칭 필수 (JTDS 호환)
}
```

### 3. Service (`service/stats/XxxService.java`)

```java
package com.bviit.analytics.service.stats;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class XxxService {
    private final XxxRepository repository;

    @Transactional(readOnly = true)
    public List<XxxItem> getStats(...) { ... }
}
```

### 4. Controller (`controller/stats/XxxController.java`)

```java
package com.bviit.analytics.controller.stats;

import com.bviit.analytics.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("mssql")
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class XxxController {
    private final XxxService service;

    @GetMapping("/xxx")
    public ResponseEntity<ApiResponse<List<XxxItem>>> getStats(...) {
        return ResponseEntity.ok(ApiResponse.ok(service.getStats(...)));
    }
}
```

---

## 운영 DB 테이블 맵

### 핵심 테이블

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| `RESERVATION` | 예약 마스터 | RESERVE_NUM, CUST_NUM, RESERVE_DATE, RESERVE_FLAG, RESERVE_JINRYO, RESERVE_STATE, RESERVE_PATH, TODAY_FLAG, START_TIME, SELECT_DOC |
| `ExamCount` | 시력교정 검사 상세 | CUST_NUM, Exam_Date, Exam_Time, 근시/난시/각막두께 등 |
| `Cataract_Exam` | 백내장 검사 | CUST_NUM, EXAM_DATE, Cancel_CD |
| `OPERATIONDATA` | 수술 데이터 | CUST_NUM, OP_DATE, 수술 코드 |
| `mh_OPERATION` | 수술 상세 (MCRM) | 수술 방법/장비 |
| `RE_OPERATION` | 재수술 | 재수술 이력 |
| `MOTIVE_NEW01` | 내원동기 1차 | 소개/광고/검색 등 |
| `MOTIVE_NEW02` | 내원동기 2차 | 상세 분류 |
| `DB_CUSTOM` | 고객 마스터 | CustNum, CUST_NAME, 국적 등 |
| `EMPLOYEE` | 직원 | EMP_NUM, EMP_NAME, POST, GRADE |
| `MEDICAL_SUB_CFG` | 진료구분 코드 | SUB_FLAG ↔ SUB_NAME |
| `POST_CFG` | 부서 코드 | POST_CD ↔ POST_NM |
| `OPERATION_CFG` | 수술 종류 코드 | 수술 코드 ↔ 수술명 |

### RESERVE_FLAG (예약 유형)

> 출처: `softcrm/js/customer-data.js` — MEDICAL_TIME_CFG 테이블 참조

| 코드 | 의미 | 영문 Key | 2026-03 건수 |
|------|------|----------|-------------|
| F | 외래 | outpatient | 6,768 |
| M | 검사 | exam | 3,225 |
| O | 수술 | surgery | 865 |
| D | 상담(드림렌즈) | dreamlens | 838 |
| E | 검진(OPFU) | checkup | - |
| G | 안경 | glasses | - |
| H | 백내장검사 | cataract_exam | 904 |
| Z | 백내장외래 | cataract_out | 1,546 |

### RESERVE_JINRYO (진료 구분)

| 코드 | 의미 |
|------|------|
| 1 | 시력교정 |
| 2 | 외래 |
| 4 | 백내장 |
| 7, 26 | 드림렌즈 |

상세 매핑: `MEDICAL_SUB_CFG` 테이블 참조

### RESERVE_PATH (유입 채널)

| 코드 | 의미 | 건수 |
|------|------|------|
| CRM | CRM 직접 | 10,548 |
| CTI | 전화 | 1,722 |
| APP | 앱 | 1,279 |
| ONLINE | 온라인 | 265 |
| NAVER | 네이버 | 199 |
| EMR | EMR | 121 |
| Kiosk | 키오스크 | 16 |
| KAKAO | 카카오 | 3 |

### RESERVE_STATE (예약 상태)

| 코드 | 의미 |
|------|------|
| C | 취소 |
| (그 외) | 유효 |

---

## 프론트 메뉴 ↔ API ↔ 상태

**범례:**
- 🟢 완료 — 백엔드 API + 프론트 페이지 모두 연결
- 🟠 백엔드만 — API는 완료, 프론트는 placeholder (프론트 연결 작업 필요)
- 🔴 **미착수** — 백엔드 API도 없음, 프론트도 placeholder

| 사이드바 | 페이지 | 라우트 | API | 프론트 파일 | 상태 |
|---------|--------|--------|-----|-----------|------|
| HOME | 대시보드 | `/` | - | `DashboardPage.tsx` | 🟠 목업 |
| 검사&예약 | 유입(검사예약) | `/stats/intake-conversion` | `/api/stats/intake-conversion` | placeholder | 🔴 **미구현** |
| | 예약 건수 | `/stats/reservation` | `/api/stats/reservation`, `/api/stats/reservation/monthly` | `ReservationPage.tsx` | 🟢 **완료** |
| | 검사 건수 | `/stats/examination` | `/api/stats/examination/monthly` | `ExaminationPage.tsx` | 🟢 **완료** |
| 상담 건수 | 상담 전환율 | `/stats/consultation-rate` | `/api/stats/consultation-rate` | `ConsultationRatePage.tsx` | 🟢 **완료** |
| 수술 | 수술 건수 | `/stats/surgery` | `/api/stats/surgery/monthly` | `SurgeryPage.tsx` | 🟢 **완료** |
| | 수술별 비중 | `/stats/surgery-ratio` | `/api/stats/surgery-ratio` | `SurgeryRatioPage.tsx` | 🟢 **완료** |
| 마케팅 | 해외 환자 | `/stats/overseas` | `/api/stats/overseas` | placeholder | 🔴 **미구현** |
| | 마케팅 유입 | `/stats/marketing` | `/api/stats/marketing` | placeholder | 🔴 **미구현** |
| 취소&부도 | 예약취소율 | `/stats/cancel-rate` | `/api/stats/cancel-rate` | placeholder | 🔴 **미구현** |
| | 부도율 | `/stats/no-show-rate` | `/api/stats/no-show-rate` | placeholder | 🔴 **미구현** |
| 객단가 | 객단가 | `/stats/unit-price` | `/api/stats/unit-price` | placeholder | 🔴 **미구현** |
| 기타 | 드림렌즈 매출 | `/stats/dreamlens-revenue` | `/api/stats/dreamlens-revenue` | placeholder | 🔴 **미구현** |
| | B2B 매출 | `/stats/b2b-revenue` | `/api/stats/b2b-revenue` | placeholder | 🔴 **미구현** |
| | 직원 포인트 | `/stats/staff-point` | `/api/stats/staff-point` | placeholder | 🔴 **미구현** |
| | PRP 시술율 | `/stats/prp-rate` | `/api/stats/prp-rate` | placeholder | 🔴 **미구현** |
| | 재수술율 | `/stats/reoperation-rate` | `/api/stats/reoperation-rate` | placeholder | 🔴 **미구현** |
| | 당일OP 비율 | `/stats/same-day-op` | `/api/stats/same-day-op` | placeholder | 🔴 **미구현** |
| | 지정의 수술 | `/stats/designated-doctor` | `/api/stats/designated-doctor` | placeholder | 🔴 **미구현** |
| | 내원동기별 | `/stats/visit-reason` | `/api/stats/visit-reason` | placeholder | 🔴 **미구현** |
| | 일일 접수 | `/stats/daily-reception` | `/api/stats/daily-reception` | placeholder | 🔴 **미구현** |

### 진행률 요약

| 상태 | 개수 | 메뉴 |
|------|------|------|
| 🟢 완료 | 5 | 예약 건수, 검사 건수, 상담 전환율, 수술 건수, 수술별 비중 |
| 🟠 백엔드만 완료 (프론트 연결 대기) | 0 | - |
| 🔴 완전 미착수 | 15 | 유입, 해외, 마케팅, 취소, 부도, 객단가, 드림렌즈매출, B2B매출, 직원포인트, PRP, 재수술, 당일OP, 지정의, 내원동기, 일일접수 |

---

## 백엔드 파일 구조

```
C:\workspace\java-dashboard\backend\src\main\java\com\bviit\analytics\
├── config\
│   ├── SecurityConfig.java            ← /api/auth/** permitAll, 나머지 authenticated
│   ├── JwtAuthenticationFilter.java   ← Bearer 토큰 검증
│   ├── JwtUtil.java                   ← JWT 생성/파싱
│   └── StatsDataSourceConfig.java     ← 듀얼 DataSource (H2 @Primary + MSSQL stats)
├── controller\
│   ├── AuthController.java            ← POST /api/auth/login
│   └── stats\
│       └── ReservationStatsController.java
├── service\
│   ├── AuthService.java
│   └── stats\
│       └── ReservationStatsService.java
├── repository\
│   ├── UserRepository.java            ← JPA (H2)
│   └── stats\
│       └── ReservationStatsRepository.java  ← JdbcTemplate (MSSQL)
├── dto\
│   ├── ApiResponse.java               ← { success, data, message }
│   ├── ErrorResponse.java             ← 에러 (timestamp KST)
│   └── stats\
│       ├── ReservationStatsResponse.java
│       └── ReservationMonthlyItem.java
└── exception\
    └── GlobalExceptionHandler.java    ← DataAccessException → 503
```

## 프론트 파일 구조

```
C:\workspace\java-dashboard\frontend\src\
├── api\
│   ├── client.ts       ← HTTP 클라이언트 (Bearer 자동 주입)
│   ├── auth.ts         ← 로그인 API
│   └── stats.ts        ← 통계 Zod 스키마 + API 함수
├── config\
│   └── navigation.ts   ← 메뉴 구조 (20개 통계 페이지 정의)
├── pages\
│   ├── DashboardPage.tsx
│   ├── ReservationPage.tsx
│   └── StatsPlaceholderPage.tsx
├── router.tsx          ← TanStack Router
├── stores\authStore.ts ← Zustand
└── components\layout\  ← Sidebar, Topbar
```

---

## EyeChartPro 참고 쿼리 (검증된 SQL)

| 파일 | 용도 |
|------|------|
| `C:\workspace\softcrm\routes\stats-a-staff.js` | 검사/외래/백내장 직원통계 |
| `C:\workspace\softcrm\routes\stats-c-cataract-visit-motive.js` | 백내장 내원동기 |
| `C:\workspace\softcrm\routes\b2b-corp-reservation.js` | B2B 예약 통계 |
| `C:\workspace\softcrm\routes\b2b-corp-point.js` | B2B 포인트 |
| `C:\workspace\softcrm\routes\clinic-statistics.js` | 진료 통계 |

---

## 작업 분배 제안

| 우선순위 | 페이지 | 주요 테이블 | 난이도 |
|---------|--------|-----------|--------|
| ★★★ | examination | ExamCount, Cataract_Exam, RESERVATION | 중 |
| ★★★ | consultation-rate | RESERVATION (FLAG별 전환) | 중 |
| ★★★ | surgery | OPERATIONDATA | 중 |
| ★★ | cancel-rate | RESERVATION (STATE='C') | 하 |
| ★★ | no-show-rate | RESERVATION | 중 |
| ★★ | surgery-ratio | OPERATIONDATA + OPERATION_CFG | 중 |
| ★ | overseas | DB_CUSTOM (국적) + RESERVATION | 중 |
| ★ | marketing | MOTIVE_NEW01/02, RESERVE_PATH | 중 |
| ★ | unit-price | 수납 테이블 (탐색 필요) | 상 |
| ★ | intake-conversion | RESERVATION + CTI_CALL_COUNT | 상 |
