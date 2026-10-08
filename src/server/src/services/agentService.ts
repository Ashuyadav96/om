import { logger } from '../utils/logger';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from '../config/database';

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Agent configuration
interface AgentConfig {
  id: string;
  agentType: string;
  displayName: string;
  provider: 'anthropic' | 'openai' | 'huggingface';
  apiKeyEnvVar: string;
  defaultModel: string;
  models: string[];
}

const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'claude',
    agentType: 'claude',
    displayName: 'Claude',
    provider: 'anthropic',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-sonnet-20240229',
    models: [
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'claude-2-1',
      'claude-2',
      'claude-instant-1-2',
    ],
  },
  {
    id: 'codex',
    agentType: 'codex',
    displayName: 'Codex',
    provider: 'openai',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4',
    models: [
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-0613',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ],
  },
  {
    id: 'hermes',
    agentType: 'hermes',
    displayName: 'Hermes',
    provider: 'huggingface',
    apiKeyEnvVar: 'HUGGINGFACE_API_KEY',
    defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    models: [
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'Hermes-2-Pro-mistralai',
    ],
  },
];

// Message interface
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Agent response interface
interface AgentResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason?: string;
}

// Agent request interface
interface AgentRequest {
  sessionId: string;
  userId: string;
  messages: Message[];
  agentType: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// Agent service class
class AgentService {
  private messageHistory: Map<string, Message[]> = new Map();

  // Get agent configuration
  getAgentConfig(agentType: string): AgentConfig | undefined {
    return AGENT_CONFIGS.find((config) => config.agentType === agentType);
  }

  // Get all agent configurations
  getAllAgentConfigs(): AgentConfig[] {
    return AGENT_CONFIGS;
  }

  // Generate system prompt based on context
  private generateSystemPrompt(agentType: string, sessionId: string): string {
    const prompts: Record<string, string> = {
      claude: `You are Claude, an AI assistant helping a team collaborate in real-time. 
Be concise, helpful, and collaborative. The team is working together in session ${sessionId}.`,
      codex: `You are Codex, an AI coding assistant. Help with code generation, debugging, and explanation. 
The team is collaborating in real-time in session ${sessionId}.`,
      hermes: `You are Hermes, a reasoning assistant. Provide detailed, well-structured responses. 
You're helping a team collaborate in real-time in session ${sessionId}.`,
    };

    return prompts[agentType] || prompts.claude;
  }

  // Generate a response from an agent
  async generateResponse(request: AgentRequest): Promise<AgentResponse> {
    const { sessionId, userId, messages, agentType, modelId, maxTokens, temperature, systemPrompt } = request;

    logger.info(`🤖 Generating response from ${agentType} in session ${sessionId}`);

    const config = this.getAgentConfig(agentType);
    if (!config) {
      throw new Error(`Agent type ${agentType} not supported`);
    }

    // Check API key
    if (!process.env[config.apiKeyEnvVar]) {
      throw new Error(`${config.apiKeyEnvVar} environment variable not set`);
    }

    // Use default model if not specified
    const model = modelId || config.defaultModel;

    // Set defaults
    const max_tokens = maxTokens || 1024;
    const temp = temperature || 0.7;

    // Generate system prompt
    const systemPromptFinal = systemPrompt || this.generateSystemPrompt(agentType, sessionId);

    try {
      switch (config.provider) {
        case 'anthropic':
          return await this.callAnthropic(model, systemPromptFinal, messages, max_tokens, temp);
        case 'openai':
          return await this.callOpenAI(model, systemPromptFinal, messages, max_tokens, temp);
        case 'huggingface':
          return await this.callHuggingFace(model, systemPromptFinal, messages, max_tokens, temp);
        default:
          throw new Error(`Provider ${config.provider} not supported`);
      }
    } catch (error) {
      logger.error(`Agent ${agentType} error:`, error);
      throw error;
    }
  }

  // Call Anthropic API (Claude)
  private async callAnthropic(
    model: string,
    systemPrompt: string,
    messages: Message[],
    maxTokens: number,
    temperature: number
  ): Promise<AgentResponse> {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages as any,
      });

      const content = response.content[0]?.text || '';

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        finishReason: response.stop_reason || 'end_turn',
      };
    } catch (error) {
      logger.error('Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Call OpenAI API (Codex, GPT-4)
  private async callOpenAI(
    model: string,
    systemPrompt: string,
    messages: Message[],
    maxTokens: number,
    temperature: number
  ): Promise<AgentResponse> {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
        finishReason: response.choices[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Call Hugging Face API (Hermes)
  private async callHuggingFace(
    model: string,
    systemPrompt: string,
    messages: Message[],
    maxTokens: number,
    temperature: number
  ): Promise<AgentResponse> {
    // TODO: Implement Hugging Face integration
    logger.warn('Hugging Face integration not yet implemented, returning simulated response');

    // Simulate a response for now
    return {
      content: `Hermes response (simulated): Based on the conversation, here's my analysis: ${messages[messages.length - 1]?.content || ''}`,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      finishReason: 'stop',
    };
  }

  // Stream a response from an agent
  async *streamResponse(request: AgentRequest): AsyncGenerator<string> {
    const { sessionId, userId, messages, agentType, modelId, maxTokens, temperature, systemPrompt } = request;

    logger.info(`🤖 Streaming response from ${agentType} in session ${sessionId}`);

    const config = this.getAgentConfig(agentType);
    if (!config) {
      throw new Error(`Agent type ${agentType} not supported`);
    }

    // Check API key
    if (!process.env[config.apiKeyEnvVar]) {
      throw new Error(`${config.apiKeyEnvVar} environment variable not set`);
    }

    // Use default model if not specified
    const model = modelId || config.defaultModel;

    // Set defaults
    const max_tokens = maxTokens || 1024;
    const temp = temperature || 0.7;

    // Generate system prompt
    const systemPromptFinal = systemPrompt || this.generateSystemPrompt(agentType, sessionId);

    try {
      switch (config.provider) {
        case 'anthropic':
          yield* this.streamAnthropic(model, systemPromptFinal, messages, max_tokens, temp);
          break;
        case 'openai':
          yield* this.streamOpenAI(model, systemPromptFinal, messages, max_tokens, temp);
          break;
        case 'huggingface':
          yield* this.streamHuggingFace(model, systemPromptFinal, messages, max_tokens, temp);
          break;
        default:
          throw new Error(`Provider ${config.provider} not supported`);
      }
    } catch (error) {
      logger.error(`Agent ${agentType} streaming error:`, error);
      throw error;
    }
  }

  // Stream from Anthropic
  private async *streamAnthropic(
    model: string,
    systemPrompt: string,
    messages: Message[],
    maxTokens: number,
    temperature: number
  ): AsyncGenerator<string> {
    try {
      const stream = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages as any,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'message_delta') {
          const content = chunk.delta?.text || '';
          if (content) {
            yield content;
          }
        }
      }
    } catch (error) {
      logger.error('Anthropic streaming error:', error);
      throw error;
    }
  }

  // Stream from OpenAI
  private async *streamOpenAI(
    model: string,
    systemPrompt: string,
    messages: Message[],
    maxTokens: number,
    temperature: number
  ): AsyncGenerator<string> {
    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  // Stream from Hugging Face
  private async *streamHuggingFace(
    model: string,
    systemPrompt: string,
    messages: Message[],
    maxTokens: number,
    temperature: number
  ): AsyncGenerator<string> {
    // TODO: Implement Hugging Face streaming
    logger.warn('Hugging Face streaming not yet implemented');
    
    // Simulate streaming
    const response = await this.callHuggingFace(model, systemPrompt, messages, maxTokens, temperature);
    
    // Split into chunks and yield
    const chunks = response.content.match(/.{1,10}/g) || [];
    for (const chunk of chunks) {
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Get available models for an agent
  async getAvailableModels(agentType: string): Promise<string[]> {
    const config = this.getAgentConfig(agentType);
    if (!config) {
      return [];
    }

    // For now, return configured models
    // TODO: Fetch from API
    return config.models;
  }

  // Get agent information
  async getAgentInfo(agentType: string) {
    const config = this.getAgentConfig(agentType);
    if (!config) {
      return null;
    }

    return {
      id: config.id,
      agentType: config.agentType,
      displayName: config.displayName,
      provider: config.provider,
      defaultModel: config.defaultModel,
      models: config.models,
      isAvailable: !!process.env[config.apiKeyEnvVar],
    };
  }
}

// Export singleton instance
export const agentService = new AgentService();

export default agentService;
