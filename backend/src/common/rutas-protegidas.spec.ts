import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AppController } from '../app.controller';
import { AuthController } from '../auth/auth.controller';
import { CategoriasController } from '../categorias/categorias.controller';
import { EquiposController } from '../equipos/equipos.controller';
import { EventosController } from '../eventos/eventos.controller';
import { JugadoresController } from '../jugadores/jugadores.controller';
import { LigasController } from '../ligas/ligas.controller';
import { PartidosController } from '../partidos/partidos.controller';
import { PublicoController } from '../publico/publico.controller';
import { RapidoController } from '../rapido/rapido.controller';

type Ctor = { prototype: object; name: string };

/** Mismo criterio que JwtAuthGuard: metadata en el handler o en la clase. */
function esPublica(controller: Ctor, metodo: string): boolean {
  const handler = (controller.prototype as Record<string, unknown>)[metodo];
  if (typeof handler !== 'function') {
    throw new Error(`${controller.name}.${metodo} no existe`);
  }
  return (
    Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true ||
    Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true
  );
}

function conNombre(rutas: [Ctor, string][]): [string, Ctor, string][] {
  return rutas.map(([c, m]) => [`${c.name}.${m}`, c, m]);
}

/**
 * "No expongas datos": las lecturas CRUD heredadas ya no son @Public, así
 * que el JwtAuthGuard global rechaza (401) cualquier request anónima. El
 * sitio público vive en /publico/*, /rapido/partidos y /auth/login.
 */
describe('Rutas protegidas vs públicas', () => {
  const protegidas: [Ctor, string][] = [
    [LigasController, 'findAll'],
    [LigasController, 'findOne'],
    [CategoriasController, 'findAllByLiga'],
    [CategoriasController, 'findOne'],
    [EquiposController, 'findAllByCategoria'],
    [EquiposController, 'findOne'],
    [JugadoresController, 'findAllByEquipo'],
    [JugadoresController, 'findOne'],
    [PartidosController, 'findAllByCategoria'],
    [PartidosController, 'findOne'],
    [PartidosController, 'listarAsignaciones'],
    [EventosController, 'listar'],
    [EventosController, 'marcador'],
  ];

  it.each(conNombre(protegidas))(
    '%s exige token (sin @Public)',
    (_nombre, ctrl, metodo) => {
      expect(esPublica(ctrl, metodo)).toBe(false);
    },
  );

  const publicas: [Ctor, string][] = [
    [AppController, 'getHello'],
    [AuthController, 'login'],
    [RapidoController, 'crear'],
    [PublicoController, 'resumen'],
    [PublicoController, 'categoria'],
    [PublicoController, 'jugador'],
    [PublicoController, 'partido'],
  ];

  it.each(conNombre(publicas))(
    '%s sigue siendo pública',
    (_nombre, ctrl, metodo) => {
      expect(esPublica(ctrl, metodo)).toBe(true);
    },
  );
});
