import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Table `ai_trend_analyses` : une ligne par exécution du job quotidien
 * d'analyse des tendances (PROMPT 8, point 2) — voir
 * `TrendAnalysisSchedulerService`. `rawStats` conserve le résumé
 * statistique effectivement envoyé à l'API pour audit (savoir sur quels
 * chiffres la synthèse s'appuie) ; `alerts`/`trends`/`positives` sont le
 * JSON structuré renvoyé par Claude (voir `TREND_ANALYSIS_SYSTEM_PROMPT`).
 */
@Entity({ name: 'ai_trend_analyses' })
export class AiTrendAnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;

  /** Libellé de la période couverte, ex: "30 derniers jours au 17/08/2026". */
  @Column({ name: 'period_label', type: 'varchar', length: 100 })
  periodLabel: string;

  @Column({ type: 'jsonb' })
  alerts: string[];

  @Column({ type: 'jsonb' })
  trends: string[];

  @Column({ type: 'jsonb' })
  positives: string[];

  @Column({ name: 'raw_stats', type: 'jsonb' })
  rawStats: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
