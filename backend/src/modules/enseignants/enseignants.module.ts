import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EnseignantEntity } from './entities/enseignant.entity';
import { EnseignantsController } from './enseignants.controller';
import { EnseignantsService } from './enseignants.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnseignantEntity]), AuthModule],
  controllers: [EnseignantsController],
  providers: [EnseignantsService],
  exports: [EnseignantsService],
})
export class EnseignantsModule {}
