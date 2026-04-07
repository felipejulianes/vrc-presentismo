'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Tab = 'entrenador' | 'coordinacion'

export default function AyudaPage() {
  const [tab, setTab] = useState<Tab>('entrenador')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/more" className="text-gray-500 hover:text-gray-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">Guía de uso</h1>
            <p className="text-xs text-gray-400">VRC Presentismo</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={() => setTab('entrenador')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'entrenador'
                ? 'text-vrc-green border-b-2 border-vrc-green'
                : 'text-gray-400'
            }`}
          >
            Entrenadores
          </button>
          <button
            onClick={() => setTab('coordinacion')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'coordinacion'
                ? 'text-vrc-green border-b-2 border-vrc-green'
                : 'text-gray-400'
            }`}
          >
            Coordinación
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-24">
        {tab === 'entrenador' ? <GuiaEntrenador /> : <GuiaCoordinacion />}
      </div>
    </div>
  )
}

/* ─── Componentes de UI ───────────────────────────────────────────────── */

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-6 pb-2">
      <span className="text-xl">{emoji}</span>
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {children}
    </div>
  )
}

function CardText({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3 text-sm text-gray-600 space-y-1">{children}</div>
}

function SS({ src, caption }: { src: string; caption?: string }) {
  return (
    <div className="px-4 my-3">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <Image
          src={`/help/${src}`}
          alt={caption || ''}
          width={390}
          height={844}
          className="w-full h-auto"
          unoptimized
        />
      </div>
      {caption && (
        <p className="text-xs text-gray-400 mt-1.5 text-center">{caption}</p>
      )}
    </div>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <div className="px-4 py-3 space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 items-start">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-vrc-green text-white text-xs flex items-center justify-center font-bold mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm text-gray-700">{item}</p>
        </div>
      ))}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 my-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
      <span className="text-base flex-shrink-0">💡</span>
      <p className="text-xs text-amber-800">{children}</p>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100 mx-4 my-4" />
}

/* ─── Guía Entrenador ────────────────────────────────────────────────── */

function GuiaEntrenador() {
  return (
    <div>
      {/* INTRO */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-sm text-gray-600">
          Esta guía explica todo lo que podés hacer en la app como entrenador.
          Usá el menú inferior para moverte entre las secciones.
        </p>
      </div>

      <SS src="01-login.jpg" caption="Pantalla de ingreso" />
      <Card>
        <CardText>
          <p>Podés ingresar con tu <strong>email y contraseña</strong> o directamente con tu cuenta de <strong>Google</strong>.</p>
          <p>Si olvidaste tu contraseña, tocá <em>&ldquo;¿Olvidaste tu contraseña?&rdquo;</em> y te llegará un email para crear una nueva.</p>
        </CardText>
      </Card>

      {/* ── JUGADORES ─────────────────────────── */}
      <SectionTitle emoji="👥" title="Jugadores" />

      <SS src="05-jugadores-lista.jpg" caption="Lista de jugadores" />
      <Card>
        <CardText>
          <p>Acá ves todos los jugadores de tus divisiones, ordenados por apellido.</p>
          <p>Podés <strong>buscar</strong> por nombre, apodo o DNI usando la barra de búsqueda.</p>
          <p>Los íconos a la derecha de cada jugador son atajos rápidos para editar ✏️, abrir WhatsApp del padre/madre 💬, o llamar directamente 📞.</p>
        </CardText>
      </Card>

      <Divider />

      <SS src="06-jugador-detalle.jpg" caption="Perfil del jugador" />
      <SS src="06b-jugador-detalle-scroll.jpg" caption="Notas, seguimiento y más" />
      <Card>
        <CardText>
          <p>Tocando en el nombre de un jugador abrís su perfil completo:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Porcentaje de asistencia del año</li>
            <li>Fecha de nacimiento, DNI, colegio</li>
            <li>Contacto del padre/madre (WhatsApp y teléfono)</li>
            <li>Bitácora del entrenador (notas privadas)</li>
            <li>Seguimiento de ausentes (registro de contactos)</li>
          </ul>
        </CardText>
      </Card>

      <Divider />

      <SS src="08-jugador-nuevo.jpg" caption="Agregar un jugador nuevo" />
      <Card>
        <Steps items={[
          'Tocá el botón verde + en la esquina superior derecha de Jugadores.',
          'Completá los datos: nombre, apellido, división, fecha de nacimiento.',
          'Podés agregar la foto usando la cámara del celular directamente.',
          'Colegio y datos de contacto del padre/madre son opcionales pero muy útiles.',
          'Guardá con el botón al final del formulario.',
        ]} />
      </Card>

      <Divider />

      <SS src="07-jugador-editar.jpg" caption="Editar jugador" />
      <Card>
        <CardText>
          <p>Para editar un jugador, tocá el ícono ✏️ en la lista o el botón de editar en su perfil.</p>
          <p>Podés actualizar <strong>foto</strong> (tocando en el círculo de la foto), colegio, grado, datos personales y contacto del referente.</p>
        </CardText>
      </Card>
      <Tip>La foto se puede tomar directo con la cámara del celular. Se guarda automáticamente en la nube.</Tip>

      {/* ── ENCUENTROS ───────────────────────── */}
      <SectionTitle emoji="📅" title="Encuentros — Tomar lista" />

      <SS src="03-encuentros-historial.jpg" caption="Historial de tu división" />
      <Card>
        <CardText>
          <p>En la pestaña <strong>Encuentros</strong> ves todos los sábados y miércoles de la temporada.</p>
          <p>Los que dicen <em>&ldquo;Sin lista&rdquo;</em> son los próximos donde todavía no tomaste asistencia.</p>
          <p>Los que ya tienen lista aparecen con la cantidad de presentes.</p>
        </CardText>
      </Card>

      <Divider />

      <SS src="04-tomar-lista.jpg" caption="Grilla de asistencia" />
      <Card>
        <Steps items={[
          'Tocá en el encuentro del día (o en "+ Nueva" para agregar la fecha de hoy).',
          'Aparece la grilla con todos los jugadores activos de tu división.',
          'Tocá sobre cada jugador para marcarlo PRESENTE (se pone verde).',
          'Los que no tocás quedan como AUSENTES.',
          'La lista se guarda automáticamente al instante — no hace falta tocar ningún botón.',
        ]} />
      </Card>
      <Tip>Podés buscar un jugador por nombre usando la barra de búsqueda arriba de la grilla, útil para divisiones grandes.</Tip>

      <Divider />

      <Card>
        <CardText>
          <p className="font-medium text-gray-800">🏉 En días de partido</p>
          <p className="mt-1">Cuando el sábado hay partido, la app te avisa si es <strong>de local</strong> o <strong>visitante</strong>.</p>
          <p className="mt-1">Si es <strong>visitante</strong>, vas a ver la dirección del club rival y los datos del bondi (chofer y teléfono) directo en la pantalla.</p>
          <p className="mt-1">La toma de lista es igual que en el entrenamiento.</p>
        </CardText>
      </Card>

      {/* ── ESTADÍSTICAS ─────────────────────── */}
      <SectionTitle emoji="📊" title="Estadísticas" />

      <SS src="10-stats-division.jpg" caption="Stats de tu división" />
      <SS src="10b-stats-ranking.jpg" caption="Ranking de asistencia" />
      <Card>
        <CardText>
          <p>En <strong>Stats</strong> ves los números de asistencia de tu división:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Jugadores activos</strong> en tu división</li>
            <li><strong>% promedio</strong> de los últimos 30 días</li>
            <li><strong>Tendencia</strong> sesión por sesión (gráfico)</li>
            <li><strong>Ranking individual</strong> de asistencia</li>
          </ul>
          <p className="mt-2">Podés filtrar por <em>Sábados</em>, <em>Miércoles</em> o <em>Todo</em> usando los tabs de arriba.</p>
        </CardText>
      </Card>

      {/* ── MÁS ──────────────────────────────── */}
      <SectionTitle emoji="⚙️" title="Más — Recursos y cuenta" />

      <SS src="11-mas.jpg" caption='Menú "Más"' />

      <Divider />

      <SS src="13-clubes-rivales.jpg" caption="Clubes rivales URBA" />
      <Card>
        <CardText>
          <p>En <strong>Clubes rivales</strong> podés buscar cualquier club de la URBA y ver su dirección, sedes y cómo llegar.</p>
          <p>Útil para cuando tenés partido de visitante y querés mandarle la dirección a los padres.</p>
        </CardText>
      </Card>

      <Divider />

      <SS src="12-mi-cuenta.jpg" caption="Mi cuenta — Cambiar contraseña" />
      <Card>
        <Steps items={[
          'Tocá "Más" en el menú inferior.',
          'Entrá a "Mi cuenta".',
          'Ingresá tu contraseña actual y la nueva.',
          'Guardá los cambios.',
        ]} />
      </Card>
    </div>
  )
}

/* ─── Guía Coordinación ──────────────────────────────────────────────── */

function GuiaCoordinacion() {
  return (
    <div>
      {/* INTRO */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-sm text-gray-600">
          Como Coordinador/Admin tenés acceso a todo lo que ven los entrenadores
          <strong> más</strong> el panel de Coordinación con las herramientas de gestión del club.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Todo lo explicado en la guía de Entrenadores aplica igual para vos. Acá se explican las secciones adicionales.
        </p>
      </div>

      {/* ── JUGADORES (admin) ─────────────────── */}
      <SectionTitle emoji="👥" title="Jugadores" />
      <SS src="05-jugadores-lista.jpg" caption="Lista completa de todos los jugadores" />
      <Card>
        <CardText>
          <p>Como Coordinador ves <strong>todos los jugadores de todas las divisiones</strong> en una sola lista.</p>
          <p>Podés editar cualquier jugador, agregar nuevos, ver su perfil completo con notas de su entrenador y registrar seguimientos.</p>
          <p className="mt-1">El botón <strong>Documentación</strong> (🗂️) en la parte superior te lleva al estado de DNI, apto médico y ficha de todos los jugadores.</p>
        </CardText>
      </Card>

      {/* ── ENCUENTROS (admin) ────────────────── */}
      <SectionTitle emoji="📅" title="Encuentros" />
      <SS src="02-encuentros-selector.jpg" caption="Selector de división" />
      <Card>
        <CardText>
          <p>A diferencia del entrenador que va directo a su división, vos ves el <strong>selector de todas las divisiones</strong>.</p>
          <p>Podés entrar a cualquier división para ver su historial o tomar lista.</p>
        </CardText>
      </Card>

      {/* ── STATS (admin) ─────────────────────── */}
      <SectionTitle emoji="📊" title="Estadísticas" />
      <SS src="09-stats-general.jpg" caption="Vista general — todas las divisiones" />
      <Card>
        <CardText>
          <p>En la vista general ves el resumen de <strong>todas las divisiones</strong> de un vistazo.</p>
          <p>Tocando en una división accedés a las stats detalladas de esa división (igual que ve el entrenador).</p>
        </CardText>
      </Card>

      {/* ── PANEL COORDINACIÓN ────────────────── */}
      <SectionTitle emoji="🎛️" title="Panel de Coordinación" />
      <SS src="14-admin-panel.jpg" caption="Panel principal" />
      <SS src="14b-admin-panel-scroll.jpg" caption="Gestión y jugadores activos por división" />
      <Card>
        <CardText>
          <p>El panel de Coordinación es el centro de gestión del club. Desde acá accedés a:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Fixture</strong> — calendario semanal de partidos y entrenamientos</li>
            <li><strong>Tercer tiempo</strong> — declaración de tercer tiempo por fecha</li>
            <li><strong>Vista del día</strong> — asistencia de hoy en todas las divisiones</li>
            <li><strong>Panel Tutoras</strong> — gestión de colegios, docs y visitas</li>
            <li><strong>Entrenadores y admins</strong> — gestión de usuarios</li>
            <li><strong>Colegios</strong> — catálogo y presencia</li>
            <li><strong>Clubes rivales</strong> — gestión del listado de clubes</li>
            <li><strong>Bondis</strong> — catálogo de vehículos</li>
          </ul>
          <p className="mt-2">Abajo del menú ves un resumen de <strong>jugadores activos por división</strong>.</p>
        </CardText>
      </Card>

      {/* ── FIXTURE ───────────────────────────── */}
      <SectionTitle emoji="🗓️" title="Fixture" />
      <SS src="15-fixture.jpg" caption="Lista de sábados del año" />
      <SS src="15b-fixture-scroll.jpg" caption="Tipo de actividad por sábado" />
      <Card>
        <CardText>
          <p>En <strong>Fixture</strong> ves todos los sábados de la temporada con su tipo de actividad.</p>
          <p>Para cada sábado podés definir si es <em>Entrenamiento</em>, <em>Partido de local</em> o <em>Partido de visitante</em>.</p>
          <p className="mt-1">Cuando configurás un partido incluís:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Club rival y sede</li>
            <li>Horario del partido por división</li>
            <li>Bondi asignado (chofer y patente)</li>
          </ul>
          <p className="mt-2">Esta información viaja automáticamente a los entrenadores cuando toman lista ese sábado.</p>
        </CardText>
      </Card>

      {/* ── TERCER TIEMPO ─────────────────────── */}
      <SectionTitle emoji="🍊" title="Tercer tiempo" />
      <SS src="16-tercer-tiempo.jpg" caption="Gestión de tercer tiempo" />
      <Card>
        <CardText>
          <p>El <strong>tercer tiempo</strong> se declara después de los partidos de local.</p>
          <p>Cada entrenador declara desde su pantalla de lista los jugadores presentes de su equipo.</p>
          <p className="mt-1">Como Coordinador ves el resumen de:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Cantidades por división</li>
            <li>Jugadores visitantes declarados</li>
            <li>Entrenadores y staff de ambos equipos</li>
          </ul>
        </CardText>
      </Card>

      {/* ── GESTIÓN DE USUARIOS ───────────────── */}
      <SectionTitle emoji="👤" title="Gestión de entrenadores y admins" />
      <SS src="20-entrenadores.jpg" caption="Lista de usuarios" />
      <SS src="20b-entrenador-nuevo.jpg" caption="Crear nuevo usuario" />
      <Card>
        <CardText>
          <p>Acá gestionás todos los usuarios de la app:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Ver qué divisiones tiene asignadas cada entrenador</li>
            <li>Cambiar el rol de un usuario (Entrenador / Admin / Tutora)</li>
            <li>Asignar o quitar divisiones</li>
            <li>Crear nuevos usuarios</li>
          </ul>
          <p className="mt-2">Tocá en cualquier usuario para editar sus datos y divisiones asignadas.</p>
        </CardText>
      </Card>
      <Tip>Al crear un usuario nuevo podés enviarle un email de &ldquo;Recuperar contraseña&rdquo; desde el Dashboard de Supabase para que elija su propia contraseña. También puede entrar con Google si el email coincide.</Tip>

      {/* ── CLUBES RIVALES ────────────────────── */}
      <SectionTitle emoji="🏟️" title="Clubes rivales" />
      <SS src="23-clubes-admin.jpg" caption="Gestión del catálogo de clubes" />
      <Card>
        <CardText>
          <p>Acá gestionás el <strong>listado completo de clubes de la URBA</strong>:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Ver todos los clubes con sus sedes</li>
            <li>Agregar nuevos clubes o editar existentes</li>
            <li>Marcar la <strong>ubicación exacta en el mapa</strong> de cada sede</li>
            <li>Agregar teléfonos de contacto</li>
          </ul>
          <p className="mt-2">Las sedes con coordenadas cargadas permiten que los entrenadores vean cómo llegar directamente desde la app.</p>
        </CardText>
      </Card>

      {/* ── BONDIS ────────────────────────────── */}
      <SectionTitle emoji="🚌" title="Bondis" />
      <SS src="22-bondis.jpg" caption="Catálogo de vehículos" />
      <Card>
        <CardText>
          <p>El <strong>catálogo de bondis</strong> guarda los datos de cada vehículo:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Nombre / identificación del bondi</li>
            <li>Chofer y teléfono de contacto</li>
            <li>Patente del vehículo</li>
          </ul>
          <p className="mt-2">Al cargar un bondi en el fixture de un sábado, estos datos aparecen automáticamente para los entrenadores cuando toman lista.</p>
        </CardText>
      </Card>
      <Tip>Mantené actualizados los datos del chofer — son los que ven los entrenadores cuando preguntan por el transporte ese sábado.</Tip>

      {/* ── PANEL TUTORAS ─────────────────────── */}
      <SectionTitle emoji="🎓" title="Panel Tutoras" />
      <SS src="18-tutoras-panel.jpg" caption="Dashboard del Panel Tutoras" />
      <SS src="18b-tutoras-scroll.jpg" caption="Próximas visitas y accesos" />
      <Card>
        <CardText>
          <p>El <strong>Panel Tutoras</strong> está diseñado para verse mejor en computadora (es responsivo).</p>
          <p className="mt-1">Desde acá las tutoras gestionan:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Documentación de jugadores (DNI, apto médico, ficha)</li>
            <li>Jugadores con foco en colegio y grado</li>
            <li>Catálogo de colegios, presencia y visitas</li>
            <li>Entrevistas realizadas a jugadores</li>
          </ul>
        </CardText>
      </Card>

      {/* ── COLEGIOS ──────────────────────────── */}
      <SectionTitle emoji="🏫" title="Colegios" />
      <SS src="19-tutoras-colegios.jpg" caption="Colegios — presencia y visitas" />
      <SS src="21-colegios.jpg" caption="Catálogo de colegios" />
      <Card>
        <CardText>
          <p>La sección Colegios tiene dos partes:</p>
          <p className="mt-2 font-medium text-gray-800">Presencia y visitas</p>
          <p>Muestra cuántos jugadores hay por colegio/división. Sirve para identificar colegios con vacantes o donde conviene hacer una visita.</p>
          <p className="mt-1">Podés planificar visitas a colegios (con las divisiones objetivo) y luego marcarlas como realizadas.</p>
          <p className="mt-2 font-medium text-gray-800">Catálogo de colegios</p>
          <p>Registrá los colegios con nombre, dirección y alias. Si un entrenador cargó mal el nombre de un colegio, podés <strong>fusionarlo</strong> con el correcto — todos los alumnos migran automáticamente.</p>
        </CardText>
      </Card>
      <Tip>Los &ldquo;alias&rdquo; del colegio sirven para que cuando alguien escribe &ldquo;Don Bosco&rdquo; o &ldquo;SOMISA&rdquo; encuentre el colegio correcto aunque el nombre oficial sea distinto.</Tip>
    </div>
  )
}
