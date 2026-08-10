import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLigaDto } from './dto/create-liga.dto';

@Injectable()
export class LigasService {
  constructor(private prisma: PrismaService) {}

  async create(createLigaDto: CreateLigaDto) {
    return this.prisma.liga.create({
      data: createLigaDto,
    });
  }

  async findAll() {
    return this.prisma.liga.findMany({
      include: { categorias: true },
    });
  }

  async findOne(id: string) {
    const liga = await this.prisma.liga.findUnique({
      where: { id },
      include: { categorias: true },
    });
    if (!liga) throw new NotFoundException(`Liga con ID ${id} no encontrada`);
    return liga;
  }
}
