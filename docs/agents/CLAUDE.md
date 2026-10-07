# 🦜 Claude Agent Integration

> **Detailed guide for integrating Anthropic's Claude AI**

---

## 🎯 **Overview**

**Claude** is Anthropic’s **most advanced AI model**, designed for **reasoning, conversation, and coding**. It is one of the **primary agents** supported by the **Multiplayer AI Orchestration** system.

---

## 🔗 **Key Features**

| **Feature** | **Description** | **Claude Support** |
|-------------|-----------------|--------------------|
| **Natural Language Understanding** | Understands and responds to human language | ✅ Yes |
| **Reasoning** | Performs logical reasoning and problem-solving | ✅ Yes |
| **Coding** | Writes, explains, and debugs code | ✅ Yes (Claude Code) |
| **Long Context** | Handles large inputs (up to **100K tokens**) | ✅ Yes |
| **Multi-Turn Conversations** | Maintains context across multiple messages | ✅ Yes |
| **Customization** | Supports temperature, max tokens, etc. | ✅ Yes |

---

## 🏗 **Claude Models**

Anthropic offers **multiple Claude models** with different capabilities and pricing:

| **Model** | **Description** | **Context Window** | **Pricing (Input)** | **Pricing (Output)** | **Best For** |
|-----------|-----------------|--------------------|---------------------|----------------------|-------------|
| `claude-3-opus-20240229` | Most intelligent, state-of-the-art | 200K tokens | $0.015/1K tokens | $0.075/1K tokens | Complex reasoning, research |
| `claude-3-sonnet-20240229` | Balanced speed and intelligence | 200K tokens | $0.003/1K tokens | $0.015/1K tokens | **Default choice** (general use) |
| `claude-3-haiku-20240307` | Fastest, least expensive | 200K tokens | $0.00025/1K tokens | $0.00125/1K tokens | Low-latency tasks |
| `claude-2` | Previous generation | 100K tokens | $0.008/1K tokens | $0.024/1K tokens | Legacy support |
| `claude-2:1` | Claude 2 with 100K context | 100K tokens | $0.008/1K tokens | $0.024/1K tokens | Long documents |
| `claude-instant-1` | Fast, lower cost | 100K tokens | $0.0016/1K tokens | $0.0055/1K tokens | Simple tasks |

**Recommendation**: Use `claude-3-sonnet-20240229` as the **default model** (best balance of cost and performance).

---

## 🔧 **API Setup**

### **Step 1: Get an API Key**

1. **Sign up for Anthropic**:
   - Go to [https://www.anthropic.com/](https://www.anthropic.com/).
   - Click **"Sign Up"** and create an account.

2. **Get your API key**:
   - Log in to the [Anthropic Console](https://console.anthropic.com/).
   - Navigate to **"API Keys"** in the sidebar.
   - Click **"Create Key"** and copy the generated key.

3. **Add the key to your `.env` file**:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxx
   ```

---

### **Step 2: Install Dependencies**

Ensure you have the required dependencies installed:

```bash
npm install axios uuid
```

---

### **Step 3: Configure the Claude Adapter**

The `ClaudeAdapter` is already implemented in the project (see [Agent Integrations](INTEGRATIONS.md)). Here’s a **detailed breakdown** of how it works:

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
        'anthropic-version': '2023-06-01', // Required for Messages API
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
        options: [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2',
          'claude-2:1',
          'claude-instant-1',
        ],
      },
      {
        name: 'maxTokens',
        type: 'number',
        default: 1024,
        required: false,
        description: 'Maximum number of tokens to generate (1-4096 for Claude 3, 1-1000 for Claude 2).',
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

## 📡 **API Endpoints**

Anthropic provides **two primary APIs** for Claude:

| **API** | **Endpoint** | **Description** | **Use Case** |
|---------|--------------|-----------------|--------------|
| **Messages API** | `POST /v1/messages` | Modern, conversational API | **Recommended** (chat, multi-turn conversations) |
| **Text Completions API** | `POST /v1/completions` | Legacy API for text generation | Simple prompts |

---

### **1. Messages API (Recommended)**

The **Messages API** is the **primary way** to interact with Claude. It supports:
- **Multi-turn conversations** (maintains context).
- **System prompts** (for instructions).
- **Tool use** (function calling).
- **Long context** (up to 200K tokens).

#### **Request Format**

```typescript
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 1024,
  "temperature": 0.7,
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ]
}
```

#### **Response Format**

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-3-sonnet-20240229",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 25,
    "output_tokens": 10
  }
}
```

#### **Example Usage**

```typescript
import axios from 'axios';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = axios.create({
  baseURL: 'https://api.anthropic.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
});

// Send a message
const response = await client.post('/messages', {
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  temperature: 0.7,
  messages: [
    { role: 'user', content: 'Hello, Claude!' },
  ],
});

console.log(response.data.content[0].text);
```

---

### **2. Text Completions API (Legacy)**

The **Text Completions API** is the **older API** for Claude. It is **simpler** but lacks some features of the Messages API.

#### **Request Format**

```typescript
{
  "prompt": "\n\nHuman: Hello, Claude!\n\nAssistant:",
  "model": "claude-2",
  "max_tokens_to_sample": 1024,
  "temperature": 0.7,
}
```

#### **Response Format**

```json
{
  "completion": " Hello! How can I help you today?",
  "stop_reason": "stop_sequence",
  "stop": "\n\nHuman:"
}
```

#### **Example Usage**

```typescript
import axios from 'axios';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = axios.create({
  baseURL: 'https://api.anthropic.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  },
});

// Send a completion request
const response = await client.post('/completions', {
  prompt: '\n\nHuman: Hello, Claude!\n\nAssistant:',
  model: 'claude-2',
  max_tokens_to_sample: 1024,
  temperature: 0.7,
});

console.log(response.data.completion);
```

---

## 🛠 **Claude-Specific Features**

### **1. System Prompts**

Use **system prompts** to **guide Claude’s behavior**:

```typescript
const response = await client.post('/messages', {
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  system: 'You are a helpful assistant that always responds in JSON format.',
  messages: [
    { role: 'user', content: 'List the top 3 programming languages.' },
  ],
});
```

---

### **2. Multi-Turn Conversations**

Maintain **context** across multiple messages:

```typescript
// First message
const response1 = await client.post('/messages', {
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude!' },
  ],
});

// Second message (with context)
const response2 = await client.post('/messages', {
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude!' },
    { role: 'assistant', content: response1.data.content[0].text },
    { role: 'user', content: 'What is your name?' },
  ],
});
```

---

### **3. Tool Use (Function Calling)**

Claude can **call functions** (tools) to interact with external systems:

```typescript
const response = await client.post('/messages', {
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  tools: [
    {
      name: 'get_weather',
      description: 'Get the weather for a given city.',
      input_schema: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'The city to get the weather for.' },
        },
        required: ['city'],
      },
    },
  ],
  messages: [
    { role: 'user', content: 'What is the weather in San Francisco?' },
  ],
});

// Check if Claude called a tool
if (response.data.content.some((c: any) => c.type === 'tool_use')) {
  const toolCall = response.data.content.find((c: any) => c.type === 'tool_use');
  console.log('Tool called:', toolCall.name, toolCall.input);
}
```

---

### **4. Streaming Responses**

Get **real-time streaming** responses (useful for long generations):

```typescript
import axios from 'axios';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = axios.create({
  baseURL: 'https://api.anthropic.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
});

// Stream a response
const response = await client.post('/messages', {
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Write a 500-word essay on AI.' },
  ],
  stream: true,
}, {
  responseType: 'stream',
});

// Handle the stream
response.data.on('data', (chunk: any) => {
  const lines = chunk.toString().split('\n');
  for (const line of lines) {
    if (line.trim() === '') continue;
    const data = JSON.parse(line);
    if (data.type === 'message_delta') {
      process.stdout.write(data.delta.text);
    }
  }
});
```

---

## 📊 **Pricing & Rate Limits**

### **1. Pricing**

| **Model** | **Input Token Price** | **Output Token Price** | **Example Cost (1K tokens in/out)** |
|-----------|-----------------------|------------------------|--------------------------------------|
| `claude-3-opus-20240229` | $0.015/1K | $0.075/1K | $0.09 |
| `claude-3-sonnet-20240229` | $0.003/1K | $0.015/1K | $0.018 |
| `claude-3-haiku-20240307` | $0.00025/1K | $0.00125/1K | $0.0015 |
| `claude-2` | $0.008/1K | $0.024/1K | $0.032 |
| `claude-instant-1` | $0.0016/1K | $0.0055/1K | $0.0071 |

**Example**: A conversation with **10K input tokens** and **5K output tokens** using `claude-3-sonnet-20240229` would cost:
- Input: 10 * $0.003 = **$0.03**
- Output: 5 * $0.015 = **$0.075**
- **Total**: **$0.105**

---

### **2. Rate Limits**

Anthropic enforces **rate limits** to prevent abuse:

| **Limit** | **Value** | **Description** |
|-----------|-----------|-----------------|
| **Requests per minute** | 100 | Maximum requests per minute per API key. |
| **Requests per day** | 10,000 | Maximum requests per day per API key. |
| **Tokens per minute** | 1,000,000 | Maximum tokens per minute per API key. |

**Note**: Rate limits may vary based on your plan. Check the [Anthropic Pricing Page](https://www.anthropic.com/pricing) for updates.

---

### **3. Handling Rate Limits**

If you hit a rate limit, the API will return a **`429 Too Many Requests`** error with a `Retry-After` header. Handle this gracefully:

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.anthropic.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
});

// Add a retry mechanism
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60; // Default: 60 seconds
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return client(error.config); // Retry the request
    }
    return Promise.reject(error);
  }
);
```

---

## 🔄 **Claude in Multiplayer AI Orchestration**

### **1. How Claude is Used**

In the **Multiplayer AI Orchestration** system, Claude is:
- The **default agent** for general-purpose tasks.
- Used for **reasoning, conversation, and coding**.
- **Fallback agent** for other agents (e.g., if Codex fails, Claude is tried next).

### **2. Example Workflow**

1. **User sends a message** in a shared session.
2. The **Agent Router** routes the message to Claude.
3. Claude **processes the message** and returns a response.
4. The **State Sync Engine** broadcasts the response to all users in the session.
5. All users **see the response in real time**.

### **3. Claude-Specific UI**

The frontend allows users to:
- **Select Claude** as the active agent.
- **Configure Claude parameters** (model, temperature, max tokens).
- **View token usage** for each request.

```tsx
// Example: Claude configuration UI
import { useState } from 'react';
import { AgentType } from '../../../shared/types';

const CLAUDE_MODELS = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-2',
];

interface ClaudeConfigProps {
  parameters: Record<string, any>;
  onUpdate: (name: string, value: any) => void;
}

export const ClaudeConfig: React.FC<ClaudeConfigProps> = ({ parameters, onUpdate }) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm">Model</label>
        <select
          value={parameters.model || 'claude-3-sonnet-20240229'}
          onChange={(e) => onUpdate('model', e.target.value)}
          className="rounded-lg border p-2"
        >
          {CLAUDE_MODELS.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm">Max Tokens</label>
        <input
          type="number"
          value={parameters.maxTokens || 1024}
          onChange={(e) => onUpdate('maxTokens', Number(e.target.value))}
          min="1"
          max="4096"
          className="rounded-lg border p-2"
        />
      </div>
      <div>
        <label className="text-sm">Temperature</label>
        <input
          type="range"
          value={parameters.temperature || 0.7}
          onChange={(e) => onUpdate('temperature', Number(e.target.value))}
          min="0"
          max="1"
          step="0.1"
          className="w-full"
        />
        <span className="text-sm">{parameters.temperature || 0.7}</span>
      </div>
    </div>
  );
};
```

---

## 🚀 **Best Practices**

### **1. Prompt Engineering**

- **Be specific**: Clearly state what you want Claude to do.
  - ❌ "Write code."
  - ✅ "Write a Python function that sorts a list of integers in ascending order."
- **Provide context**: Include relevant background information.
- **Use examples**: Show Claude what the output should look like.
- **Break down tasks**: For complex tasks, break them into smaller steps.

### **2. Parameter Tuning**

| **Parameter** | **Effect** | **Recommended Value** |
|---------------|------------|------------------------|
| **temperature** | Controls randomness (0 = deterministic, 1 = creative) | `0.7` (balanced) |
| **max_tokens** | Maximum tokens to generate | `1024` (default) |
| **model** | Claude model to use | `claude-3-sonnet-20240229` (best balance) |

### **3. Cost Optimization**

- **Use caching**: Cache frequent requests to avoid reprocessing.
- **Use smaller models**: For simple tasks, use `claude-3-haiku-20240307` (cheaper).
- **Batch requests**: Combine multiple requests into one (if possible).
- **Limit max_tokens**: Set `max_tokens` to the minimum needed.

### **4. Error Handling**

- **Retry on rate limits**: Use exponential backoff for `429` errors.
- **Fallback to other agents**: If Claude fails, try Codex or Hermes.
- **Graceful degradation**: If all agents fail, show a user-friendly error.

---

## 🐛 **Troubleshooting**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| **`401 Unauthorized`** | Invalid API key | Check your `ANTHROPIC_API_KEY`. |
| **`404 Not Found`** | Incorrect endpoint | Use `https://api.anthropic.com/v1/messages`. |
| **`429 Too Many Requests`** | Rate limit exceeded | Wait and retry (use `Retry-After` header). |
| **`500 Internal Server Error`** | Anthropic server issue | Retry later or check [Anthropic Status](https://status.anthropic.com/). |
| **`Invalid API key`** | API key not set | Set `x-api-key` header. |
| **`Missing anthropic-version`** | Missing version header | Add `anthropic-version: 2023-06-01`. |
| **`Model not found`** | Invalid model name | Use a valid model (e.g., `claude-3-sonnet-20240229`). |

---

## 📚 **Resources**

- [Anthropic Documentation](https://docs.anthropic.com/) – Official API docs.
- [Claude Models](https://www.anthropic.com/news/claude-3-family) – Model comparisons.
- [Pricing](https://www.anthropic.com/pricing) – Up-to-date pricing.
- [API Status](https://status.anthropic.com/) – Check API status.
- [Community](https://community.anthropic.com/) – Ask questions and share feedback.

---

## 🎯 **Next Steps**

1. **Get your API key** from the [Anthropic Console](https://console.anthropic.com/).
2. **Add it to your `.env` file**.
3. **Test the Claude adapter** locally:
   ```bash
   npm run dev
   ```
4. **Integrate Claude into your workflows** (e.g., chat, coding, reasoning).

---

## 📞 **Need Help?**

If you have questions about Claude integration:
1. Check the **[Anthropic Documentation](https://docs.anthropic.com/)**.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

**Happy coding with Claude!** 🦜
