"""Video "Cómo funciona" de Pañuelo sin efecto (vertical, para celular).

Render (desde esta carpeta, con ManimGX instalado):
    manimgx render como_funciona.py -o como-funciona.mp4 -r 1080x1920 --fps 30
Revisión de cuadros y problemas de layout:
    manimgx inspect como_funciona.py
"""

import sys
from pathlib import Path

import manimgx as m

sys.path.insert(0, str(Path(__file__).parent))
from voz_local import paulina  # noqa: E402

# Vertical 9:16, primero para celular.
m.config.pixel_width = 1080
m.config.pixel_height = 1920
m.config.frame_height = 16  # el ancho sale de la proporción: 9

# Identidad "Transmisión de estadio" (web/src/lib/tema.ts, modo oscuro).
FONDO = "#0A1A33"
PANEL = "#13284A"
TEXTO = "#EEF2F8"
SUAVE = "#B8C4D6"
FRANJA_1 = "#1E5631"
FRANJA_2 = "#256B3D"
PANUELO = "#FFD23F"
LOCAL = "#3473DA"
VISITANTE = "#D73D3D"


# Sans de la marca disponible en ManimGX (la web usa Barlow).
FUENTE = "Inter"


def texto(t: str, size: float = 40, color: str = TEXTO, bold: bool = False) -> m.Text:
    return m.Text(t, font=FUENTE, font_size=size, color=color, weight="BOLD" if bold else "NORMAL")


def titulo(t: str) -> m.Text:
    return texto(t, size=64, bold=True)


def panel(ancho: float, alto: float, color: str = PANEL) -> m.RoundedRectangle:
    return m.RoundedRectangle(width=ancho, height=alto, corner_radius=0.25, fill_color=color, fill_opacity=1, stroke_width=0)


def logo(lado: float = 2.4) -> m.VGroup:
    """Yarda 50: franjas de pasto, línea central de cal y el pañuelo amarillo."""
    franjas = m.VGroup(
        *[
            m.Rectangle(width=lado, height=lado / 6, fill_color=FRANJA_2 if i % 2 == 0 else FRANJA_1, fill_opacity=1, stroke_width=0)
            for i in range(6)
        ]
    ).arrange(m.DOWN, buff=0)
    linea = m.Line(franjas.get_top(), franjas.get_bottom(), color=TEXTO, stroke_width=6)
    cinco = texto("5", size=lado * 34, bold=True).move_to(franjas.get_center() + m.LEFT * lado * 0.22 + m.DOWN * lado * 0.08)
    cero = texto("0", size=lado * 34, bold=True).move_to(franjas.get_center() + m.RIGHT * lado * 0.22 + m.DOWN * lado * 0.08)
    panuelo = m.Polygon(
        [0.0, 0.0, 0],
        [lado * 0.26, lado * 0.06, 0],
        [lado * 0.29, lado * 0.23, 0],
        [lado * 0.03, lado * 0.18, 0],
        fill_color=PANUELO,
        fill_opacity=1,
        stroke_width=0,
    ).move_to(franjas.get_center() + m.RIGHT * lado * 0.2 + m.UP * lado * 0.3)
    return m.VGroup(franjas, linea, cinco, cero, panuelo)


def telefono(contenido: m.Mobject) -> m.VGroup:
    marco = m.RoundedRectangle(width=6.4, height=10.4, corner_radius=0.5, stroke_color=SUAVE, stroke_width=5, fill_color=FONDO, fill_opacity=1)
    contenido.move_to(marco.get_center())
    return m.VGroup(marco, contenido)


def boton(t: str, ancho: float = 4.2, size: float = 36) -> m.VGroup:
    """Botón amarillo que siempre deja aire alrededor de su texto."""
    etiqueta = texto(t, size=size, color=FONDO, bold=True)
    fondo = panel(max(ancho, etiqueta.width + 0.9), etiqueta.height + 0.6, PANUELO)
    return m.VGroup(fondo, etiqueta.move_to(fondo))


def campo_formulario(etiqueta: str, valor: str) -> m.VGroup:
    caja = m.RoundedRectangle(width=5.0, height=0.85, corner_radius=0.12, stroke_color=SUAVE, stroke_width=2, fill_opacity=0)
    return m.VGroup(
        texto(etiqueta, size=30, color=SUAVE),
        m.VGroup(caja, texto(valor, size=34).move_to(caja.get_left() + m.RIGHT * 0.25, aligned_edge=m.LEFT)),
    ).arrange(m.DOWN, buff=0.12, aligned_edge=m.LEFT)


def marcador(local: int, visitante: int) -> tuple[m.VGroup, m.Text, m.Text]:
    """Tablero estilo transmisión: zonas de anotación con el color de cada equipo."""
    franjas = m.VGroup(
        *[m.Rectangle(width=0.55, height=2.6, fill_color=FRANJA_1 if i % 2 else FRANJA_2, fill_opacity=1, stroke_width=0) for i in range(10)]
    ).arrange(m.RIGHT, buff=0)
    zona_l = m.Rectangle(width=0.6, height=2.6, fill_color=LOCAL, fill_opacity=1, stroke_width=0).next_to(franjas, m.LEFT, buff=0)
    zona_v = m.Rectangle(width=0.6, height=2.6, fill_color=VISITANTE, fill_opacity=1, stroke_width=0).next_to(franjas, m.RIGHT, buff=0)
    placa = panel(4.0, 1.6, FONDO).move_to(franjas)
    n_local = texto(str(local), size=80, bold=True).move_to(placa.get_center() + m.LEFT * 1.1)
    guion = m.Line(m.LEFT * 0.25, m.RIGHT * 0.25, color=SUAVE, stroke_width=10).move_to(placa)
    n_visit = texto(str(visitante), size=80, bold=True).move_to(placa.get_center() + m.RIGHT * 1.1)
    nombres = m.VGroup(
        texto("TOROS", size=38, bold=True).next_to(zona_l, m.UP, buff=0.25).align_to(zona_l, m.LEFT),
        texto("LOBOS", size=38, bold=True).next_to(zona_v, m.UP, buff=0.25).align_to(zona_v, m.RIGHT),
    )
    return m.VGroup(zona_l, franjas, zona_v, placa, guion, nombres), n_local, n_visit


class ComoFunciona(m.Scene):
    def construct(self) -> None:
        self.camera.background_color = FONDO
        self.voice = paulina

        # 1. Marca.
        marca = m.VGroup(logo(3.0), m.VGroup(texto("PAÑUELO", size=80, bold=True), texto("SIN EFECTO", size=46, color=PANUELO, bold=True)).arrange(m.DOWN, buff=0.15)).arrange(m.DOWN, buff=0.6)
        lema = texto("El marcador de tu liga,\nen vivo y sin papel.", size=46, color=SUAVE).next_to(marca, m.DOWN, buff=0.8)
        self.say("[Pañuelo sin efecto.] [El marcador de tu liga, en vivo y sin papel.]", m.FadeIn(marca, shift=m.UP * 0.3), m.Write(lema))
        self.play(m.FadeOut(marca), m.FadeOut(lema))

        # 2. El problema: la hoja de papel.
        hoja = m.VGroup(
            m.Rectangle(width=4, height=5.2, fill_color="#F4F1E8", fill_opacity=1, stroke_width=0),
            *[m.Line([-1.5, 2 - i * 0.6, 0], [1.5, 2 - i * 0.6, 0], color="#9AA4B2", stroke_width=3) for i in range(7)],
        )
        tache = m.Cross(hoja, stroke_color=VISITANTE, stroke_width=14)
        pregunta = titulo("¿Todavía en papel?").to_edge(m.UP, buff=1.6)
        self.say(
            "[¿Todavía anotas los partidos en una hoja?] Se moja, se pierde, [y nadie ve el resultado.]",
            m.FadeIn(m.VGroup(pregunta, hoja)),
            m.Create(tache),
        )
        self.play(m.FadeOut(m.VGroup(pregunta, hoja, tache)))

        # 3. Registro con mes gratis.
        formulario = m.VGroup(
            texto("REGISTRA TU LIGA", size=44, bold=True),
            campo_formulario("Nombre de tu liga", "Liga del Valle"),
            campo_formulario("Primera categoría", "Varonil"),
            boton("CREAR MI LIGA GRATIS"),
        ).arrange(m.DOWN, buff=0.45)
        tel = telefono(formulario)
        sello = boton("1 MES GRATIS", size=44).next_to(tel, m.UP, buff=0.5)
        self.say("[Registra tu liga en un minuto,] [gratis el primer mes.]", m.FadeIn(tel, shift=m.UP * 0.4), m.FadeIn(sello, scale=1.3))
        self.play(m.FadeOut(m.VGroup(tel, sello)))

        # 4. Excel.
        excel = m.VGroup(
            *[
                m.VGroup(*[m.Rectangle(width=1.1, height=0.5, stroke_color="#1E7145", stroke_width=2, fill_color="#FFFFFF" if f else "#1E7145", fill_opacity=1) for _ in range(3)]).arrange(m.RIGHT, buff=0)
                for f in range(5)
            ]
        ).arrange(m.DOWN, buff=0).shift(m.UP * 3)
        flecha = m.Arrow(excel.get_bottom(), excel.get_bottom() + m.DOWN * 1.6, color=PANUELO, stroke_width=10)
        equipos = m.VGroup(
            *[m.VGroup(panel(7.4, 0.95), texto(n, size=34)).arrange(m.ORIGIN) for n in ("Toros · 8 jugadores", "Lobos · 8 jugadores", "Sáb 10:00 · Toros vs Lobos")]
        ).arrange(m.DOWN, buff=0.25).next_to(flecha, m.DOWN, buff=0.3)
        for fila in equipos:
            fila[1].move_to(fila[0])
        self.say(
            "[Sube tus equipos, jugadores y calendario] [desde Excel, y listo.]",
            m.FadeIn(excel),
            m.AnimationGroup(m.GrowArrow(flecha), m.LaggedStart(*[m.FadeIn(e, shift=m.RIGHT * 0.3) for e in equipos], lag_ratio=0.3)),
        )
        self.play(m.FadeOut(m.VGroup(excel, flecha, equipos)))

        # 5. El árbitro anota desde el celular.
        tablero, n_local, n_visit = marcador(0, 0)
        tablero.shift(m.UP * 2.5)
        n_local.shift(m.UP * 2.5)
        n_visit.shift(m.UP * 2.5)
        mas6 = boton("+6  TOUCHDOWN", 5.0, size=44).shift(m.DOWN * 1.2)
        senal = texto("Sin señal: se guarda\ny se envía después", size=36, color=SUAVE).shift(m.DOWN * 3.4)
        self.add(tablero, n_local, n_visit)
        self.say(
            "El árbitro anota desde el celular, [con un toque,] [aunque no haya señal en el campo.]",
            m.AnimationGroup(m.FadeIn(mas6), m.Indicate(mas6, color=PANUELO), m.Transform(n_local, texto("6", size=80, bold=True).move_to(n_local))),
            m.FadeIn(senal),
        )
        self.play(m.FadeOut(m.VGroup(tablero, n_local, n_visit, mas6, senal)))

        # 6. Resultados públicos y para compartir.
        filas = m.VGroup(
            *[
                m.VGroup(panel(7.4, 1.0, PANEL if i % 2 == 0 else "#102240"), texto(f"{i + 1}   {eq}", size=40), texto(pts, size=40, color=PANUELO if i == 0 else TEXTO, bold=True))
                for i, (eq, pts) in enumerate([("Toros", "9"), ("Halcones", "6"), ("Lobos", "3")])
            ]
        ).arrange(m.DOWN, buff=0.12).shift(m.UP * 1.5)
        for f in filas:
            f[1].move_to(f[0].get_left() + m.RIGHT * 0.4, aligned_edge=m.LEFT)
            f[2].move_to(f[0].get_right() + m.LEFT * 0.4, aligned_edge=m.RIGHT)
        cab = titulo("Tabla de posiciones").next_to(filas, m.UP, buff=0.5)
        compartir = boton("COMPARTIR POR WHATSAPP", size=34).next_to(filas, m.DOWN, buff=1.0)
        self.say(
            "La tabla, los líderes y el resultado [se publican solos,] [y se comparten por WhatsApp.]",
            m.FadeIn(m.VGroup(cab, filas), shift=m.UP * 0.3),
            m.FadeIn(compartir, scale=1.2),
        )
        self.play(m.FadeOut(m.VGroup(cab, filas, compartir)))

        # 7. Reglamento y planes.
        libro = m.VGroup(panel(4.6, 4.4), texto("REGLAMENTO", size=40, bold=True), texto("IFAF Flag", size=34, color=SUAVE)).arrange(m.ORIGIN)
        libro[1].move_to(libro[0].get_center() + m.UP * 0.4)
        libro[2].move_to(libro[0].get_center() + m.DOWN * 0.3)
        libro.shift(m.UP * 2.2)
        precio = m.VGroup(texto("Planes desde", size=34, color=SUAVE), texto("$99 al mes", size=64, color=PANUELO, bold=True)).arrange(m.DOWN, buff=0.2).shift(m.DOWN * 2.4)
        self.say("[Con el reglamento a la mano,] y planes [desde noventa y nueve pesos al mes.]", m.FadeIn(libro), m.FadeIn(precio, shift=m.UP * 0.3))
        self.play(m.FadeOut(m.VGroup(libro, precio)))

        # 8. Cierre con la dirección.
        final = m.VGroup(logo(2.6), texto("panuelo-sin-efecto.vercel.app", size=36, color=PANUELO, bold=True), boton("REGISTRA TU LIGA", size=44)).arrange(m.DOWN, buff=0.7)
        self.say("Entra y [registra tu liga hoy.]", m.FadeIn(final, shift=m.UP * 0.3))
        self.wait(1.5)
