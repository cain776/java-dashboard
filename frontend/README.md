# B&VIIT Analytics Frontend

React 19 + TypeScript + Vite 기반의 병원 KPI 대시보드 프런트엔드입니다.

## 시작하기

```bash
npm install
npm run dev
```

기본 개발 모드에서는 실제 백엔드 `/api`를 호출합니다.

프런트만 단독으로 개발해야 할 때만 MSW를 명시적으로 켭니다.

1. `frontend/.env.example`을 복사해 `.env.local` 생성
2. `VITE_USE_MSW=true` 설정

```bash
VITE_USE_MSW=true
```

## 스크립트

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run preview
```

## 현재 상태

- 로그인 페이지와 인증 레이아웃이 동작합니다.
- 주요 통계 화면은 screen-first 방식으로 목업/샘플 데이터가 들어가 있습니다.
- 예약 통계 API는 MSW 응답 스키마와 타입 검증이 연결돼 있습니다.
- 실제 PostgreSQL 기반 통계 API는 아직 연결 전입니다.

## 연동 메모

- API base path는 `/api` 입니다.
- Vite 개발 서버는 `/api`를 `http://localhost:18080`으로 프록시합니다.
- 로그인 후 토큰은 `Authorization: Bearer ...` 헤더로 전송됩니다.

## handoff 체크

```bash
npm run build
npm run lint
npm run test
```

백엔드 실연동 확인 시에는 `VITE_USE_MSW=false` 상태여야 합니다.
