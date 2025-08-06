import { test, expect, Page, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Configuración de rutas para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración global
const SESION_PATH = path.join(__dirname, 'sesion.json');
const ANEXOS_DIR = path.join(__dirname, '../Anexos');
const TIMEOUT = 120000; // 2 minutos

test.describe('Descarga de Hojas de Vida', () => {
  test.use({ 
    storageState: fs.existsSync(SESION_PATH) ? SESION_PATH : undefined,
    timeout: TIMEOUT
  });

  test('Descargar hoja de vida @integration', async ({ page, context }) => {
    test.setTimeout(0);
    const documento = process.env.DOCUMENTO;
    if (!documento) {
      test.skip(!documento, 'No se proporcionó documento');
      return;
    }

    console.log(`📄 Procesando documento: ${documento}`);
    const carpetaDescargas = path.join(os.homedir(), 'Downloads', documento);

    try {
      // Crear carpeta si no existe
      if (!fs.existsSync(carpetaDescargas)) {
        fs.mkdirSync(carpetaDescargas, { recursive: true });
        console.log(`📁 Carpeta creada: ${carpetaDescargas}`);
      }

      // Autenticación
      await autenticar(page, context);

      // Procesamiento del documento
      const datosPersona = await obtenerDatosPersonales(page, documento);
      await descargarHojaVida(page, carpetaDescargas, datosPersona.nombre);

      console.log(`✅ Proceso completado para ${documento}`);
    } catch (error) {
      console.error(`❌ Error procesando ${documento}:`, error);
      throw error;
    }
  });
});

// Función para autenticación
async function autenticar(page: Page, context: BrowserContext) {
  await page.goto('https://www.funcionpublica.gov.co/sigep-web/sigep2/index.xhtml');

  try {
    await page.waitForSelector('text=Información Personal', { timeout: 5000 });
    console.log('✅ Sesión activa encontrada');
  } catch {
    console.log('🔴 Iniciando nueva sesión...');
    await iniciarSesion(page);
    await context.storageState({ path: SESION_PATH });
  }
}

// Función para iniciar sesión
async function iniciarSesion(page: Page) {
  const CREDENCIALES = {
    usuario: '43575335',
    contraseña: 'Alex8800**12'
  };

  await page.getByLabel('Tipo de Documento*').selectOption('38');
        await page.waitForTimeout(3000);
        await page.getByRole('textbox', { name: 'Número de Identificación *' }).click();
        await page.getByRole('textbox', { name: 'Número de Identificación *' }).fill('43575335');
        await page.waitForTimeout(500);
        await page.getByRole('textbox', { name: 'Contraseña *' }).click();
        await page.getByRole('textbox', { name: 'Contraseña *' }).press('CapsLock');
        await page.getByRole('textbox', { name: 'Contraseña *' }).fill('A');
        await page.getByRole('textbox', { name: 'Contraseña *' }).press('CapsLock');
        await page.waitForTimeout(500);
        await page.getByRole('textbox', { name: 'Contraseña *' }).fill('Alex8800**12');
        await page.waitForTimeout(3000);
        await page.getByRole('button', { name: 'Ingrese' }).click();
  await page.waitForTimeout(3000);
  
  await page.getByRole('cell', { name: 'Seleccione' }).locator('span').click();
  await page.getByRole('cell', { name: 'SERVICIO NACIONAL DE' }).locator('span').click();
  await page.getByRole('button', { name: 'Aceptar' }).click();
}

// Función para obtener datos personales
async function obtenerDatosPersonales(page: Page, documento: string) {
  await navegarAGestionHojaVida(page);
  
  await page.getByLabel('Tipo de Documento:', { exact: true }).selectOption('38');
  await page.getByRole('textbox', { name: 'Número de Documento:' }).fill(documento);
  await page.getByRole('button', { name: 'Buscar' }).click();

  const verDetalle = page.getByRole('button', { name: 'Ver Detalle' });
  await verDetalle.waitFor({ state: 'visible', timeout: 15000 });
  await verDetalle.click();
  await page.waitForTimeout(3000);

  const datos = await page.locator('text=Datos Básicos de Identificación').locator('xpath=..').first().innerText();
  console.log('🔍 Texto capturado:', datos);
  const match = datos.match(
    /([A-ZÁÉÍÓÚÑ][^\n]+)\n+Tipo de Documento:\s*(.+)\nNúmero de Identificación:\s*(\d+)\nFecha de Nacimiento:\s*(.+)\nCorreo Electrónico Personal \(Principal\):\s*(.+)\nGénero:\s*(\w+)/i
  );

  if (!match) throw new Error('No se pudieron extraer los datos personales');

  const [, nombre, tipoDoc, id, fechaNac, correo, genero] = match;
  return {
    nombre: nombre.trim(),
    tipoDoc,
    id,
    fechaNac,
    genero: genero.includes('Masculino') ? 'M' : 'F',
    correo
  };
}

// Función para navegar a gestión de HV
async function navegarAGestionHojaVida(page: Page) {
  await page.getByRole('link', { name: 'Información Personal' }).click();
  await page.getByRole('link', { name: 'Información Personal' }).click();
  await page.getByRole('link', { name: 'Gestionar Hoja de Vida' }).click();
  await page.waitForLoadState('networkidle');
}

// Función para descargar la hoja de vida
async function descargarHojaVida(page: Page, carpetaDescargas: string, nombre: string) {
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Descargar Mi Hoja De Vida' }).click();
  const page1 = await page1Promise;

  await page1.locator('td').filter({ hasText: 'Hoja de Vida Completa' }).locator('span').click();
  await page1.locator('[id$="j_idt139"] span').click();

  const downloadPromise = page1.waitForEvent('download');
  await page1.getByRole('button', { name: 'Descargar' }).click();
  const download = await downloadPromise;

  const nombreArchivo = `HV_${nombre.replace(/\s+/g, '_')}.pdf`;
  const rutaFinal = path.join(carpetaDescargas, nombreArchivo);
  await download.saveAs(rutaFinal);
  
  console.log(`📄 Archivo guardado: ${rutaFinal}`);
  await page1.close();
}