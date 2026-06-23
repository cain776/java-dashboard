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
- **모킹**: MSW (`VITE_USE_MSW=true`일 때만 opt-in)
- **언어**: 한국어 UI

## 디렉토리 구조

```
project-root/
├── backend/
│   ├── src/main/java/com/bviit/analytics/
│   │   ├── config/
│   │   │   ├── SecurityConfig.java      # Spring Security + CORS (localhost:5173 허용)
│   │   │   ├── JwtUtil.java             # JWT 생성/검증 (HMAC-SHA256)
│   │   │   └── DataInitializer.java     # 초기 admin 계정 시딩
│   │   ├── controller/
│   │   │   └── AuthController.java      # POST /api/auth/login
│   │   ├── service/
│   │   │   └── AuthService.java         # 인증 로직
│   │   ├── entity/
│   │   │   └── User.java               # id, email, password, name
│   │   ├── repository/
│   │   │   └── UserRepository.java      # findByEmail()
│   │   └── dto/
│   │       ├── LoginRequest.java        # @Email, @NotBlank
│   │       └── LoginResponse.java       # token + UserDto
│   ├── src/main/resources/
│   │   ├── application.properties           # H2 인메모리 (개발 기본)
│   │   └── application-postgres.properties  # PostgreSQL (운영)
│   └── build.gradle
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # 진입점 (VITE_USE_MSW=true면 MSW 초기화 → React 렌더)
│   │   ├── App.tsx                      # QueryClientProvider + RouterProvider
│   │   ├── router.tsx                   # TanStack Router (인증 가드 포함)
│   │   ├── index.css                    # Tailwind 4 + OKLCH 테마 변수
│   │   ├── api/
│   │   │   ├── client.ts               # HTTP 클라이언트 (Bearer 토큰 자동 주입)
│   │   │   └── auth.ts                 # 로그인 API
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx        # 인증 레이아웃 (Topbar + Sidebar + Outlet)
│   │   │   │   ├── Sidebar.tsx          # 접이식 네비게이션 (navigation.ts 기반)
│   │   │   │   └── Topbar.tsx           # 상단 바 (유저명, 로그아웃)
│   │   │   └── ui/                      # shadcn 컴포넌트 (button, card, chart)
│   │   ├── config/
│   │   │   └── navigation.ts            # 메뉴 구조 + 통계 페이지 정의 (10개)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx            # 로그인 (react-hook-form + Zod)
│   │   │   ├── DashboardPage.tsx        # 메인 대시보드 (KPI 카드 + 차트, 목업 데이터)
│   │   │   ├── ReservationPage.tsx      # 예약 비교 (월별/연도별 토글, 목업 데이터)
│   │   │   └── StatsPlaceholderPage.tsx # 미구현 통계 페이지 템플릿
│   │   ├── stores/
│   │   │   └── authStore.ts             # Zustand 인증 (token + user, localStorage 연동)
│   │   ├── mocks/
│   │   │   ├── browser.ts              # MSW 워커
│   │   │   └── handlers.ts             # POST /api/auth/login 목 핸들러
│   │   ├── lib/
│   │   │   └── utils.ts                # cn() (clsx + tailwind-merge)
│   │   └── test/
│   │       └── setup.ts                # Vitest + @testing-library/jest-dom
│   ├── components.json                  # shadcn CLI 설정
│   ├── vite.config.ts                   # 프록시: /api → localhost:8080
│   └── package.json
│
├── 서버시작.bat                          # Backend(8080) + Frontend(5173) 동시 실행
├── 서버종료.bat                          # 포트 8080/5173 프로세스 종료
└── AGENTS.md
```

## 현재 구현 상태

### 구현 완료

- JWT 기반 로그인/인증 (백엔드 + 프론트)
- 메인 대시보드 레이아웃 (Sidebar + Topbar + Content)
- DashboardPage (KPI 카드 4개 + 차트 5개, 하드코딩 목업)
- ReservationPage (월별/연도별 비교, 하드코딩 목업)
- 인증 라우트 가드 (미인증 시 /login 리다이렉트)
- MSW opt-in 개발 목킹 (`VITE_USE_MSW=true`)

### 미구현 (플레이스홀더)

9개 통계 페이지 + 백엔드 통계 API 전체

## 통계 페이지 목록

| ID | 이름 | 경로 | 섹션 | 상태 |
|----|------|------|------|------|
| reservation | 예약 건수 | /stats/reservation | 유입 | 구현됨 (목업) |
| examination | 검사 건수 | /stats/examination | 유입 | 플레이스홀더 |
| consultation-rate | 상담 전환율 | /stats/consultation-rate | 상담 | 플레이스홀더 |
| surgery | 수술 건수 | /stats/surgery | 수술 | 플레이스홀더 |
| surgery-ratio | 주요 수술별 비중 | /stats/surgery-ratio | 수술비중 | 플레이스홀더 |
| overseas | 해외 환자 관련 지표 | /stats/overseas | 해외 | 플레이스홀더 |
| marketing | 마케팅 유입 및 효율 | /stats/marketing | 마케팅 | 플레이스홀더 |
| cancel-rate | 예약취소율 | /stats/cancel-rate | 기타 | 플레이스홀더 |
| no-show-rate | 부도율 | /stats/no-show-rate | 기타 | 플레이스홀더 |
| unit-price | 객단가 | /stats/unit-price | 기타 | 플레이스홀더 |

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

1. Entity/DTO 정의 (`entity/`, `dto/request/`, `dto/response/`)
2. Repository 작성 (`repository/`)
3. Service 비즈니스 로직 (`service/`)
4. Controller 엔드포인트 (`controller/`)
5. 프론트 API 함수 + 페이지 연결

## 프론트엔드 컨벤션

### 라우팅 패턴

- 인증 필요 페이지는 `authLayout` 하위에 등록 (`router.tsx`)
- 새 통계 페이지: `config/navigation.ts`에 정의 → `router.tsx`에 전용 라우트 등록
- 미구현 페이지는 `StatsPlaceholderPage`로 자동 렌더링
- 새 페이지 추가 시 `filter` 제거: `router.tsx`에서 해당 ID의 플레이스홀더를 전용 컴포넌트로 교체

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
- 브랜치: `feature/reservation-stats`, `fix/export-encoding`

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

## Codex에게 요청할 때 참고사항

- **새 통계 페이지**: `navigation.ts`에 이미 10개 정의됨 → 전용 페이지 컴포넌트 작성 + `router.tsx` 라우트 교체 + 백엔드 API 구현
- **새 차트**: Recharts 기반, shadcn `ChartContainer` 사용, `CHART_PALETTE` 색상 적용
- **새 UI 컴포넌트**: `npx shadcn@latest add <name>` (설정: `components.json`)
- **API 연동**: `api/client.ts` HTTP 클라이언트 사용, TanStack Query `useQuery`로 캐싱
- **DashboardPage/ReservationPage 데이터는 하드코딩 목업** — API 연동 시 교체 필요
- **MSW 핸들러**: 새 API 개발 전 `mocks/handlers.ts`에 목 추가하면 프론트 선행 개발 가능
