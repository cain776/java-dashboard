# EXAM

> **DB**: SOFTCRM | **컬럼**: 84개 | **행 수**: ~413,814 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | |

<!-- TODO: FK, JOIN 키 추가 -->

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
| CANCEL_CD | char(3) | Y | |  |
| CANCEL_REASON | nvarchar(50) | Y | |  |
| RIGHT01 | nvarchar(20) | Y | |  |
| LEFT01 | nvarchar(20) | Y | |  |

> 외 69개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'EXAM'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM EXAM\|JOIN EXAM' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
