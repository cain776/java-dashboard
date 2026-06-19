# Archive (보관 문서)

구현이 완료되어 **현행 기준 문서로서의 역할이 끝난** 설계·핸드오버·초안 문서를 모아둡니다.
역사적 설계 근거·SQL 매핑은 그대로 보존하되, 현재 구현 현황은 아래 라이브 문서를 참조하세요.

| 보관 문서 | 원래 위치 | 보관 사유 | 현행 대체 문서 |
|------|------|------|------|
| [api-redesign-request.md](api-redesign-request.md) | `docs/` | 요청한 `reservation/monthly` API가 구현 완료됨 | [기획/dashboard-spec.md](../기획/dashboard-spec.md), [db/지표정의.md](../db/지표정의.md) |
| [stats-api-handover.md](stats-api-handover.md) | `docs/` | 2026-04 병렬개발 핸드오버 — 이후 통계 API 다수 구현되어 현황표 stale | [기획/dashboard-spec.md](../기획/dashboard-spec.md) |
| [surgery-api-spec.md](surgery-api-spec.md) | `docs/` | `controller/surgery/` 로 구현 완료 | [db/지표정의.md](../db/지표정의.md) §2(수술) |
| [menu-route-api-draft.md](menu-route-api-draft.md) | `docs/기획/` | 메뉴·라우트·API 계약 초안 — dashboard-spec로 일원화됨 | [기획/dashboard-spec.md](../기획/dashboard-spec.md) |

> 보관일: 2026-06-19. 설계 근거가 필요할 때만 참고하고, 새 작업의 기준으로 삼지 마세요.
