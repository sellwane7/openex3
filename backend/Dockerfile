# --- Build stage ---
FROM gradle:8.9-jdk17 AS build
WORKDIR /app

# Reuse the host's already-populated Gradle cache so this build never
# needs network access to Gradle's plugin/dependency repositories —
# works around flaky TLS to plugins.gradle.org in some Docker/WSL2 setups.
COPY .docker-gradle-cache /root/.gradle

COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN gradle bootJar --no-daemon -x test --offline

# --- Run stage ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]