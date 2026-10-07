# 💻 Codex Agent Integration

> **Detailed guide for integrating OpenAI's Codex AI**

---

## 🎯 **Overview**

**Codex** is OpenAI’s **AI model for code generation**, designed to **write, explain, and debug code**. It is one of the **primary agents** supported by the **Multiplayer AI Orchestration** system for **coding-related tasks**.

---

## 🔗 **Key Features**

| **Feature** | **Description** | **Codex Support** |
|-------------|-----------------|--------------------|
| **Code Generation** | Writes code in **dozens of languages** | ✅ Yes |
| **Code Completion** | Autocompletes code in real time | ✅ Yes |
| **Code Explanation** | Explains how code works | ✅ Yes |
| **Bug Fixing** | Identifies and fixes bugs | ✅ Yes |
| **Multi-Language** | Supports **Python, JavaScript, Java, C++, etc.** | ✅ Yes |
| **Context Awareness** | Understands **existing code** | ✅ Yes |

---

## 🏗 **Codex Models**

OpenAI offers **two Codex models** with different capabilities:

| **Model** | **Description** | **Context Window** | **Pricing** | **Best For** |
|-----------|-----------------|--------------------|-------------|-------------|
| `code-davinci-002` | More powerful, higher quality | 8K tokens | $0.02/1K tokens | **Recommended** (complex tasks) |
| `code-cushman-001` | Faster, lower cost | 8K tokens | $0.02/1K tokens | Simple tasks |

**Recommendation**: Use `code-davinci-002` as the **default model** (best quality).

---

## 🔧 **API Setup**

### **Step 1: Get an API Key**

1. **Sign up for OpenAI**:
   - Go to [https://platform.openai.com/](https://platform.openai.com/).
   - Click **"Sign Up"** and create an account.

2. **Get your API key**:
   - Log in to the [OpenAI Dashboard](https://platform.openai.com/account).
   - Navigate to **"API Keys"** in the sidebar.
   - Click **"Create New Secret Key"** and copy the generated key.

3. **Add the key to your `.env` file**:
   ```env
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxx
   ```

---

### **Step 2: Install Dependencies**

Ensure you have the required dependencies installed:

```bash
npm install axios uuid
```

---

### **Step 3: Configure the Codex Adapter**

The `CodexAdapter` is already implemented in the project (see [Agent Integrations](INTEGRATIONS.md)). Here’s a **detailed breakdown** of how it works:

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
        stop: parameters?.stop || '\n',
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
      {
        name: 'stop',
        type: 'string',
        default: '\n',
        required: false,
        description: 'Sequence where the API will stop generating.',
      },
    ];
  }
}
```

---

## 📡 **API Endpoints**

OpenAI provides **one primary API** for Codex:

| **API** | **Endpoint** | **Description** | **Use Case** |
|---------|--------------|-----------------|--------------|
| **Completions API** | `POST /v1/completions` | Generate code completions | **Primary API** (code generation) |

---

### **1. Completions API**

The **Completions API** is the **primary way** to interact with Codex. It generates **code completions** based on a **prompt**.

#### **Request Format**

```typescript
{
  "model": "code-davinci-002",
  "prompt": "// Write a Python function to sort a list\n",
  "max_tokens": 1024,
  "temperature": 0.7,
  "top_p": 1,
  "stop": "\n"
}
```

#### **Response Format**

```json
{
  "id": "cmpl-123",
  "object": "text_completion",
  "created": 1680000000,
  "model": "code-davinci-002",
  "choices": [
    {
      "text": "def sort_list(lst):\n    return sorted(lst)",
      "index": 0,
      "finish_reason": "stop",
      "stop": "\n"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

#### **Example Usage**

```typescript
import axios from 'axios';

const apiKey = process.env.OPENAI_API_KEY;
const client = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
});

// Send a completion request
const response = await client.post('/completions', {
  model: 'code-davinci-002',
  prompt: '// Write a Python function to sort a list\n',
  max_tokens: 1024,
  temperature: 0.7,
  top_p: 1,
  stop: '\n',
});

console.log(response.data.choices[0].text);
```

---

## 🛠 **Codex-Specific Features**

### **1. Code Generation**

Generate **code in any language** based on a prompt:

```typescript
const response = await client.post('/completions', {
  model: 'code-davinci-002',
  prompt: '// Write a JavaScript function to fetch data from an API\n',
  max_tokens: 512,
  temperature: 0.5,
});

const code = response.data.choices[0].text;
console.log(code);
```

**Example Output**:
```javascript
// Write a JavaScript function to fetch data from an API

async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}
```

---

### **2. Code Completion**

Autocomplete **existing code** (e.g., in an IDE):

```typescript
const response = await client.post('/completions', {
  model: 'code-davinci-002',
  prompt: `// Given an array of numbers, sort it
function sortArray(arr) {
  `,
  max_tokens: 64,
  temperature: 0.2,
  stop: '}',
});

const completion = response.data.choices[0].text;
console.log(`function sortArray(arr) {${completion}`);
```

**Example Output**:
```javascript
function sortArray(arr) {
  return arr.sort((a, b) => a - b);
}
```

---

### **3. Code Explanation**

Explain **how code works**:

```typescript
const response = await client.post('/completions', {
  model: 'code-davinci-002',
  prompt: `// Explain the following Python code
import os

# List all files in a directory
def list_files(directory):
    for filename in os.listdir(directory):
        print(filename)

`,
  max_tokens: 256,
  temperature: 0.3,
});

console.log(response.data.choices[0].text);
```

**Example Output**:
```
// Explain the following Python code

This Python code does the following:

1. Imports the `os` module, which provides functions for interacting with the operating system.
2. Defines a function `list_files` that takes a `directory` parameter.
3. Uses `os.listdir(directory)` to get a list of all files and directories in the specified `directory`.
4. Iterates over the list and prints each filename.

In summary, this code lists all files and directories in a given directory.
```

---

### **4. Bug Fixing**

Identify and **fix bugs** in code:

```typescript
const response = await client.post('/completions', {
  model: 'code-davinci-002',
  prompt: `// Fix the following Python function
# This function is supposed to return the sum of a list, but it has a bug
def sum_list(lst):
    total = 0
    for i in range(len(lst)):
        total += lst[i + 1]
    return total

Fixed version:
`,
  max_tokens: 128,
  temperature: 0.2,
});

console.log(response.data.choices[0].text);
```

**Example Output**:
```python
# Fix the following Python function
# This function is supposed to return the sum of a list, but it has a bug
def sum_list(lst):
    total = 0
    for i in range(len(lst)):
        total += lst[i + 1]
    return total

Fixed version:
def sum_list(lst):
    total = 0
    for num in lst:
        total += num
    return total
```

---

### **5. Multi-Language Support**

Codex supports **dozens of programming languages**, including:
- **Python**
- **JavaScript/TypeScript**
- **Java**
- **C/C++**
- **Go**
- **Rust**
- **Ruby**
- **PHP**
- **Swift**
- **Kotlin**

**Example**: Generate **Java code**:
```typescript
const response = await client.post('/completions', {
  model: 'code-davinci-002',
  prompt: '// Write a Java method to reverse a string\n',
  max_tokens: 128,
  temperature: 0.3,
});

console.log(response.data.choices[0].text);
```

**Example Output**:
```java
// Write a Java method to reverse a string

public static String reverseString(String str) {
    StringBuilder reversed = new StringBuilder();
    for (int i = str.length() - 1; i >= 0; i--) {
        reversed.append(str.charAt(i));
    }
    return reversed.toString();
}
```

---

## 📊 **Pricing & Rate Limits**

### **1. Pricing**

| **Model** | **Pricing** | **Example Cost (1K tokens)** |
|-----------|-------------|--------------------------------|
| `code-davinci-002` | $0.02/1K tokens | $0.02 |
| `code-cushman-001` | $0.02/1K tokens | $0.02 |

**Example**: A **100-line Python script** (~1K tokens) would cost **$0.02** to generate.

---

### **2. Rate Limits**

OpenAI enforces **rate limits** to prevent abuse:

| **Limit** | **Value** | **Description** |
|-----------|-----------|-----------------|
| **Requests per minute** | 60 | Maximum requests per minute per API key. |
| **Tokens per minute** | 60,000 | Maximum tokens per minute per API key. |
| **Requests per day** | Unlimited | No daily limit (but subject to usage-based billing). |

**Note**: Rate limits may vary based on your plan. Check the [OpenAI Pricing Page](https://openai.com/pricing) for updates.

---

### **3. Handling Rate Limits**

If you hit a rate limit, the API will return a **`429 Too Many Requests`** error. Handle this gracefully:

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
});

// Add a retry mechanism
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = 60; // Default: 60 seconds
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return client(error.config); // Retry the request
    }
    return Promise.reject(error);
  }
);
```

---

## 🔄 **Codex in Multiplayer AI Orchestration**

### **1. How Codex is Used**

In the **Multiplayer AI Orchestration** system, Codex is:
- The **primary agent for coding tasks** (code generation, completion, explanation).
- Used for **real-time code collaboration** (e.g., pair programming).
- **Fallback agent** for Claude (if Claude fails, Codex is tried next).

### **2. Example Workflow**

1. **User writes a code prompt** in a shared session (e.g., "Write a Python function to sort a list").
2. The **Agent Router** routes the prompt to Codex.
3. Codex **generates the code** and returns it.
4. The **State Sync Engine** broadcasts the code to all users in the session.
5. All users **see the code in real time** and can **edit or extend it**.

### **3. Codex-Specific UI**

The frontend allows users to:
- **Select Codex** as the active agent for coding tasks.
- **Configure Codex parameters** (model, temperature, max tokens, stop sequence).
- **View token usage** for each request.

```tsx
// Example: Codex configuration UI
import { useState } from 'react';
import { AgentType } from '../../../shared/types';

const CODEX_MODELS = [
  'code-davinci-002',
  'code-cushman-001',
];

interface CodexConfigProps {
  parameters: Record<string, any>;
  onUpdate: (name: string, value: any) => void;
}

export const CodexConfig: React.FC<CodexConfigProps> = ({ parameters, onUpdate }) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm">Model</label>
        <select
          value={parameters.model || 'code-davinci-002'}
          onChange={(e) => onUpdate('model', e.target.value)}
          className="rounded-lg border p-2"
        >
          {CODEX_MODELS.map((model) => (
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
      <div>
        <label className="text-sm">Stop Sequence</label>
        <input
          type="text"
          value={parameters.stop || '\n'}
          onChange={(e) => onUpdate('stop', e.target.value)}
          className="rounded-lg border p-2"
        />
      </div>
    </div>
  );
};
```

---

## 🚀 **Best Practices**

### **1. Prompt Engineering for Code**

- **Be specific**: Clearly state the **language, task, and requirements**.
  - ❌ "Write code."
  - ✅ "Write a Python function that takes a list of integers and returns the sum."
- **Provide context**: Include **existing code** or **examples**.
- **Use comments**: Start prompts with **comments** to guide Codex.
  - ✅ `// Write a JavaScript function to fetch data from an API`
- **Break down tasks**: For complex tasks, break them into **smaller steps**.

### **2. Parameter Tuning**

| **Parameter** | **Effect** | **Recommended Value** | **Use Case** |
|---------------|------------|------------------------|-------------|
| **temperature** | Controls randomness (0 = deterministic, 1 = creative) | `0.3–0.7` | Lower for precise code, higher for creative solutions |
| **max_tokens** | Maximum tokens to generate | `64–1024` | Shorter for completions, longer for full functions |
| **top_p** | Nucleus sampling (0.1–1.0) | `1.0` | Keep at 1.0 for code |
| **stop** | Sequence to stop generation | `\n`, `;`, `}` | Stop at natural code boundaries |

### **3. Cost Optimization**

- **Use caching**: Cache **frequent code snippets** to avoid regenerating.
- **Limit max_tokens**: Set `max_tokens` to the **minimum needed**.
- **Batch requests**: Combine **multiple completions** into one request (if possible).
- **Use stop sequences**: Stop generation at **natural boundaries** (e.g., `\n`, `}`).

### **4. Error Handling**

- **Retry on rate limits**: Use exponential backoff for `429` errors.
- **Fallback to other agents**: If Codex fails, try Claude or Hermes.
- **Graceful degradation**: If all agents fail, show a user-friendly error.

---

## 🐛 **Troubleshooting**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| **`401 Unauthorized`** | Invalid API key | Check your `OPENAI_API_KEY`. |
| **`404 Not Found`** | Incorrect endpoint | Use `https://api.openai.com/v1/completions`. |
| **`429 Too Many Requests`** | Rate limit exceeded | Wait and retry (use `Retry-After` header). |
| **`500 Internal Server Error`** | OpenAI server issue | Retry later or check [OpenAI Status](https://status.openai.com/). |
| **`Invalid API key`** | API key not set | Set `Authorization: Bearer YOUR_API_KEY`. |
| **`Model not found`** | Invalid model name | Use `code-davinci-002` or `code-cushman-001`. |
| **`Max tokens exceeded`** | `max_tokens` too high | Reduce `max_tokens` (max is 4096 for Codex). |

---

## 📚 **Resources**

- [OpenAI Documentation](https://platform.openai.com/docs) – Official API docs.
- [Codex Models](https://openai.com/blog/codex-java-python-js) – Model comparisons.
- [Pricing](https://openai.com/pricing) – Up-to-date pricing.
- [API Status](https://status.openai.com/) – Check API status.
- [Community](https://community.openai.com/) – Ask questions and share feedback.

---

## 🎯 **Next Steps**

1. **Get your API key** from the [OpenAI Dashboard](https://platform.openai.com/account).
2. **Add it to your `.env` file**.
3. **Test the Codex adapter** locally:
   ```bash
   npm run dev
   ```
4. **Integrate Codex into your coding workflows** (e.g., pair programming, code reviews).

---

## 📞 **Need Help?**

If you have questions about Codex integration:
1. Check the **[OpenAI Documentation](https://platform.openai.com/docs)**.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

**Happy coding with Codex!** 💻
