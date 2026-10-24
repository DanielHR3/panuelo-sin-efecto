import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AppModule } from '../app.module';

type Ctor = { prototype: object; name: string };

interface Ruta {
  /** `Controller.metodo`, estable aunque cambie el path. */
  id: string;
  /** `GET /partidos/:id`, para que el fallo diga qué ruta es. */
  ruta: string;
  publica: boolean;
}

/**
 * Recorre el árbol de módulos desde AppModule (imports, también los
 * dinámicos) y junta todos los controladores registrados.
 */
function controladores(): Ctor[] {
  const vistos = new Set<unknown>();
  const encontrados = new Set<Ctor>();
  const visitar = (mod: unknown) => {
    if (!mod || vistos.has(mod)) return;
    vistos.add(mod);
    // Módulo dinámico ({ module, controllers?, imports? }) o clase @Module.
    const dinamico = mod as {
      module?: object;
      controllers?: Ctor[];
      imports?: unknown[];
    };
    const clase = dinamico.module ?? mod;
    const leer = <T>(key: string): T[] =>
      (Reflect.getMetadata(key, clase) as T[] | undefined) ?? [];
    [...leer<Ctor>('controllers'), ...(dinamico.controllers ?? [])].forEach(
      (c) => encontrados.add(c),
    );
    [...leer<unknown>('imports'), ...(dinamico.imports ?? [])].forEach(visitar);
  };
  visitar(AppModule);
  return [...encontrados];
}

function rutas(): Ruta[] {
  return controladores().flatMap((ctrl) => {
    const base = (Reflect.getMetadata(PATH_METADATA, ctrl) as string) ?? '';
    const clasePublica = Reflect.getMetadata(IS_PUBLIC_KEY, ctrl) === true;
    const proto = ctrl.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(proto)
      .filter((m) => m !== 'constructor' && typeof proto[m] === 'function')
      .map((m) => ({ m, handler: proto[m] as object }))
      .filter(({ handler }) => Reflect.hasMetadata(PATH_METADATA, handler))
      .map(({ m, handler }) => {
        const metodo =
          RequestMethod[
            Reflect.getMetadata(METHOD_METADATA, handler) as number
          ];
        const path = Reflect.getMetadata(PATH_METADATA, handler) as string;
        return {
          id: `${ctrl.name}.${m}`,
          ruta: `${metodo} /${[base, path].filter((p) => p && p !== '/').join('/')}`,
          publica:
            clasePublica ||
            Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true,
        };
      });
  });
}

/**
 * "No expongas datos": solo el sitio público (/publico/*), el partido rápido
 * sin cuenta, el login y el health check pueden ir sin token. Cualquier
 * @Public nuevo (p. ej. un GET que alguien marque público "para probar")
 * rompe este test y obliga a revisarlo a propósito.
 */
const PUBLICAS_PERMITIDAS = [
  'AppController.getHello', // GET / (health)
  'AuthController.login', // POST /auth/login
  'RapidoController.crear', // POST /rapido/partidos
  'RegistroController.registrar', // POST /registro (alta de organizador)
  'PublicoController.resumen', // GET /publico/resumen
  'PublicoController.categoria', // GET /publico/categorias/:id
  'PublicoController.jugador', // GET /publico/jugadores/:id
  'PublicoController.partido', // GET /publico/partidos/:id
].sort();

describe('Rutas públicas', () => {
  const todas = rutas();

  it('descubre los controladores de toda la app', () => {
    const ids = todas.map((r) => r.id);
    // Muestra de control: si el recorrido de módulos dejara de funcionar,
    // el test de abajo pasaría en vacío.
    expect(ids).toEqual(
      expect.arrayContaining([
        'LigasController.findAll',
        'PartidosController.findOne',
        'EventosController.marcador',
        'UsuariosController.findAll',
        'DiscrepanciasController.listar',
        ...PUBLICAS_PERMITIDAS,
      ]),
    );
  });

  it('solo las rutas permitidas son @Public; el resto exige token', () => {
    const publicas = todas
      .filter((r) => r.publica)
      .map((r) => `${r.id} (${r.ruta})`)
      .sort();
    expect(publicas.map((p) => p.split(' ')[0])).toEqual(PUBLICAS_PERMITIDAS);
  });

  it.each([
    'GET /ligas',
    'GET /ligas/:id',
    'GET /partidos/:id',
    'GET /partidos/:partidoId/eventos',
    'GET /partidos/:partidoId/marcador',
  ])('%s exige token', (ruta) => {
    const r = todas.find((x) => x.ruta === ruta);
    expect(r).toBeDefined();
    expect(r?.publica).toBe(false);
  });
});
