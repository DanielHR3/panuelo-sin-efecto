# Video "Cómo funciona"

Animación vertical (1080×1920, ~45 s) hecha con [ManimGX](https://manimgx.academa.ai)
y narrada con la voz **Paulina** (español de México) de macOS. El resultado se publica en
`web/public/video/` y se ve en `/como-funciona`.

## Generarlo de nuevo

Requisitos: macOS (por el comando `say`), `ffmpeg` y Python 3.13+.

```bash
python3 -m venv .venv && .venv/bin/pip install manimgx==0.1.1
.venv/bin/manimgx inspect como_funciona.py          # cuadros clave y problemas de layout
.venv/bin/manimgx render como_funciona.py -o como-funciona.mp4 -r 1080x1920 --fps 30 --crf 26 --preset slow
cp como-funciona.mp4 ../web/public/video/
ffmpeg -y -i como-funciona.srt ../web/public/video/como-funciona.vtt
ffmpeg -y -ss 4.45 -i como-funciona.mp4 -frames:v 1 -vf scale=540:-1 -q:v 4 ../web/public/video/como-funciona.jpg
```

- El guion está en `como_funciona.py`: cada `self.say(...)` es una frase; lo que va entre
  corchetes marca cuándo empieza cada animación.
- Para otra voz, cambia `voz_local.py` por cualquier función de texto a `Speech`
  (por ejemplo un servicio de voz con IA).
