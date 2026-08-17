import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInspecteurDto } from './dto/create-inspecteur.dto';
import { QueryInspecteurDto } from './dto/query-inspecteur.dto';
import { UpdateInspecteurDto } from './dto/update-inspecteur.dto';
import { InspecteursService } from './inspecteurs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspecteurs')
export class InspecteursController {
  constructor(private readonly service: InspecteursService) {}

  @Roles('ige_admin', 'super_admin')
  @Post()
  create(@Body() dto: CreateInspecteurDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryInspecteurDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ige_admin', 'super_admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInspecteurDto) {
    return this.service.update(id, dto);
  }

  @Roles('ige_admin', 'super_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
