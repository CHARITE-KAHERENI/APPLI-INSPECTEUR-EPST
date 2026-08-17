import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { InspecteurEntity } from './entities/inspecteur.entity';
import { InspecteursController } from './inspecteurs.controller';
import { InspecteursService } from './inspecteurs.service';

@Module({
  imports: [TypeOrmModule.forFeature([InspecteurEntity]), AuthModule],
  controllers: [InspecteursController],
  providers: [InspecteursService],
  exports: [InspecteursService],
})
export class InspecteursModule {}
