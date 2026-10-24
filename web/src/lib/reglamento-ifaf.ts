/**
 * Resumen propio (no es el texto oficial) de las reglas clave del reglamento
 * IFAF de Flag Football, edición 2023 — la vigente para flag: IFAF no publicó
 * reglas de flag nuevas en 2026. El texto completo es de IFAF y se consulta en
 * su sitio; aquí solo se enlaza.
 */
export const IFAF_REGLAS_URL = "https://www.americanfootball.sport/ifaf-rules/";
export const IFAF_EDICION = "IFAF Flag Football, edición 2023";

export interface SeccionReglamento {
  titulo: string;
  puntos: string[];
}

export const RESUMEN_IFAF: SeccionReglamento[] = [
  {
    titulo: "Equipos y campo",
    puntos: [
      "5 jugadores por equipo en el campo; hasta 15 en el roster.",
      "Campo de 50 × 25 yardas, más zonas de anotación de 10 yardas en cada extremo.",
      "La línea de media cancha marca dónde se gana una nueva serie de downs.",
      "Zonas de no correr: las 5 yardas antes de cada zona de anotación. Ahí la ofensiva solo puede pasar.",
    ],
  },
  {
    titulo: "Tiempo",
    puntos: [
      "Dos mitades de 20 minutos con 2 minutos de descanso.",
      "En los últimos 2 minutos de cada mitad el reloj se detiene en situaciones como primeros downs, anotaciones y tiempos fuera.",
      "Cada equipo tiene 2 tiempos fuera por mitad, de hasta 60 segundos; no se acumulan.",
      "La ofensiva tiene 25 segundos para poner el balón en juego.",
    ],
  },
  {
    titulo: "Avance y anotación",
    puntos: [
      "4 downs para cruzar la media cancha; al cruzarla, 4 downs más para anotar.",
      "Touchdown: 6 puntos.",
      "Punto extra desde la yarda 5: 1 punto. Desde la yarda 10: 2 puntos.",
      "Si la defensa anota durante un punto extra: 2 puntos.",
      "Safety: 2 puntos para el equipo contrario.",
    ],
  },
  {
    titulo: "Jugadas clave",
    puntos: [
      "El quarterback no puede correr con el balón más allá de la línea de golpeo, salvo las excepciones del reglamento.",
      "El blitzer se coloca a más de 7 yardas de la línea, levanta la mano antes del snap y va directo al quarterback.",
      "No hay contacto: proteger la bandera con las manos o el balón (flag guarding) es falta.",
      "La jugada termina cuando le quitan la bandera al corredor.",
    ],
  },
  {
    titulo: "Empate",
    puntos: [
      "Si el reglamento de la competencia lo pide, se juega un desempate por series desde media cancha y después con puntos extra.",
    ],
  },
];
