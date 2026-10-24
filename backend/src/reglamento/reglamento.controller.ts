import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { ReglamentoService } from './reglamento.service';

const MAX_REGLAMENTO_BYTES = 10 * 1024 * 1024;

@ApiTags('reglamento')
@Controller()
export class ReglamentoController {
  constructor(private readonly reglamento: ReglamentoService) {}

  @Put('ligas/:ligaId/reglamento')
  @ApiBearerAuth()
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_REGLAMENTO_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { archivo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Sube o reemplaza el reglamento propio (PDF, máx. 10 MB; plan Completo o prueba)',
  })
  subir(
    @Param('ligaId') ligaId: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!archivo)
      throw new BadRequestException('Sube el reglamento en el campo "archivo"');
    return this.reglamento.subir(ligaId, archivo, user);
  }

  @Delete('ligas/:ligaId/reglamento')
  @ApiBearerAuth()
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @ApiOperation({
    summary: 'Quita el reglamento propio; la liga vuelve a mostrar el de IFAF',
  })
  quitar(@Param('ligaId') ligaId: string, @CurrentUser() user: AuthUser) {
    return this.reglamento.quitar(ligaId, user);
  }

  @Public()
  @Get('publico/ligas/:ligaId/reglamento')
  @ApiOperation({
    summary:
      'Qué reglamento usa la liga: propio (nombre del PDF) o el de IFAF (propio = null)',
  })
  info(@Param('ligaId') ligaId: string) {
    return this.reglamento.info(ligaId);
  }

  @Public()
  @Get('publico/ligas/:ligaId/reglamento.pdf')
  @ApiOperation({ summary: 'PDF del reglamento propio de la liga' })
  async pdf(
    @Param('ligaId') ligaId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const r = await this.reglamento.archivo(ligaId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(r.nombre)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=300',
    });
    return new StreamableFile(Buffer.from(r.archivo));
  }
}
