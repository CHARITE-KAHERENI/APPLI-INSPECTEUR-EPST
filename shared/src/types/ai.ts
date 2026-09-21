import type { FormCode } from './common';

/**
 * Intégration IA (PROMPT 8) — types partagés entre le backend
 * (`modules/ai`) et le web (`pages/AssistantIaPage`, `pages/AnalyseIaPage`,
 * `components/ChatbotWidget`). Le mobile a son propre miroir Dart (voir
 * `mobile/lib/core/ai`).
 */

export interface WritingAssistantRequest {
  formCode: FormCode;
  sectionTitle: string;
  rawNotes: string;
  enseignantHistorySummary?: string;
}

export interface WritingAssistantResponse {
  suggestion: string;
}

export interface AiTrendAnalysis {
  id: string;
  generatedAt: string;
  periodLabel: string;
  alerts: string[];
  trends: string[];
  positives: string[];
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatHistoryMessage[];
}

export interface ChatResponse {
  reply: string;
}
