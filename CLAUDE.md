# B&VIIT Analytics Dashboard — 코딩 표준 및 규칙

## 프로젝트 개요

- **목적**: 안과(B&VIIT) KPI 대시보드 및 데이터 시각화 플랫폼
- **백엔드**: Java 21 / Spring Boot 3.5 / Gradle
- **프론트엔드**: React 19 / TypeScript / Vite 8
- **UI**: Tailwind CSS 4 + shadcn/ui (base-nova 테마) + Recharts
- **상태관리**: Zustand (인증) + TanStack Query (서버 상태)
- **라우팅**: TanStack Router
- **폼**: react-hook-form + Zod
- **DB**: H2 (개발, 기본) / PostgreSQL (운영, `application-postgres.properties`)
- **인증**: Spring Security + JWT (jjwt, HMAC-SHA256)
- **모킹**: MSW (개발 환경 API 목업)
- **언어**: 한국어 UI

## 디렉토리 구조

```
project-root/
├── backend/
│   ├── src/main/java/com/bviit/analytics/
│   │   │                                # 레이어(controller/service/repository/dto) → 도메인 하위패키지 구조
│   │   ├── config/                      # SecurityConfig·JwtUtil·DataInitializer·*DataSourceConfig
│   │   ├── controller/
│   │   │   ├── AuthController.java       # POST /api/auth/login
│   │   │   ├── reservation/            # 예약·예약종합·유입(intake) 통계 컨트롤러
│   │   │   ├── exam/                   # 검사리스트·시술별·검사건수 컨트롤러
│   │   │   ├── surgery/               # 수술·수술비중 컨트롤러
│   │   │   ├── consultation/          # 전환율·예약률·중단사유 컨트롤러
│   │   │   ├── outpatient/            # 외래수 컨트롤러
│   │   │   ├── overall/               # 주간 종합지표 컨트롤러
│   │   │   ├── etc/                   # B2B 매출 등 기타 컨트롤러
│   │   │   └── stats/                 # 공용 유틸(StatsPanelSupport·StatsRequestValidator)
│   │   ├── service/                     # controller와 동일한 도메인 분할
│   │   ├── repository/                  # 도메인별 + UserRepository (Mock*Repository는 도메인 귀속)
│   │   ├── dto/                         # ApiResponse·ErrorResponse·Login* + 도메인별 응답 DTO
│   │   ├── entity/                      # User
│   │   ├── exception/                   # @RestControllerAdvice + 커스텀 예외
│   │   └── util/                        # MonthlyBuckets·NumberUtils 등 공용
│   ├── src/main/resources/
│   │   ├── application.properties           # H2 인메모리 (개발 기본)
│   │   └── application-postgres.properties  # PostgreSQL (운영)
│   └── build.gradle
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # 진입점 (MSW 초기화 → React 렌더)
│   │   ├── App.tsx                      # QueryClientProvider + RouterProvider
│   │   ├── router.tsx                   # TanStack Router (인증 가드 + 도메인별 페이지 라우트)
│   │   ├── index.css                    # Tailwind 4 + OKLCH 테마 변수
│   │   ├── api/                         # 도메인별 API 폴더 (각 index.ts가 도메인 객체 export)
│   │   │   ├── client.ts               # HTTP 클라이언트 (Bearer 토큰 자동 주입) — 공용
│   │   │   ├── _shared.ts              # apiResponseOf() 등 공통 응답 래퍼 — 공용
│   │   │   ├── auth.ts                 # 로그인 API — 공용
│   │   │   ├── reservation/            # index.ts(reservationApi) + reservationList.ts
│   │   │   ├── exam/                   # index.ts(examApi) + examList.ts · cataractExamList.ts
│   │   │   ├── surgery/                # index.ts(surgeryApi) + surgeryList.ts
│   │   │   ├── consultation/           # index.ts(consultationApi)
│   │   │   ├── outpatient/             # index.ts(outpatientApi)
│   │   │   ├── overall/                # index.ts(overallApi)
│   │   │   └── etc/                    # index.ts(b2bApi · B2B 매출)
│   │   ├── hooks/                       # 도메인별 TanStack Query 훅
│   │   │   ├── reservation/            # useReservationKpi/Trend/Composition/List/OverallTrend …
│   │   │   ├── exam/                   # useExamination*·useProcedureExamTrend·useExamList·useCataractExamList
│   │   │   ├── consultation/           # useConsultationRate*·useCataractReservationRateTrend·useStopReasonMonthly
│   │   │   ├── surgery/                # useSurgery*·useSurgeryRatio*
│   │   │   ├── overall/                # useOverallExamWeekly
│   │   │   ├── outpatient/             # useOutpatientCountTrend
│   │   │   ├── useIsMobile.ts          # (공용) 반응형 분기
│   │   │   └── useWeeklyApproval.ts    # (공용) 리스트 주별 승인 워크플로우
│   │   ├── components/
│   │   │   ├── layout/                  # AppLayout·Sidebar·Topbar + desktop/·mobile/
│   │   │   ├── filters/                 # FilterBar·PeriodChip·Select
│   │   │   ├── stats/                   # KpiCard·StatsPrimitives·WeeklyApprovalPanel (공용)
│   │   │   ├── report/                  # ReportLineChart
│   │   │   └── ui/                      # shadcn 컴포넌트 (button, card, chart)
│   │   ├── config/
│   │   │   └── navigation.ts            # 메뉴 구조 + 통계 페이지 정의 (sectionId = 도메인 그룹)
│   │   ├── pages/                       # 도메인별 폴더 (Login·Dashboard·StatsPlaceholder만 root)
│   │   │   ├── reservation/            # IntakeConversion·Reservation·ReservationOverall·ReservationList
│   │   │   ├── exam/                   # ExamList·CataractExamList·Examination(±Vision/Dreamlens)·ProcedureExam
│   │   │   ├── consultation/           # ConsultationRate(+consultation-rate/)·CataractReservationRate·StopReason
│   │   │   ├── surgery/                # SurgeryList·Surgery·SurgeryRatio(+surgery-ratio/)·SurgeryComposition
│   │   │   ├── report/                 # ReportPage(주간)·MonthlyReportPage
│   │   │   ├── overall/ · outpatient/ · marketing/ · cancel-noshow/ · unit-price/ · etc/
│   │   │   ├── LoginPage.tsx           # 로그인 (react-hook-form + Zod)
│   │   │   ├── DashboardPage.tsx       # 메인 대시보드 (KPI 카드 + 차트, 목업 데이터)
│   │   │   └── StatsPlaceholderPage.tsx # 미구현 통계 페이지 템플릿
│   │   ├── stores/                      # authStore (Zustand: token+user, localStorage 연동)
│   │   ├── mocks/                       # MSW (browser.ts·handlers.ts)
│   │   ├── constants/ · data/ · lib/ · utils/   # chart 상수·레거시 데이터·cn()·stats 포맷터
│   │   └── test/                        # Vitest + @testing-library/jest-dom
│   ├── components.json                  # shadcn CLI 설정
│   ├── vite.config.ts                   # 프록시: /api → localhost:8080
│   └── package.json
│
├── 서버시작.bat                          # Backend(8080) + Frontend(5173) 동시 실행
├── 서버종료.bat                          # 포트 8080/5173 프로세스 종료
└── CLAUDE.md
```

### 도메인별 코드 구성 (레이어 → 도메인)

백엔드·프론트 모두 **레이어 우선 + 도메인 하위 분할** 구조를 따른다. 도메인 = `navigation.ts`의 메뉴 그룹(`sectionId`): `reservation`(예약) / `exam`(검사) / `surgery`(수술) / `consultation`(전환&성공률) / `report` / `overall`(전체지표) / `outpatient`(외래) / `marketing` / `cancel-noshow` / `unit-price` / `etc`.

- **백엔드**: `controller/`·`service/`·`repository/`·`dto/` 각 레이어 안에 도메인 하위패키지(`controller/reservation/` …). `stats/`에는 도메인에 속하지 않는 **공용 유틸만** 남긴다(`StatsPanelSupport`, `StatsRequestValidator`). `Mock*Repository`는 해당 도메인 `repository/<domain>/`에 둔다.
- **프론트**: `api/<domain>.ts`(도메인 API 객체 + 타입) · `hooks/<domain>/` · `pages/<domain>/`. 여러 도메인이 공유하는 것만 root(`api/_shared.ts`, `api/client.ts`, `hooks/useIsMobile.ts`, `hooks/useWeeklyApproval.ts`, `pages/{Login,Dashboard,StatsPlaceholder}Page.tsx`)에 둔다. 페이지 전용 하위 컴포넌트는 페이지 폴더 안에(`pages/consultation/consultation-rate/`, `pages/surgery/surgery-ratio/`).
- **신규 추가**: 새 통계 기능은 해당 도메인 폴더/패키지에 파일을 추가한다(새 레이어 루트에 흩뿌리지 말 것). 도메인이 없으면 메뉴 그룹 기준으로 새 폴더를 만든다.

> ✅ **이관 완료**: 프론트(api·hooks·pages)와 백엔드(controller·service·repository·dto) 모두 도메인 패키지로 이관 완료. 백엔드 `*/stats/`에는 공용 유틸(`StatsPanelSupport`·`StatsRequestValidator`)만 남는다. (frontend: tsc·lint·test green / backend: gradle build SUCCESSFUL)

## 현재 구현 상태

### 구현 완료

- JWT 기반 로그인/인증 (백엔드 + 프론트)
- 메인 대시보드 레이아웃 (Sidebar + Topbar + Content)
- DashboardPage (KPI 카드 4개 + 차트 5개, 하드코딩 목업)
- ReservationPage (월별/연도별 비교, 하드코딩 목업)
- 인증 라우트 가드 (미인증 시 /login 리다이렉트)
- MSW 개발 목킹
- 통계 전용 페이지 10종 + MSSQL(prod) 연동 통계 API (검사·수술·전환율·리스트 등, 아래 표 참조)

### 미구현 (플레이스홀더)

통계 페이지 15종은 아직 `StatsPlaceholderPage`로 렌더. 2종은 백엔드 API만 존재.

## 통계 페이지 목록

`navigation.ts`에 27개 정의. 상태: **완료**(전용 페이지+API) / **백엔드만**(API만, 프론트 placeholder) / **미구현**.

| ID | 메뉴명 | 경로 | 그룹 | 상태 |
|----|------|------|------|------|
| intake-conversion | 유입(검사예약) | /stats/intake-conversion | 예약 | 미구현 |
| reservation | 예약 건수 | /stats/reservation | 예약 | 완료 |
| reservation-overall | 예약 종합 | /stats/reservation-overall | 예약 | 완료 (3탭: 종합/온라인/콜, 지표정의 §5.1) |
| exam-list | 검사자 리스트 | /stats/exam-list | 검사 | 완료 |
| cataract-exam-list | 백내장 검사자 리스트 | /stats/cataract-exam-list | 검사 | 완료 |
| examination | 시술별 | /stats/examination | 검사 | 완료 |
| procedure-exam | 검사건수 | /stats/procedure-exam | 검사 | 완료 |
| examination-vision | 시력교정 검사건수 | /stats/examination/vision | 검사 | 백엔드만 |
| examination-dreamlens | 드림렌즈 검사건수 | /stats/examination/dreamlens | 검사 | 백엔드만 |
| consultation-rate | 전환율 | /stats/consultation-rate | 전환&성공률 | 완료 |
| cataract-reservation-rate | 예약률 | /stats/cataract-reservation-rate | 전환&성공률 | 완료 |
| surgery-list | 수술자 리스트 | /stats/surgery-list | 수술 | 완료 |
| surgery | 수술 건수 | /stats/surgery | 수술 | 완료 |
| surgery-ratio | 주요 수술별 비중 | /stats/surgery-ratio | 수술 | 완료 |
| overseas | 해외 환자 관련 지표 | /stats/overseas | 마케팅 | 미구현 |
| marketing | 마케팅 유입 및 효율 지표 | /stats/marketing | 마케팅 | 미구현 |
| cancel-rate | 예약취소율 | /stats/cancel-rate | 취소&부도 | 미구현 |
| no-show-rate | 부도율 | /stats/no-show-rate | 취소&부도 | 미구현 |
| unit-price | 객단가 | /stats/unit-price | 객단가 | 미구현 |
| dreamlens-revenue | 드림렌즈 매출 | /stats/dreamlens-revenue | 기타 | 미구현 |
| b2b-revenue | B2B 매출 | /stats/b2b-revenue | 기타 | 완료 |
| staff-point | 직원 포인트 | /stats/staff-point | 기타 | 미구현 |
| prp-rate | PRP 시술율 | /stats/prp-rate | 기타 | 미구현 |
| reoperation-rate | 재수술율 | /stats/reoperation-rate | 기타 | 미구현 |
| same-day-op | 당일OP 비율 | /stats/same-day-op | 기타 | 미구현 |
| designated-doctor | 지정의 수술 비율 | /stats/designated-doctor | 기타 | 미구현 |
| visit-reason | 내원동기별 비중 | /stats/visit-reason | 기타 | 미구현 |
| daily-reception | 일일 접수/응대 건수 | /stats/daily-reception | 기타 | 미구현 |

> ⚠️ **메뉴명 주의**: `검사건수` 메뉴 = `procedure-exam`(전체 검사수 = EXAM 행 + Cataract_Exam 세션), `시술별` 메뉴 = `examination`(시력교정/드림렌즈/백내장 탭). id·경로와 라벨이 어긋나니 혼동 주의.

## 백엔드 컨벤션

### API 설계

```
POST   /api/auth/login                              # 로그인 (구현됨)

# 통계 API (구현 예정)
GET    /api/stats/{pageId}                           # 통계 데이터 조회
GET    /api/stats/{pageId}/trend?period=MONTHLY&from=2025-01&to=2025-12
GET    /api/stats/{pageId}/compare?compareTo=PREVIOUS_PERIOD
```

### 응답 포맷

```json
// 성공 (ApiResponse<T>)
{
  "success": true,
  "data": { ... }
}

// 에러 (ErrorResponse)
{
  "success": false,
  "status": 401,
  "message": "인증이 필요합니다.",
  "errors": { "field": "메시지" },   // validation 에러 시에만
  "timestamp": "2026-04-11T..."
}
```

### 코딩 스타일

- 패키지: `com.bviit.analytics`
- Entity에 `@Setter` 금지 — 의미 있는 메서드로 상태 변경
- DTO <-> Entity: 정적 팩토리 (`XxxResponse.from(entity)`)
- 예외: `@RestControllerAdvice` + 커스텀 예외 클래스
- Validation: `@Valid` + Bean Validation (`@Email`, `@NotBlank` 등)
- 테스트 메서드명 한글 허용: `예약_건수_정상조회()`
- SQL 파라미터 바인딩 필수 (문자열 결합 절대 금지)
- Lombok: `@RequiredArgsConstructor`, `@Builder`, `@Getter` 허용 / `@Setter` 금지

### 신규 통계 API 추가 순서

> 도메인 = `<domain>` (reservation/exam/surgery/consultation/…). 모든 파일을 해당 도메인 하위패키지에 둔다.

1. DTO 정의 (`dto/<domain>/`)
2. Repository 작성 (`repository/<domain>/`)
3. Service 비즈니스 로직 (`service/<domain>/`)
4. Controller 엔드포인트 (`controller/<domain>/`)
5. 프론트 API 함수(`api/<domain>.ts`) + 훅(`hooks/<domain>/`) + 페이지(`pages/<domain>/`) 연결

## 프론트엔드 컨벤션

### 라우팅 패턴

- 인증 필요 페이지는 `authLayout` 하위에 등록 (`router.tsx`)
- 라우트는 `router.tsx`가 `navigation.ts`의 `statsPages` + 도메인 레지스트리(`pages/<domain>/routes.ts`, `pageId → 컴포넌트`)를 합쳐 **자동 생성**한다. 레지스트리에 컴포넌트가 있으면 전용 페이지, 없으면 `StatsPlaceholderPage`로 렌더 (하드코딩 목록 없음)
- 새 통계 페이지 연결: `navigation.ts`에 정의 → `pages/<domain>/`에 컴포넌트 작성 → `pages/<domain>/routes.ts`에 `'<id>': Component` 한 줄 추가 (**`router.tsx` 수정 불필요**)
- 훅은 `@/hooks/<domain>/useXxx`, API는 `@/api/<domain>`(리스트는 `@/api/<domain>/xxxList`)에서 import
- **pending(미완성) 메뉴 정책**: 운영 빌드(PROD)에서는 사이드바에서 **숨김** + 라우트 **차단**(직접 URL도 `StatsPlaceholderPage`). 개발 빌드에서는 미리보기 가능(사이드바 빨강 표시). 상태는 `MENU_STATUS`, 조회는 `getMenuStatus()`.

### 차트 (Recharts)

- 모든 차트는 shadcn `ChartContainer` + `ChartTooltip`으로 감싸서 테마 통일
- 차트 설정은 `chartConfig` 객체로 정의 (색상, 라벨)
- 참고 구현: `DashboardPage.tsx`, `ReservationPage.tsx`

### 색상 체계

```typescript
// KPI 상태별 색상
const STATUS_COLORS = {
  DANGER:  '#EF4444',   // red-500
  WARNING: '#F59E0B',   // amber-500
  GOOD:    '#10B981',   // emerald-500
  NEUTRAL: '#6B7280',   // gray-500
}

// 추세 색상
const TREND_COLORS = {
  POSITIVE: '#10B981',  // 좋은 추세 (초록)
  NEGATIVE: '#EF4444',  // 나쁜 추세 (빨강)
  FLAT:     '#6B7280',  // 변동 없음 (회색)
}

// 차트 팔레트 (최대 8개 시리즈)
const CHART_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]
```

### 숫자 포맷 규칙

- 금액: `1,234,567,890원` / 축약 시 `12.3억`
- 퍼센트: `83.3%` (소수점 1자리)
- 건수: `1,234건`
- 증감률: `▲ +5.9%` (초록) / `▼ -3.2%` (빨강) / `— 0.0%` (회색)

### 상태관리

```
authStore (Zustand)     — 인증: token, user, login/logout (localStorage 연동)
filterStore (Zustand)   — 글로벌 필터: 기간, 부서, 카테고리 (구현 예정)
TanStack Query          — 서버 데이터 캐싱/갱신
```

### shadcn 컴포넌트 추가

```bash
cd frontend && npx shadcn@latest add <component-name>
```

설정: `frontend/components.json` (base-nova 테마, Lucide 아이콘)

## 실행 명령어

```bash
# 동시 실행
서버시작.bat                              # Backend(8080) + Frontend(5173)
서버종료.bat                              # 전체 종료

# 개별 실행
cd backend && gradlew.bat bootRun        # Backend (H2 인메모리 기본)
cd frontend && npm run dev               # Frontend (Vite dev server)

# PostgreSQL로 실행
cd backend && gradlew.bat bootRun --args='--spring.profiles.active=postgres'

# 빌드/테스트
cd frontend && npm run build             # 프로덕션 빌드
cd frontend && npm run lint              # ESLint
cd frontend && npm run test              # Vitest
```

## 공통 규칙

### Git

- 커밋: `feat: 예약 통계 페이지 구현`, `fix: 달성률 소수점 계산 오류`
- 브랜치: `dev` (개발, 기본), `main` (운영)
- **배포 플로우**: `dev` → PR → `main` (main에 직접 push 금지)
  1. `dev`에서 작업 및 커밋
  2. `git push origin dev`
  3. `gh pr create --base main` 로 PR 생성
  4. PR 머지 후 로컬 동기화 (`git pull origin main`)

### 코드 품질

- **KISS**: 가장 단순한 해결책 선택
- **DRY**: 중복 코드는 함수로 추출
- **YAGNI**: 필요하지 않은 기능 미리 구현 금지
- 파일 500줄 이하 유지, 함수 50줄 이하 유지

### 보안

- 하드코딩된 비밀번호/키 금지 (운영 환경에서 JWT 시크릿 반드시 교체)
- 콘솔에 민감 정보 출력 금지
- 사용자 입력 필수 검증 (`@Valid`, Zod)
- SQL 파라미터 바인딩 필수

### 환경 설정

- `application-local.properties` → `.gitignore`
- 프론트 환경변수: `VITE_` 접두사 사용
- Vite 프록시: `/api` → `http://localhost:8080` (`vite.config.ts`)

## Claude에게 요청할 때 참고사항

- **새 통계 페이지**: `navigation.ts`에 27개 정의됨 → 전용 페이지 컴포넌트 작성 + `router.tsx` 라우트 교체 + 백엔드 API 구현
- **새 차트**: Recharts 기반, shadcn `ChartContainer` 사용, `CHART_PALETTE` 색상 적용
- **새 UI 컴포넌트**: `npx shadcn@latest add <name>` (설정: `components.json`)
- **API 연동**: `api/client.ts` HTTP 클라이언트 사용, TanStack Query `useQuery`로 캐싱
- **DashboardPage/ReservationPage 데이터는 하드코딩 목업** — API 연동 시 교체 필요
- **MSW 핸들러**: 새 API 개발 전 `mocks/handlers.ts`에 목 추가하면 프론트 선행 개발 가능

## DB 테이블 카탈로그

`docs/db/tables/`에 35개 테이블의 컬럼 정보, PK/FK, JOIN 키, 함정(Gotchas)이 정리되어 있습니다.
이 DB는 EyeChartPro(Node.js, Java)와 공유하는 동일 MSSQL입니다.

### 참조 규칙

1. **SQL 쿼리 작성 전** 해당 테이블의 `docs/db/tables/{테이블명}.md`를 먼저 읽을 것
2. **"함정(Gotchas)" 섹션은 반드시 확인** — 과거 실수와 알려진 위험이 기록되어 있음
3. 원본은 softcrm 레포에 있으며, 갱신 시 동기화됨

### 고위험 테이블 (필독)

| 테이블 | 핵심 함정 |
|--------|----------|
| **CUSTOM** | JUMIN_NUM 복호화 비용 높음, 6개 직원필드 → EMPLOYEE.EMP_NUM |
| **RESERVATION** | SELECT_DOC vs RESERVE_DOC 우선순위, RESERVE_STATE 4상태(Y/I/H/C) |
| **EMPLOYEE** | EMP_STATE <> 'N' 퇴직자 필터 필수, EMP_NUM 형식 혼재 |
| **OPERATIONDATA** | OP_EMP 순서 역전(EMP2=C, EMP3=A), 고객당 1행 |
| **COSTPRICE** | 원데이 수술 합산 이슈, PrcItmLst JOIN 필요 |
