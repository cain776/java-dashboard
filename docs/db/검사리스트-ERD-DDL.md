# 검사자/백내장 검사 리스트 — ERD Cloud용 DDL

> [검사자리스트-컬럼정의.md](검사자리스트-컬럼정의.md)·[백내장검사리스트-컬럼정의.md](백내장검사리스트-컬럼정의.md)의 SQL에 등장하는 테이블을 ERD로 옮기기 위한 DDL.
> [ERD Cloud](https://www.erdcloud.com) **`Import → DDL`** 에 아래 코드블록을 그대로 붙여넣으면 테이블·관계가 자동 생성된다.
> 최종 갱신: 2026-06-16

## 사용법

1. ERD Cloud 접속 → 새 ERD 생성 → 상단 **`Import`** → **`DDL`** 선택.
2. DBMS는 **`MS-SQL`** 선택 (타입이 `NVARCHAR`/`MONEY`/`SMALLINT` 등 MSSQL 기준).
3. 아래 [DDL 전문](#ddl-전문) 코드블록 전체 복사 → 붙여넣기 → Import.
4. 관계선이 자동으로 그려진다. 컬럼 한글명은 import 후 ERD Cloud에서 논리명(Logical)으로 수기 보강하거나, 컬럼정의서를 참조.

## ⚠️ 중요 — 이 DDL의 성격

- **실제 운영 DB(SOFTCRM, MSSQL)에는 FK 제약이 없다.** 레거시 CRM이라 모든 관계는 코드의 `JOIN` 조건으로만 존재한다. 아래 `FOREIGN KEY`는 **ERD에 관계선을 그리기 위한 논리적 선언**일 뿐, DDL을 운영 DB에 실행하지 말 것.
- **컬럼은 두 화면이 참조하는 것만 추렸다.** 각 테이블의 전체 컬럼(예: CUSTOM 61, EXAM 84)이 아니라 PK·조인키·화면 표시 컬럼 위주. 측정값(`RIGHT/LEFT01~30`)은 대표 1쌍만 넣고 생략.
- **타입 불일치 주의**: `MOTIVE_NEW02.cust_num`(nvarchar23)·`MOTIVE_NEW01.cust_num`(nvarchar23) ↔ `CUSTOM.CUST_NUM`(char13)은 타입이 다르다. ERD Cloud가 경고할 수 있으나 관계선은 그려진다.
- **DDL로 표현 못 한 관계**(아래 [수동 추가 관계](#수동-추가-관계-필터형) 참조)는 import 후 ERD Cloud에서 직접 선을 그어야 한다.

## DDL 전문

```sql
-- =========================================================
-- 코드/마스터 테이블 (참조 대상)
-- =========================================================

-- 직원 마스터
CREATE TABLE EMPLOYEE (
  EMP_NUM   CHAR(6)       NOT NULL,
  EMP_NAME  NVARCHAR(30)  NULL,
  EMP_STATE CHAR(1)       NULL,
  CONSTRAINT PK_EMPLOYEE PRIMARY KEY (EMP_NUM)
);

-- 국적 코드
CREATE TABLE NationCustom_CFG (
  Code             NVARCHAR(20)  NOT NULL,
  Nation_CodeName  NVARCHAR(100) NULL,
  CONSTRAINT PK_NationCustom_CFG PRIMARY KEY (Code)
);

-- 취소사유 코드
CREATE TABLE CANCEL_CFG (
  CANCEL_CD     CHAR(3)       NOT NULL,
  CANCEL_REASON NVARCHAR(50)  NULL,
  CONSTRAINT PK_CANCEL_CFG PRIMARY KEY (CANCEL_CD)
);

-- 진료 세부유형(검사예약 진료구분명)
CREATE TABLE MEDICAL_SUB_CFG (
  RESERVE_FLAG CHAR(1)      NOT NULL,
  SUB_FLAG     VARCHAR(2)   NOT NULL,
  SUB_NAME     NVARCHAR(50) NULL,
  CONSTRAINT PK_MEDICAL_SUB_CFG PRIMARY KEY (RESERVE_FLAG, SUB_FLAG)
);

-- 범용 코드(보험사 InsuranceCfg / 유입 InflowItemCfg 등)
CREATE TABLE EtcCfg (
  EtcBseCod NVARCHAR(50)  NOT NULL,
  EtcCod    NVARCHAR(50)  NOT NULL,
  EtcCodNam NVARCHAR(100) NULL,
  EtcCodVal NVARCHAR(100) NULL,
  CONSTRAINT PK_EtcCfg PRIMARY KEY (EtcBseCod, EtcCod)
);

-- =========================================================
-- 고객 마스터
-- =========================================================
CREATE TABLE CUSTOM (
  CUST_NUM       CHAR(13)       NOT NULL,
  CUST_NAME      NVARCHAR(100)  NULL,
  CUST_ENAME     VARCHAR(200)   NULL,
  BIRTH_DAY      CHAR(10)       NULL,
  LUNAR_YN       CHAR(1)        NULL,
  JUMIN_NUM      VARBINARY(100) NULL,
  CALL_NUM1      VARCHAR(30)    NULL,
  CALL_NUM2      VARCHAR(30)    NULL,
  EMAIL          VARCHAR(50)    NULL,
  ZIP_CODE       NVARCHAR(20)   NULL,
  ADDR1          NVARCHAR(200)  NULL,
  ADDR2          NVARCHAR(200)  NULL,
  ETC            VARCHAR(8000)  NULL,
  LEVEL          NVARCHAR(1)    NULL,
  JOB            NVARCHAR(50)   NULL,
  FIRST_DAY      CHAR(10)       NULL,
  LAST_DAY       CHAR(10)       NULL,
  MY_COUNSELOR   CHAR(6)        NULL,
  MY_DOCTOR      CHAR(6)        NULL,
  MY_OPTOMETRIST NCHAR(6)       NULL,
  Nation_code    NVARCHAR(20)   NULL,
  InsuranceCode  CHAR(10)       NULL,
  CONSTRAINT PK_CUSTOM PRIMARY KEY (CUST_NUM),
  CONSTRAINT FK_CUSTOM_COUNSELOR FOREIGN KEY (MY_COUNSELOR)   REFERENCES EMPLOYEE (EMP_NUM),
  CONSTRAINT FK_CUSTOM_DOCTOR    FOREIGN KEY (MY_DOCTOR)      REFERENCES EMPLOYEE (EMP_NUM),
  CONSTRAINT FK_CUSTOM_OPTOM     FOREIGN KEY (MY_OPTOMETRIST) REFERENCES EMPLOYEE (EMP_NUM),
  CONSTRAINT FK_CUSTOM_NATION    FOREIGN KEY (Nation_code)    REFERENCES NationCustom_CFG (Code)
);

-- =========================================================
-- 예약
-- =========================================================
CREATE TABLE RESERVATION (
  RESERVE_NUM    CHAR(22)      NOT NULL,
  CUST_NUM       CHAR(13)      NULL,
  RESERVE_DATE   CHAR(10)      NULL,
  START_TIME     CHAR(5)       NULL,
  RESERVE_FLAG   CHAR(1)       NULL,
  RESERVE_JINRYO VARCHAR(2)    NULL,
  RESERVE_STATE  CHAR(1)       NULL,
  RESERVE_PATH   NVARCHAR(50)  NULL,
  SELECT_DOC     CHAR(6)       NULL,
  RESERVE_DOC    CHAR(6)       NULL,
  CONSTRAINT PK_RESERVATION PRIMARY KEY (RESERVE_NUM),
  CONSTRAINT FK_RSV_CUSTOM    FOREIGN KEY (CUST_NUM)   REFERENCES CUSTOM (CUST_NUM),
  CONSTRAINT FK_RSV_SELECTDOC FOREIGN KEY (SELECT_DOC) REFERENCES EMPLOYEE (EMP_NUM),
  CONSTRAINT FK_RSV_RESERVEDOC FOREIGN KEY (RESERVE_DOC) REFERENCES EMPLOYEE (EMP_NUM),
  CONSTRAINT FK_RSV_SUBCFG    FOREIGN KEY (RESERVE_FLAG, RESERVE_JINRYO) REFERENCES MEDICAL_SUB_CFG (RESERVE_FLAG, SUB_FLAG)
);

-- =========================================================
-- 시력교정 검사 / 수술
-- =========================================================

-- 일반 검사 (고객당 1행 스냅샷)
CREATE TABLE EXAM (
  CUST_NUM       CHAR(13)       NOT NULL,
  EXAM_DATE      CHAR(10)       NULL,
  EXAM_MEMO      NVARCHAR(4000) NULL,
  OPERATIONR     NVARCHAR(40)   NULL,
  OPERATIONL     NVARCHAR(40)   NULL,
  OP_ESTIMATE    NVARCHAR(30)   NULL,
  ExamPercent    NVARCHAR(10)   NULL,
  STOP_YN        CHAR(1)        NULL,
  OP_POSSIBLE_YN CHAR(1)        NULL,
  CANCEL_CD      CHAR(3)        NULL,
  CANCEL_REASON  NVARCHAR(50)   NULL,
  RIGHT01        NVARCHAR(20)   NULL,  -- 측정값 대표 1쌍(실제 RIGHT01~30/LEFT01~30 존재)
  LEFT01         NVARCHAR(20)   NULL,
  CONSTRAINT PK_EXAM PRIMARY KEY (CUST_NUM),
  CONSTRAINT FK_EXAM_CUSTOM FOREIGN KEY (CUST_NUM)  REFERENCES CUSTOM (CUST_NUM),
  CONSTRAINT FK_EXAM_CANCEL FOREIGN KEY (CANCEL_CD) REFERENCES CANCEL_CFG (CANCEL_CD)
);

-- 시력교정 수술 (고객당 1행)
CREATE TABLE OPERATIONDATA (
  CUST_NUM       CHAR(13)     NOT NULL,
  OPERATION_DATE CHAR(10)     NULL,
  OPERATIONR     NVARCHAR(40) NULL,
  OPERATIONL     NVARCHAR(40) NULL,
  OPERATION_DOC  CHAR(6)      NULL,
  CONSTRAINT PK_OPERATIONDATA PRIMARY KEY (CUST_NUM),
  CONSTRAINT FK_OPDATA_CUSTOM FOREIGN KEY (CUST_NUM)      REFERENCES CUSTOM (CUST_NUM),
  CONSTRAINT FK_OPDATA_DOC    FOREIGN KEY (OPERATION_DOC) REFERENCES EMPLOYEE (EMP_NUM)
);

-- =========================================================
-- 백내장 검사 / 수술
-- =========================================================

-- 백내장 검사 (고객당 복수행: CUST_NUM + SEQ)
CREATE TABLE Cataract_Exam (
  CUST_NUM      CHAR(13)      NOT NULL,
  SEQ           INT           NOT NULL,
  EXAM_DATE     CHAR(10)      NULL,
  EXAM_MEMO     NVARCHAR(2000) NULL,
  Stop_YN       CHAR(1)       NULL,
  Impossible    CHAR(1)       NULL,
  Cancel_CD     CHAR(3)       NULL,
  Cancel_reason NVARCHAR(50)  NULL,
  OPERATIONR    NVARCHAR(40)  NULL,  -- 추천 IOL(우)
  OPERATIONL    NVARCHAR(40)  NULL,  -- 추천 IOL(좌)
  OP_ESTIMATE_R NVARCHAR(30)  NULL,
  OP_ESTIMATE_L NVARCHAR(30)  NULL,
  ExamPercent   NVARCHAR(10)  NULL,
  RIGHT01       NVARCHAR(20)  NULL,  -- 측정값 대표 1쌍(실제 RIGHT01~15/LEFT01~15)
  LEFT01        NVARCHAR(20)  NULL,
  CONSTRAINT PK_Cataract_Exam PRIMARY KEY (CUST_NUM, SEQ),
  CONSTRAINT FK_CEXAM_CUSTOM FOREIGN KEY (CUST_NUM)  REFERENCES CUSTOM (CUST_NUM),
  CONSTRAINT FK_CEXAM_CANCEL FOREIGN KEY (Cancel_CD) REFERENCES CANCEL_CFG (CANCEL_CD)
);

-- 백내장 수술 (고객당 1행, 좌/우 분리)
CREATE TABLE Cataract_Operationdata (
  CUST_NUM        CHAR(13)     NOT NULL,
  OPERATIONR_DATE CHAR(10)     NULL,
  OPERATIONL_DATE CHAR(10)     NULL,
  OPERATIONR      NVARCHAR(40) NULL,  -- 실제 IOL(우)
  OPERATIONL      NVARCHAR(40) NULL,  -- 실제 IOL(좌)
  OPERATIONR_DOC  NCHAR(6)     NULL,
  OPERATIONL_DOC  NCHAR(6)     NULL,
  CONSTRAINT PK_Cataract_Operationdata PRIMARY KEY (CUST_NUM),
  CONSTRAINT FK_COP_CUSTOM FOREIGN KEY (CUST_NUM)       REFERENCES CUSTOM (CUST_NUM),
  CONSTRAINT FK_COP_DOCR   FOREIGN KEY (OPERATIONR_DOC) REFERENCES EMPLOYEE (EMP_NUM),
  CONSTRAINT FK_COP_DOCL   FOREIGN KEY (OPERATIONL_DOC) REFERENCES EMPLOYEE (EMP_NUM)
);

-- =========================================================
-- 내원동기
-- =========================================================

-- 내원동기 1차(소개자/메모)
CREATE TABLE MOTIVE_NEW01 (
  pkey     INT           NOT NULL,
  cust_num NVARCHAR(23)  NULL,
  comments NVARCHAR(500) NULL,
  CONSTRAINT PK_MOTIVE_NEW01 PRIMARY KEY (pkey),
  CONSTRAINT FK_M1_CUSTOM FOREIGN KEY (cust_num) REFERENCES CUSTOM (CUST_NUM)  -- 타입불일치(nvarchar23 vs char13)
);

-- 내원동기 2차(대/중/세 분류)
CREATE TABLE MOTIVE_NEW02 (
  pkey            INT          NOT NULL,
  fkey            INT          NULL,
  cust_num        NVARCHAR(23) NULL,
  Idx             CHAR(1)      NULL,
  section         SMALLINT     NULL,
  category01_name NVARCHAR(50) NULL,
  category02_name NVARCHAR(100) NULL,
  category03_name NVARCHAR(50) NULL,
  name            NVARCHAR(100) NULL,
  CONSTRAINT PK_MOTIVE_NEW02 PRIMARY KEY (pkey),
  CONSTRAINT FK_M2_M1     FOREIGN KEY (fkey)     REFERENCES MOTIVE_NEW01 (pkey),
  CONSTRAINT FK_M2_CUSTOM FOREIGN KEY (cust_num) REFERENCES CUSTOM (CUST_NUM)  -- 타입불일치(nvarchar23 vs char13)
);

-- =========================================================
-- 수납/결제 (수납금액 RECEIPT 집계 소스)
-- =========================================================

-- 수납 마스터 (고객당 복수행: CUST_NUM + SEQ)
CREATE TABLE COSTPRICE (
  CUST_NUM   CHAR(13)    NOT NULL,
  SEQ        INT         NOT NULL,
  COST_DATE  CHAR(10)    NULL,
  COST_PRICE MONEY       NULL,
  COST_FLAG  NCHAR(10)   NULL,
  PayStt     CHAR(1)     NULL,
  CONSTRAINT PK_COSTPRICE PRIMARY KEY (CUST_NUM, SEQ),
  CONSTRAINT FK_COST_CUSTOM FOREIGN KEY (CUST_NUM) REFERENCES CUSTOM (CUST_NUM)
);

-- 수납 서브(부분납/할부)
CREATE TABLE CSTPRCSUB (
  CstCusNum CHAR(13) NOT NULL,
  CstSeq    INT      NOT NULL,
  CstPrc    MONEY    NULL,
  CstCnlYnN CHAR(1)  NULL,
  CstPayTyp CHAR(1)  NULL,
  CONSTRAINT FK_SUB_COST FOREIGN KEY (CstCusNum, CstSeq) REFERENCES COSTPRICE (CUST_NUM, SEQ)
);

-- 수납 항목 리스트
CREATE TABLE PRCITMLST (
  PrcCusNum CHAR(13) NOT NULL,
  PrcSeq    INT      NOT NULL,
  PrcCod    NVARCHAR(10) NULL,
  CONSTRAINT FK_ITM_COST FOREIGN KEY (PrcCusNum, PrcSeq) REFERENCES COSTPRICE (CUST_NUM, SEQ)
);

-- 수납 항목 상세
CREATE TABLE PrcItmDtl (
  PrcCusNum  CHAR(13)     NOT NULL,
  PrcSeq     INT          NOT NULL,
  PrcCod     NVARCHAR(10) NULL,
  PrcDtlPrc  MONEY        NULL,
  PrcCnlYnN  CHAR(1)      NULL,
  CONSTRAINT FK_DTL_COST FOREIGN KEY (PrcCusNum, PrcSeq) REFERENCES COSTPRICE (CUST_NUM, SEQ)
);
```

## 관계 요약

| 자식(N) | → | 부모(1) | 키 | 용도 |
|---|:--:|---|---|---|
| EXAM | → | CUSTOM | `CUST_NUM` | 검사 → 고객 |
| EXAM | → | CANCEL_CFG | `CANCEL_CD` | 취소사유명 |
| OPERATIONDATA | → | CUSTOM | `CUST_NUM` | 수술 → 고객 |
| OPERATIONDATA | → | EMPLOYEE | `OPERATION_DOC` | 집도의 |
| Cataract_Exam | → | CUSTOM | `CUST_NUM` | 백내장검사 → 고객 |
| Cataract_Exam | → | CANCEL_CFG | `Cancel_CD` | 취소사유명 |
| Cataract_Operationdata | → | CUSTOM | `CUST_NUM` | 백내장수술 → 고객 |
| Cataract_Operationdata | → | EMPLOYEE | `OPERATIONR_DOC` / `OPERATIONL_DOC` | 좌/우 집도의 |
| RESERVATION | → | CUSTOM | `CUST_NUM` | 예약 → 고객 |
| RESERVATION | → | EMPLOYEE | `SELECT_DOC` / `RESERVE_DOC` | 지정의/예약의 |
| RESERVATION | → | MEDICAL_SUB_CFG | `RESERVE_FLAG`+`RESERVE_JINRYO` | 진료구분명 |
| CUSTOM | → | EMPLOYEE | `MY_COUNSELOR` / `MY_DOCTOR` / `MY_OPTOMETRIST` | 상담사/상담의/검안사 |
| CUSTOM | → | NationCustom_CFG | `Nation_code` | 국적명 |
| MOTIVE_NEW02 | → | MOTIVE_NEW01 | `fkey → pkey` | 동기메모 |
| MOTIVE_NEW02 / MOTIVE_NEW01 | → | CUSTOM | `cust_num` | 동기 → 고객 (타입불일치) |
| COSTPRICE | → | CUSTOM | `CUST_NUM` | 수납 → 고객 |
| CSTPRCSUB / PRCITMLST / PrcItmDtl | → | COSTPRICE | `CUST_NUM`+`SEQ` | 수납 상세 |

## 수동 추가 관계 (필터형)

DDL의 `FOREIGN KEY`로 표현하지 못한 관계. ERD Cloud import 후 직접 선을 그어야 한다 (참조 대상이 복합 PK인데 자식 쪽에 일부 키만 있는 **필터 조인**이라 표준 FK로 선언 불가).

| 자식 | 부모 | 조인 조건 | 비고 |
|---|---|---|---|
| CUSTOM.`InsuranceCode` | EtcCfg | `EtcBseCod='InsuranceCfg' AND EtcCod=InsuranceCode` | 보험사명. CUSTOM에 `EtcBseCod` 컬럼 없음 → 상수 필터 |
| Cataract_Exam.`InflowCod` | EtcCfg | `EtcBseCod='InflowItemCfg' AND EtcCod=InflowCod` | 유입항목명(레거시 전용 화면). 본 DDL엔 `InflowCod` 미포함 |

> 두 관계 모두 `EtcCfg`의 복합 PK(`EtcBseCod`,`EtcCod`) 중 `EtcBseCod`를 코드에서 상수로 고정하는 방식이라 FK 제약으로 만들 수 없다.

## 관련 문서

- [검사자리스트-컬럼정의.md](검사자리스트-컬럼정의.md) — 시력교정 검사자 리스트 화면 컬럼·SQL
- [백내장검사리스트-컬럼정의.md](백내장검사리스트-컬럼정의.md) — 백내장 검사자 리스트 화면 컬럼·SQL
- [tables/_index.md](tables/_index.md) — 전체 테이블 카탈로그(컬럼 전수·함정)
