// Script para tomar screenshots de la app en modo mobile
// Requiere: npx playwright install chromium (solo la primera vez)

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'https://vrc-presentismo.vercel.app';
const OUTPUT_DIR = path.join(__dirname, '../public/help');
const MOBILE = { width: 390, height: 844 };

const EMAIL = 'auditoria@gmail.com';
const PASS = 'auditoria';

async function screenshot(page, filename, { scrollY = 0 } = {}) {
  if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    clip: { x: 0, y: 0, width: MOBILE.width, height: MOBILE.height },
  });
  console.log(`✅ ${filename}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '01-login.jpg');

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/attendance`);
  await page.waitForTimeout(1000);

  // ── ENCUENTROS ─────────────────────────────────────────────────────────────
  await screenshot(page, '02-encuentros-selector.jpg');

  // Ir a M12
  const m12Btn = page.locator('text=M12');
  await m12Btn.first().click();
  await page.waitForLoadState('networkidle');
  await screenshot(page, '03-encuentros-historial.jpg');

  // Nueva sesión
  await page.click('text=Nueva');
  await page.waitForLoadState('networkidle');
  await screenshot(page, '04-tomar-lista.jpg');
  await screenshot(page, '04b-tomar-lista-scroll.jpg', { scrollY: 400 });

  // Volver
  await page.goBack();
  await page.goBack();

  // ── JUGADORES ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/players`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '05-jugadores-lista.jpg');

  // Detalle jugador (primer jugador)
  const firstPlayer = page.locator('a[href*="/players/e"]').first();
  await firstPlayer.click();
  await page.waitForLoadState('networkidle');
  await screenshot(page, '06-jugador-detalle.jpg');
  await screenshot(page, '06b-jugador-detalle-scroll.jpg', { scrollY: 500 });

  // Editar jugador
  const editBtn = page.locator('a[href*="/edit"]').first();
  const editHref = await editBtn.getAttribute('href');
  await page.goto(`${BASE_URL}${editHref}`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '07-jugador-editar.jpg');

  // Nuevo jugador
  await page.goto(`${BASE_URL}/players/new`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '08-jugador-nuevo.jpg');

  // ── STATS ─────────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/stats`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '09-stats-general.jpg');

  // Stats M12
  await page.click('text=M12');
  await page.waitForLoadState('networkidle');
  await screenshot(page, '10-stats-division.jpg');
  await screenshot(page, '10b-stats-ranking.jpg', { scrollY: 500 });

  // ── MÁS ───────────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/more`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '11-mas.jpg');

  // Mi cuenta
  await page.goto(`${BASE_URL}/more/account`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '12-mi-cuenta.jpg');

  // Clubes rivales (público)
  await page.goto(`${BASE_URL}/clubs`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '13-clubes-rivales.jpg');

  // ── COORDINACIÓN / ADMIN ──────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '14-admin-panel.jpg');
  await screenshot(page, '14b-admin-panel-scroll.jpg', { scrollY: 400 });

  // Fixture
  await page.goto(`${BASE_URL}/admin/sabados`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '15-fixture.jpg');
  await screenshot(page, '15b-fixture-scroll.jpg', { scrollY: 400 });

  // Tercer tiempo
  await page.goto(`${BASE_URL}/admin/tercer-tiempo`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '16-tercer-tiempo.jpg');

  // Vista del día
  await page.goto(`${BASE_URL}/admin/hoy`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '17-vista-dia.jpg');

  // Panel Tutoras
  await page.goto(`${BASE_URL}/tutoras`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '18-tutoras-panel.jpg');
  await screenshot(page, '18b-tutoras-scroll.jpg', { scrollY: 400 });

  // Colegios (desde tutoras)
  await page.goto(`${BASE_URL}/tutoras/schools`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '19-tutoras-colegios.jpg');

  // Volver al admin
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState('networkidle');

  // Entrenadores
  await page.goto(`${BASE_URL}/admin/coaches`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '20-entrenadores.jpg');

  // Nuevo entrenador
  await page.goto(`${BASE_URL}/admin/coaches/new`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '20b-entrenador-nuevo.jpg');

  // Colegios admin
  await page.goto(`${BASE_URL}/tutoras/schools`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '21-colegios.jpg');

  // Bondis
  await page.goto(`${BASE_URL}/admin/buses`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '22-bondis.jpg');

  // Clubes rivales admin
  await page.goto(`${BASE_URL}/admin/clubs`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, '23-clubes-admin.jpg');

  await browser.close();
  console.log('\n🎉 ¡Screenshots completados!');
}

main().catch(console.error);
