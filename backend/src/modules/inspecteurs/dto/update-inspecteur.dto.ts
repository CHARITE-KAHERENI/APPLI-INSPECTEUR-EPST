import { PartialType } from '@nestjs/mapped-types';
import { CreateInspecteurDto } from './create-inspecteur.dto';

export class UpdateInspecteurDto extends PartialType(CreateInspecteurDto) {}
