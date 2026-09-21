import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEtablissementDto } from './dto/create-etablissement.dto';
import { QueryEtablissementDto } from './dto/query-etablissement.dto';
import { UpdateEtablissementDto } from './dto/update-etablissement.dto';
import { EtablissementsService } from './etablissements.service';

/**
 * Référentiel des établissements. Lecture ouverte à tout utilisateur
 * authentifié (nécessaire pour peupler les filtres du web) ; création /
 * modification / suppression réservées à l'IGE (`ige_admin`,
 * `super_admin`) — voir PROMPT 6, règle 2 ("Endpoints CRUD").
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('etablissements')
export class EtablissementsController {
  constructor(private readonly service: EtablissementsService) {}

  @Roles('ige_admin', 'super_admin')
  @Post()
  create(@Body() dto: CreateEtablissementDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEtablissementDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ige_admin', 'super_admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEtablissementDto) {
    return this.service.update(id, dto);
  }

  @Roles('ige_admin', 'super_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
