# 기획 (Planning)

비앤빛 Analytics KPI 대시보드의 기획 산출물 모음입니다.

## 문서 목록

| 문서 | 형식 | 내용 |
|------|------|------|
| [prd.html](prd.html) | HTML (인터랙티브) | **PRD 통합 문서** — 상단 탭으로 `PRD · Features · User Flow · Wireframe` 전환. 브라우저로 열어서 봅니다. |
| [dashboard-spec.md](dashboard-spec.md) | Markdown | **대시보드 기획서** — 개요·데이터 소스(MSSQL READ ONLY)·메뉴/화면·인증·통계 API·구현 현황. (노션과 동기화본) |
| [menu-route-api-draft.md](menu-route-api-draft.md) | Markdown | 프론트–백엔드 병행 개발용 **메뉴·라우트·API 계약 초안** (원본 draft) |
| [service-planning-team-kpi.md](service-planning-team-kpi.md) | Markdown | 서비스기획팀 **KPI 기획서** (팀 단위 KPI 체계, 별도 주제) |

## prd.html 구성 (탭)

- **PRD** — Overview / Problem & Solution / Target & Scenario / Success & Risks / Project Basics
- **Features** — 요구사항 6종 → 기능별 ID·Status·Priority·Acceptance Criteria·Related Features (실제 구현 상태 반영)
- **User Flow** — 실제 메뉴 구조 스와임레인 (인증 → KPI 종합 대시보드 → 검사&예약 · 상담 · 수술 · 마케팅 · 취소&부도 · 객단가 · 기타)
- **Wireframe** — 좌측 목차로 **전체 페이지**(로그인 · KPI 종합 대시보드 · 통계 20종) 와이어프레임. 통계 페이지는 공통 템플릿(필터 + 요약 카드 + 추이 차트 + 결과 표) 사용.

## 참고

- 데이터 출처·테이블 함정은 [`../db/tables/`](../db/tables/) 카탈로그 참조.
- 구현 상태는 코드(`frontend/src/config/navigation.ts`)의 상태 맵 기준 (🟢 complete / 🟠 backend-only / 🔴 pending).
- 노션 동기본: "비앤빛 KPI 대시보드 기획서" 페이지.
