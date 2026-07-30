# OpenEx 3.0 — Week 1: Core Engine & DB Integrity

This is the Week 1 deliverable: a Kotlin/Spring Boot backend with a strict
double-entry ledger, JWT auth, idempotent order creation, and an in-memory
price-time-priority matching engine.

## Prerequisites

- JDK 17+
- Docker + Docker Compose
- (Optional but recommended) IntelliJ IDEA Community Edition

## Day-by-day map of this repo

| Day | What it added | Where to look |
|---|---|---|
| 1 | Project skeleton, Docker Compose, CI | `backend/build.gradle.kts`, `docker-compose.yml`, `.github/workflows/ci.yml` |
| 2 | Double-entry ledger | `db/migration/V1__init_ledger_schema.sql`, `service/LedgerService.kt`, `LedgerServiceTest.kt` |
| 3 | JWT auth + wallet deposit | `security/`, `controller/AuthController.kt`, `controller/WalletController.kt` |
| 4 | Orders + idempotency | `db/migration/V3__orders_and_idempotency.sql`, `service/IdempotencyService.kt`, `controller/OrderController.kt` |
| 5 | Matching engine | `service/MatchingEngineService.kt`, `MatchingEngineServiceTest.kt` |

## First-time setup

1. Generate the Gradle wrapper (needed for CI and for running without a local Gradle install):
   ```bash
   cd backend
   gradle wrapper --gradle-version 8.9
   ```
   (If you don't have Gradle installed, install it once via `sdk install gradle` or `brew install gradle`, or download it from gradle.org — you only need it this one time to generate the wrapper.)

2. Start Postgres + Redis:
   ```bash
   docker compose up -d postgres redis
   ```

3. Run the backend:
   ```bash
   cd backend
   ./gradlew bootRun
   ```
   Flyway will run the migrations automatically on startup. Check `http://localhost:8080/api/health`.

4. Run the full test suite (uses an in-memory H2 database, no Docker needed):
   ```bash
   cd backend
   ./gradlew test
   ```

## Manually proving Day 3 (JWT login + deposit) with curl

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"supersecret1"}'

# Login (copy the "token" from the response)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"supersecret1"}'

# Deposit 250 USD (replace <TOKEN>)
curl -X POST http://localhost:8080/api/wallets/deposit \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","amount":250.00}'

# Check balances
curl http://localhost:8080/api/wallets -H "Authorization: Bearer <TOKEN>"
```

## Manually proving Day 4 (idempotency) with curl

Run this exact command twice with the same `Idempotency-Key` — you'll get
the identical response both times, and only one row in the `orders` table:

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"side":"BUY","type":"LIMIT","price":50000.00,"quantity":0.01}'
```

## Git workflow for the week (per the SDLC rules in the brief)

```
feature/project-scaffolding        (Day 1)
feature/double-entry-ledger        (Day 2)
feature/jwt-auth-and-wallet        (Day 3)
feature/order-idempotency          (Day 4)
feature/matching-engine            (Day 5)
```

Each branch → PR into `main` → CI must pass → review → merge. Suggested
final PR title for the week, matching the brief: **`feat(core): matching engine and ledger integration`**.
