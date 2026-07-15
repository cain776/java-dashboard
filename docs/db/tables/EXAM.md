# EXAM

> **DB**: SOFTCRM | **컬럼**: 84개 | **행 수**: ~415,501 (PROD DB 기준, 2026-06-19)
> **최종 갱신**: 2026-06-19

## 역할

시력교정 검사 결과 마스터. **고객당 1행**(PK=`CUST_NUM`)으로, 재검사 시 기존 행을 덮어쓴다(upsert). 검사 결과·수술가능여부(`OP_POSSIBLE_YN`)·중단여부(`STOP_YN`)·견적 등을 보관.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | 고객번호. **고객당 1행** (CUSTOM.CustNum 참조) |
| 시점 | EXAM_DATE | char(10) | 검사일 `YYYY-MM-DD`. 단일 컬럼 — 마지막 검사일로 덮어써짐 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | | PK |
| EXAM_DATE | char(10) | Y | |  |
| OPERATIONR | nvarchar(40) | Y | |  |
| OPERATIONL | nvarchar(40) | Y | |  |
| MANGMAK_MR | char(1) | Y | |  |
| MANGMAK_MEMO | nvarchar(100) | Y | |  |
| EYE_SICK | nvarchar(100) | Y | |  |
| OP_POSSIBLE_YN | char(1) | Y | |  |
| STOP_YN | char(1) | Y | |  |
| EXAM_MEMO | nvarchar(4000) | Y | |  |
| TODAY_YN | char(1) | Y | |  |
| CANCEL_CD | char(3) | Y | **중단 사유 코드** | 마스터 `CANCEL_CFG`. 상담사 드롭다운 선택값. 1xx/3xx 두 코드군이 같은 라벨 세트 → [중단사유-분류-정의.md](../../기획/중단사유-분류-정의.md) |
| CANCEL_REASON | nvarchar(50) | Y | 중단 사유 라벨 | `CANCEL_CD`에 대응하는 텍스트 |
| RIGHT01 | nvarchar(20) | Y | |  |
| LEFT01 | nvarchar(20) | Y | |  |

> 외 69개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'EXAM'` 으로 전체 조회

## 함정 (Gotchas)

- **⚠️ 고객당 1행 = 덮어쓰기 구조 (시점 통계 왜곡)**: PK가 `CUST_NUM` 단독이라 한 고객은 EXAM에 단 1행만 존재한다 (PROD 확인: 총행수 = 고유고객수 = 415,501, 완전 1:1). 재검사하면 `STOP_YN`·`EXAM_DATE`·검사값이 모두 최신으로 **덮어써진다**.
  - `STOP_YN`/`EXAM_DATE`는 "그 고객의 **현재 스냅샷**"일 뿐, 과거 시점의 상태가 아니다.
  - 예: 1월에 중단(`STOP_YN='Y'`)했던 환자가 3월에 재검사하면 → `STOP_YN='N'`, `EXAM_DATE='3월'`로 갱신 → **1월 중단건수가 소급 감소**한다. 같은 기간을 다른 날 조회하면 수치가 달라질 수 있음.
  - **월별 중단건수(`STOP_YN='Y'` GROUP BY 월) 등 시점 집계는 신뢰 불가.** 정확한 집계는 [지표 마감 스냅샷](../../지표정의.md) (월말 상태 고정)으로만 가능.
- **검사 이력 복원 불가**: 이력 테이블 `EXAM_FU`는 PROD에 14행뿐 — 실질 미사용. 과거 검사/중단 시점을 복원할 소스가 없다.
- **STOP_YN 값 분포** (PROD 전체): `N`=353,784 / `NULL`=34,712 / `Y`=27,005. NULL 비중이 커서 `STOP_YN='Y'`(중단)과 `STOP_YN<>'Y'`(비중단)는 다르게 카운트되니 주의.
- **STOP_YN(검사 중단) ≠ RESERVATION.RESERVE_STATE='C'(예약 취소)**: 별개 개념. 예약 테이블에는 "중단" 상태가 없다 (Y/I/H/C 4상태뿐).
- **⚠️ CANCEL_CD는 이름과 달리 "취소 플래그"가 아니라 "중단 사유 코드"다 — 같은 컬럼이 두 용도로 쓰인다**:
  - **사유 분류**: `STOP_YN='Y'` 행의 `CANCEL_CD`를 중단 사유로 해석 → 중단사유 차트 ([중단사유-분류-정의.md](../../기획/중단사유-분류-정의.md), `find-stop-reason-monthly.sql`)
  - **취소 제외**: `ISNULL(CANCEL_CD,'') = ''` 조건으로 "코드 있으면 취소된 건" 취급해 검사수에서 제외 (지표정의 §검사수 제외조건)
  - 한쪽 의미만 알고 고치면 반대쪽이 깨진다. **둘 다 확인할 것.**
- **중단 사유는 코드가 있다** (`CANCEL_CD` + 마스터 `CANCEL_CFG`). 과거 코드에 `EXAM_MEMO` 자유텍스트 키워드로 사유를 추정하던 방식이 있었으나 부정확해 2026-07-14(`fd54e30`) 폐기됨 — **"사유 코드가 DB에 없다"는 옛 주석·메모가 남아 있으면 그게 낡은 것.**

## 사용처

<!-- TODO: grep -r 'FROM EXAM\|JOIN EXAM' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
