import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserEntity } from '../users/entities/user.entity';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { WritingAssistantRequestDto } from './dto/writing-assistant-request.dto';
import { TrendAnalysisService } from './trend-analysis.service';
import { WritingAssistantService } from './writing-assistant.service';

/**
 * Intégration IA (PROMPT 8) — API Claude (Anthropic), voir
 * `config/ai-prompts.ts` pour les 3 prompts système et
 * `backend/README.md` (section "Intelligence artificielle") pour le
 * détail. Toutes les routes exigent une session (`JwtAuthGuard`) : ces
 * fonctionnalités nécessitent une connexion internet, contrairement à la
 * saisie hors-ligne du reste de l'application.
 */
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly writingAssistantService: WritingAssistantService,
    private readonly trendAnalysisService: TrendAnalysisService,
    private readonly chatbotService: ChatbotService,
  ) {}

  /** Assistant de rédaction (mobile et web) — voir PROMPT 8, point 1. */
  @Post('writing-assistant')
  generateWritingSuggestion(@Body() dto: WritingAssistantRequestDto) {
    return this.writingAssistantService.generateSuggestion(dto);
  }

  /** Dernière synthèse générée par le job quotidien — page "Analyse IA" (web, IGE). */
  @UseGuards(RolesGuard)
  @Roles('ige_admin', 'super_admin')
  @Get('trend-analyses/latest')
  findLatestTrendAnalysis() {
    return this.trendAnalysisService.findLatest();
  }

  /** Historique des synthèses (les plus récentes d'abord). */
  @UseGuards(RolesGuard)
  @Roles('ige_admin', 'super_admin')
  @Get('trend-analyses')
  findTrendAnalyses(@Query('limit') limit?: string) {
    return this.trendAnalysisService.findAll(limit ? Number(limit) : undefined);
  }

  /**
   * Déclenchement manuel du job quotidien (`super_admin` uniquement) —
   * utile pour valider la fonctionnalité sans attendre le cron
   * (`TrendAnalysisSchedulerService`, `EVERY_DAY_AT_3AM`).
   */
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Post('trend-analyses/generate')
  generateTrendAnalysis() {
    return this.trendAnalysisService.generateAnalysis();
  }

  /** Chatbot d'assistance (web, tous rôles) — voir PROMPT 8, point 3. */
  @Post('chat')
  chat(@Body() dto: ChatRequestDto, @CurrentUser() user: UserEntity) {
    return this.chatbotService.chat(dto, user);
  }
}
