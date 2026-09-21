import type Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { AnthropicClientService } from './anthropic-client.service';
import { WritingAssistantRequestDto } from './dto/writing-assistant-request.dto';

/**
 * Assistant de rédaction (PROMPT 8, point 1) : reformule les notes
 * brutes d'un inspecteur, pour une section notée d'un formulaire, en un
 * conseil pédagogique structuré. Nécessite une connexion internet (appel
 * direct à l'API Anthropic) — mobile et web affichent tous deux un
 * message explicite en cas d'indisponibilité (hors-ligne ou clé absente)
 * plutôt que de bloquer la saisie : voir `mobile/README.md` et
 * `web/README.md`.
 */
@Injectable()
export class WritingAssistantService {
  constructor(
    private readonly anthropicClient: AnthropicClientService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async generateSuggestion(
    dto: WritingAssistantRequestDto,
  ): Promise<{ suggestion: string }> {
    const { systemPrompts } = this.configService.get('ai', { infer: true });

    const userMessage = [
      `Formulaire : ${dto.formCode}`,
      `Section : ${dto.sectionTitle}`,
      dto.enseignantHistorySummary
        ? `Historique de l'enseignant concerné : ${dto.enseignantHistorySummary}`
        : null,
      '',
      "Notes brutes de l'inspecteur :",
      dto.rawNotes,
    ]
      .filter((line): line is string => line !== null)
      .join('\n');

    const response = await this.anthropicClient.raw.messages.create({
      model: this.anthropicClient.model,
      max_tokens: 600,
      system: systemPrompts.writingAssistant,
      messages: [{ role: 'user', content: userMessage }],
    });

    const suggestion = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return { suggestion };
  }
}
