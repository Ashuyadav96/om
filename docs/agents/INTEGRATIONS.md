# 🤖 Agent Integrations: Multiplayer AI Orchestration

> **How to connect to Claude, Codex, Hermes, and other AI agents**

---

## 🎯 **Overview**

This document explains how to **integrate third-party AI agents** (Claude, Codex, Hermes, etc.) into the **Multiplayer AI Orchestration** system. The system uses a **standardized adapter pattern** to support multiple agents with a **consistent interface**.

---

## 🏗 **Agent Architecture**

The system uses an **adapter pattern** to abstract away the differences between AI agents. Each agent has its own **adapter** that implements a **common interface** (`AgentAdapter`).

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Router                                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  - Routes requests to the appropriate agent                   │  │
│  │  - Handles fallbacks if an agent fails                       │  │
│  │  - Manages API keys and authentication                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Adapters                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │
│  │  Claude     │  │  Codex       │  │  Hermes      │  │  ...     │  │
│  │  Adapter    │  │  Adapter     │  │  Adapter     │  │         │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        External AI APIs                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │
│  │  Claude     │  │  Codex       │  │  Hermes      │  │  ...     │  │
│  │  (Anthropic)│  │  (OpenAI)    │  │  (Hugging    │  │         │  │
│  │             │  │             │  │  Face)       │  │         │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 **Agent Adapter Interface**

All agents **must implement** the `AgentAdapter` interface to ensure consistency:

```typescript
// src/server/services/agents/AgentAdapter.ts

import { AgentType, AgentParameters, AgentResponse } from '../../../shared/types';

/**
 * Interface for all AI agent adapters.
 * Each agent (Claude, Codex, etc.) must implement this interface.
 */
export interface AgentAdapter {
  /**
   * Send a message to the agent and return the response.
   * @param prompt - The user's input/prompt.
   * @param parameters - Optional parameters (e.g., temperature, maxTokens).
   * @returns The agent's response.
   */
  sendMessage(prompt: string, parameters?: AgentParameters): Promise<AgentResponse>;

  /**
   * Check if the agent is available (e.g., API is reachable).
   * @returns True if the agent is available, false otherwise.
   */
  getStatus(): Promise<boolean>;

  /**
   * Get the agent's unique identifier (e.g., 'claude').
   * @returns The agent type.
   */
  getName(): AgentType;

  /**
   * Get the agent's display name (e.g., 'Claude').
   * @returns The display name.
   */
  getDisplayName(): string;

  /**
   * Get the agent's description.
   * @returns The description.
   */
  getDescription(): string;

  /**
   * Get the agent's required/optional parameters.
   * @returns Array of parameter definitions.
   */
  getParameters(): AgentParameter[];

  /**
   * Set the API key for the agent (if required).
   * @param apiKey - The API key.
   */
  setApiKey?(apiKey: string): void;
}

/**
 * Parameter definition for agent configuration.
 */
export interface AgentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  default?: string | number | boolean;
  required?: boolean;
  description?: string;
  options?: string[]; // For enum types
}

/**
 * Supported agent types.
 */
export type AgentType = 'claude' | 'codex' | 'hermes' | 'openclaw' | 'github-copilot' | 'devin';

/**
 * Parameters for agent requests.
 */
export interface AgentParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
  [key: string]: any;
}

/**
 * Response from an agent.
 */
export interface AgentResponse {
  requestId: string;
  content: string;
  agentType: AgentType;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: Date;
  status: 'success' | 'error';
  error?: string;
}
```

---

## 📡 **Agent Registry**

The `AgentRouter` uses a **registry** to manage all supported agents:

```typescript
// src/server/services/agents/AgentRouter.ts

import { AgentAdapter, AgentType, AgentResponse, AgentParameters } from './AgentAdapter';
import { ClaudeAdapter } from './ClaudeAdapter';
import { CodexAdapter } from './CodexAdapter';
import { HermesAdapter } from './HermesAdapter';

/**
 * Registry of all supported agents.
 */
const agentRegistry: Record<AgentType, AgentAdapter> = {
  claude: new ClaudeAdapter(),
  codex: new CodexAdapter(),
  hermes: new HermesAdapter(),
  // Add more agents here
};

/**
 * Fallback chain for agents (if primary agent fails).
 */
export const FALLBACK_CHAIN: Record<AgentType, AgentType[]> = {
  claude: ['codex', 'hermes'],
  codex: ['claude', 'hermes'],
  hermes: ['claude', 'codex'],
  openclaw: ['claude'],
  'github-copilot': ['claude'],
  devin: ['claude'],
};

/**
 * Get an agent by type.
 * @param agentType - The type of agent.
 * @param apiKey - Optional API key (if required).
 * @returns The agent adapter.
 */
export function getAgent(agentType: AgentType, apiKey?: string): AgentAdapter {
  const agent = agentRegistry[agentType];
  if (!agent) {
    throw new Error(`Agent ${agentType} not supported`);
  }

  // If the agent requires an API key, set it
  if (apiKey && agent.setApiKey) {
    agent.setApiKey(apiKey);
  }

  return agent;
}

/**
 * Send a message to an agent with fallback support.
 * @param prompt - The user's prompt.
 * @param primaryAgent - The primary agent to use.
 * @param parameters - Optional parameters.
 * @returns The agent's response.
 */
export async function sendMessageWithFallback(
  prompt: string,
  primaryAgent: AgentType,
  parameters?: AgentParameters
): Promise<AgentResponse> {
  const agentsToTry = [primaryAgent, ...FALLBACK_CHAIN[primaryAgent]];

  for (const agentType of agentsToTry) {
    try {
      const agent = getAgent(agentType);
      const response = await agent.sendMessage(prompt, parameters);
      return response;
    } catch (error) {
      console.warn(`Agent ${agentType} failed:`, error);
      continue;
    }
  }

  throw new Error(`All fallback agents failed for prompt: ${prompt}`);
}
```

---

## 🤖 **Supported Agents**

Below are the **implementations** for each supported agent. Each agent has its own adapter that implements the `AgentAdapter` interface.

---

### **1. Claude (Anthropic)**

**Overview**:
- **Provider**: [Anthropic](https://www.anthropic.com/)
- **Use Case**: General Q&A, reasoning, coding.
- **Models**: `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`, `claude-2`
- **Pricing**: $0.01–0.03/1K tokens (input), $0.05–0.15/1K tokens (output)
- **API Docs**: [https://docs.anthropic.com/](https://docs.anthropic.com/)

---

#### **Adapter Implementation**

```typescript
// src/server/services/agents/ClaudeAdapter.ts

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentAdapter,
  AgentParameter,
  AgentResponse,
  AgentType,
  AgentParameters,
} from './AgentAdapter';

export class ClaudeAdapter implements AgentAdapter {
  private apiKey?: string;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers['x-api-key'] = apiKey;
  }

  async sendMessage(
    prompt: string,
    parameters?: AgentParameters
  ): Promise<AgentResponse> {
    try {
      const response = await this.client.post('/messages', {
        model: parameters?.model || 'claude-3-sonnet-20240229',
        max_tokens: parameters?.maxTokens || 1024,
        temperature: parameters?.temperature || 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.data.content[0].text;
      const usage = response.data.usage;

      return {
        requestId: uuidv4(),
        content,
        agentType: 'claude',
        tokenUsage: {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        },
        timestamp: new Date(),
        status: 'success',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          requestId: uuidv4(),
          content: '',
          agentType: 'claude',
          timestamp: new Date(),
          status: 'error',
          error: error.response?.data?.error?.message || error.message,
        };
      }
      throw error;
    }
  }

  async getStatus(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  getName(): AgentType {
    return 'claude';
  }

  getDisplayName(): string {
    return 'Claude';
  }

  getDescription(): string {
    return "Anthropic's most advanced AI model for reasoning and conversation.";
  }

  getParameters(): AgentParameter[] {
    return [
      {
        name: 'model',
        type: 'enum',
        default: 'claude-3-sonnet-20240229',
        required: false,
        description: 'The Claude model to use.',
        options: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2'],
      },
      {
        name: 'maxTokens',
        type: 'number',
        default: 1024,
        required: false,
        description: 'Maximum number of tokens to generate.',
      },
      {
        name: 'temperature',
        type: 'number',
        default: 0.7,
        required: false,
        description: 'Controls randomness (0 = deterministic, 1 = creative).',
      },
    ];
  }
}
```

---

#### **API Key Setup**

1. Sign up for Anthropic: [https://www.anthropic.com/](https://www.anthropic.com/)
2. Go to the **Developer Console** > **API Keys**.
3. Click **"Create Key"** and copy the key.
4. Add to your `.env` file:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```

---

#### **Example Usage**

```typescript
import { ClaudeAdapter } from './ClaudeAdapter';

const claude = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Send a message
const response = await claude.sendMessage('Hello, Claude!', {
  model: 'claude-3-sonnet-20240229',
  maxTokens: 1024,
  temperature: 0.7,
});

console.log(response.content);
```

---

### **2. Codex (OpenAI)**

**Overview**:
- **Provider**: [OpenAI](https://openai.com/)
- **Use Case**: Code generation, completion.
- **Models**: `code-davinci-002`, `code-cushman-001`
- **Pricing**: $0.02/1K tokens
- **API Docs**: [https://platform.openai.com/docs/guides/code](https://platform.openai.com/docs/guides/code)

---

#### **Adapter Implementation**

```typescript
// src/server/services/agents/CodexAdapter.ts

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentAdapter,
  AgentParameter,
  AgentResponse,
  AgentType,
  AgentParameters,
} from './AgentAdapter';

export class CodexAdapter implements AgentAdapter {
  private apiKey?: string;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers.Authorization = `Bearer ${apiKey}`;
  }

  async sendMessage(
    prompt: string,
    parameters?: AgentParameters
  ): Promise<AgentResponse> {
    try {
      const response = await this.client.post('/completions', {
        model: parameters?.model || 'code-davinci-002',
        prompt,
        max_tokens: parameters?.maxTokens || 1024,
        temperature: parameters?.temperature || 0.7,
        top_p: parameters?.topP || 1,
      });

      const content = response.data.choices[0].text;
      const usage = response.data.usage;

      return {
        requestId: uuidv4(),
        content,
        agentType: 'codex',
        tokenUsage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        timestamp: new Date(),
        status: 'success',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          requestId: uuidv4(),
          content: '',
          agentType: 'codex',
          timestamp: new Date(),
          status: 'error',
          error: error.response?.data?.error?.message || error.message,
        };
      }
      throw error;
    }
  }

  async getStatus(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch {
      return false;
    }
  }

  getName(): AgentType {
    return 'codex';
  }

  getDisplayName(): string {
    return 'Codex';
  }

  getDescription(): string {
    return "OpenAI's code generation model.";
  }

  getParameters(): AgentParameter[] {
    return [
      {
        name: 'model',
        type: 'enum',
        default: 'code-davinci-002',
        required: false,
        description: 'The Codex model to use.',
        options: ['code-davinci-002', 'code-cushman-001'],
      },
      {
        name: 'maxTokens',
        type: 'number',
        default: 1024,
        required: false,
        description: 'Maximum number of tokens to generate.',
      },
      {
        name: 'temperature',
        type: 'number',
        default: 0.7,
        required: false,
        description: 'Controls randomness (0 = deterministic, 1 = creative).',
      },
      {
        name: 'topP',
        type: 'number',
        default: 1,
        required: false,
        description: 'Nucleus sampling parameter.',
      },
    ];
  }
}
```

---

#### **API Key Setup**

1. Sign up for OpenAI: [https://platform.openai.com/](https://platform.openai.com/)
2. Go to **API Keys** in your account settings.
3. Click **"Create New Secret Key"** and copy the key.
4. Add to your `.env` file:
   ```env
   OPENAI_API_KEY=sk-xxxxx
   ```

---

### **3. Hermes (Hugging Face)**

**Overview**:
- **Provider**: [Hugging Face](https://huggingface.co/)
- **Use Case**: Reasoning, open-source alternative.
- **Models**: `google/flan-t5-xxl`, `mistral-7b`, `llama-2-70b`
- **Pricing**: Free (rate-limited)
- **API Docs**: [https://huggingface.co/inference-api](https://huggingface.co/inference-api)

---

#### **Adapter Implementation**

```typescript
// src/server/services/agents/HermesAdapter.ts

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentAdapter,
  AgentParameter,
  AgentResponse,
  AgentType,
  AgentParameters,
} from './AgentAdapter';

export class HermesAdapter implements AgentAdapter {
  private apiKey?: string;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api-inference.huggingface.co/models',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers.Authorization = `Bearer ${apiKey}`;
  }

  async sendMessage(
    prompt: string,
    parameters?: AgentParameters
  ): Promise<AgentResponse> {
    try {
      // Hermes uses a different API structure (model-specific endpoints)
      const model = parameters?.model || 'google/flan-t5-xxl';
      const response = await this.client.post(`/${model}`, {
        inputs: prompt,
        parameters: {
          max_length: parameters?.maxTokens || 512,
          temperature: parameters?.temperature || 0.7,
          top_p: parameters?.topP || 0.9,
        },
      });

      // Handle Hugging Face's response format
      const content = Array.isArray(response.data)
        ? response.data[0].generated_text
        : response.data.generated_text || JSON.stringify(response.data);

      return {
        requestId: uuidv4(),
        content,
        agentType: 'hermes',
        timestamp: new Date(),
        status: 'success',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          requestId: uuidv4(),
          content: '',
          agentType: 'hermes',
          timestamp: new Date(),
          status: 'error',
          error: error.response?.data?.error || error.message,
        };
      }
      throw error;
    }
  }

  async getStatus(): Promise<boolean> {
    try {
      await this.client.get('/google/flan-t5-xxl');
      return true;
    } catch {
      return false;
    }
  }

  getName(): AgentType {
    return 'hermes';
  }

  getDisplayName(): string {
    return 'Hermes';
  }

  getDescription(): string {
    return "Hugging Face's open-source AI models.";
  }

  getParameters(): AgentParameter[] {
    return [
      {
        name: 'model',
        type: 'string',
        default: 'google/flan-t5-xxl',
        required: false,
        description: 'The Hugging Face model to use.',
      },
      {
        name: 'maxTokens',
        type: 'number',
        default: 512,
        required: false,
        description: 'Maximum number of tokens to generate.',
      },
      {
        name: 'temperature',
        type: 'number',
        default: 0.7,
        required: false,
        description: 'Controls randomness.',
      },
    ];
  }
}
```

---

#### **API Key Setup**

1. Sign up for Hugging Face: [https://huggingface.co/](https://huggingface.co/)
2. Go to **Settings > Access Tokens**.
3. Click **"New Token"** and copy the key.
4. Add to your `.env` file:
   ```env
   HUGGINGFACE_API_KEY=hf_xxxxx
   ```

---

### **4. OpenClaw**

**Overview**:
- **Provider**: Open Source
- **Use Case**: General-purpose, self-hosted.
- **Models**: Custom
- **Pricing**: Free
- **GitHub**: [https://github.com/OpenClaw/OpenClaw](https://github.com/OpenClaw/OpenClaw)

---

#### **Adapter Implementation**

```typescript
// src/server/services/agents/OpenClawAdapter.ts

import { v4 as uuidv4 } from 'uuid';
import {
  AgentAdapter,
  AgentParameter,
  AgentResponse,
  AgentType,
  AgentParameters,
} from './AgentAdapter';

// Mock implementation (replace with actual OpenClaw API calls)
export class OpenClawAdapter implements AgentAdapter {
  private apiUrl?: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || 'http://localhost:8080';
  }

  async sendMessage(
    prompt: string,
    parameters?: AgentParameters
  ): Promise<AgentResponse> {
    // TODO: Replace with actual OpenClaw API calls
    // This is a mock implementation
    const mockResponse = `OpenClaw response to: ${prompt}`;

    return {
      requestId: uuidv4(),
      content: mockResponse,
      agentType: 'openclaw',
      timestamp: new Date(),
      status: 'success',
    };
  }

  async getStatus(): Promise<boolean> {
    // TODO: Check if OpenClaw server is running
    return true;
  }

  getName(): AgentType {
    return 'openclaw';
  }

  getDisplayName(): string {
    return 'OpenClaw';
  }

  getDescription(): string {
    return "Open-source AI agent.";
  }

  getParameters(): AgentParameter[] {
    return [
      {
        name: 'apiUrl',
        type: 'string',
        default: 'http://localhost:8080',
        required: false,
        description: 'URL of the OpenClaw server.',
      },
    ];
  }
}
```

---

### **5. GitHub Copilot**

**Overview**:
- **Provider**: [GitHub](https://github.com/)
- **Use Case**: Coding assistant.
- **Pricing**: $10/user/month
- **API Docs**: [https://docs.github.com/en/copilot](https://docs.github.com/en/copilot)

---

#### **Adapter Implementation**

**Note**: GitHub Copilot does not have a public API for direct integration. This adapter is a **placeholder** for future support.

```typescript
// src/server/services/agents/GitHubCopilotAdapter.ts

import { v4 as uuidv4 } from 'uuid';
import {
  AgentAdapter,
  AgentParameter,
  AgentResponse,
  AgentType,
  AgentParameters,
} from './AgentAdapter';

export class GitHubCopilotAdapter implements AgentAdapter {
  async sendMessage(
    prompt: string,
    parameters?: AgentParameters
  ): Promise<AgentResponse> {
    // TODO: Implement when GitHub Copilot API is available
    return {
      requestId: uuidv4(),
      content: `GitHub Copilot response to: ${prompt} (API not yet available)`,
      agentType: 'github-copilot',
      timestamp: new Date(),
      status: 'success',
    };
  }

  async getStatus(): Promise<boolean> {
    return false; // Not available yet
  }

  getName(): AgentType {
    return 'github-copilot';
  }

  getDisplayName(): string {
    return 'GitHub Copilot';
  }

  getDescription(): string {
    return "GitHub's AI coding assistant (API not yet public).";
  }

  getParameters(): AgentParameter[] {
    return [];
  }
}
```

---

### **6. Devin (Cognition AI)**

**Overview**:
- **Provider**: [Cognition AI](https://www.cognition.ai/)
- **Use Case**: Full-stack coding agent.
- **Pricing**: Unknown (waitlist)
- **Website**: [https://www.cognition.ai/](https://www.cognition.ai/)

---

#### **Adapter Implementation**

```typescript
// src/server/services/agents/DevinAdapter.ts

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentAdapter,
  AgentParameter,
  AgentResponse,
  AgentType,
  AgentParameters,
} from './AgentAdapter';

export class DevinAdapter implements AgentAdapter {
  private apiKey?: string;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.cognition.ai/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers.Authorization = `Bearer ${apiKey}`;
  }

  async sendMessage(
    prompt: string,
    parameters?: AgentParameters
  ): Promise<AgentResponse> {
    try {
      // Devin's API is not yet public, so this is a placeholder
      const response = await this.client.post('/tasks', {
        prompt,
        max_tokens: parameters?.maxTokens || 1024,
      });

      const content = response.data.result || JSON.stringify(response.data);

      return {
        requestId: uuidv4(),
        content,
        agentType: 'devin',
        timestamp: new Date(),
        status: 'success',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          requestId: uuidv4(),
          content: '',
          agentType: 'devin',
          timestamp: new Date(),
          status: 'error',
          error: error.response?.data?.error || error.message,
        };
      }
      throw error;
    }
  }

  async getStatus(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  getName(): AgentType {
    return 'devin';
  }

  getDisplayName(): string {
    return 'Devin';
  }

  getDescription(): string {
    return "Cognition AI's full-stack coding agent.";
  }

  getParameters(): AgentParameter[] {
    return [
      {
        name: 'maxTokens',
        type: 'number',
        default: 1024,
        required: false,
        description: 'Maximum number of tokens to generate.',
      },
    ];
  }
}
```

---

## 🔌 **Adding a New Agent**

To add a new AI agent to the system:

### **Step 1: Create the Adapter**
1. Create a new file in `src/server/services/agents/` (e.g., `NewAgentAdapter.ts`).
2. Implement the `AgentAdapter` interface.

### **Step 2: Register the Agent**
1. Add the agent to the `agentRegistry` in `AgentRouter.ts`:
   ```typescript
   const agentRegistry: Record<AgentType, AgentAdapter> = {
     // ... existing agents
     newagent: new NewAgentAdapter(),
   };
   ```
2. Add the agent to the `FALLBACK_CHAIN`:
   ```typescript
   export const FALLBACK_CHAIN: Record<AgentType, AgentType[]> = {
     // ... existing fallbacks
     newagent: ['claude', 'codex'],
   };
   ```

### **Step 3: Update the AgentType Enum**
1. Update the `AgentType` type in `AgentAdapter.ts`:
   ```typescript
   export type AgentType = 'claude' | 'codex' | 'hermes' | 'newagent';
   ```

### **Step 4: Update the Database Schema (Optional)**
If the agent requires storing additional data, update the Prisma schema:
```prisma
// prisma/schema.prisma
enum AgentType {
  CLAUDE
  CODEX
  HERMES
  NEWAGENT
}
```

### **Step 5: Test the Agent**
1. Add the agent’s API key to your `.env` file.
2. Test the agent in the app:
   ```typescript
   import { getAgent } from './AgentRouter';
   
   const agent = getAgent('newagent', process.env.NEWAGENT_API_KEY);
   const response = await agent.sendMessage('Hello!');
   console.log(response);
   ```

---

## 🛠 **Agent Configuration in the UI**

The frontend allows users to **configure agents** via the **Agent Controls** component. Here’s how it works:

### **1. Agent Selection**
Users can switch between agents using a dropdown:

```tsx
// components/Agent/AgentSelector.tsx
import { useState } from 'react';
import { AgentType, AVAILABLE_AGENTS } from '../../../shared/types';

interface AgentSelectorProps {
  selectedAgent: AgentType;
  onSelect: (agent: AgentType) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ selectedAgent, onSelect }) => {
  return (
    <select
      value={selectedAgent}
      onChange={(e) => onSelect(e.target.value as AgentType)}
      className="rounded-lg border p-2"
    >
      {AVAILABLE_AGENTS.map((agent) => (
        <option key={agent} value={agent}>
          {agent}
        </option>
      ))}
    </select>
  );
};
```

### **2. API Key Management**
Users can add/remove API keys for each agent:

```tsx
// components/Agent/AgentKeyManager.tsx
import { useState } from 'react';
import { AgentType } from '../../../shared/types';

interface AgentKeyManagerProps {
  agentType: AgentType;
  apiKey: string | null;
  onSave: (agentType: AgentType, apiKey: string) => void;
}

export const AgentKeyManager: React.FC<AgentKeyManagerProps> = ({ agentType, apiKey, onSave }) => {
  const [key, setKey] = useState(apiKey || '');

  const handleSave = () => {
    onSave(agentType, key);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={`Enter ${agentType} API key`}
        className="rounded-lg border p-2"
      />
      <button
        onClick={handleSave}
        className="rounded-lg bg-blue-500 p-2 text-white"
      >
        Save API Key
      </button>
    </div>
  );
};
```

### **3. Agent Parameters**
Users can configure agent-specific parameters:

```tsx
// components/Agent/AgentParameters.tsx
import { useState } from 'react';
import { AgentType, AgentParameter, getAgentParameters } from '../../../shared/types';

interface AgentParametersProps {
  agentType: AgentType;
  parameters: Record<string, any>;
  onUpdate: (name: string, value: any) => void;
}

export const AgentParameters: React.FC<AgentParametersProps> = ({ agentType, parameters, onUpdate }) => {
  const [params] = useState<AgentParameter[]>(getAgentParameters(agentType));

  const handleChange = (param: AgentParameter, value: any) => {
    onUpdate(param.name, value);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">Agent Parameters</h3>
      {params.map((param) => (
        <div key={param.name} className="flex flex-col gap-1">
          <label className="text-sm">{param.name}</label>
          {param.type === 'string' && (
            <input
              type="text"
              value={parameters[param.name] || param.default || ''}
              onChange={(e) => handleChange(param, e.target.value)}
              className="rounded-lg border p-2"
            />
          )}
          {param.type === 'number' && (
            <input
              type="number"
              value={parameters[param.name] || param.default || 0}
              onChange={(e) => handleChange(param, Number(e.target.value))}
              className="rounded-lg border p-2"
            />
          )}
          {param.type === 'enum' && (
            <select
              value={parameters[param.name] || param.default || ''}
              onChange={(e) => handleChange(param, e.target.value)}
              className="rounded-lg border p-2"
            >
              {param.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 🔄 **Agent Fallback Strategy**

If an agent fails (e.g., due to rate limits or downtime), the system can **fall back to another agent**:

```typescript
// Example fallback chain
const FALLBACK_CHAIN: Record<AgentType, AgentType[]> = {
  claude: ['codex', 'hermes'],
  codex: ['claude', 'hermes'],
  hermes: ['claude', 'codex'],
};

// Send a message with fallback
async function sendMessageWithFallback(prompt: string, primaryAgent: AgentType) {
  const agentsToTry = [primaryAgent, ...FALLBACK_CHAIN[primaryAgent]];
  
  for (const agentType of agentsToTry) {
    try {
      const agent = getAgent(agentType);
      const response = await agent.sendMessage(prompt);
      return response;
    } catch (error) {
      console.warn(`Agent ${agentType} failed:`, error);
      continue;
    }
  }
  
  throw new Error(`All fallback agents failed for prompt: ${prompt}`);
}
```

---

## 💰 **Cost Optimization**

### **1. Caching**
Cache **frequent requests** to reduce API costs:

```typescript
// src/server/services/agents/AgentCache.ts

import { createHash } from 'crypto';
import { AgentResponse } from './AgentAdapter';

const cache = new Map<string, { response: AgentResponse; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function getCachedResponse(prompt: string, agentType: string): AgentResponse | null {
  const key = generateCacheKey(prompt, agentType);
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if cache has expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.response;
}

export function cacheResponse(prompt: string, agentType: string, response: AgentResponse): void {
  const key = generateCacheKey(prompt, agentType);
  cache.set(key, { response, timestamp: Date.now() });
}

function generateCacheKey(prompt: string, agentType: string): string {
  const normalizedPrompt = prompt.toLowerCase().trim();
  return createHash('sha256')
    .update(`${agentType}:${normalizedPrompt}`)
    .digest('hex');
}
```

### **2. Batching**
Batch **multiple requests** to the same agent to reduce API calls:

```typescript
// src/server/services/agents/AgentBatcher.ts

import { AgentAdapter, AgentResponse, AgentType } from './AgentAdapter';

interface BatchedRequest {
  prompt: string;
  parameters?: any;
  resolve: (response: AgentResponse) => void;
  reject: (error: Error) => void;
}

const batchQueue = new Map<AgentType, BatchedRequest[]>();
const BATCH_INTERVAL = 100; // 100ms

export function enqueueBatchedRequest(
  agentType: AgentType,
  prompt: string,
  parameters?: any
): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    if (!batchQueue.has(agentType)) {
      batchQueue.set(agentType, []);
      // Start a timer to process the batch
      setTimeout(() => processBatch(agentType), BATCH_INTERVAL);
    }
    
    batchQueue.get(agentType)!.push({ prompt, parameters, resolve, reject });
  });
}

async function processBatch(agentType: AgentType): Promise<void> {
  const queue = batchQueue.get(agentType);
  if (!queue || queue.length === 0) return;
  
  batchQueue.delete(agentType);
  
  const agent = getAgent(agentType);
  const prompts = queue.map((req) => req.prompt);
  
  try {
    // TODO: Implement batch processing in the agent adapter
    const responses = await agent.sendBatch(prompts);
    
    queue.forEach((req, index) => {
      req.resolve(responses[index]);
    });
  } catch (error) {
    queue.forEach((req) => {
      req.reject(error as Error);
    });
  }
}
```

---

## 📊 **Agent Usage Analytics**

Track **agent usage** to monitor costs and performance:

```typescript
// src/server/services/agents/AgentAnalytics.ts

import { AgentType } from './AgentAdapter';

interface AgentUsage {
  agentType: AgentType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
  errors: number;
  timestamp: Date;
}

const usageHistory: AgentUsage[] = [];

export function trackAgentUsage(
  agentType: AgentType,
  promptTokens: number,
  completionTokens: number,
  isError: boolean = false
): void {
  const today = new Date().toISOString().split('T')[0];
  const existing = usageHistory.find(
    (u) => u.agentType === agentType && u.timestamp.toISOString().startsWith(today)
  );
  
  if (existing) {
    existing.promptTokens += promptTokens;
    existing.completionTokens += completionTokens;
    existing.totalTokens += promptTokens + completionTokens;
    existing.requests += 1;
    if (isError) existing.errors += 1;
  } else {
    usageHistory.push({
      agentType,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      requests: 1,
      errors: isError ? 1 : 0,
      timestamp: new Date(),
    });
  }
}

export function getAgentUsage(agentType?: AgentType): AgentUsage[] {
  if (agentType) {
    return usageHistory.filter((u) => u.agentType === agentType);
  }
  return usageHistory;
}
```

---

## 🎯 **Next Steps**

1. **Pick an agent** to integrate (Claude, Codex, Hermes, etc.).
2. **Set up the API key** in your `.env` file.
3. **Test the agent** locally:
   ```bash
   npm run dev
   ```
4. **Add more agents** as needed (follow the [Adding a New Agent](#-adding-a-new-agent) guide).

---

## 📞 **Need Help?**

If you have questions about agent integrations:
1. Check the **API documentation** for the agent you’re integrating.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

**Let’s build the future of multiplayer AI, one agent at a time!** 🚀
