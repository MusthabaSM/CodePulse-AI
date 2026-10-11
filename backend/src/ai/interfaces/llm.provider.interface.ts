export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlmHealthStatus {
  providerName: string;
  modelName: string;
  isAvailable: boolean;
  mode: 'real' | 'mock';
  lastSuccessfulRequest?: Date;
  error?: string;
  quotaStatus?: string;
}

export interface LlmProvider {
  /**
   * Generates a response from the LLM based on the conversation history and system context.
   */
  generateResponse(
    systemContext: string,
    conversation: ChatMessage[],
  ): Promise<string>;

  checkHealth(): Promise<LlmHealthStatus>;
}
