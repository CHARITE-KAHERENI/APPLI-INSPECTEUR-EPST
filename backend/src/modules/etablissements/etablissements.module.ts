import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EtablissementEntity } from './entities/etablissement.entity';
import { EtablissementsController } from './etablissements.controller';
import { EtablissementsService } from './etablissements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtablissementEntity]),
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [EtablissementsController],
  providers: [EtablissementsService],
  exports: [EtablissementsService],
})
export class EtablissementsModule {}
