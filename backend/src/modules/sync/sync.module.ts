import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionEntity } from '../form-submissions/entities/form-submission.entity';
import { FormSubmissionVersionEntity } from './entities/form-submission-version.entity';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormSubmissionEntity,
      FormSubmissionVersionEntity,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
