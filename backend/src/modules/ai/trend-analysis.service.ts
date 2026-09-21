import type Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppConfig } from '../../config/configuration';
import { FormSubmissionEntity } from '../form-submissions/entities/form-submission.entity';
import { AnthropicClientService } from './anthropic-client.service';
import { AiTrendAnalysisEntity } from './entities/ai-trend-analysis.entity';

const WINDOW_DAYS = 30;

interface AggregateStats {
  periodLabel: string;
  totalInspections: number;
  averagePercentageCurrentPeriod: number | null;
  averagePercentagePreviousPeriod: number | null;
  byZone: Array<{
    zone: string;
    averagePercentage: number | null;
    count: number;
  }>;
  byFormCode: Array<{
    formCode: string;
    averagePercentage: number | null;
    count: number;
  }>;
  /** Les 5 établissements avec le score moyen le plus bas sur la période — priorité des alertes. */
  lowestEtablissements: Array<{
    etablissement: string;
    averagePercentage: number | null;
    count: number;
  }>;
}

/**
 * Analyse des tendances par IA (PROMPT 8, point 2) : agrège les scores
 * des 30 derniers jours (par zone, par formulaire, les établissements
 * les plus en difficulté) et les compare à la période précédente de même
 * durée, puis demande à Claude une synthèse structurée en français
 * (alertes/tendances/points positifs) — voir
 * `TREND_ANALYSIS_SYSTEM_PROMPT`. Le job quotidien
 * (`TrendAnalysisSchedulerService`) produit une synthèse globale unique
 * (pas une par zone) : un `ige_admin` la consulte au même titre qu'un
 * `super_admin`, sans restriction par zone pour cette fonctionnalité.
 */
@Injectable()
export class TrendAnalysisService {
  private readonly logger = new Logger(TrendAnalysisService.name);

  constructor(
    @InjectRepository(FormSubmissionEntity)
    private readonly submissionRepository: Repository<FormSubmissionEntity>,
    @InjectRepository(AiTrendAnalysisEntity)
    private readonly analysisRepository: Repository<AiTrendAnalysisEntity>,
    private readonly anthropicClient: AnthropicClientService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async findLatest(): Promise<AiTrendAnalysisEntity | null> {
    return this.analysisRepository.findOne({
      where: {},
      order: { generatedAt: 'DESC' },
    });
  }

  findAll(limit = 30): Promise<AiTrendAnalysisEntity[]> {
    return this.analysisRepository.find({
      order: { generatedAt: 'DESC' },
      take: limit,
    });
  }

  async generateAnalysis(): Promise<AiTrendAnalysisEntity> {
    const stats = await this.computeAggregateStats();
    const synthesis = await this.callClaudeForSynthesis(stats);

    return this.analysisRepository.save(
      this.analysisRepository.create({
        generatedAt: new Date(),
        periodLabel: stats.periodLabel,
        alerts: synthesis.alerts,
        trends: synthesis.trends,
        positives: synthesis.positives,
        rawStats: stats as unknown as Record<string, unknown>,
      }),
    );
  }

  private async computeAggregateStats(): Promise<AggregateStats> {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - WINDOW_DAYS);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - WINDOW_DAYS);

    const periodLabel = `${WINDOW_DAYS} derniers jours au ${now.toLocaleDateString('fr-FR')}`;

    const [
      totalInspections,
      averageCurrent,
      averagePrevious,
      byZone,
      byFormCode,
      lowestEtablissements,
    ] = await Promise.all([
      this.submissionRepository
        .createQueryBuilder('s')
        .where('s.created_at >= :currentStart', { currentStart })
        .getCount(),
      this.averagePercentageBetween(currentStart, now),
      this.averagePercentageBetween(previousStart, currentStart),
      this.averageByZone(currentStart, now),
      this.averageByFormCode(currentStart, now),
      this.lowestEtablissementsSince(currentStart, now),
    ]);

    return {
      periodLabel,
      totalInspections,
      averagePercentageCurrentPeriod: averageCurrent,
      averagePercentagePreviousPeriod: averagePrevious,
      byZone,
      byFormCode,
      lowestEtablissements,
    };
  }

  private async averagePercentageBetween(
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const row = await this.submissionRepository
      .createQueryBuilder('s')
      .select('AVG(s.overall_percentage)', 'avg')
      .where('s.created_at BETWEEN :from AND :to', { from, to })
      .andWhere('s.overall_percentage IS NOT NULL')
      .getRawOne<{ avg: string | null }>();
    return row?.avg != null ? Number(row.avg) : null;
  }

  private async averageByZone(
    from: Date,
    to: Date,
  ): Promise<
    Array<{ zone: string; averagePercentage: number | null; count: number }>
  > {
    const rows = await this.submissionRepository
      .createQueryBuilder('s')
      .leftJoin('s.etablissement', 'etablissement')
      .select('etablissement.zone', 'zone')
      .addSelect('AVG(s.overall_percentage)', 'averagePercentage')
      .addSelect('COUNT(s.id)', 'count')
      .where('s.created_at BETWEEN :from AND :to', { from, to })
      .andWhere('etablissement.zone IS NOT NULL')
      .groupBy('etablissement.zone')
      .getRawMany<{
        zone: string;
        averagePercentage: string | null;
        count: string;
      }>();

    return rows.map((row) => ({
      zone: row.zone,
      averagePercentage:
        row.averagePercentage != null ? Number(row.averagePercentage) : null,
      count: Number(row.count),
    }));
  }

  private async averageByFormCode(
    from: Date,
    to: Date,
  ): Promise<
    Array<{ formCode: string; averagePercentage: number | null; count: number }>
  > {
    const rows = await this.submissionRepository
      .createQueryBuilder('s')
      .select('s.form_code', 'formCode')
      .addSelect('AVG(s.overall_percentage)', 'averagePercentage')
      .addSelect('COUNT(s.id)', 'count')
      .where('s.created_at BETWEEN :from AND :to', { from, to })
      .groupBy('s.form_code')
      .getRawMany<{
        formCode: string;
        averagePercentage: string | null;
        count: string;
      }>();

    return rows.map((row) => ({
      formCode: row.formCode,
      averagePercentage:
        row.averagePercentage != null ? Number(row.averagePercentage) : null,
      count: Number(row.count),
    }));
  }

  private async lowestEtablissementsSince(
    from: Date,
    to: Date,
  ): Promise<
    Array<{
      etablissement: string;
      averagePercentage: number | null;
      count: number;
    }>
  > {
    const rows = await this.submissionRepository
      .createQueryBuilder('s')
      .leftJoin('s.etablissement', 'etablissement')
      .select('etablissement.nom', 'etablissement')
      .addSelect('AVG(s.overall_percentage)', 'averagePercentage')
      .addSelect('COUNT(s.id)', 'count')
      .where('s.created_at BETWEEN :from AND :to', { from, to })
      .andWhere('etablissement.nom IS NOT NULL')
      .andWhere('s.overall_percentage IS NOT NULL')
      .groupBy('etablissement.nom')
      .orderBy('"averagePercentage"', 'ASC')
      .limit(5)
      .getRawMany<{
        etablissement: string;
        averagePercentage: string | null;
        count: string;
      }>();

    return rows.map((row) => ({
      etablissement: row.etablissement,
      averagePercentage:
        row.averagePercentage != null ? Number(row.averagePercentage) : null,
      count: Number(row.count),
    }));
  }

  private async callClaudeForSynthesis(
    stats: AggregateStats,
  ): Promise<{ alerts: string[]; trends: string[]; positives: string[] }> {
    const { systemPrompts } = this.configService.get('ai', { infer: true });

    const response = await this.anthropicClient.raw.messages.create({
      model: this.anthropicClient.model,
      max_tokens: 1200,
      system: systemPrompts.trendAnalysis,
      messages: [{ role: 'user', content: JSON.stringify(stats, null, 2) }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    try {
      const parsed = JSON.parse(text) as {
        alerts?: string[];
        trends?: string[];
        positives?: string[];
      };
      return {
        alerts: parsed.alerts ?? [],
        trends: parsed.trends ?? [],
        positives: parsed.positives ?? [],
      };
    } catch (error) {
      this.logger.error(
        'Réponse IA non parsable en JSON pour la synthèse des tendances.',
        error as Error,
      );
      return { alerts: [], trends: [], positives: [] };
    }
  }
}
