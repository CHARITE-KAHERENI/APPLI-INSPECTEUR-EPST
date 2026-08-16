import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BatchSyncSubmissionsDto } from './dto/batch-sync-submissions.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * Réception en lot de la file de synchronisation mobile
   * (`sync_queue` côté appareil). Chaque entrée est traitée
   * indépendamment (une erreur sur l'une n'empêche pas les autres) — voir
   * `SyncService.syncSubmissions` pour la politique de résolution de
   * conflit.
   */
  @Post('submissions')
  syncSubmissions(@Body() dto: BatchSyncSubmissionsDto) {
    return this.syncService.syncSubmissions(dto);
  }

  /** Vérification de connectivité légère avant de lancer une synchronisation complète. */
  @Get('status')
  getStatus() {
    return this.syncService.getStatus();
  }

  /**
   * Historique d'un formulaire : version actuelle + versions remplacées
   * lors des synchronisations précédentes (voir
   * `SyncService.getSubmissionHistory`) — permet à l'IGE de consulter les
   * deux versions lorsqu'un conflit local/serveur a été détecté.
   */
  @Get('submissions/:id/history')
  getSubmissionHistory(@Param('id') id: string) {
    return this.syncService.getSubmissionHistory(id);
  }
}
