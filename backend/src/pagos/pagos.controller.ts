import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { PagosService } from './pagos.service';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { ResolverPagoDto } from './dto/resolver-pago.dto';

const MAX_COMPROBANTE_BYTES = 2 * 1024 * 1024;

@ApiTags('pagos')
@ApiBearerAuth()
@Controller()
@Roles('SUPERADMIN', 'LIGA_ADMIN')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Get('pagos/datos')
  @ApiOperation({
    summary:
      'Datos para transferir por SPEI (CLABE, banco, beneficiario) y precios en centavos',
  })
  datos() {
    return this.pagos.datosDePago();
  }

  @Post('ligas/:ligaId/pagos')
  @ApiOperation({
    summary: 'Abre un pago PENDIENTE con su referencia (uno a la vez por liga)',
  })
  crear(
    @Param('ligaId') ligaId: string,
    @Body() dto: CrearPagoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pagos.crear(ligaId, dto, user);
  }

  @Get('ligas/:ligaId/pagos')
  @ApiOperation({
    summary: 'Pagos de una liga (sin el archivo del comprobante)',
  })
  deLiga(@Param('ligaId') ligaId: string, @CurrentUser() user: AuthUser) {
    return this.pagos.listarDeLiga(ligaId, user);
  }

  @Get('pagos')
  @Roles('SUPERADMIN')
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['PENDIENTE', 'CONFIRMADO', 'RECHAZADO'],
  })
  @ApiOperation({
    summary:
      'SUPERADMIN: pagos por estado (por defecto pendientes), con liga y organizador',
  })
  listar(
    @Query('estado') estado: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pagos.listar(estado, user);
  }

  @Post('pagos/:id/comprobante')
  // Memoria y sin fileFilter: el tipo se valida en el servicio.
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_COMPROBANTE_BYTES, files: 1 },
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
    summary: 'Sube el comprobante (foto o PDF, máx. 2 MB) de un pago pendiente',
  })
  subirComprobante(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!archivo)
      throw new BadRequestException(
        'Sube el comprobante en el campo "archivo"',
      );
    return this.pagos.subirComprobante(id, archivo, user);
  }

  @Get('pagos/:id/comprobante')
  @ApiOperation({
    summary: 'Descarga el comprobante (dueño de la liga o SUPERADMIN)',
  })
  async comprobante(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const c = await this.pagos.comprobante(id, user);
    res.set({
      'Content-Type': c.comprobanteTipo ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(c.comprobanteNombre ?? 'comprobante')}"`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(Buffer.from(c.comprobante!));
  }

  @Patch('pagos/:id')
  @Roles('SUPERADMIN')
  @ApiOperation({
    summary:
      'SUPERADMIN: confirma (extiende el plan) o rechaza (con motivo) un pago pendiente',
  })
  resolver(
    @Param('id') id: string,
    @Body() dto: ResolverPagoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pagos.resolver(id, dto, user);
  }
}
