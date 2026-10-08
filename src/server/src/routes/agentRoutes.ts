import express from 'express';
import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { clerkAuth, attachUser, checkApiKeyAccess } from '../middleware/authMiddleware';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const router = Router();

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Validation schemas
const agentRequestSchema = z.object({
  sessionId: z.string(),
  prompt: z.string().min(1).max(10000),
  agentType: z.enum(['claude', 'codex', 'hermes']),
  modelId: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

const listModelsSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'huggingface']),
});

// POST /agents/chat - Send a message to an AI agent
router.post(
  '/chat',
  clerkAuth,
  attachUser,
  checkApiKeyAccess,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const body = agentRequestSchema.parse(req.body);
    const { sessionId, prompt, agentType, modelId, maxTokens, temperature } = body;

    logger.info(`🤖 Agent request from ${user.id}: ${prompt.substring(0, 50)}...`);

    let response: string;
    let usage: any = null;

    try {
      switch (agentType) {
        case 'claude':
          response = await handleClaudeRequest(prompt, modelId, maxTokens, temperature);
          break;
        case 'codex':
          response = await handleCodexRequest(prompt, modelId, maxTokens, temperature);
          break;
        case 'hermes':
          response = await handleHermesRequest(prompt, modelId, maxTokens, temperature);
          break;
        default:
          throw new Error(`Unsupported agent type: ${agentType}`);
      }

      // Store the message in the database
      await prisma.message.create({
        data: {
          sessionId,
          senderType: 'agent',
          senderId: agentType,
          senderName: agentType,
          content: response,
          agentType,
          metadata: {
            prompt,
            modelId,
            maxTokens,
            temperature,
            usage,
          },
        },
      });

      logger.info(`🤖 Agent ${agentType} responded to user ${user.id}`);

      res.json({
        success: true,
        data: {
          response,
          agentType,
          modelId,
          usage,
        },
      });
    } catch (error) {
      logger.error(`Agent ${agentType} error:`, error);
      
      // Store error message
      await prisma.message.create({
        data: {
          sessionId,
          senderType: 'system',
          senderId: 'system',
          senderName: 'System',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          agentType,
          metadata: { error: true },
        },
      });

      throw error;
    }
  })
);

// GET /agents/models - List available models for each provider
router.get(
  '/models',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const providers = await prisma.agentConfig.findMany({
      include: {
        models: true,
      },
    });

    res.json({
      success: true,
      data: providers,
    });
  })
);

// GET /agents/models/:provider - List models for a specific provider
router.get(
  '/models/:provider',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const { provider } = req.params;

    const agentConfig = await prisma.agentConfig.findUnique({
      where: { agentType: provider },
      include: {
        models: true,
      },
    });

    if (!agentConfig) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Provider ${provider} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: agentConfig,
    });
  })
);

// POST /agents/complete - Get autocomplete suggestions
router.post(
  '/complete',
  clerkAuth,
  attachUser,
  checkApiKeyAccess,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const body = agentRequestSchema.parse(req.body);
    const { prompt, agentType } = body;

    // For now, just return a simple completion
    // TODO: Integrate with actual autocomplete APIs
    const completions = generateCompletions(prompt, agentType);

    res.json({
      success: true,
      data: { completions },
    });
  })
);

// Helper functions for AI agent requests
async function handleClaudeRequest(
  prompt: string,
  modelId?: string,
  maxTokens?: number,
  temperature?: number
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const model = modelId || 'claude-3-sonnet-20240229';
  const max_tokens = maxTokens || 1024;
  const temp = temperature || 0.7;

  const msg = await anthropic.messages.create({
    model,
    max_tokens,
    temperature: temp,
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].text || 'No response from Claude';
}

async function handleCodexRequest(
  prompt: string,
  modelId?: string,
  maxTokens?: number,
  temperature?: number
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const model = modelId || 'gpt-4-codex';
  const max_tokens = maxTokens || 1024;
  const temp = temperature || 0.7;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens,
      temperature: temp,
    });

    return completion.choices[0].message.content || 'No response from Codex';
  } catch (error) {
    // Fallback to regular gpt-4 if codex is not available
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens,
      temperature: temp,
    });

    return completion.choices[0].message.content || 'No response from OpenAI';
  }
}

async function handleHermesRequest(
  prompt: string,
  modelId?: string,
  maxTokens?: number,
  temperature?: number
): Promise<string> {
  // Hermes is typically from Hugging Face
  // For now, we'll simulate a response
  // TODO: Integrate with Hugging Face API
  
  logger.warn('Hermes integration not yet implemented, returning simulated response');
  
  // Simulate a response
  return `Hermes response to "${prompt}": This is a simulated response. Hermes integration will be added soon.`;
}

// Generate autocomplete completions (simulated)
function generateCompletions(prompt: string, agentType: string): string[] {
  const completions = [
    `${prompt} and then...`,
    `${prompt} with the following approach:`,
    `${prompt} by using...`,
    `${prompt} to solve this, we need to:`,
    `${prompt} here's the answer:`,
  ];

  return completions.slice(0, 3);
}

export default router;
