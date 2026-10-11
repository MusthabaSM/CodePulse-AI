import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider, ChatMessage, LlmHealthStatus } from '../interfaces/llm.provider.interface';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiProvider implements LlmProvider {
  private ai: GoogleGenAI | null = null;
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly modelName: string;
  private lastSuccessfulRequest?: Date;

  constructor() {
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.logger.log('Gemini API initialized successfully. AI Provider is ready.');
    } else {
      this.logger.warn('WARNING: No GEMINI_API_KEY found. AI Consultant will not function properly.');
    }
  }

  async generateResponse(
    systemContext: string,
    conversation: ChatMessage[],
  ): Promise<string> {
    if (!this.ai) {
      throw new Error('INVALID_API_KEY');
    }

    this.logger.debug(`[REAL LLM] Model: ${this.modelName}`);
    this.logger.debug(`[REAL LLM] System Prompt: ${systemContext}`);
    this.logger.debug(`[REAL LLM] Conversation Payload: ${JSON.stringify(conversation)}`);
    this.logger.debug(`[REAL_LLM_REQUEST] Starting API call to Gemini...`);

    try {
      // Map generic chat format to Gemini format
      const contents = conversation.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: systemContext,
          temperature: 0.7,
        },
      });

      const responseText = response.text || '';
      this.logger.debug(`[REAL_LLM_RESPONSE] Received response length: ${responseText.length}`);
      this.lastSuccessfulRequest = new Date();
      this.logger.debug(`[FINAL_RESPONSE] ${responseText}`);
      return responseText;
    } catch (error: any) {
      this.logger.error('Failed to generate response from Gemini', error);
      
      if (error.status === 429) {
        throw new Error('RATE_LIMITED');
      } else if (error.status === 404 || error.status === 403 || error.status === 503 || error.status === 400) {
        throw new Error('MODEL_UNAVAILABLE');
      }
      
      throw error;
    }
  }

  async checkHealth(): Promise<LlmHealthStatus> {
    try {
      if (!this.ai) {
        return {
          providerName: 'Gemini',
          modelName: 'none',
          isAvailable: false,
          mode: 'real',
          lastSuccessfulRequest: this.lastSuccessfulRequest,
          error: 'Missing API key',
          quotaStatus: 'UNKNOWN',
        };
      }
      return {
        providerName: 'Gemini',
        modelName: this.modelName,
        isAvailable: true,
        mode: 'real',
        lastSuccessfulRequest: this.lastSuccessfulRequest,
        quotaStatus: 'OK',
      };
    } catch (error: any) {
      const isQuotaError = error.status === 429;
      return {
        providerName: 'Gemini',
        modelName: this.modelName,
        isAvailable: false,
        mode: 'real',
        lastSuccessfulRequest: this.lastSuccessfulRequest,
        error: error.message,
        quotaStatus: isQuotaError ? 'EXHAUSTED' : 'UNKNOWN',
      };
    }
  }
}
