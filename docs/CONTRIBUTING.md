# 🤝 Contributing to Multiplayer AI Orchestration

> **How to contribute to the project**

---

## 🎉 **Welcome!**

Thank you for your interest in contributing to **Multiplayer AI Orchestration**! This project is **open-source**, and we **welcome contributions** from everyone. Whether you're a **developer, designer, tester, or documentation writer**, there are many ways to get involved.

---

## 📌 **Code of Conduct**

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand the **expected behavior** and **guidelines** for contributing.

---

## 🚀 **How to Contribute**

There are **many ways** to contribute to this project:

| **Type** | **Description** | **Difficulty** | **Impact** |
|----------|-----------------|----------------|------------|
| **Bug Reports** | Report bugs or issues | Easy | High |
| **Feature Requests** | Suggest new features | Easy | Medium |
| **Documentation** | Improve docs, tutorials, examples | Easy | High |
| **Code Contributions** | Fix bugs, add features | Medium | High |
| **Tests** | Add unit/integration/E2E tests | Medium | High |
| **Design** | Improve UI/UX | Medium | High |
| **Community** | Help others, answer questions | Easy | Medium |

---

## 🐛 **Reporting Bugs**

If you find a bug, please **open an issue** on GitHub with the following details:

### **Bug Report Template**

```markdown
## 🐛 Bug Report

### **Description**
A clear and concise description of the bug.

### **Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### **Expected Behavior**
What you expected to happen.

### **Actual Behavior**
What actually happened.

### **Screenshots/Videos**
If applicable, add screenshots or videos to help explain the problem.

### **Environment**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Node.js version: [e.g., v18.0.0]
- npm/yarn version: [e.g., v9.0.0]

### **Additional Context**
Any other context about the problem (e.g., logs, error messages).
```

### **Example Bug Report**

```markdown
## 🐛 Bug Report

### **Description**
When I try to join a session, the WebSocket connection fails with a `403 Forbidden` error.

### **Steps to Reproduce**
1. Open the app at `http://localhost:3000`.
2. Log in with my account.
3. Click on a session to join.
4. See `403 Forbidden` error in the console.

### **Expected Behavior**
I should be able to join the session without errors.

### **Actual Behavior**
I get a `403 Forbidden` error and cannot join the session.

### **Screenshots**
![Console error](https://i.imgur.com/abc123.png)

### **Environment**
- OS: macOS Ventura 13.4
- Browser: Chrome 115.0.0.0
- Node.js: v18.16.0
- npm: v9.6.0

### **Additional Context**
The error occurs when the JWT token is expired. The frontend should automatically refresh the token.
```

---

## 💡 **Suggesting Features**

If you have an idea for a new feature, please **open an issue** on GitHub with the following details:

### **Feature Request Template**

```markdown
## 💡 Feature Request

### **Description**
A clear and concise description of the feature.

### **Problem**
What problem does this feature solve?

### **Proposed Solution**
Describe your proposed solution.

### **Use Case**
Who would use this feature, and how would they use it?

### **Additional Context**
Any other context or examples (e.g., mockups, screenshots).
```

### **Example Feature Request**

```markdown
## 💡 Feature Request

### **Description**
Add support for **Slack integration** to start AI sessions from Slack.

### **Problem**
Teams using Slack cannot easily start AI sessions without leaving Slack.

### **Proposed Solution**
Add a Slack app that allows users to:
1. Start a new AI session with `/ai-start`.
2. Share AI session outputs to Slack channels.
3. Receive notifications for session updates.

### **Use Case**
- A sales team wants to **draft a proposal** in Slack using Claude.
- A support team wants to **resolve a ticket** in Slack using Codex.

### **Additional Context**
This would be similar to how **Google Docs** or **Figma** integrate with Slack.
```

---

## 💻 **Setting Up the Project**

Before contributing code, you’ll need to **set up the project locally**:

1. **Fork the repository**:
   ```bash
   git clone https://github.com/your-username/om.git
   cd om
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

For detailed setup instructions, see the [Development Setup Guide](development/SETUP.md).

---

## 🔧 **Development Workflow**

### **1. Create a Feature Branch**

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
| Feature | `feature/` | `feature/slack-integration` |
| Bug Fix | `fix/` | `fix/websocket-disconnect` |
| Documentation | `docs/` | `docs/api-reference` |
| Refactor | `refactor/` | `refactor/agent-router` |
| Chore | `chore/` | `chore/update-dependencies` |

### **2. Make Your Changes**

- Write **clean, modular code**.
- Follow the **coding standards** (see below).
- Add **tests** for new functionality.
- Update **documentation** if needed.

### **3. Commit Your Changes**

```bash
# Stage your changes
git add .

# Commit with a descriptive message
npm run commit
# Or manually:
git commit -m "feat: add Slack integration"
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

### **4. Push Your Changes**

```bash
# Push to your fork
git push origin feature/your-feature-name
```

### **5. Open a Pull Request (PR)**

1. Go to the [original repository](https://github.com/Ashuyadav96/om).
2. Click **"New Pull Request"**.
3. Select your fork and branch.
4. Fill out the **PR template** (see below).
5. Click **"Create Pull Request"**.

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
- [ ] All **tests pass** (`npm test`)
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

#### **Service Guidelines**

- **Contain business logic** (e.g., session management, agent routing).
- **Use dependency injection** for testability.
- **Avoid direct database access** (use Prisma models).

### **4. Database (Prisma)**

#### **Schema Guidelines**

- **Use descriptive model names** (e.g., `SessionParticipant` instead of `Participant`).
- **Define relations** explicitly.
- **Use enums** for fixed sets of values (e.g., `AgentType`).
- **Add `@default` for sensible defaults** (e.g., timestamps).

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

---

## 🧪 **Testing**

### **1. Unit Tests**

- **Framework**: Jest + `@testing-library/react` (frontend), Jest + Supertest (backend).
- **Location**: `src/__tests__/` or `src/**/*.test.ts`.
- **Run Tests**:
  ```bash
  npm test
  ```

### **2. Integration Tests**

- **Framework**: Supertest (backend).
- **Location**: `src/__tests__/integration/`.
- **Run Tests**:
  ```bash
  npm run test:integration
  ```

### **3. End-to-End Tests**

- **Framework**: Cypress or Playwright.
- **Location**: `cypress/` or `playwright/`.
- **Run Tests**:
  ```bash
  npm run test:e2e
  ```

---

## 🐛 **Debugging**

### **1. Frontend Debugging**

- **Browser DevTools**: Open with `F12` or `Ctrl+Shift+I`.
- **React DevTools**: Install the [React Developer Tools](https://react.dev/learn/react-developer-tools) extension.
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

## 📚 **Documentation**

We **welcome improvements** to our documentation! If you find **typos, unclear explanations, or missing information**, please **open a PR** to fix it.

### **Documentation Guidelines**

- **Use Markdown** for formatting.
- **Be concise** (avoid walls of text).
- **Use examples** (code snippets, screenshots).
- **Keep it up-to-date** (update docs when code changes).

### **Documentation Structure**

```
docs/
├── architecture/
│   ├── OVERVIEW.md         # High-level architecture
│   ├── COMPONENTS.md       # Detailed component breakdown
│   └── DATA_FLOW.md        # Data flow diagrams
├── development/
│   ├── SETUP.md           # Local development setup
│   ├── DEVELOPMENT.md     # Development workflow
│   └── DEPLOY.md           # Deployment guide
├── api/
│   ├── REFERENCE.md        # API documentation
│   └── AUTH.md             # Authentication guide
├── agents/
│   ├── INTEGRATIONS.md    # Agent integration guides
│   ├── CLAUDE.md           # Claude-specific docs
│   └── CODEX.md            # Codex-specific docs
├── PRODUCT.md              # Product vision and features
├── ROADMAP.md              # Development timeline
├── YC_APPLICATION.md       # Y Combinator pitch
└── CONTRIBUTING.md         # This file
```

---

## 🙏 **Recognizing Contributions**

We **appreciate all contributions**, big or small! Here’s how we recognize contributors:

1. **GitHub Contributors**: All contributors are listed in the [GitHub Contributors](https://github.com/Ashuyadav96/om/graphs/contributors) tab.
2. **Changelog**: Major contributions are highlighted in the [CHANGELOG.md](CHANGELOG.md).
3. **Social Media**: We may **tweet, blog, or post** about significant contributions.
4. **Swag**: Top contributors may receive **stickers, t-shirts, or other swag**.

---

## 📅 **Community**

Join our community to **stay updated, ask questions, and collaborate** with other contributors:

- **GitHub Discussions**: [https://github.com/Ashuyadav96/om/discussions](https://github.com/Ashuyadav96/om/discussions)
- **Twitter**: [@YourHandle](https://twitter.com/YourHandle)
- **Discord**: [Invite Link](https://discord.gg/your-invite)
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

## 📞 **Need Help?**

If you have questions or need assistance:
1. Check the **[FAQ](#-faq)** below.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Ask in the **[GitHub Discussions](https://github.com/Ashuyadav96/om/discussions)**.
4. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

### **FAQ**

#### **Q: How do I get started?**
A: Follow the [Development Setup Guide](development/SETUP.md) to set up the project locally.

#### **Q: How do I add a new AI agent?**
A: See the [Agent Integrations Guide](agents/INTEGRATIONS.md) for step-by-step instructions.

#### **Q: How do I run tests?**
A: Run `npm test` for unit tests, `npm run test:integration` for integration tests, and `npm run test:e2e` for end-to-end tests.

#### **Q: How do I debug WebSocket issues?**
A: Enable debug logging in Socket.io (`logger: true`) and use the **Socket.io Inspector** Chrome extension.

#### **Q: How do I contribute to documentation?**
A: Open a PR with your changes to the `docs/` directory. Follow the [Documentation Guidelines](#documentation-guidelines).

#### **Q: How do I report a security vulnerability?**
A: Please **email the project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)) **privately** (do not open a public issue).

---

## 🎉 **Thank You!**

Thank you for contributing to **Multiplayer AI Orchestration**! Your help is **invaluable** in making this project a success. Together, we can **build the future of multiplayer AI**.

**Let’s collaborate!** 🚀
