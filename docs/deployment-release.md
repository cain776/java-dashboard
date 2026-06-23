# 운영 배포 가이드

> **배포 문서 3종 — 읽는 순서**: ① [전략·CI](deployment-strategy.md) → ② [로컬 개발 실행](deployment-local.md) → ③ **운영 배포(이 문서)**

## 개요

이 문서는 `main` 브랜치에서 생성된 GitHub Actions 배포 아티팩트를 내부 PC에 적용하는 방법을 설명합니다.

운영은 `npm run dev`가 아니라, 프론트 빌드가 포함된 Spring Boot jar 실행을 기준으로 합니다.

일반적인 흐름은 다음과 같습니다.

1. `dev`에서 작업 및 CI 확인
2. GitHub Actions `Promote Dev to Main` 실행
3. `main`에서 생성된 `Release Package` artifact 다운로드
4. 내부 PC에 수동 반영

---

## 배포 파일 구성

GitHub Actions `Release Package` artifact에는 보통 아래 파일이 포함됩니다.

- `analytics-*.jar`
- `backend.env.example`
- `deployment-strategy.md`
- `deployment-release.md`

---

## 1. 서버 준비

필수:

- Java 21 이상

확인 명령:

```bash
java -version
```

---

## 2. 환경변수 파일 준비

아티팩트에 포함된 `backend.env.example` 파일을 참고해 같은 폴더에 `.env`를 준비합니다.

예시:

```env
STATS_DB_URL=jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM
STATS_DB_USERNAME=readonly_user
STATS_DB_PASSWORD=change-me
```

주의:

- 읽기 전용 계정을 사용하세요
- `.env`는 Git에 올리지 않습니다

---

## 3. 실행 방법

Windows PowerShell 기준:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $name, $value = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

$env:SPRING_PROFILES_ACTIVE = 'mssql'
java -jar .\analytics-0.0.1-SNAPSHOT.jar
```

실행 후 접속:

- 대시보드: `http://localhost:18080`
- 운영 환경에는 기본 계정을 두지 않습니다. 관리자 계정은 운영 절차에 따라 별도 생성하고, `APP_SEED_ENABLED=false`를 유지하세요.

---

## 4. 종료 방법

- 실행 중인 터미널에서 `Ctrl + C`

---

## 5. 운영 배포 순서

1. GitHub Actions에서 `Promote Dev to Main` 실행
2. `Release Package` workflow 완료 확인
3. GitHub에서 `main` 기준 `Release Package` artifact 다운로드
4. 운영 폴더에 압축 해제
5. `.env` 준비
6. jar 실행
7. 로그인 및 핵심 화면 확인

---

## 6. 롤백 방법

가장 간단한 롤백 방법은 이전 artifact를 따로 보관하는 것입니다.

문제 발생 시:

1. 현재 jar 종료
2. 이전 정상 artifact로 교체
3. 같은 방식으로 재실행

---

## 7. 참고

- 개발/검증용 로컬 실행은 `docs/deployment-local.md`
- 전체 전략은 `docs/deployment-strategy.md`
