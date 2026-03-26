-- Migration 020: Pre-load reglamento wiki pages
-- Source: Reglamento Nacional de Rugby Pre Juvenil e Infantil 2024 (UAR/URBA)

INSERT INTO wiki_pages (title, slug, category, sort_order, published, content) VALUES

-- ─────────────────────────────────────────────────────────────
-- 1. INFANTIL: Resumen por categoría
-- ─────────────────────────────────────────────────────────────
(
  'Reglamento Infantil — Resumen por categoría',
  'reglamento-infantil-resumen',
  'reglamento',
  10,
  true,
  $CONTENT$
## Categorías Infantil

| Categoría | Edad |
|-----------|------|
| M6 | Menores de 6 años |
| M7 | Menores de 7 años |
| M8 | Menores de 8 años |
| M9 | Menores de 9 años |
| M10 | Menores de 10 años |
| M11 | Menores de 11 años |
| M12 | Menores de 12 años |

> Niñas y niños pueden jugar juntos en un equipo hasta M13 inclusive. No hay límites por peso ni estatura.

---

## Constitución de equipos

| Categoría | Jugadores |
|-----------|-----------|
| M6 y M7 | Hasta 5 (Probá Rugby) |
| M8 | 5 |
| M9 | 7 |
| M10 | 9 |
| M11 | 10 |
| M12 | 12 (hasta junio) / 13 (desde julio) |

---

## Duración de los partidos

| Categoría | Períodos | Minutos c/u | Pausas | Total |
|-----------|----------|-------------|--------|-------|
| M6 y M7 | 5 | 7' | hasta 5' | 35' |
| M8 | 5 | 8' | hasta 5' | 40' |
| M9 | 5 | 9' | hasta 5' | 45' |
| M10 y M11 | 5 | 10' | hasta 5' | 50' |
| M12 | 5 | 12' | hasta 5' | 60' |

> Al finalizar cada período los equipos cambian de lado.

---

## Máximo de minutos por jugador (en 48 hs)

| Categoría | Máx. minutos |
|-----------|-------------|
| M6 a M9 | 60' |
| M10 y M11 | 70' |
| M12 | 80' |

> Pausa mínima entre partidos: **40 minutos**.

---

## Campo de juego

| Categoría | Medidas (sin In-Goal) |
|-----------|----------------------|
| M6 y M7 | 22 × 12 m |
| M8 | 35 × 22 m |
| M9 | 35 × 24 m |
| M10 | 45 × 33 m |
| M11 | 47 × 37 m |
| M12 | 60×46 m (hasta junio) / 70×55 m (desde julio) |

> Las medidas no incluyen los In-Goals. Se deben respetar durante todo el año; no se puede adelantar a las medidas del año siguiente.

---

## Scrum

| Categoría | Formación | Hooking | Empuje |
|-----------|-----------|---------|--------|
| M6 y M7 | No hay scrum (Probá Rugby) | — | — |
| M8 | 1 vs 2 | No | Hasta línea de pelota |
| M9 | 2 vs 3 | No | Hasta línea de pelota |
| M10 | 2+1 vs 3 | No | Hasta línea de pelota |
| M11 | 3 vs 3 | No | Hasta línea de pelota |
| M12 (hasta junio) | 3+2 vs 3+2 | No | Hasta línea de pelota |
| M12 (desde julio) | 3+2+1 vs 3+2+1 | No | Hasta línea de pelota |

> **Protocolo**: "cuclillas, tomarse, ya". El defensor solo puede resistir (tensión isométrica). En M8 a M10 se sugiere alternar: de cada 3 infracciones, 1 scrum y 2 free kicks.

---

## Line out

| Categoría | Jugadores | Levantar al saltador | Oposición | Offside backs |
|-----------|-----------|---------------------|-----------|---------------|
| M6 y M7 | No hay line out | — | — | — |
| M8 y M9 | Reducido (menor cantidad) | No | No | 5 m |
| M10 | 1+5+1 | No | No | 5 m |
| M11 | 1+6+1 | No | No | 7 m |
| M12 | 1+7+1 | No (hasta junio) / Sí (desde julio) | No | 7 m |

---

## Ruck

| Categoría | Permitido | Jugadores por lado |
|-----------|-----------|-------------------|
| M6, M7, M8 | No | — |
| M9 y M10 | Sí | 1 por lado |
| M11 | Sí | Hasta 2 por lado |
| M12 | Sí | Libre |

> Solo 1ra y única disputa. Cuando el árbitro dice "**Definida**", todos dejan de empujar.

---

## Tackle

| Categoría | Modalidad |
|-----------|-----------|
| M6 y M7 | No hay tackle — se quitan las cintas del cinturón |
| M8 | "Abrazar 1, 2, 3" (abrazo con ambos brazos) |
| M9 a M12 | Tackle desde la cintura hacia abajo |

---

## Pelota

| Categoría | Tamaño |
|-----------|--------|
| M6 a M9 | Nro. 3 o 4 |
| M10 a M12 | Nro. 4 |

---

## Conversión

| Categoría | Cómo se convierte |
|-----------|------------------|
| M6 a M9 | No se convierte |
| M10 y M11 | Sobre pique frente a los postes |
| M12 | Según leyes del juego |

---

## Tercer Tiempo

Al finalizar los encuentros, **todos los jugadores, entrenadores, árbitros y colaboradores de todos los clubes se reúnen** para compartir bebidas y alimentos nutritivos. No se entrega como vianda; el ritual de compartir en conjunto es parte esencial del rugby.

---

[Ver reglamento completo (PDF)](https://urbaweb-659150f8efd973a5-endpoint.azureedge.net/wp-content/uploads/2024/09/Reglamento-nacional-de-Rugby-pre-juvenil-e-Infantil-2024.pdf)
$CONTENT$
),

-- ─────────────────────────────────────────────────────────────
-- 2. PRE JUVENIL: Resumen por categoría
-- ─────────────────────────────────────────────────────────────
(
  'Reglamento Pre Juvenil — Resumen por categoría',
  'reglamento-pre-juvenil-resumen',
  'reglamento',
  20,
  true,
  $CONTENT2$
## Categorías Pre Juvenil

| Categoría | Edad |
|-----------|------|
| M13 | Menores de 13 años — **MIXTO** (varones y mujeres) |
| M14 | Menores de 14 años |
| M15 | Menores de 15 años |

> No hay campeón, no hay tabla de posiciones. Los encuentros son formativos, recreativos y educativos.

---

## Constitución de equipos

| Categoría | Jugadores |
|-----------|-----------|
| M13 | 15 |
| M14 | 15 |
| M15 | 15 |

---

## Duración de los partidos

| Categoría | Períodos | Minutos c/u | Pausas | Total |
|-----------|----------|-------------|--------|-------|
| M13 | 4 | 15' | hasta 5' | 60' |
| M14 | 3 | 20' | hasta 5' | 60' |
| M15 | Según reglamento WR para menores | — | — | — |

> Se sugiere que todos los jugadores inicien al menos un período y jueguen al menos 2 períodos completos.

---

## Máximo de minutos por jugador (en 48 hs)

| Categoría | Máx. minutos |
|-----------|-------------|
| M13 | 90' |
| M14 | 90' |
| M15 | Según WR |

> Pausa mínima entre partidos: **40 minutos**.

---

## Campo de juego

| Categoría | Medidas |
|-----------|---------|
| M13, M14 y M15 | 100 × 70/60 m |

---

## Scrum

| Categoría | Formación | Ataque | Defensa | Offside medio |
|-----------|-----------|--------|---------|---------------|
| M13 | 3+4+1 vs 3+4+1 | Tensión isométrica + hooking | Solo resistir (isométrico) | 5 m |
| M14 | 3+4+1 vs 3+4+1 | Tensión isométrica + hooking | Solo resistir (isométrico) | 5 m |
| M15 | Según WR | — | — | — |

> **Protocolo**: "cuclillas, tomarse, ya". Empuje permitido hasta superar la línea de la pelota.

---

## Line out

| Categoría | Formación | Levantar | Oposición | Offside backs |
|-----------|-----------|----------|-----------|---------------|
| M13 | 1+7+1 | No | No | 10 m |
| M14 | 1+7+1 | Sí | No (1er sem.) / 2 manos (2do sem.) | 10 m |
| M15 | Según WR | — | — | — |

> En M13 y M14: en un maul después del line out no se puede empujar más de **2 metros**.

---

## Ruck

| Categoría | Descripción |
|-----------|-------------|
| M13 y M14 | Permitido. **1ra y única disputa**, libre cantidad de jugadores. |
| M15 | Según WR |

> Cuando el árbitro dice "**Definida**", los equipos dejan de empujar.

---

## Tackle

| Categoría | Altura |
|-----------|--------|
| M13 y M14 | Desde la cintura hacia abajo |
| M15 | Según WR |

> No está permitido embestir intencionalmente al defensor.

---

## Pelota

| Categoría | Tamaño |
|-----------|--------|
| M13 | Nro. 4 |
| M14 y M15 | Nro. 5 |

---

## Tercer Tiempo

Al finalizar los encuentros, **todos los jugadores, entrenadores, árbitros y colaboradores de todos los clubes se reúnen** para compartir bebidas y alimentos nutritivos. No se entrega como vianda; el ritual de compartir en conjunto es parte esencial del rugby.

---

[Ver reglamento completo (PDF)](https://urbaweb-659150f8efd973a5-endpoint.azureedge.net/wp-content/uploads/2024/09/Reglamento-nacional-de-Rugby-pre-juvenil-e-Infantil-2024.pdf)
$CONTENT2$
),

-- ─────────────────────────────────────────────────────────────
-- 3. PROBÁ RUGBY: Guía M6 y M7
-- ─────────────────────────────────────────────────────────────
(
  'Probá Rugby — Guía M6 y M7',
  'proba-rugby-m6-m7',
  'reglamento',
  30,
  true,
  $CONTENT3$
## ¿Qué es Probá Rugby?

El formato para M6 y M7 no es rugby con tackles: es un juego con **cinturón y cintas** donde en lugar de tacklear se quitan las cintas al portador de la pelota.

---

## Campo y equipo

- **Campo**: 22 × 12 m (sin In-Goals)
- **Jugadores**: hasta 5 por equipo
- **Duración**: 5 períodos × 7' con pausas de hasta 5' = 35' totales
- **Pelota**: Nro. 3 o 4

---

## Reglas clave

**Posesión y avance**
- El portador avanza con la pelota hasta que le quitan **ambas cintas** (o una, según acordado entre entrenadores).
- Al quitarle las cintas, el portador dice **"PASE"** en voz alta, se detiene y pasa la pelota.
- No hay tackle físico.

**Pase**
- Solo hacia atrás o lateral (igual que el rugby).
- No se sanciona el knock-on involuntario en M6 y M7 — se reinicia con free kick.

**Conversión**
- No se convierte después del try.

**Reinicio**
- Después de un try, **reinicia el mismo equipo que anotó** (para mantener el flujo del juego formativo).

---

## Palabras clave del árbitro

| Palabra | Cuándo usarla |
|---------|--------------|
| **"DOS MANOS"** | Para recordar que se deben quitar ambas cintas |
| **"CINTAS"** | Para señalar que ya fueron quitadas |
| **"PASE"** | Para recordar al portador que debe pasar |

---

## Objetivos pedagógicos

- Que todos los jugadores toquen la pelota y participen del juego.
- Desarrollar las nociones espaciales básicas (campo delimitado con conos o cintas).
- Introducir progresivamente el contacto a partir de M8.
- El árbitro tiene rol **docente**: explica, no solo sanciona.

---

[Ver reglamento completo (PDF)](https://urbaweb-659150f8efd973a5-endpoint.azureedge.net/wp-content/uploads/2024/09/Reglamento-nacional-de-Rugby-pre-juvenil-e-Infantil-2024.pdf)
$CONTENT3$
)

ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  title = EXCLUDED.title,
  sort_order = EXCLUDED.sort_order,
  published = EXCLUDED.published,
  updated_at = now();
