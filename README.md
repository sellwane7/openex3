# OpenEx 3.0 - A Simulated Crypto Exchange & AI Trading Terminal

A lightweight, simulated crypto exchange built as a 3-week capstone project, using a fully open-source microservices architecture: a Kotlin/Spring Boot trading engine, a React real-time UI, and a Python/LangChain AI trading assistant powered by a local Ollama model.

## Architecture
                +-------------------+
                |   React Frontend  |  (Vite, port 5173)
                +---------+---------+
                          |
          +---------------+----------------+
          |                                 |
+---------v---------+           +-----------v-----------+
|  Kotlin Backend    |           |   Python AI Service    |
|  Spring Boot       |<----------|   Flask + LangChain    |
|  port 8080         |  wallet   |   port 5000             |
+---------+----------+  lookup   +-----------+-------------+
          |                                   |
+---------+----------+                        |
|                    |                +--------v--------+

+---v----+ +----v----+ | Ollama (host) |
|Postgres| | Redis | | llama3.2, 11434 |
| 5432 | | 6379 | +-------------------+
+--------+ +---------+


- **Backend (Kotlin/Spring Boot)** - double-entry ledger, JWT auth, idempotent orders, in-memory matching engine, WebSocket order book broadcasting.
- **Frontend (React/Vite)** - trading terminal UI: auth, order forms, live order book, market chart, floating AI chat widget.
- **Python AI Service (Flask/LangChain)** - simulated market data (Pandas/NumPy), and a ReAct agent that can call a tool to fetch a user's real wallet balance from the Kotlin backend.
- **Ollama** - runs the local LLM (`llama3.2`) that powers the AI assistant, fully containerized alongside the rest of the stack with its own persistent volume for model storage.

## Prerequisites

- Docker Desktop (with Docker Compose)
- [Ollama](https://ollama.com/download) installed on the host machine
- Node.js 18+ (only needed if running the frontend outside Docker, see below)

## One-time setup

1. **Start the stack, then pull the model into the running Ollama container (first time only):**
```bash
docker compose up -d --build
docker exec -it openex-ollama ollama pull llama3.2
```

2. **Clone the repo and enter the project root:**
```bash
   cd openex3
```

## Running the full stack

The backend, database, cache, and AI service all start with a single command:

```bash
docker compose up -d --build
```

This will:
- Start Postgres and Redis, and wait for both to report healthy
- Build and start the Kotlin backend once the database is healthy (runs Flyway migrations automatically)
- Build and start the Python AI service once the backend is healthy
- All four containers include health checks (`docker ps` will show `(healthy)` for each)

Check everything is up:
```bash
docker ps
```

**Note on first build:** the very first `docker-compose up` will take several minutes since it downloads base images and installs dependencies. Subsequent runs are much faster due to Docker's layer caching.

### Running the frontend

The frontend is fully containerized and starts automatically with the rest of the stack - no separate steps needed. It's served by nginx on port 80, which also reverse-proxies API, WebSocket, and AI service requests so the browser only ever talks to `http://localhost`.

## Service ports

| Service | Port | Purpose |
|---|---|---|
| Frontend (nginx) | 80 | React trading terminal |
| Backend (Kotlin) | 8080 | REST API, JWT auth, WebSocket order book |
| Python AI Service | 5000 | Market data API, AI chat |
| Postgres | 5432 | Primary database |
| Redis | 6379 | Idempotency key cache |
| Ollama | 11434 | Local LLM inference (container, internal only) |

## Day-by-day map of this repo

### Week 1 - Core Engine & DB Integrity (Kotlin)

| Day | What it added | Where to look |
|---|---|---|
| 1 | Project skeleton, Docker Compose, CI | `backend/build.gradle.kts`, `docker-compose.yml`, `.github/workflows/ci.yml` |
| 2 | Double-entry ledger | `db/migration/V1__init_ledger_schema.sql`, `service/LedgerService.kt` |
| 3 | JWT auth + wallet deposit | `security/`, `controller/AuthController.kt`, `controller/WalletController.kt` |
| 4 | Orders + idempotency | `service/IdempotencyService.kt`, `controller/OrderController.kt` |
| 5 | Matching engine | `service/MatchingEngineService.kt` |

### Week 2 - Real-Time Streaming & UI (React)

| Day | What it added | Where to look |
|---|---|---|
| 6 | Spring WebSockets, order book broadcasting | `config/WebSocketConfig.kt`, `controller/OrderBookController.kt` |
| 7 | React scaffolding, routing, Zustand state | `frontend/src/App.jsx`, `frontend/src/store/authStore.js` |
| 8 | Login/register UI, wallet dashboard | `frontend/src/pages/Login.jsx`, `frontend/src/pages/Dashboard.jsx` |
| 9 | Order execution forms, idempotency headers | `frontend/src/components/OrderForm.jsx` |
| 10 | Live order book rendering | `frontend/src/components/OrderBook.jsx`, `frontend/src/hooks/useOrderBookSocket.js` |

### Week 3 - Analytics & Agentic AI (Python)

| Day | What it added | Where to look |
|---|---|---|
| 11 | Flask API, market simulator (Pandas/NumPy) | `python-service/app/market_simulator.py` |
| 12 | Ollama + LangChain chat, financial persona | `python-service/app/chat_agent.py` |
| 13 | Agentic tool calling (real wallet lookup) | `python-service/app/wallet_tool.py` |
| 14 | Chart.js market chart, floating chat UI | `frontend/src/components/MarketChart.jsx`, `frontend/src/components/ChatWidget.jsx` |
| 15 | Docker health checks, full-stack cold start, this README | `docker-compose.yml` |

## Manually proving the AI agent works (curl)

```bash
# Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"supersecret1"}'

# Deposit funds (replace <TOKEN> with the token from registration)
curl -X POST http://localhost:8080/api/wallets/deposit \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","amount":2500}'

# Ask the AI assistant about your balance - it calls the Kotlin API live
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my USD balance?"}'
```

The AI's reply should quote the real, current balance - proof the LangChain agent is genuinely calling the tool rather than guessing.

## Running tests

```bash
cd backend
./gradlew test
```

Uses an in-memory H2 database, no Docker required.

## Git workflow (per the SDLC rules in the brief)

Feature-branch workflow, Conventional Commits, PR required for every merge into `main`, CI must pass before merge.

feature/project-scaffolding (Week 1, Day 1)
feature/double-entry-ledger (Week 1, Day 2)
feature/jwt-auth-and-wallet (Week 1, Day 3)
feature/order-idempotency (Week 1, Day 4)
feature/matching-engine (Week 1, Day 5)
feature/websocket-orderbook (Week 2, Day 6)
feature/react-scaffold (Week 2, Days 7-10)
feature/market-simulator (Week 3, Days 11-15)


PR titles matching the brief's requirements:
- `feat(core): matching engine and ledger integration` (Week 1)
- `feat(ui): real-time order book integration` (Week 2)
- `feat(ai): agentic trading assistant` (Week 3)

## Known design decisions

- **Ollama and the frontend are both fully containerized**, started with everything else via a single `docker compose up -d --build`. The model must be pulled once into the running container (see setup above) since it isn't baked into the image.