# DevCollab — AI-Powered Code Review & Collaboration Platform

A full-stack web application where developers submit code, Claude AI automatically reviews it for bugs and security issues, and teammates collaborate with real-time inline comments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Monaco Editor, Recharts, Zustand, Axios, STOMP.js |
| **Backend** | Java 17, Spring Boot 3.2, Spring Security, JWT, Spring WebSocket (STOMP) |
| **Database** | PostgreSQL 15 (JPA / Hibernate ORM) |
| **AI** | OpenRouter API — Claude 3.5 Sonnet with automatic model fallback |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD, Nginx |
| **Deploy** | Render (backend + frontend + PostgreSQL — all free tier) |

---

## Features

- **AI Code Review** — Paste code → OpenRouter calls Claude 3.5 Sonnet → returns bugs, security issues, and best practices with line numbers
- **Auto Fallback** — If Claude is rate-limited, automatically retries with Claude Haiku → Gemini Flash → Llama 3.1 (free), using one API key
- **Real-Time Collaboration** — STOMP WebSocket lets multiple users see comments appear live without refreshing
- **Monaco Editor** — VS Code-quality code editor with syntax highlighting for 15+ languages
- **Dashboard Analytics** — Code quality score trends, issues by type (pie chart), reviews by language (bar chart), contributor leaderboard
- **JWT Authentication** — Stateless auth with BCrypt password hashing
- **Swagger UI** — Full interactive API docs at `/swagger-ui.html`

---

## Project Structure

```
devcollab/
├── backend/
│   └── src/main/java/com/devcollab/
│       ├── config/
│       │   ├── SecurityConfig.java         JWT + CORS (reads env vars)
│       │   ├── WebSocketConfig.java        STOMP WebSocket setup
│       │   ├── JwtUtils.java               Token generate/validate
│       │   ├── JwtAuthenticationFilter.java  Per-request JWT check
│       │   └── DataSeeder.java             Creates demo users on startup
│       ├── controller/
│       │   ├── AuthController.java         POST /api/auth/register, /login
│       │   ├── CodeReviewController.java   CRUD + AI trigger endpoints
│       │   ├── DashboardController.java    GET /api/dashboard/stats
│       │   └── GlobalExceptionHandler.java Consistent error responses
│       ├── service/
│       │   ├── ClaudeAiService.java        OpenRouter call + fallback chain
│       │   ├── CodeReviewService.java      Business logic + WebSocket broadcast
│       │   ├── AuthService.java            Register/login logic
│       │   ├── DashboardService.java       Analytics aggregation
│       │   └── UserDetailsServiceImpl.java Spring Security user loader
│       ├── entity/                         JPA entities (DB tables)
│       │   ├── User.java
│       │   ├── CodeReview.java
│       │   ├── ReviewComment.java
│       │   └── AiReviewResult.java
│       ├── dto/                            Request/Response objects
│       ├── repository/                     JPA repository interfaces
│       └── websocket/
│           └── CollaborationWebSocketHandler.java  Join/leave/cursor events
│
├── frontend/src/
│   ├── components/
│   │   ├── auth/          Login.tsx, Register.tsx
│   │   ├── dashboard/     Dashboard.tsx (Recharts graphs)
│   │   ├── review/        ReviewList.tsx, NewReview.tsx, ReviewDetail.tsx
│   │   └── layout/        Navbar.tsx
│   ├── services/
│   │   ├── api.ts         Axios instance with JWT interceptor
│   │   └── websocket.ts   STOMP client (connect/subscribe/publish)
│   ├── store/
│   │   └── authStore.ts   Zustand global auth state
│   └── types/index.ts     TypeScript interfaces for all data shapes
│
├── .github/workflows/ci.yml   GitHub Actions: build + test on every push
├── docker-compose.yml          Local dev: postgres + backend + frontend
├── render.yaml                 Render deploy blueprint (one-click)
└── .env.example                Template — copy to .env
```

---

## Local Setup (VS Code)

### Prerequisites

Install these before starting:

| Tool | Download |
|---|---|
| Node.js 18+ | https://nodejs.org |
| Java 17+ | https://adoptium.net |
| Maven 3.8+ | https://maven.apache.org/download.cgi |
| Docker Desktop | https://docker.com/products/docker-desktop |
| Git | https://git-scm.com |

Verify each is installed:
```bash
node --version   # v18+
java --version   # 17+
mvn --version    # 3.8+
docker --version
```

---

### Step 1 — Get a Free OpenRouter API Key

1. Go to **https://openrouter.ai/keys**
2. Sign up free → click **Create Key**
3. Copy the key (looks like `sk-or-v1-xxxxxxxxxx`)
4. Free credits included; also has truly free models (Llama 3.1)

---

### Step 2 — Clone and Configure

```bash
git clone https://github.com/YOUR_USERNAME/devcollab.git
cd devcollab

cp .env.example .env
```

Open `.env` and set:
```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

---

### Step 3 — Run (Docker — Recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Swagger Docs | http://localhost:8080/swagger-ui.html |

**Demo login:** `demo@devcollab.io` / `demo1234`

Two sample reviews are pre-loaded. Click **🤖 Re-run AI** on either to see the AI review in action.

---

### Step 3 (Alternative) — Run Without Docker

```bash
# Start only the database
docker-compose up postgres -d

# Terminal 1 — Backend
cd backend
export OPENROUTER_API_KEY=sk-or-v1-your-key    # Mac/Linux
# set OPENROUTER_API_KEY=sk-or-v1-your-key     # Windows
mvn clean install -DskipTests
mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm install
npm start
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, get JWT token |
| POST | `/api/reviews` | Yes | Submit code for review |
| GET | `/api/reviews` | Yes | All reviews (paginated) |
| GET | `/api/reviews/my` | Yes | My reviews |
| GET | `/api/reviews/{id}` | Yes | Review detail with comments |
| POST | `/api/reviews/{id}/ai-review` | Yes | Trigger AI review |
| POST | `/api/reviews/{id}/comments` | Yes | Add inline comment |
| PATCH | `/api/reviews/{id}/status` | Yes | Update status |
| GET | `/api/dashboard/stats` | Yes | Analytics data |
| WS | `/ws` (STOMP) | Yes | Real-time collab channel |

Full interactive docs: **http://localhost:8080/swagger-ui.html**

---

## AI Fallback Chain

Uses a single `OPENROUTER_API_KEY`. If one model fails or is rate-limited, automatically moves to the next:

```
1. anthropic/claude-3.5-sonnet     ← best quality
2. anthropic/claude-3-haiku        ← fast, cheap
3. google/gemini-flash-1.5         ← solid fallback
4. meta-llama/llama-3.1-8b-instruct:free  ← always free, never fails
```

Configured in `application.properties` — edit the `openrouter.models` line to change order or add models.

---
