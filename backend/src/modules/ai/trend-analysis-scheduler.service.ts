import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnthropicClientService } from './anthropic-client.service';
import { TrendAnalysisService } from './trend-analysis.service';

/**
 * Job quotidien d'analyse des tendances (PROMPT 8, point 2). Ne fait
 * rien silencieusement si aucune clé Anthropic n'est configurée (utile
 * en développement) plutôt que de faire échouer le cron chaque jour.
 */
@Injectable()
export class TrendAnalysisSchedulerService {
  private readonly logger = new Logger(TrendAnalysisSchedulerService.name);

  constructor(
    private readonly trendAnalysisService: TrendAnalysisService,
    private readonly anthropicClient: AnthropicClientService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async generateDailyAnalysis(): Promise<void> {
    if (!this.anthropicClient.isConfigured) {
      this.logger.warn(
        'ANTHROPIC_API_KEY absente : analyse des tendances quotidienne ignorée.',
      );
      return;
    }
    try {
      const analysis = await this.trendAnalysisService.generateAnalysis();
      this.logger.log(
        `Analyse des tendances générée (${analysis.alerts.length} alerte(s), ` +
          `${analysis.trends.length} tendance(s), ${analysis.positives.length} point(s) positif(s)).`,
      );
    } catch (error) {
      this.logger.error(
        "Échec de la génération de l'analyse des tendances.",
        error as Error,
      );
    }
  }
}
