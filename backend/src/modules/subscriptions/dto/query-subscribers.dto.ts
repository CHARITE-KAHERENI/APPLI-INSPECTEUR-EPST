import {
  SUBSCRIBER_ACCOUNT_TYPES,
  SUBSCRIBER_STATUSES,
} from '@c3-digital/shared';
import type {
  SubscriberAccountType,
  SubscriberStatus,
} from '@c3-digital/shared';
import { IsIn, IsOptional } from 'class-validator';

export class QuerySubscribersDto {
  @IsOptional()
  @IsIn(SUBSCRIBER_STATUSES)
  status?: SubscriberStatus;

  @IsOptional()
  @IsIn(SUBSCRIBER_ACCOUNT_TYPES)
  accountType?: SubscriberAccountType;
}
