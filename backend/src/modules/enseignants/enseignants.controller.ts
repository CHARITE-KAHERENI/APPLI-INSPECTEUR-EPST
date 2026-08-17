import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { QueryEnseignantDto } from './dto/query-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { EnseignantsService } from './enseignants.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enseignants')
export class EnseignantsController {
  constructor(private readonly service: EnseignantsService) {}

  @Roles('ige_admin', 'super_admin')
  @Post()
  create(@Body() dto: CreateEnseignantDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEnseignantDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ige_admin', 'super_admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnseignantDto) {
    return this.service.update(id, dto);
  }

  @Roles('ige_admin', 'super_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
