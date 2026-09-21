import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { SyncSubmissionItemDto } from './sync-submission-item.dto';

/** Corps de `POST /sync/submissions` : un lot d'entrées de la file de synchronisation mobile. */
export class BatchSyncSubmissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncSubmissionItemDto)
  submissions: SyncSubmissionItemDto[];
}
