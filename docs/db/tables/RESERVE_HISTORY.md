# RESERVE_HISTORY

> **DB**: SOFTCRM | **컬럼**: 44개 | **행 수**: ~6,751,231 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HISTORY_NUM | char(22) | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HISTORY_NUM | char(22) | N | | PK |
| CUST_NUM | char(13) | Y | |  |
| RESERVE_NUM | char(22) | N | |  |
| RESERVE_DATE | char(10) | Y | |  |
| START_TIME | char(5) | Y | |  |
| END_TIME | char(5) | Y | |  |
| RESERVE_FLAG | nvarchar(30) | Y | |  |
| RESERVE_STATE | char(1) | Y | |  |
| EMP_NUM | char(6) | Y | |  |
| MEMO | nvarchar(200) | Y | |  |
| HISTORY_TIME | varchar(50) | Y | |  |
| HISTORY_IP | varchar(50) | Y | |  |
| CUST_NAME | nvarchar(100) | Y | |  |
| CUST_ENAME | nvarchar(30) | Y | |  |
| CALL_NUM1 | varchar(30) | Y | |  |

> 외 29개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESERVE_HISTORY'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM RESERVE_HISTORY\|JOIN RESERVE_HISTORY' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
