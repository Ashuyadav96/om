# 💻 Development Guide: Multiplayer AI Orchestration

> **Everything you need to contribute to the project**

---

## 🎯 **Overview**

This guide covers:
- **Development workflow** (how to contribute).
- **Coding standards** (style, conventions).
- **Testing** (unit, integration, E2E).
- **Debugging** (tools and techniques).
- **Deployment** (how to deploy changes).

---

## 🚀 **Development Workflow**

### **1. Fork the Repository**
1. Go to [https://github.com/Ashuyadav96/om](https://github.com/Ashuyadav96/om).
2. Click **"Fork"** in the top-right corner.
3. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/om.git
   cd om
   ```

### **2. Set Up the Project**
Follow the [Setup Guide](SETUP.md) to install dependencies and configure your environment.

### **3. Create a Feature Branch**
```bash
# Check out the main branch
git checkout main

# Pull the latest changes
git pull origin main

# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

**Branch Naming Conventions**:
| **Type** | **Prefix** | **Example** |
|----------|------------|-------------|
| Feature | `feature/` | `feature/multiplayer-chat` |
| Bug Fix | `fix/` | `fix/agent-handoff-bug` |
| Documentation | `docs/` | `docs/api-reference` |
| Refactor | `refactor/` | `refactor/session-manager` |
| Chore | `chore/` | `chore/update-dependencies` |

### **4. Make Your Changes**
- Write **clean, modular code**.
- Follow the **coding standards** (see below).
- Add **tests** for new functionality.
- Update **documentation** if needed.

### **5. Commit Your Changes**
```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add multiplayer chat UI"

# Or use the interactive commit tool
npm run commit
```

**Commit Message Conventions**:
Use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

| **Type** | **Description** | **Example** |
|----------|-----------------|-------------|
| `feat` | New feature | `feat: add live cursors` |
| `fix` | Bug fix | `fix: agent handoff not working` |
| `docs` | Documentation changes | `docs: update API reference` |
| `style` | Code style changes | `style: format ChatInput component` |
| `refactor` | Code refactoring | `refactor: extract AgentRouter logic` |
| `test` | Adding tests | `test: add unit tests for SessionManager` |
| `chore` | Maintenance tasks | `chore: update dependencies` |

### **6. Push Your Changes**
```bash
# Push to your fork
git push origin feature/your-feature-name
```

### **7. Open a Pull Request (PR)**
1. Go to the [original repository](https://github.com/Ashuyadav96/om).
2. Click **"New Pull Request"**.
3. Select your fork and branch.
4. Fill out the **PR template** (see below).
5. Click **"Create Pull Request"**.

### **8. PR Review Process**
1. **Automated Checks**: GitHub Actions will run **tests, linting, and builds**.
2. **Code Review**: Maintainers will review your PR and provide feedback.
3. **Address Feedback**: Make requested changes and push new commits.
4. **Merge**: Once approved, your PR will be merged into `main`.

---

## 📝 **Pull Request Template**

```markdown
## 📌 **Pull Request**

### **Type**
- [ ] ✨ Feature
- [ ] 🐛 Bug Fix
- [ ] 📚 Documentation
- [ ] 🔧 Refactor
- [ ] 🧪 Tests
- [ ] 🤖 Chore

### **Description**
A clear and concise description of the changes.

### **Related Issue**
Fixes #[issue-number] or Closes #[issue-number]

### **Changes Made**
- [ ] Added new feature X
- [ ] Fixed bug Y
- [ ] Updated documentation for Z
- [ ] Added tests for A

### **Screenshots/Videos (if applicable)**
Add screenshots or videos for UI changes.

### **Checklist**
- [ ] Code follows the project's **coding standards**
- [ ] All **tests pass**
- [ ] **Documentation** is updated (if needed)
- [ ] **No breaking changes** (or documented if necessary)
- [ ] **Self-reviewed** my code

### **Additional Notes**
Any additional context or notes for reviewers.
```

---

## 💻 **Coding Standards**

### **1. General Rules**
- **Use TypeScript** for all new code.
- **Follow the existing code style** (use Prettier/ESLint).
- **Write modular code** (small, reusable functions/components).
- **Avoid magic numbers/strings** (use constants or enums).
- **Handle errors gracefully** (use try/catch, validate inputs).
- **Write meaningful variable names** (e.g., `userId` instead of `id`).
- **Comment complex logic** (but avoid unnecessary comments).

### **2. Frontend (React/Next.js)**

#### **File Structure**
```
src/client/
├── components/
│   ├── Chat/
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   └── index.ts
│   ├── Session/
│   │   ├── SessionHeader.tsx
│   │   └── SessionList.tsx
│   └── Agent/
│       ├── AgentSelector.tsx
│       └── AgentControls.tsx
├── pages/
│   ├── _app.tsx
│   ├── index.tsx
│   └── session/
│       └── [id].tsx
├── styles/
│   └── globals.css
├── utils/
│   ├── api.ts
│   └── hooks.ts
└── lib/
    └── yjs.ts
```

#### **Component Guidelines**
- **Use functional components** (not class components).
- **Use TypeScript interfaces** for props:
  ```tsx
  interface ChatMessageProps {
    message: Message;
    user: User;
  }
  
  export const ChatMessage: React.FC<ChatMessageProps> = ({ message, user }) => {
    // ...
  };
  ```
- **Use Tailwind CSS** for styling (avoid inline styles).
- **Extract reusable logic** into custom hooks:
  ```tsx
  // useChat.ts
  export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    // ...
    return { messages, sendMessage };
  };
  ```
- **Use context for global state** (e.g., user, session).

#### **Example Component**
```tsx
// components/Chat/ChatInput.tsx
import { useState } from 'react';
import { useChat } from '../../hooks/useChat';

interface ChatInputProps {
  sessionId: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ sessionId }) => {
  const [input, setInput] = useState('');
  const { sendMessage } = useChat(sessionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 rounded-lg border p-2"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-500 p-2 text-white"
      >
        Send
      </button>
    </form>
  );
};
```

---

### **3. Backend (Node.js/Express)**

#### **File Structure**
```
src/server/
├── controllers/
│   ├── session.ts
│   ├── agent.ts
│   └── user.ts
├── services/
│   ├── SessionManager.ts
│   ├── AgentRouter.ts
│   └── AuthService.ts
├── models/
│   └── schema.prisma
├── routes/
│   ├── session.ts
│   ├── agent.ts
│   └── user.ts
├── middleware/
│   ├── auth.ts
│   └── errorHandler.ts
├── utils/
│   ├── logger.ts
│   └── validators.ts
└── index.ts
```

#### **Controller Guidelines**
- **Keep controllers thin** (business logic goes in services).
- **Use async/await** for database/API calls.
- **Validate inputs** (use Zod or Joi).
- **Handle errors** (use try/catch or middleware).

#### **Example Controller**
```typescript
// controllers/session.ts
import { Request, Response } from 'express';
import { SessionManager } from '../services/SessionManager';
import { z } from 'zod';

const createSessionSchema = z.object({
  name: z.string().min(1),
  agentType: z.enum(['claude', 'codex', 'hermes']),
});

export const createSession = async (req: Request, res: Response) => {
  try {
    const { name, agentType } = createSessionSchema.parse(req.body);
    const userId = req.user.id; // From auth middleware
    
    const session = await SessionManager.createSession({
      name,
      agentType,
      createdById: userId,
    });

    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### **Service Guidelines**
- **Contain business logic** (e.g., session management, agent routing).
- **Use dependency injection** for testability.
- **Avoid direct database access** (use Prisma models).

#### **Example Service**
```typescript
// services/SessionManager.ts
import { PrismaClient, Session, User } from '@prisma/client';
import { Y } from 'yjs';

const prisma = new PrismaClient();

export class SessionManager {
  static async createSession(data: {
    name: string;
    agentType: string;
    createdById: string;
  }): Promise<Session> {
    return prisma.session.create({
      data: {
        name: data.name,
        agentType: data.agentType as any,
        createdById: data.createdById,
        yjsState: Buffer.from(Y.encodeStateAsUpdate(new Y.Doc())),
      },
    });
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { id: sessionId },
      include: { createdBy: true, participants: true },
    });
  }
}
```

---

### **4. Database (Prisma)**

#### **Schema Guidelines**
- **Use descriptive model names** (e.g., `SessionParticipant` instead of `Participant`).
- **Define relations** explicitly.
- **Use enums** for fixed sets of values (e.g., `AgentType`).
- **Add `@default` for sensible defaults** (e.g., timestamps).

#### **Example Schema**
```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  avatar        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[] @relation("CreatedSessions")
  participants  SessionParticipant[]
  agentKeys     AgentKey[]
}

model Session {
  id            String    @id @default(uuid())
  name          String
  agentType     AgentType @default("claude")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     User      @relation("CreatedSessions", fields: [createdById], references: [id])
  createdById   String
  participants  SessionParticipant[]
  messages      Message[]
  yjsState      Bytes?    // Serialized Yjs state
  isPublic      Boolean   @default(false)
  isArchived    Boolean   @default(false)
}

model SessionParticipant {
  id          String   @id @default(uuid())
  session     Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  sessionId   String
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  joinedAt    DateTime @default(now())
  lastActive  DateTime @updatedAt
  role        Role     @default("member")

  @@unique([sessionId, userId])
}

enum AgentType {
  CLAUDE
  CODEX
  HERMES
  OPENCLAW
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

---

### **5. Real-Time (Yjs + Socket.io)**

#### **Yjs Setup**
```typescript
// lib/yjs.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export const setupYjs = (sessionId: string, websocketUrl: string) => {
  const yDoc = new Y.Doc();
  const provider = new WebsocketProvider(websocketUrl, sessionId, yDoc);
  
  // Define shared types
  const yMessages = yDoc.getArray<Message>('messages');
  const yUsers = yDoc.getMap<User>('users');
  const yCursors = yDoc.getMap<CursorData>('cursors');
  
  return { yDoc, provider, yMessages, yUsers, yCursors };
};
```

#### **Socket.io Server**
```typescript
// server/index.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Y } from 'yjs';
import { setupWebsocketProvider } from 'y-websocket';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Set up Yjs WebSocket provider
setupWebsocketProvider(io, {
  doc: (sessionId) => new Y.Doc(),
  // Optional: authentication
  authentication: (sessionId, token) => {
    return { authenticated: true };
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log('WebSocket server running on port 3001');
});
```

---

## 🧪 **Testing**

### **1. Unit Tests**
- **Framework**: Jest + `@testing-library/react` (frontend), Jest + Supertest (backend).
- **Location**: `src/__tests__/` or `src/**/*.test.ts`.
- **Run Tests**:
  ```bash
  npm test
  ```

#### **Example Unit Test (Backend)**
```typescript
// __tests__/services/SessionManager.test.ts
import { SessionManager } from '../../server/services/SessionManager';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('SessionManager', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await prisma.session.deleteMany();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await SessionManager.createSession({
        name: 'Test Session',
        agentType: 'claude',
        createdById: 'user-123',
      });

      expect(session.name).toBe('Test Session');
      expect(session.agentType).toBe('claude');
      expect(session.createdById).toBe('user-123');
    });
  });
});
```

#### **Example Unit Test (Frontend)**
```tsx
// __tests__/components/ChatInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../../client/components/Chat/ChatInput';

describe('ChatInput', () => {
  it('should call sendMessage when form is submitted', () => {
    const mockSendMessage = jest.fn();
    render(<ChatInput sessionId="session-123" sendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.click(button);

    expect(mockSendMessage).toHaveBeenCalledWith('Hello!');
  });
});
```

---

### **2. Integration Tests**
- **Framework**: Supertest (backend), Cypress (frontend).
- **Location**: `src/__tests__/integration/`.
- **Run Tests**:
  ```bash
  npm run test:integration
  ```

#### **Example Integration Test**
```typescript
// __tests__/integration/session.test.ts
import { app } from '../../server/index';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

const prisma = new PrismaClient();

describe('Session Routes', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Integration Test Session',
          agentType: 'claude',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Integration Test Session');
    });
  });
});
```

---

### **3. End-to-End Tests**
- **Framework**: Cypress or Playwright.
- **Location**: `cypress/` or `playwright/`.
- **Run Tests**:
  ```bash
  npm run test:e2e
  ```

#### **Example E2E Test (Cypress)**
```typescript
// cypress/e2e/session.cy.ts
describe('Session Flow', () => {
  it('should allow a user to create and join a session', () => {
    cy.visit('/');
    
    // Sign in (mock auth)
    cy.get('[data-testid="signin-button"]').click();
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password');
    cy.get('[data-testid="submit-button"]').click();
    
    // Create a new session
    cy.get('[data-testid="create-session-button"]').click();
    cy.get('[data-testid="session-name-input"]').type('Test Session');
    cy.get('[data-testid="submit-button"]').click();
    
    // Verify session was created
    cy.url().should('include', '/session/');
    cy.get('[data-testid="session-name"]').should('contain', 'Test Session');
  });
});
```

---

## 🐛 **Debugging**

### **1. Frontend Debugging**
- **Browser DevTools**: Open with `F12` or `Ctrl+Shift+I`.
- **React DevTools**: Install the [React Developer Tools](https://react.dev/learn/react-developer-tools) extension.
- **Redux DevTools**: If using Redux, install the [Redux DevTools](https://redux.js.org/usage/dev-tools) extension.
- **Logging**: Use `console.log`, `console.error`, etc.

### **2. Backend Debugging**
- **Logging**: The backend uses `winston` for structured logging.
  ```bash
  # View logs in the terminal
  npm run dev:backend
  
  # Or tail the log file
  tail -f logs/server.log
  ```
- **Debugger**: Use Node.js debugger:
  ```bash
  # Start the server with debugger
  node --inspect-brk ./node_modules/.bin/ts-node src/server/index.ts
  
  # Open Chrome DevTools
  chrome://inspect
  ```
- **Database Debugging**:
  - **Prisma Studio**: Visualize and edit your database:
    ```bash
    npx prisma studio
    ```
    Open [http://localhost:5555](http://localhost:5555).
  - **psql**: Connect directly to PostgreSQL:
    ```bash
    psql -U postgres -d multiplayer_ai
    ```

### **3. Real-Time Debugging**
- **Socket.io Debugging**:
  - Enable debug logging:
    ```typescript
    const io = new Server(httpServer, {
      cors: { ... },
      logger: true, // Enable debug logging
    });
    ```
  - Use the **Socket.io Inspector** (Chrome extension).
- **Yjs Debugging**:
  - Log Yjs updates:
    ```typescript
    yDoc.on('update', (update: Uint8Array) => {
      console.log('Yjs update:', update);
    });
    ```

---

## 🚀 **Deployment**

### **1. Vercel (Frontend)**
1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy:
   ```bash
   vercel
   ```
3. Follow the prompts to link your project.

### **2. Railway (Backend)**
1. Install the Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
2. Deploy:
   ```bash
   railway up
   ```
3. Follow the prompts to configure your project.

### **3. Docker (Self-Hosted)**
1. Build the Docker images:
   ```bash
   docker-compose build
   ```
2. Start the containers:
   ```bash
   docker-compose up -d
   ```
3. Access the app at `http://localhost:3000`.

### **4. Environment Variables in Production**
Ensure all required environment variables are set in your production environment:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `SOCKET_IO_CORS_ORIGIN`
- Agent API keys (e.g., `ANTHROPIC_API_KEY`)

---

## 📚 **Learning Resources**

### **Frontend**
- [Next.js Docs](https://nextjs.org/docs) – Official Next.js documentation.
- [React Docs](https://react.dev/learn) – React fundamentals and best practices.
- [Tailwind CSS Docs](https://tailwindcss.com/docs) – Utility-first CSS framework.
- [TypeScript Docs](https://www.typescriptlang.org/docs/) – TypeScript handbook.

### **Backend**
- [Express.js Docs](https://expressjs.com/) – Express.js guide.
- [Prisma Docs](https://www.prisma.io/docs) – Prisma ORM documentation.
- [Node.js Docs](https://nodejs.org/en/docs/) – Node.js API reference.

### **Real-Time**
- [Socket.io Docs](https://socket.io/docs/v4/) – Real-time communication.
- [Yjs Docs](https://docs.yjs.dev/) – CRDT library for real-time collaboration.

### **Testing**
- [Jest Docs](https://jestjs.io/docs/getting-started) – JavaScript testing framework.
- [Cypress Docs](https://docs.cypress.io/) – End-to-end testing framework.
- [Supertest Docs](https://github.com/visionmedia/supertest) – HTTP assertions for Express.

---

## 🙏 **Contributing Guidelines**

1. **Follow the workflow**: Use feature branches and PRs.
2. **Write tests**: Add tests for new features and bug fixes.
3. **Document your code**: Add comments for complex logic.
4. **Keep commits atomic**: Each commit should do one thing.
5. **Review others' PRs**: Help improve the project.

For more details, see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## 📞 **Need Help?**

If you have questions or need assistance:
1. Check the **[FAQ](#-faq)** below.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

### **FAQ**

#### **Q: How do I add a new AI agent?**
A: 
1. Create a new adapter in `src/server/services/agents/` (e.g., `DevinAdapter.ts`).
2. Implement the `AgentAdapter` interface.
3. Add the agent to the `agentRegistry` in `AgentRouter.ts`.
4. Update the `AgentType` enum in `prisma/schema.prisma`.

#### **Q: How do I add a new integration (e.g., Notion)?**
A:
1. Create a new service in `src/server/services/integrations/` (e.g., `NotionService.ts`).
2. Add API routes in `src/server/routes/integrations.ts`.
3. Update the frontend to call the new routes.

#### **Q: How do I debug a WebSocket issue?**
A:
1. Enable debug logging in Socket.io:
   ```typescript
   const io = new Server(httpServer, { logger: true });
   ```
2. Use the **Socket.io Inspector** Chrome extension.
3. Check the **browser’s Network tab** for WebSocket connections.

#### **Q: How do I test Yjs locally?**
A:
1. Start the WebSocket server:
   ```bash
   npm run dev:backend
   ```
2. Open two browser tabs to `http://localhost:3000`.
3. Join the same session and type in both tabs to see real-time sync.

---

**Happy coding!** 🎉
