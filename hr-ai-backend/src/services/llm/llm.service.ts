import { Injectable } from '@nestjs/common';

@Injectable()
export class LlmService {
  async generateDraft(prompt: string) {
    return {
      content: `Mock AI draft for: ${prompt}`,
      provider: 'mock',
      note: 'LangChain.js or another LLM provider will be wired here later.',
    };
  }

  async answerQuestion(question: string) {
    return {
      answer: `Mock answer for: ${question}`,
      provider: 'mock',
    };
  }
}
