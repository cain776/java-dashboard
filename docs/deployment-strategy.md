# 배포 전략

## 목표

`java-dashboard`는 소규모 내부 사용 제품이므로, 복잡한 완전 자동 배포보다 `자동 검증 + 수동 배포 승인` 전략을 기본으로 사용합니다.

핵심 원칙:

1. `dev` 브랜치는 개발/통합 브랜치입니다.
2. `main` 브랜치는 배포 확정 브랜치입니다.
3. 코드 품질 검증은 GitHub Actions가 자동으로 수행합니다.
4. `dev -> main` 승격은 GitHub Actions 버튼으로 수행합니다.
5. 운영 반영은 사람이 확인 후 수동으로 진행합니다.

---

## 브랜치 전략

### `dev`

- 일상 개발, 수정, 통합 작업 브랜치
- push / pull request 시 자동 CI 실행

### `main`

- 실제 배포 후보 브랜치
- push 시 자동으로 배포용 아티팩트 생성
- 운영 반영은 아티팩트를 내려받아 수동 적용

---

## 승격 자동화

파일: `.github/workflows/promote-dev-to-main.yml`

실행 방식:

- GitHub Actions에서 `Promote Dev to Main` 수동 실행
- 기본값은 `dev` 최신 커밋을 `main`으로 승격
- 필요하면 특정 `dev` 커밋 SHA를 입력해 해당 버전만 승격 가능

동작 원칙:

- 승격 대상 커밋이 `dev`에 포함되어 있어야 함
- `main`이 해당 커밋으로 fast-forward 가능한 경우에만 승격
- 승격이 끝나면 `main` push가 발생하고, 이어서 `Release Package` workflow가 자동 실행됨

이 방식으로 `git push origin dev:main`을 직접 치지 않아도, GitHub 안에서 일관된 승격 흐름을 유지할 수 있습니다.

---

## CI

파일: `.github/workflows/ci.yml`

자동 실행 대상:

- `dev` push
- `main` push
- `dev`, `main` 대상 pull request

실행 항목:

### Frontend

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build`

### Backend

- `./gradlew test`

---

## 반자동 배포

파일: `.github/workflows/release-package.yml`

실행 방식:

- `main` 브랜치 push 시 자동 실행
- 또는 GitHub Actions에서 수동 실행

생성 결과:

- 프론트 빌드가 포함된 Spring Boot jar
- `backend.env.example`
- 배포 문서

운영자는 GitHub Actions의 artifact를 내려받아 내부 PC에 적용합니다.

---

## 운영 배포 방식

운영은 `Vite dev server`를 쓰지 않습니다.

운영 배포는 다음 구조를 기준으로 합니다:

1. 프론트엔드 `dist` 빌드
2. 빌드 결과를 백엔드 jar 내부 정적 리소스로 포함
3. Spring Boot jar 한 개로 실행

즉, 운영에서는 브라우저가 Spring Boot 서버 하나에 접속하고:

- `/api/**` 는 백엔드 API
- `/` 및 프런트 라우트는 정적 프런트 파일

이 방식은 내부툴 기준으로 가장 단순하고 관리가 쉽습니다.

---

## 권장 운영 흐름

1. 개발자는 `dev`에서 작업
2. GitHub Actions CI 통과 확인
3. 배포 시점에 `Promote Dev to Main` 실행
4. `main` 승격 완료 확인
5. `Release Package` artifact 생성 확인
6. 운영 PC에서 수동 반영
7. 이상 없으면 그 버전을 운영 기준점으로 유지

---

## 지금 하지 않는 것

현재 전략에서는 아래 항목은 기본 범위에 포함하지 않습니다.

- 운영 서버 자동 배포
- 무중단 배포
- 자동 롤백
- 모니터링/알림 연동
- 컨테이너 오케스트레이션

이 항목들은 제품 사용 빈도와 운영 부담을 고려해 필요해질 때 추가합니다.
