# 반응형 패널 아키텍처 핸드오버

> 작성: 2026-04-12 | 작성자: Claude Opus  
> 목적: 모바일/PC 레이아웃 분리 구조와 패널별 독립 API 패턴을 이어서 개발할 수 있도록 정리

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────┐
│  ReservationPage (페이지)                         │
│  ├── FilterBar (공용)                             │
│  ├── useIsMobile() → 분기                         │
│  │                                               │
│  │  PC (≥768px)          모바일 (<768px)          │
│  │  ┌──────────┐        ┌──────────┐             │
│  │  │StatsGrid │        │StatsStack│             │
│  │  │ 2열 그리드│        │ 1열 스택  │             │
│  │  └──────────┘        └──────────┘             │
│  │       │                    │                   │
│  │       └──── 동일 패널 컴포넌트 ────┘             │
│  │            KpiCardsPanel                       │
│  │            MonthComparePanel                   │
│  │            YearTrendPanel ...                   │
│  └───────────────────────────────────────────────┘
```

**핵심 원칙**: 패널은 플랫폼 무관(공용), 레이아웃만 분리.

---

## 2. 디렉토리 구조

```
frontend/src/
├── hooks/
│   ├── useIsMobile.ts              ← 768px 브레이크포인트 감지
│   ├── useReservationKpi.ts        ← /reservation/kpi 호출
│   ├── useReservationTrend.ts      ← /reservation/trend 호출
│   └── useReservationComposition.ts← /reservation/composition 호출
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           ← PC: 사이드바 | 모바일: 드로어
│   │   ├── Sidebar.tsx             ← onNavigate 콜백 지원
│   │   ├── Topbar.tsx
│   │   ├── desktop/
│   │   │   └── StatsGrid.tsx       ← PC 전용 레이아웃
│   │   └── mobile/
│   │       └── StatsStack.tsx      ← 모바일 전용 레이아웃
│   ├── PanelShell.tsx              ← 스켈레톤 로딩 + 에러 딤드
│   └── ErrorOverlay.tsx
│
├── pages/
│   └── ReservationPage.tsx         ← 패널 컴포넌트 + 레이아웃 분기
│
└── mocks/
    └── handlers.ts                 ← /kpi, /trend, /composition 목업
```

---

## 3. 패널별 독립 API

하나의 통계 페이지가 **3개 엔드포인트**를 병렬 호출합니다.

| 엔드포인트 | React Query 키 | 사용 패널 | MSW 딜레이 |
|-----------|---------------|----------|-----------|
| `GET /api/stats/reservation/kpi?years=` | `reservation-kpi` | KPI 카드 4개 | 200ms |
| `GET /api/stats/reservation/trend?years=` | `reservation-trend` | 유형별 비교, 건수+증감, 추이 비교 | 500ms |
| `GET /api/stats/reservation/composition?years=` | `reservation-composition` | 구성비, 비율/도넛 | 350ms |

### 응답 형식

**kpi** — 연도별 집계:
```json
{
  "success": true,
  "data": [
    { "year": 2026, "surgery": 754, "outpatient": 4808, "dreamlens": 566, "total": 6128 }
  ]
}
```

**trend / composition** — 월별 시계열 (동일 형식):
```json
{
  "success": true,
  "data": [
    { "year": 2026, "month": 1, "surgery": 52, "outpatient": 350, "dreamlens": 40, "total": 442 },
    ...
  ]
}
```

### 새 통계 페이지에 동일 패턴 적용하는 법

1. `hooks/use{PageName}Kpi.ts` — KPI 엔드포인트 호출 훅
2. `hooks/use{PageName}Trend.ts` — 추이 엔드포인트 호출 훅
3. `hooks/use{PageName}Composition.ts` — 구성비 엔드포인트 호출 훅
4. `mocks/handlers.ts` — 해당 목업 핸들러 추가
5. `api/stats.ts` — API 함수 추가
6. 패널 컴포넌트에서 각각 다른 훅 사용

---

## 4. PanelShell — 스켈레톤 + 에러

각 패널을 `PanelShell`로 감싸면 로딩/에러가 자동 처리됩니다.

```tsx
<PanelShell isLoading={isLoading} isError={isError} variant="bar">
  <Card>...</Card>
</PanelShell>
```

### variant 종류

| variant | 형태 | 용도 |
|---------|------|------|
| `kpi` | 카드 스켈레톤 (제목+숫자+라인) | KPI 카드 |
| `bar` | 막대 차트 스켈레톤 | Grouped/Stacked Bar, Composed |
| `line` | 가로선 스켈레톤 | Line 차트, 추이 비교 |
| `donut` | 원형 스켈레톤 | Pie/Donut 차트 |
| `area` | 적층 영역 스켈레톤 | Stacked Area 차트 |

### 에러 상태

- API 실패 시 딤드 오버레이 + "데이터 로드 실패" 표시
- **X 버튼**으로 개별 닫기 가능 (빈 차트 확인 가능)
- 패널별 독립 — 한 패널 실패해도 다른 패널 정상 표시

---

## 5. 레이아웃 분리 규칙

### useIsMobile 훅

```typescript
// hooks/useIsMobile.ts
const MOBILE_BREAKPOINT = 768  // px
// matchMedia 기반, SSR-safe
```

### 페이지에서 사용

```tsx
export function SomePage() {
  const isMobile = useIsMobile()
  const Layout = isMobile ? StatsStack : StatsGrid
  
  return (
    <div className="space-y-6">
      <FilterBar {...filter} />
      <Layout kpi={<KpiPanel />} charts={<Charts />} />
    </div>
  )
}
```

### 레이아웃 컴포넌트 인터페이스

```typescript
interface StatsLayoutProps {
  kpi: React.ReactNode    // KPI 카드 영역
  charts: React.ReactNode // 차트 패널들
}
```

| 컴포넌트 | 파일 | KPI 배치 | 차트 배치 |
|---------|------|---------|----------|
| `StatsGrid` | `layout/desktop/StatsGrid.tsx` | 4열 그리드 | 2열 그리드 |
| `StatsStack` | `layout/mobile/StatsStack.tsx` | 2열 그리드 | 1열 세로 스택 |

### AppLayout 모바일 처리

- **PC (≥768px)**: 고정 사이드바 + Topbar
- **모바일 (<768px)**: 사이드바 → 드로어 (햄버거 메뉴), Topbar 제거, 패딩 축소
- 메뉴 클릭 시 `onNavigate` 콜백으로 드로어 자동 닫힘

---

## 6. 새 통계 페이지 추가 체크리스트

1. **백엔드 API** (또는 MSW 목업)
   - [ ] `/api/stats/{pageId}/kpi?years=` 엔드포인트
   - [ ] `/api/stats/{pageId}/trend?years=` 엔드포인트
   - [ ] `/api/stats/{pageId}/composition?years=` 엔드포인트

2. **프론트엔드 훅**
   - [ ] `hooks/use{PageName}Kpi.ts`
   - [ ] `hooks/use{PageName}Trend.ts`
   - [ ] `hooks/use{PageName}Composition.ts`

3. **페이지 컴포넌트**
   - [ ] 패널 컴포넌트들 (각각 자기 훅 호출)
   - [ ] `useIsMobile()` + `StatsGrid/StatsStack` 레이아웃 분기
   - [ ] `PanelShell` 래핑 (적절한 variant 지정)

4. **라우팅**
   - [ ] `router.tsx`에 라우트 등록
   - [ ] `navigation.ts` 플레이스홀더 제거

---

## 7. 주의사항

- **MSW**: `VITE_USE_MSW=true`로 켜야 목업 데이터 동작. 현재 `.env`는 `false` (실 백엔드 연동)
- **백엔드 @Profile("mssql")**: 모든 stats 컨트롤러/서비스/레포지토리가 `mssql` 프로파일 전용. H2 기본 실행 시 404 반환
- **React Query 캐싱**: 동일 queryKey는 자동 중복제거. 같은 엔드포인트를 쓰는 패널들은 1회만 호출
- **차트 높이**: 모든 차트 `h-72` (288px) 고정. 모바일에서도 동일 — 필요시 `StatsStack`에서 조정

---

## 8. 파일 변경 이력 (2026-04-12)

| 파일 | 변경 |
|------|------|
| `hooks/useIsMobile.ts` | 신규 — 768px 브레이크포인트 훅 |
| `hooks/useReservationKpi.ts` | 신규 — KPI 전용 훅 |
| `hooks/useReservationTrend.ts` | 신규 — 추이 전용 훅 |
| `hooks/useReservationComposition.ts` | 신규 — 구성비 전용 훅 |
| `components/layout/desktop/StatsGrid.tsx` | 신규 — PC 레이아웃 |
| `components/layout/mobile/StatsStack.tsx` | 신규 — 모바일 레이아웃 |
| `components/layout/AppLayout.tsx` | 변경 — 모바일 드로어 추가 |
| `components/layout/Sidebar.tsx` | 변경 — `onNavigate` 콜백 추가 |
| `components/PanelShell.tsx` | 변경 — 5종 스켈레톤 variant |
| `components/ErrorOverlay.tsx` | 신규 — X 닫기 가능 딤드 오버레이 |
| `pages/ReservationPage.tsx` | 변경 — 패널 분리 + 레이아웃 분기 |
| `api/stats.ts` | 변경 — kpi/trend/composition API 추가 |
| `mocks/handlers.ts` | 변경 — 3개 분리 엔드포인트 + delay |
| `.env` | 변경 — `VITE_USE_MSW=false` (실 연동) |
