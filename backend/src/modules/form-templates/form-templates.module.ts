import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormTemplateEntity } from './entities/form-template.entity';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormTemplateEntity])],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService],
  exports: [FormTemplatesService],
})
export class FormTemplatesModule {}
