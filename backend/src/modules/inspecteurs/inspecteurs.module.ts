import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InspecteurEntity } from './entities/inspecteur.entity';
import { InspecteursController } from './inspecteurs.controller';
import { InspecteursService } from './inspecteurs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InspecteurEntity]),
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [InspecteursController],
  providers: [InspecteursService],
  exports: [InspecteursService],
})
export class InspecteursModule {}
