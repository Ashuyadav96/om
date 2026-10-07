# 📚 API Reference: Multiplayer AI Orchestration

> **Complete documentation for the Multiplayer AI Orchestration API**

---

## 🎯 **Overview**

The **Multiplayer AI Orchestration API** provides **RESTful endpoints** and **real-time WebSocket connections** for:
- **Session management** (create, join, leave sessions).
- **Agent orchestration** (send messages to AI agents).
- **User management** (authentication, profiles).
- **Integrations** (GitHub, Slack, etc.).

---

## 🌐 **Base URL**

| **Environment** | **Base URL** | **WebSocket URL** |
|-----------------|--------------|-------------------|
| **Local Development** | `http://localhost:3001` | `ws://localhost:3001` |
| **Staging** | `https://staging.yourdomain.com` | `wss://staging.yourdomain.com` |
| **Production** | `https://api.yourdomain.com` | `wss://api.yourdomain.com` |

---

## 🔐 **Authentication**

All API requests (except `/auth/*`) require **authentication** via:
- **JWT Token** (for REST API): Include in the `Authorization` header.
- **Session Token** (for WebSockets): Passed during connection.

### **1. JWT Authentication (REST API)**

Include your JWT token in the `Authorization` header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example (cURL)**:
```bash
curl -X GET https://api.yourdomain.com/api/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **2. WebSocket Authentication**

Pass your JWT token as a **query parameter** when connecting:

```javascript
// JavaScript (Socket.io)
const socket = io('wss://api.yourdomain.com', {
  query: {
    token: 'YOUR_JWT_TOKEN',
  },
});
```

---

## 📡 **REST API Endpoints**

---

### **1. Authentication**

#### **Sign Up**
Create a new user account.

**Endpoint**: `POST /api/auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "YOUR_JWT_TOKEN"
}
```

**Example (cURL)**:
```bash
curl -X POST https://api.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123", "name": "John Doe"}'
```

---

#### **Log In**
Authenticate an existing user.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "YOUR_JWT_TOKEN"
}
```

**Example (cURL)**:
```bash
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123"}'
```

---

#### **Get Current User**
Get the authenticated user’s details.

**Endpoint**: `GET /api/auth/me`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z",
  "agentKeys": [
    {
      "agentType": "claude",
      "hasKey": true
    }
  ]
}
```

**Example (cURL)**:
```bash
curl -X GET https://api.yourdomain.com/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### **2. Sessions**

#### **List Sessions**
Get a list of sessions the user has access to.

**Endpoint**: `GET /api/sessions`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters**:
| **Parameter** | **Type** | **Description** | **Default** |
|---------------|----------|-----------------|-------------|
| `limit` | number | Maximum number of sessions to return | 20 |
| `offset` | number | Number of sessions to skip | 0 |
| `search` | string | Search sessions by name | - |

**Response**:
```json
{
  "sessions": [
    {
      "id": "session_123",
      "name": "Team Brainstorm",
      "agentType": "claude",
      "createdAt": "2024-01-01T00:00:00Z",
      "createdBy": {
        "id": "user_123",
        "name": "John Doe"
      },
      "participants": [
        {
          "id": "user_123",
          "name": "John Doe",
          "role": "owner"
        }
      ]
    }
  ],
  "total": 1
}
```

**Example (cURL)**:
```bash
curl -X GET https://api.yourdomain.com/api/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### **Create Session**
Create a new session.

**Endpoint**: `POST /api/sessions`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Team Brainstorm",
  "agentType": "claude",
  "isPublic": false
}
```

**Response**:
```json
{
  "id": "session_123",
  "name": "Team Brainstorm",
  "agentType": "claude",
  "createdAt": "2024-01-01T00:00:00Z",
  "createdBy": {
    "id": "user_123",
    "name": "John Doe"
  },
  "yjsState": "..."
}
```

**Example (cURL)**:
```bash
curl -X POST https://api.yourdomain.com/api/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Team Brainstorm", "agentType": "claude"}'
```

---

#### **Get Session**
Get details of a specific session.

**Endpoint**: `GET /api/sessions/:id`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "id": "session_123",
  "name": "Team Brainstorm",
  "agentType": "claude",
  "createdAt": "2024-01-01T00:00:00Z",
  "createdBy": {
    "id": "user_123",
    "name": "John Doe"
  },
  "participants": [
    {
      "id": "user_123",
      "name": "John Doe",
      "role": "owner",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "messages": [
    {
      "id": "msg_123",
      "sender": "user",
      "userId": "user_123",
      "content": "Hello, Claude!",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Example (cURL)**:
```bash
curl -X GET https://api.yourdomain.com/api/sessions/session_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### **Update Session**
Update a session’s metadata (e.g., name, agent).

**Endpoint**: `PUT /api/sessions/:id`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Updated Session Name",
  "agentType": "codex"
}
```

**Response**:
```json
{
  "id": "session_123",
  "name": "Updated Session Name",
  "agentType": "codex",
  "updatedAt": "2024-01-01T00:01:00Z"
}
```

**Example (cURL)**:
```bash
curl -X PUT https://api.yourdomain.com/api/sessions/session_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Session Name", "agentType": "codex"}'
```

---

#### **Delete Session**
Delete a session.

**Endpoint**: `DELETE /api/sessions/:id`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true
}
```

**Example (cURL)**:
```bash
curl -X DELETE https://api.yourdomain.com/api/sessions/session_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### **Invite User to Session**
Invite a user to a session.

**Endpoint**: `POST /api/sessions/:id/invite`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "userId": "user_456",
  "role": "member"
}
```

**Response**:
```json
{
  "success": true,
  "session": {
    "id": "session_123",
    "participants": [
      {
        "id": "user_123",
        "role": "owner"
      },
      {
        "id": "user_456",
        "role": "member"
      }
    ]
  }
}
```

**Example (cURL)**:
```bash
curl -X POST https://api.yourdomain.com/api/sessions/session_123/invite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_456", "role": "member"}'
```

---

#### **Remove User from Session**
Remove a user from a session.

**Endpoint**: `DELETE /api/sessions/:id/participants/:userId`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true
}
```

**Example (cURL)**:
```bash
curl -X DELETE https://api.yourdomain.com/api/sessions/session_123/participants/user_456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### **3. Agents**

#### **List Available Agents**
Get a list of all supported AI agents.

**Endpoint**: `GET /api/agents`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "agents": [
    {
      "id": "claude",
      "name": "Claude",
      "description": "Anthropic's most advanced AI model.",
      "hasKey": true,
      "parameters": [
        {
          "name": "model",
          "type": "enum",
          "default": "claude-3-sonnet-20240229",
          "options": ["claude-3-sonnet-20240229", "claude-2"]
        },
        {
          "name": "maxTokens",
          "type": "number",
          "default": 1024
        }
      ]
    },
    {
      "id": "codex",
      "name": "Codex",
      "description": "OpenAI's code generation model.",
      "hasKey": false,
      "parameters": [
        {
          "name": "model",
          "type": "enum",
          "default": "code-davinci-002",
          "options": ["code-davinci-002", "code-cushman-001"]
        }
      ]
    }
  ]
}
```

**Example (cURL)**:
```bash
curl -X GET https://api.yourdomain.com/api/agents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### **Save Agent API Key**
Save an API key for a specific agent.

**Endpoint**: `POST /api/agents/:agentType/key`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "apiKey": "sk-ant-xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "agentType": "claude"
}
```

**Example (cURL)**:
```bash
curl -X POST https://api.yourdomain.com/api/agents/claude/key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk-ant-xxxxx"}'
```

---

#### **Delete Agent API Key**
Delete an API key for a specific agent.

**Endpoint**: `DELETE /api/agents/:agentType/key`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true
}
```

**Example (cURL)**:
```bash
curl -X DELETE https://api.yourdomain.com/api/agents/claude/key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### **4. Messages (Legacy)**

> **Note**: Messages are primarily handled via **WebSockets** for real-time collaboration. These endpoints are for **legacy support** or **non-real-time use cases**.

#### **Send Message to Agent**
Send a message to an agent in a session (non-real-time).

**Endpoint**: `POST /api/sessions/:id/messages`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "Hello, Claude!",
  "agentType": "claude"
}
```

**Response**:
```json
{
  "id": "msg_123",
  "sender": "agent",
  "agentType": "claude",
  "content": "Hello! How can I help you today?",
  "timestamp": "2024-01-01T00:00:00Z",
  "tokenUsage": {
    "promptTokens": 10,
    "completionTokens": 20,
    "totalTokens": 30
  }
}
```

**Example (cURL)**:
```bash
curl -X POST https://api.yourdomain.com/api/sessions/session_123/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, Claude!", "agentType": "claude"}'
```

---

#### **Get Session Messages**
Get all messages in a session.

**Endpoint**: `GET /api/sessions/:id/messages`

**Headers**:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters**:
| **Parameter** | **Type** | **Description** | **Default** |
|---------------|----------|-----------------|-------------|
| `limit` | number | Maximum number of messages to return | 50 |
| `offset` | number | Number of messages to skip | 0 |

**Response**:
```json
{
  "messages": [
    {
      "id": "msg_123",
      "sender": "user",
      "userId": "user_123",
      "content": "Hello, Claude!",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "id": "msg_456",
      "sender": "agent",
      "agentType": "claude",
      "content": "Hello! How can I help you today?",
      "timestamp": "2024-01-01T00:00:01Z"
    }
  ],
  "total": 2
}
```

**Example (cURL)**:
```bash
curl -X GET https://api.yourdomain.com/api/sessions/session_123/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔌 **WebSocket API**

The **WebSocket API** enables **real-time collaboration** in sessions. It uses **Socket.io** for bidirectional communication.

---

### **1. Connection**

#### **Connect to WebSocket**

```javascript
// JavaScript (Socket.io Client)
import { io } from 'socket.io-client';

const socket = io('wss://api.yourdomain.com', {
  query: {
    token: 'YOUR_JWT_TOKEN',
  },
  transports: ['websocket'], // Force WebSocket (no long-polling)
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

### **2. Session Events**

#### **Join Session**
Join a session to start receiving updates.

**Event**: `join-session`

**Payload**:
```json
{
  "sessionId": "session_123"
}
```

**Example**:
```javascript
socket.emit('join-session', { sessionId: 'session_123' });
```

**Server Response**:
- Emits `session-joined` with the **session state** (Yjs updates).

```javascript
socket.on('session-joined', (data) => {
  const { sessionId, yjsState } = data;
  console.log(`Joined session ${sessionId}`);
  // Apply Yjs state to the client
});
```

---

#### **Leave Session**
Leave a session.

**Event**: `leave-session`

**Payload**:
```json
{
  "sessionId": "session_123"
}
```

**Example**:
```javascript
socket.emit('leave-session', { sessionId: 'session_123' });
```

---

### **3. Message Events**

#### **Send Message**
Send a message to the agent in a session.

**Event**: `send-message`

**Payload**:
```json
{
  "sessionId": "session_123",
  "content": "Hello, Claude!"
}
```

**Example**:
```javascript
socket.emit('send-message', {
  sessionId: 'session_123',
  content: 'Hello, Claude!',
});
```

**Server Response**:
- Broadcasts `new-message` to **all clients in the session**.

```javascript
socket.on('new-message', (message) => {
  const { id, sender, content, timestamp } = message;
  console.log(`${sender}: ${content}`);
  // Update UI with the new message
});
```

---

#### **Receive Message**
Receive a new message in a session.

**Event**: `new-message`

**Payload**:
```json
{
  "id": "msg_123",
  "sessionId": "session_123",
  "sender": "user" | "agent",
  "userId": "user_123", // If sender is a user
  "agentType": "claude", // If sender is an agent
  "content": "Hello! How can I help you today?",
  "timestamp": "2024-01-01T00:00:00Z",
  "tokenUsage": {
    "promptTokens": 10,
    "completionTokens": 20,
    "totalTokens": 30
  }
}
```

---

### **4. Agent Events**

#### **Agent Response**
Receive a response from an agent.

**Event**: `agent-response`

**Payload**:
```json
{
  "requestId": "req_123",
  "sessionId": "session_123",
  "content": "Here is the code you requested...",
  "agentType": "claude",
  "tokenUsage": {
    "promptTokens": 25,
    "completionTokens": 50,
    "totalTokens": 75
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Example**:
```javascript
socket.on('agent-response', (response) => {
  const { content, agentType, tokenUsage } = response;
  console.log(`${agentType} response: ${content}`);
  // Update UI with the agent's response
});
```

---

#### **Agent Error**
Receive an error from an agent.

**Event**: `agent-error`

**Payload**:
```json
{
  "requestId": "req_123",
  "sessionId": "session_123",
  "error": "Rate limit exceeded",
  "agentType": "claude",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Example**:
```javascript
socket.on('agent-error', (error) => {
  console.error(`Agent error: ${error.error}`);
  // Show error message to the user
});
```

---

### **5. Collaboration Events**

#### **Cursor Update**
Receive updates about other users' cursors in a session.

**Event**: `cursor-update`

**Payload**:
```json
{
  "sessionId": "session_123",
  "userId": "user_456",
  "userName": "Jane Doe",
  "position": {
    "start": 10,
    "end": 20
  },
  "color": "#ff0000"
}
```

**Example**:
```javascript
socket.on('cursor-update', (cursor) => {
  const { userId, userName, position, color } = cursor;
  console.log(`${userName}'s cursor is at position ${position.start}-${position.end}`);
  // Update UI to show the cursor
});
```

---

#### **User Joined**
A new user joined the session.

**Event**: `user-joined`

**Payload**:
```json
{
  "sessionId": "session_123",
  "user": {
    "id": "user_456",
    "name": "Jane Doe",
    "avatar": "https://..."
  }
}
```

**Example**:
```javascript
socket.on('user-joined', (data) => {
  const { user } = data;
  console.log(`${user.name} joined the session`);
  // Update UI to show the new user
});
```

---

#### **User Left**
A user left the session.

**Event**: `user-left`

**Payload**:
```json
{
  "sessionId": "session_123",
  "userId": "user_456"
}
```

**Example**:
```javascript
socket.on('user-left', (data) => {
  const { userId } = data;
  console.log(`User ${userId} left the session`);
  // Update UI to remove the user
});
```

---

#### **Driver Change**
The "driver" (user controlling the agent) changed.

**Event**: `driver-change`

**Payload**:
```json
{
  "sessionId": "session_123",
  "driverId": "user_456"
}
```

**Example**:
```javascript
socket.on('driver-change', (data) => {
  const { driverId } = data;
  console.log(`User ${driverId} is now driving the agent`);
  // Update UI to show the new driver
});
```

---

### **6. Yjs State Events**

#### **State Update**
Receive updates to the **Yjs document** (for real-time collaboration).

**Event**: `yjs-update`

**Payload**:
```json
{
  "sessionId": "session_123",
  "update": Uint8Array, // Binary Yjs update
  "sender": "user_123"
}
```

**Example**:
```javascript
import * as Y from 'yjs';

const yDoc = new Y.Doc();

socket.on('yjs-update', (data) => {
  const { update, sender } = data;
  Y.applyUpdate(yDoc, update);
  console.log(`Received update from ${sender}`);
});
```

---

#### **Sync State**
Request the full **Yjs state** for a session (e.g., when joining).

**Event**: `sync-state`

**Payload**:
```json
{
  "sessionId": "session_123"
}
```

**Server Response**:
- Emits `yjs-state` with the **full Yjs state**.

```javascript
socket.on('yjs-state', (data) => {
  const { sessionId, state } = data;
  Y.applyUpdate(yDoc, state);
  console.log(`Received full state for session ${sessionId}`);
});
```

---

## 📋 **Error Codes**

| **Code** | **HTTP Status** | **Description** | **Solution** |
|----------|-----------------|-----------------|--------------|
| `UNAUTHORIZED` | 401 | Invalid or missing JWT token | Check your `Authorization` header |
| `FORBIDDEN` | 403 | Insufficient permissions | Ensure your user has the required role |
| `NOT_FOUND` | 404 | Resource not found (e.g., session, user) | Check the resource ID |
| `VALIDATION_ERROR` | 400 | Invalid request body | Check the request format |
| `RATE_LIMITED` | 429 | Too many requests | Wait and retry |
| `AGENT_ERROR` | 500 | Agent API error (e.g., Claude/Codex) | Check agent API status |
| `INTERNAL_ERROR` | 500 | Server error | Contact support |

---

## 🧪 **API Examples**

### **1. Full Session Flow (REST + WebSocket)**

```javascript
// 1. Log in (REST)
const loginResponse = await fetch('https://api.yourdomain.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
});
const { token } = await loginResponse.json();

// 2. Create a session (REST)
const sessionResponse = await fetch('https://api.yourdomain.com/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ name: 'Team Brainstorm', agentType: 'claude' }),
});
const { id: sessionId } = await sessionResponse.json();

// 3. Connect to WebSocket
const socket = io('wss://api.yourdomain.com', {
  query: { token },
});

// 4. Join the session
socket.emit('join-session', { sessionId });

// 5. Send a message
socket.emit('send-message', {
  sessionId,
  content: 'Hello, Claude!',
});

// 6. Listen for responses
socket.on('new-message', (message) => {
  console.log('New message:', message);
});

socket.on('agent-response', (response) => {
  console.log('Agent response:', response);
});
```

---

### **2. Agent Handoff**

```javascript
// User 1 sends a message
socket.emit('send-message', {
  sessionId: 'session_123',
  content: 'Start writing a Python function...',
});

// User 1 hands off to User 2
socket.emit('handoff', {
  sessionId: 'session_123',
  newDriverId: 'user_456',
});

// User 2 takes over and sends another message
socket.emit('send-message', {
  sessionId: 'session_123',
  content: 'Continue the function...',
});
```

---

## 📡 **Postman Collection**

For easier testing, you can import the following **Postman collection**:

```json
{
  "info": {
    "_postman_id": "12345678-1234-1234-1234-123456789012",
    "name": "Multiplayer AI Orchestration",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Sign Up",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\",\n  \"name\": \"John Doe\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/signup",
              "host": ["{{baseUrl}}"]
            }
          }
        },
        {
          "name": "Log In",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/login",
              "host": ["{{baseUrl}}"]
            }
          }
        }
      ]
    },
    {
      "name": "Sessions",
      "item": [
        {
          "name": "List Sessions",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/sessions",
              "host": ["{{baseUrl}}"]
            }
          }
        },
        {
          "name": "Create Session",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Team Brainstorm\",\n  \"agentType\": \"claude\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/sessions",
              "host": ["{{baseUrl}}"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 🚀 **SDKs**

### **1. JavaScript/TypeScript SDK**

Install the **unofficial SDK** (or use the raw API):

```bash
npm install @multiplayer-ai/sdk
```

**Example Usage**:
```typescript
import { MultiplayerAI } from '@multiplayer-ai/sdk';

const ai = new MultiplayerAI({
  apiKey: 'YOUR_JWT_TOKEN',
  baseUrl: 'https://api.yourdomain.com',
});

// Create a session
const session = await ai.sessions.create({
  name: 'Team Brainstorm',
  agentType: 'claude',
});

// Connect to WebSocket
const socket = ai.connectToSession(session.id);

// Send a message
socket.sendMessage('Hello, Claude!');

// Listen for responses
socket.on('message', (message) => {
  console.log('New message:', message);
});
```

---

### **2. Python SDK**

```python
# Install the SDK
pip install multiplayer-ai

# Example usage
from multiplayer_ai import MultiplayerAI

ai = MultiplayerAI(api_key="YOUR_JWT_TOKEN", base_url="https://api.yourdomain.com")

# Create a session
session = ai.sessions.create(name="Team Brainstorm", agent_type="claude")

# Connect to WebSocket (using websockets library)
import websockets
import asyncio

async def listen():
    async with websockets.connect(
        f"wss://api.yourdomain.com?token=YOUR_JWT_TOKEN"
    ) as ws:
        await ws.send_json({"event": "join-session", "sessionId": session["id"]})
        async for message in ws:
            data = json.loads(message)
            print("Received:", data)

asyncio.get_event_loop().run_until_complete(listen())
```

---

## 📊 **Rate Limits**

| **Endpoint** | **Rate Limit** | **Description** |
|--------------|----------------|-----------------|
| `/api/auth/*` | 10 requests/minute | Authentication endpoints |
| `/api/sessions` | 30 requests/minute | Session management |
| `/api/agents/*` | 20 requests/minute | Agent management |
| `/api/messages` | 50 requests/minute | Message endpoints |
| **WebSocket** | 100 messages/second | Real-time messages |

---

## 🛡 **Security**

- **HTTPS Only**: All API requests must use **HTTPS** (or `http://localhost` for development).
- **JWT Tokens**: Tokens are **short-lived** (1 hour by default). Refresh as needed.
- **Input Validation**: All inputs are **sanitized** to prevent injection attacks.
- **Rate Limiting**: Enforced to prevent abuse.

---

## 📞 **Need Help?**

If you have questions about the API:
1. Check the **[API Reference](#-api-reference)** for endpoint details.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

**Happy coding!** 🚀
