import type Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { UserEntity } from '../users/entities/user.entity';
import { AnthropicClientService } from './anthropic-client.service';
import { ChatbotToolsService } from './chatbot-tools.service';
import { ChatRequestDto } from './dto/chat-request.dto';

const MAX_TOOL_ROUNDS = 4;

/**
 * Chatbot d'assistance (PROMPT 8, point 3) : boucle d'utilisation d'outils
 * ("tool use") de l'API Claude — le modèle ne reçoit jamais d'accès direct
 * à la base de données, seulement les résultats déjà calculés par
 * `ChatbotToolsService` (elle-même construite sur les services scopés par
 * rôle existants). `history` est reconstruit par le client à chaque appel
 * (pas de session serveur) — suffisant pour un widget de chat web léger.
 */
@Injectable()
export class ChatbotService {
  constructor(
    private readonly anthropicClient: AnthropicClientService,
    private readonly tools: ChatbotToolsService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async chat(
    dto: ChatRequestDto,
    user: UserEntity,
  ): Promise<{ reply: string }> {
    const { systemPrompts } = this.configService.get('ai', { infer: true });

    const messages: Anthropic.MessageParam[] = [
      ...(dto.history ?? []).map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      { role: 'user', content: dto.message },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await this.anthropicClient.raw.messages.create({
        model: this.anthropicClient.model,
        max_tokens: 800,
        system: systemPrompts.chatbot,
        tools: this.tools.definitions,
        messages,
      });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        const reply = response.content
          .filter(
            (block): block is Anthropic.TextBlock => block.type === 'text',
          )
          .map((block) => block.text)
          .join('\n')
          .trim();
        return { reply: reply || "Je n'ai pas pu formuler de réponse." };
      }

      // Le modèle demande à utiliser un ou plusieurs outils : on les exécute
      // (via ChatbotToolsService, jamais de SQL direct) et on renvoie les
      // résultats dans le tour suivant.
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(
            await this.tools.execute(
              block.name,
              block.input as Record<string, unknown>,
              user,
            ),
          ),
        })),
      );
      messages.push({ role: 'user', content: toolResults });
    }

    return {
      reply:
        "Je n'ai pas pu obtenir une réponse complète — reformulez votre question, s'il vous plaît.",
    };
  }
}
