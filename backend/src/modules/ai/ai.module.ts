import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AnthropicClientService } from './anthropic-client.service';
import { ChatbotService } from './chatbot.service';
import { ChatbotToolsService } from './chatbot-tools.service';
import { AiTrendAnalysisEntity } from './entities/ai-trend-analysis.entity';
import { TrendAnalysisService } from './trend-analysis.service';
import { TrendAnalysisSchedulerService } from './trend-analysis-scheduler.service';
import { WritingAssistantService } from './writing-assistant.service';
import { AuthModule } from '../auth/auth.module';
import { FormSubmissionEntity } from '../form-submissions/entities/form-submission.entity';
import { FormSubmissionsModule } from '../form-submissions/form-submissions.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

/**
 * Intégration IA (PROMPT 8) — voir `ai.controller.ts` pour les routes et
 * `backend/README.md` (section "Intelligence artificielle"). Réutilise
 * les services déjà scopés par rôle de `form-submissions` et
 * `subscriptions` pour le chatbot (`ChatbotToolsService`), plutôt que de
 * dupliquer la logique d'autorisation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FormSubmissionEntity, AiTrendAnalysisEntity]),
    AuthModule,
    FormSubmissionsModule,
    SubscriptionsModule,
  ],
  controllers: [AiController],
  providers: [
    AnthropicClientService,
    WritingAssistantService,
    TrendAnalysisService,
    TrendAnalysisSchedulerService,
    ChatbotToolsService,
    ChatbotService,
  ],
})
export class AiModule {}
