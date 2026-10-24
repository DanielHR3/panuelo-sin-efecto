import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  ParseBoolPipe,
  Post,
  Query,
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
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { ImportacionService } from './importacion.service';
import { crearPlantilla } from './plantilla';

/** Tamaño máximo del .xlsx (diseño, Parte 4). */
export const MAX_ARCHIVO_BYTES = 2 * 1024 * 1024;

@ApiTags('importacion')
@ApiBearerAuth()
@Controller()
export class ImportacionController {
  constructor(private readonly importacion: ImportacionService) {}

  @Get('importacion/plantilla')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="plantilla-liga.xlsx"')
  @ApiOperation({
    summary:
      'Plantilla .xlsx (Equipos, Jugadores, Calendario) con instrucciones y ejemplo',
  })
  async plantilla(): Promise<StreamableFile> {
    return new StreamableFile(await crearPlantilla());
  }

  @Post('ligas/:ligaId/importar')
  @Roles('SUPERADMIN', 'LIGA_ADMIN')
  // Memoria y sin fileFilter: el archivo se valida al leerlo (máx. 2 MB).
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_ARCHIVO_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { archivo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiQuery({ name: 'confirmar', required: false, type: Boolean })
  @ApiOperation({
    summary:
      'Importa una liga desde Excel. Sin confirmar: vista previa (qué se crea/actualiza/omite y errores por fila). Con confirmar=true y sin errores: lo crea todo en una transacción.',
  })
  importar(
    @Param('ligaId') ligaId: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Query('confirmar', new ParseBoolPipe({ optional: true }))
    confirmar: boolean | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!archivo)
      throw new BadRequestException(
        'Sube un archivo .xlsx en el campo "archivo"',
      );
    if (!archivo.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException(
        'Solo se aceptan archivos de Excel (.xlsx)',
      );
    }
    return this.importacion.importar(
      ligaId,
      archivo.buffer,
      confirmar ?? false,
      user,
    );
  }
}
