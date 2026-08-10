import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { LigasService } from './ligas.service';
import { CreateLigaDto } from './dto/create-liga.dto';

@Controller('ligas')
export class LigasController {
  constructor(private readonly ligasService: LigasService) {}

  @Post()
  create(@Body() createLigaDto: CreateLigaDto) {
    return this.ligasService.create(createLigaDto);
  }

  @Get()
  findAll() {
    return this.ligasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ligasService.findOne(id);
  }
}
