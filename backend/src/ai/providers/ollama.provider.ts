import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider, ChatMessage, LlmHealthStatus } from '../interfaces/llm.provider.interface';
import axios from 'axios';

@Injectable()
export class OllamaProvider implements LlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly modelName: string;
  private lastSuccessfulRequest?: Date;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'llama3';
    this.logger.log(`Ollama provider initialized. Target URL: ${this.baseUrl}, Model: ${this.modelName}`);
  }

  async generateResponse(systemContext: string, conversation: ChatMessage[]): Promise<string> {
    this.logger.log(`Generating response via Ollama (${this.modelName})`);
    this.logger.debug(`[REAL LLM] System Prompt: ${systemContext}`);
    this.logger.debug(`[REAL LLM] Conversation Payload: ${JSON.stringify(conversation)}`);
    
    try {
      const messages = [
        { role: 'system', content: systemContext },
        ...conversation,
      ];

      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.modelName,
        messages,
        stream: false,
      });

      this.lastSuccessfulRequest = new Date();
      return response.data.message.content;
    } catch (error: any) {
      this.logger.error('Failed to generate response from Ollama', error.message);
      throw error;
    }
  }

  async checkHealth(): Promise<LlmHealthStatus> {
    try {
      // Check if Ollama is running and has the model
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      const models = response.data.models || [];
      const hasModel = models.some((m: any) => m.name.includes(this.modelName));
      
      return {
        providerName: 'Ollama',
        modelName: this.modelName,
        isAvailable: hasModel,
        mode: 'real',
        lastSuccessfulRequest: this.lastSuccessfulRequest,
        error: hasModel ? undefined : `Model ${this.modelName} not found locally`,
      };
    } catch (error: any) {
      return {
        providerName: 'Ollama',
        modelName: this.modelName,
        isAvailable: false,
        mode: 'real',
        lastSuccessfulRequest: this.lastSuccessfulRequest,
        error: error.message,
      };
    }
  }
}
