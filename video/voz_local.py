"""Voz en español de México con el `say` de macOS (gratis, sin cuentas).

ManimGX acepta como voz cualquier función de texto a `Speech`. Esta usa la
voz "Paulina" (es_MX) que trae macOS y convierte el audio a WAV con ffmpeg;
ManimGX estima cuándo se dice cada palabra para sincronizar las animaciones.
Para cambiar a una voz más natural basta con otra función con la misma firma.
"""

import subprocess
import tempfile
from pathlib import Path

import manimgx as m

VOZ = "Paulina"
VELOCIDAD = 175  # palabras por minuto; la de fábrica suena apresurada


def paulina(texto: str) -> m.voices.Speech:
    carpeta = Path(tempfile.mkdtemp(prefix="voz-"))
    aiff = carpeta / "voz.aiff"
    wav = carpeta / "voz.wav"
    subprocess.run(["say", "-v", VOZ, "-r", str(VELOCIDAD), "-o", str(aiff), texto], check=True)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff), "-ar", "48000", "-ac", "1", str(wav)],
        check=True,
    )
    return m.voices.Speech(str(wav), text=texto)
