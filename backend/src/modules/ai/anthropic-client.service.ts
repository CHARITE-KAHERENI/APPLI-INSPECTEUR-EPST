import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

/**
 * Enveloppe fine autour du SDK Anthropic — centralise la lecture de
 * `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (voir `config/configuration.ts`)
 * pour que les 3 services IA (assistant de rédaction, analyse des
 * tendances, chatbot) n'aient pas chacun à gérer l'absence de clé.
 * Sans clé configurée, `raw` lève une erreur claire (503) plutôt que le
 * SDK n'échoue avec un message générique — permet de développer/déployer
 * le reste de l'application sans clé Anthropic.
 */
@Injectable()
export class AnthropicClientService {
  private readonly client: Anthropic | null;
  readonly model: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const ai = configService.get('ai', { infer: true });
    this.model = ai.model;
    this.client = ai.apiKey ? new Anthropic({ apiKey: ai.apiKey }) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  get raw(): Anthropic {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Fonctionnalité IA indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur.",
      );
    }
    return this.client;
  }
}
