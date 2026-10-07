# 🛠 Development Setup: Multiplayer AI Orchestration

> **Get the project running locally in under 10 minutes**

---

## 🎯 **Prerequisites**

Before you begin, ensure you have the following installed:

| **Tool** | **Version** | **Purpose** | **Installation Link** |
|----------|-------------|-------------|------------------------|
| **Node.js** | v18+ | JavaScript runtime | [https://nodejs.org/](https://nodejs.org/) |
| **npm** | v9+ | Package manager | Included with Node.js |
| **yarn** | v1.22+ | Alternative package manager | [https://yarnpkg.com/](https://yarnpkg.com/) |
| **PostgreSQL** | v14+ | Database | [https://www.postgresql.org/](https://www.postgresql.org/) |
| **Docker** | v20+ | Containerization (optional) | [https://www.docker.com/](https://www.docker.com/) |
| **Git** | v2+ | Version control | [https://git-scm.com/](https://git-scm.com/) |

**Verify Installations**:
```bash
# Check Node.js
node -v
# Should output: v18.x.x or higher

# Check npm
npm -v
# Should output: 9.x.x or higher

# Check PostgreSQL
psql --version
# Should output: psql (PostgreSQL) 14.x or higher

# Check Docker (optional)
docker --version
# Should output: Docker version 20.x.x or higher
```

---

## 🚀 **Quick Start**

### **1. Clone the Repository**
```bash
git clone https://github.com/Ashuyadav96/om.git
cd om
```

### **2. Install Dependencies**
```bash
# Using npm
npm install

# Or using yarn
 yarn install
```

### **3. Set Up Environment Variables**
```bash
# Copy the example .env file
cp .env.example .env

# Edit .env with your local settings
nano .env  # or use your preferred editor
```

### **4. Set Up PostgreSQL**
#### **Option A: Local PostgreSQL**
1. Start PostgreSQL:
   ```bash
   # On macOS (Homebrew)
   brew services start postgresql
   
   # On Linux (Ubuntu/Debian)
   sudo service postgresql start
   
   # On Windows
   # Start PostgreSQL via Services or pgAdmin
   ```
2. Create a database:
   ```bash
   psql -U postgres -c "CREATE DATABASE multiplayer_ai;"
   ```
3. Update `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/multiplayer_ai"
   ```

#### **Option B: Docker (Recommended for Development)**
1. Start PostgreSQL in Docker:
   ```bash
   docker run --name multiplayer-ai-db -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres
   ```
2. Update `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/postgres"
   ```

#### **Option C: Supabase (Cloud Database)**
1. Sign up for Supabase: [https://supabase.com/](https://supabase.com/)
2. Create a new project and database.
3. Update `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

### **5. Run Database Migrations**
```bash
# Using Prisma (our ORM)
npx prisma generate
npx prisma migrate dev
```

### **6. Seed the Database (Optional)**
```bash
# Run the seed script (if available)
npx prisma db seed
```

### **7. Start the Development Servers**
```bash
# Start the frontend (Next.js)
npm run dev:frontend

# In a new terminal, start the backend (Node.js)
npm run dev:backend

# Or start both with a single command
npm run dev
```

### **8. Open the App**
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 **Project Structure**

```
multiplayer-ai-orchestration/
├── docs/                      # Documentation (you're here!)
├── src/
│   ├── client/               # Frontend (Next.js)
│   │   ├── components/       # React components
│   │   │   ├── Chat/         # Chat-related components
│   │   │   ├── Session/      # Session management components
│   │   │   ├── Agent/        # Agent controls
│   │   │   └── ...
│   │   ├── pages/            # Next.js pages
│   │   │   ├── _app.tsx      # Custom App
│   │   │   ├── index.tsx     # Home page
│   │   │   ├── session/      # Session pages
│   │   │   │   └── [id].tsx  # Dynamic session page
│   │   │   └── ...
│   │   ├── styles/           # CSS/Tailwind styles
│   │   ├── utils/            # Frontend utilities
│   │   └── lib/              # Shared frontend libraries
│   │
│   ├── server/               # Backend (Node.js)
│   │   ├── controllers/      # Route controllers
│   │   │   ├── session.ts    # Session controller
│   │   │   ├── agent.ts      # Agent controller
│   │   │   └── ...
│   │   ├── services/         # Business logic
│   │   │   ├── SessionManager.ts  # Session management
│   │   │   ├── AgentRouter.ts     # Agent routing
│   │   │   └── ...
│   │   ├── models/           # Database models (Prisma)
│   │   │   └── schema.prisma # Prisma schema
│   │   ├── routes/           # Express routes
│   │   │   ├── session.ts    # Session routes
│   │   │   ├── agent.ts      # Agent routes
│   │   │   └── ...
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts       # Authentication
│   │   │   └── ...
│   │   ├── utils/            # Backend utilities
│   │   └── index.ts          # Server entry point
│   │
│   └── shared/               # Shared code (frontend + backend)
│       ├── types/            # TypeScript types
│       └── constants/        # Shared constants
│
├── .env.example              # Example environment variables
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
├── prisma/
│   ├── schema.prisma         # Prisma schema
│   └── seed.ts               # Database seed script
├── public/                   # Static assets
└── README.md                 # Project README
```

---

## 🔧 **Environment Variables**

The project uses the following environment variables (defined in `.env`):

### **Required Variables**

| **Variable** | **Description** | **Example** | **Default** |
|--------------|-----------------|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/db` | - |
| `NEXTAUTH_URL` | Frontend URL (for auth callbacks) | `http://localhost:3000` | - |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | `your-secret-key` | - |
| `SOCKET_IO_CORS_ORIGIN` | Allowed origins for Socket.io | `http://localhost:3000` | - |

### **Agent API Keys (Optional for Local Dev)**

| **Variable** | **Description** | **Example** | **Default** |
|--------------|-----------------|-------------|-------------|
| `ANTHROPIC_API_KEY` | API key for Claude | `sk-ant-xxxxx` | - |
| `OPENAI_API_KEY` | API key for Codex | `sk-xxxxx` | - |
| `HUGGINGFACE_API_KEY` | API key for Hermes | `hf_xxxxx` | - |

### **Optional Variables**

| **Variable** | **Description** | **Example** | **Default** |
|--------------|-----------------|-------------|-------------|
| `PORT` | Backend server port | `3001` | `3001` |
| `NODE_ENV` | Node.js environment | `development` | `development` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | - |
| `PINECONE_API_KEY` | Pinecone API key (for vector DB) | `xxxx` | - |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `us-west1-gcp` | - |

---

## 🐳 **Docker Setup (Alternative)**

For a **fully containerized** development environment, use Docker Compose:

### **1. Install Docker Compose**
Ensure you have Docker Compose installed:
```bash
docker-compose --version
# Should output: docker-compose version 1.x.x or higher
```

### **2. Create `docker-compose.yml`**
```yaml
version: '3.8'

services:
  # Postgres Database
  db:
    image: postgres:15
    container_name: multiplayer-ai-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: multiplayer_ai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis (for caching and rate limiting)
  redis:
    image: redis:7
    container_name: multiplayer-ai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Backend Server
  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    container_name: multiplayer-ai-server
    environment:
      DATABASE_URL: postgresql://postgres:yourpassword@db:5432/multiplayer_ai
      NODE_ENV: development
      PORT: 3001
      REDIS_URL: redis://redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  # Frontend App
  client:
    build:
      context: .
      dockerfile: Dockerfile.client
    container_name: multiplayer-ai-client
    environment:
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: your-secret-key
      NEXT_PUBLIC_API_URL: http://localhost:3001
    ports:
      - "3000:3000"
    depends_on:
      - server

volumes:
  postgres_data:
  redis_data:
```

### **3. Create `Dockerfile.server`**
```dockerfile
FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start:backend"]
```

### **4. Create `Dockerfile.client`**
```dockerfile
FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start:frontend"]
```

### **5. Start the Containers**
```bash
# Build and start all services
docker-compose up --build

# Or start in detached mode
docker-compose up --build -d
```

### **6. Stop the Containers**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## 🔌 **Agent API Setup**

To test **AI agent integrations**, you’ll need API keys for the agents you want to use. Here’s how to set them up:

### **1. Anthropic (Claude)**
1. Sign up for Anthropic: [https://www.anthropic.com/](https://www.anthropic.com/)
2. Get your API key from the **Developer Console**.
3. Add to `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```

### **2. OpenAI (Codex)**
1. Sign up for OpenAI: [https://platform.openai.com/](https://platform.openai.com/)
2. Get your API key from the **API Keys** page.
3. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-xxxxx
   ```

### **3. Hugging Face (Hermes)**
1. Sign up for Hugging Face: [https://huggingface.co/](https://huggingface.co/)
2. Get your API key from **Settings > Access Tokens**.
3. Add to `.env`:
   ```env
   HUGGINGFACE_API_KEY=hf_xxxxx
   ```

### **4. Testing Agents Locally**
Once you’ve added your API keys, you can test agent integrations:

```bash
# Test Claude
curl -X POST http://localhost:3001/api/agent/claude 
  -H "Content-Type: application/json" 
  -d '{"prompt": "Hello, Claude!"}'

# Test Codex
curl -X POST http://localhost:3001/api/agent/codex 
  -H "Content-Type: application/json" 
  -d '{"prompt": "Write a Python function to sort a list."}'
```

---

## 🧪 **Running Tests**

### **Unit Tests**
```bash
# Run all unit tests
npm test

# Run tests for a specific file
npm test -- src/server/services/AgentRouter.test.ts

# Run tests with coverage
npm test -- --coverage
```

### **Integration Tests**
```bash
# Run integration tests
npm run test:integration

# Run a specific integration test
npm run test:integration -- src/server/routes/session.test.ts
```

### **End-to-End Tests**
```bash
# Run E2E tests (using Cypress or Playwright)
npm run test:e2e

# Run E2E tests in headed mode (for debugging)
npm run test:e2e --headed
```

---

## 🐛 **Debugging**

### **Frontend Debugging**
1. **Browser DevTools**: Open Chrome/Firefox DevTools (`F12` or `Ctrl+Shift+I`).
2. **React DevTools**: Install the [React Developer Tools](https://react.dev/learn/react-developer-tools) extension.
3. **Redux DevTools**: If using Redux, install the [Redux DevTools](https://redux.js.org/usage/dev-tools) extension.

### **Backend Debugging**
1. **Logging**: The backend uses `console.log` and `winston` for logging.
   ```bash
   # View logs in the terminal
   npm run dev:backend
   
   # Or tail the log file (if using Winston)
   tail -f logs/server.log
   ```
2. **Debugger**: Use Node.js debugger:
   ```bash
   # Start the server with debugger
   node --inspect-brk ./node_modules/.bin/ts-node src/server/index.ts
   
   # Open Chrome DevTools
   chrome://inspect
   ```

### **Database Debugging**
1. **Prisma Studio**: Visualize and edit your database:
   ```bash
   npx prisma studio
   ```
   Open [http://localhost:5555](http://localhost:5555) in your browser.

2. **psql**: Connect directly to PostgreSQL:
   ```bash
   psql -U postgres -d multiplayer_ai
   ```

---

## 📝 **Common Issues & Fixes**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| **`Error: Database connection failed`** | Incorrect `DATABASE_URL` | Check `.env` and PostgreSQL credentials. |
| **`Error: Cannot find module '...'`** | Missing dependencies | Run `npm install`. |
| **`Error: Prisma schema out of sync`** | Database schema changed | Run `npx prisma migrate dev`. |
| **`Error: WebSocket connection failed`** | Backend not running | Start the backend with `npm run dev:backend`. |
| **`Error: Agent API key missing`** | Missing API key | Add the key to `.env` (e.g., `ANTHROPIC_API_KEY`). |
| **`Error: CORS blocked request`** | Incorrect `NEXTAUTH_URL` | Update `NEXTAUTH_URL` in `.env`. |
| **Frontend not updating** | HMR not working | Restart the dev server (`npm run dev:frontend`). |
| **`Error: Port 3000 in use`** | Port conflict | Kill the process (`lsof -i :3000`) or change the port. |

---

## 📚 **Additional Resources**

- [Next.js Docs](https://nextjs.org/docs) – Frontend framework documentation.
- [Express.js Docs](https://expressjs.com/) – Backend framework documentation.
- [Prisma Docs](https://www.prisma.io/docs) – Database ORM documentation.
- [Yjs Docs](https://docs.yjs.dev/) – CRDT library documentation.
- [Socket.io Docs](https://socket.io/docs/v4/) – Real-time communication library.
- [TypeScript Docs](https://www.typescriptlang.org/docs/) – TypeScript documentation.

---

## 🚀 **Next Steps**

1. **Run the app locally**: Follow the [Quick Start](#-quick-start) guide.
2. **Explore the codebase**: Check out the [Project Structure](#-project-structure).
3. **Test agent integrations**: Set up your [Agent API Keys](#-agent-api-setup).
4. **Start developing**: Read the [Development Guide](DEVELOPMENT.md).

---

## 📞 **Need Help?**

If you encounter any issues:
1. Check the **[Common Issues & Fixes](#-common-issues--fixes)** table.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

**Happy coding!** 🎉
