# ─────────────────────────────────────────────────────────────
# Stage 1. Frontend build (Vite → frontend/dist)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2. Backend build (Gradle bootJar)
#   - build.gradle 의 processResources 가 ../frontend/dist 를
#     백엔드 static/ 으로 복사하므로 디렉터리 구조를 동일하게 유지한다.
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS backend-builder
WORKDIR /workspace

COPY backend/ /workspace/backend/
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist

WORKDIR /workspace/backend
RUN chmod +x gradlew \
 && ./gradlew --no-daemon clean bootJar -x test

# ─────────────────────────────────────────────────────────────
# Stage 3. Runtime
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home /app app \
 && mkdir -p /app/.cache/stats \
 && chown -R app:app /app

COPY --from=backend-builder /workspace/backend/build/libs/*-SNAPSHOT.jar /app/app.jar

USER app

ENV SERVER_PORT=18080 \
    STATS_CACHE_DIR=/app/.cache/stats \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Duser.timezone=Asia/Seoul"

EXPOSE 18080

ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]
